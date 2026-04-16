#!/usr/bin/env node

/**
 * 智能模型路由器 v4 - "维度扩展 + 置信度 + Agentic"
 * 
 * 设计原则：
 * 1. 12 维度加权评分 → Tier 映射
 * 2. Sigmoid 置信度校准
 * 3. Agentic 任务检测
 * 4. Bailian 优先（包月无上限）
 * 5. 零崩溃保证（继承 v3 设计）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 导入 v4 模块
const {
  scoreAllDimensions,
  calculateWeightedScore,
  collectSignals,
  DEFAULT_CONFIG: DIMENSION_CONFIG
} = require('./lib/dimensions');

const {
  calculateConfidence,
  calibrateConfidence,
  mapScoreToTier,
  checkReasoningOverride,
  hasStructuredOutputRequirement,
  upgradeTier,
  DEFAULT_TIER_BOUNDARIES
} = require('./lib/confidence');

const { selectModelByTier } = require('./lib/tier');

const {
  applyProfileTierAdjustment,
  applyTaskBoost,
  sortModelsByProfile,
  getCurrentProfile,
  DEFAULT_PROFILES
} = require('./lib/profile');

const {
  classifyByLLM,
  shouldTriggerFallback,
  DEFAULT_FALLBACK_CONFIG
} = require('./lib/fallback');

const {
  logRoute,
  logError,
  getMetrics,
  resetMetrics,
  createTimer,
  DEFAULT_OBSERVABILITY_CONFIG
} = require('./lib/observability');

const {
  RouteCache,
  WarmupManager,
  DEFAULT_WARMUP_PATTERNS,
  globalMonitor
} = require('./lib/cache');

const configPath = path.join(__dirname, 'config.json');
const openclawConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');

// 输入消毒
function sanitizeInput(input) {
  try {
    if (typeof input !== 'object' || input === null) return null;
    let text = input.text || '';
    if (typeof text === 'string' && text.length > 100000) text = text.substring(0, 100000);
    if (typeof text !== 'string') text = String(text || '');
    return {
      text,
      user_model: input.user_model || null,
      images: Array.isArray(input.images) ? input.images : [],
      files: Array.isArray(input.files) ? input.files : []
    };
  } catch (e) {
    return null;
  }
}

// 配置加载
function loadOpenClawModels() {
  try {
    const cfg = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf-8'));
    const models = {};
    const providers = cfg.models?.providers || {};
    const allowed = cfg.agents?.defaults?.models || {};
    
    for (const [id, mc] of Object.entries(allowed)) {
      const [prov, ...nameParts] = id.split('/');
      const name = nameParts.join('/');
      const pc = providers[prov];
      if (!pc) continue;
      const pm = pc.models?.find(m => m.id === name);
      if (!pm) continue;
      const alias = mc.alias || name;
      models[alias] = { id, provider: prov, modelId: name };
    }
    return { models, defaultModel: cfg.agents?.defaults?.model?.primary || null };
  } catch (e) {
    return { models: {}, defaultModel: null };
  }
}

let _config = null;
let _routeCache = null;
let _warmupManager = null;

// 初始化缓存
function getRouteCache() {
  if (!_routeCache) {
    const config = getConfig();
    _routeCache = new RouteCache({
      maxSize: config.cache?.maxSize || 1000,
      defaultTTL: config.cache?.ttl || 3600000,
      enabled: config.cache?.enabled !== false
    });
  }
  return _routeCache;
}

// 初始化预热管理器
function getWarmupManager() {
  if (!_warmupManager) {
    _warmupManager = new WarmupManager(getRouteCache());
    // 添加默认预热模式
    DEFAULT_WARMUP_PATTERNS.forEach(p => {
      _warmupManager.addPattern(p.pattern, p.profile, p.expectedTier);
    });
  }
  return _warmupManager;
}

function loadConfig() {
  try {
    const rc = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const { models: systemModels, defaultModel } = loadOpenClawModels();
    const modelMapping = {};
    for (const [alias, mi] of Object.entries(systemModels)) modelMapping[alias] = mi.id;
    if (rc.model_aliases) {
      for (const [alias, target] of Object.entries(rc.model_aliases)) {
        if (systemModels[target]) modelMapping[alias] = systemModels[target].id;
      }
    }
    return { ...rc, systemModels, modelMapping, defaultModel };
  } catch (e) {
    return { systemModels: {}, modelMapping: {}, defaultModel: null, blocked_models: [] };
  }
}

function getConfig() { return _config || (_config = loadConfig()); }
function reloadConfig() { _config = null; return getConfig(); }

function getEmergencyFallback() {
  return { provider: 'bailian', modelId: 'glm-5', alias: 'GLM5-BL' };
}

function isBlockedModel(modelId, config) {
  const blocked = config.blocked_models || [];
  const lower = (modelId || '').toLowerCase();
  return blocked.some(p => p.endsWith('*') ? lower.startsWith(p.toLowerCase().slice(0, -1)) : lower.includes(p.toLowerCase()));
}

function estimateTokens(text) { return Math.ceil((text || '').length / 4); }

function detectCodeTask(text) {
  const lower = (text || '').toLowerCase();
  return DIMENSION_CONFIG.codeKeywords.filter(kw => lower.includes(kw.toLowerCase())).length >= 2;
}

// v4 核心路由（Phase 3: 集成缓存 + 可观测性）
function route(input, includeFullInfo = false) {
  const timer = createTimer();
  let cacheHit = false;
  let fallbackTriggered = false;
  
  try {
    const agentId = input?.agentId || input?.session?.agentId || input?.context?.agentId;
    if (agentId === 'life_assistant') return null;

    const safeInput = sanitizeInput(input);
    if (!safeInput) return createFallbackResult(includeFullInfo);

    const config = getConfig();
    const text = safeInput.text || '';
    const userModel = safeInput.user_model;

    // 获取 Profile
    const profile = getCurrentProfile(config);
    
    // Phase 3: 检查缓存
    const cache = getRouteCache();
    const cached = cache.get(text, profile);
    if (cached) {
      cacheHit = true;
      const latencyMs = timer.elapsedMs();
      
      // 转换模型序列（如果需要完整信息）
      const modelSequence = includeFullInfo && typeof cached.model_sequence[0] === 'string'
        ? cached.model_sequence.map(alias => resolveToFullModelInfo(alias, config) || { alias, provider: 'unknown', modelId: 'unknown' })
        : cached.model_sequence;
      
      const result = {
        ...cached,
        model_sequence: modelSequence,
        cacheHit: true
      };
      
      // 记录日志
      logRoute({
        input: text,
        profile,
        tier: cached.features?.tier,
        model: modelSequence[0],
        confidence: cached.confidence,
        latencyMs,
        signals: [...(cached.signals || []), 'cache-hit'],
        cacheHit: true,
        fallbackTriggered: cached.signals?.includes('fallback-triggered')
      }, config.observability);
      
      return result;
    }

    // 用户指定模型
    if (userModel && !isBlockedModel(userModel, config)) {
      const mi = resolveToFullModelInfo(userModel, config);
      if (mi) {
        const result = {
          matched_rule: 'user_specified',
          reason: '用户明确指定模型',
          model_sequence: [includeFullInfo ? mi : mi.alias],
          confidence: 1.0,
          signals: ['user_specified'],
          profile
        };
        cache.set(text, profile, result);
        return result;
      }
    }

    const signals = [];
    signals.push(`profile:${profile}`);

    // 维度评分
    const estimatedTokens = estimateTokens(text);
    const { dimensions, agenticScore } = scoreAllDimensions(text, estimatedTokens);
    let weightedScore = calculateWeightedScore(dimensions);
    signals.push(...collectSignals(dimensions));
    
    const isCodeTask = detectCodeTask(text);
    
    // 应用任务加权（coding profile）
    weightedScore = applyTaskBoost(weightedScore, isCodeTask ? 'code' : 'general', profile);
    
    // 推理覆盖检查
    const reasoningCheck = checkReasoningOverride(text, DIMENSION_CONFIG.reasoningKeywords);
    let tier, confidence;
    
    if (reasoningCheck.isReasoning) {
      tier = 'REASONING';
      confidence = 0.9;
      signals.push('reasoning-override');
    } else {
      const tr = mapScoreToTier(weightedScore, DEFAULT_TIER_BOUNDARIES);
      tier = tr.tier;
      confidence = calibrateConfidence(tr.distanceFromBoundary);
    }
    
    // 结构化输出升级
    if (hasStructuredOutputRequirement(text)) {
      tier = upgradeTier(tier, 'MEDIUM');
    }
    
    // Profile Tier 调整
    const originalTier = tier;
    tier = applyProfileTierAdjustment(tier, profile);
    if (tier !== originalTier) {
      signals.push(`profile-adjust:${originalTier}→${tier}`);
    }
    
    // LLM Fallback
    const fallbackConfig = config.fallback || DEFAULT_FALLBACK_CONFIG;
    if (shouldTriggerFallback(confidence, fallbackConfig)) {
      signals.push('fallback-triggered');
      fallbackTriggered = true;
    }
    
    // 选择模型
    const modelResult = selectModelByTier(tier, { agenticScore, isCodeTask, availableModels: config.systemModels });
    
    // Profile 排序
    let models = modelResult.modelSequence;
    models = sortModelsByProfile(models, profile, { isCodeTask, agenticScore });
    
    // Agentic 信号
    if (agenticScore >= 0.5) {
      signals.push(`agentic(${agenticScore.toFixed(1)})`);
    }

    // 转换模型序列为完整信息（如果需要）
    const modelSequence = includeFullInfo 
      ? models.map(alias => resolveToFullModelInfo(alias, config) || { alias, provider: 'unknown', modelId: 'unknown' })
      : models;

    const result = {
      matched_rule: 'v4_dimension_scoring',
      reason: `score=${weightedScore.toFixed(2)} | tier=${tier} | profile=${profile}`,
      features: { weightedScore, tier, agenticScore, profile },
      model_sequence: modelSequence,
      confidence,
      signals,
      profile
    };
    
    // 写入缓存（存储别名版本）
    cache.set(text, profile, { ...result, model_sequence: models });
    
    // 记录日志
    const latencyMs = timer.elapsedMs();
    logRoute({
      input: text,
      profile,
      tier,
      model: models[0],
      confidence,
      latencyMs,
      signals,
      cacheHit: false,
      fallbackTriggered
    }, config.observability);
    
    // 性能监控
    globalMonitor.record('route', latencyMs);

    return result;
  } catch (e) {
    logError(e, getConfig()?.observability);
    return createFallbackResult(includeFullInfo);
  }
}

function resolveToFullModelInfo(aliasOrId, config) {
  const fullId = aliasOrId.includes('/') ? aliasOrId : config.modelMapping[aliasOrId];
  if (!fullId || isBlockedModel(fullId, config)) return null;
  for (const [alias, mi] of Object.entries(config.systemModels)) {
    if (mi.id === fullId) return { provider: mi.provider, modelId: mi.modelId, alias };
  }
  return null;
}

function createFallbackResult(includeFullInfo) {
  const e = getEmergencyFallback();
  return { matched_rule: 'emergency_fallback', reason: '紧急回退', model_sequence: [includeFullInfo ? e : e.alias], confidence: 0.5, signals: ['fallback'] };
}

// 公共 API
function getRecommendedModel(input) { return route(input)?.model_sequence?.[0]; }
function getRecommendedModelFull(input) { return route(input, true)?.model_sequence?.[0] || getEmergencyFallback(); }
function getRoutingInfo(input) { return route(input); }
function listAvailableModels() { return getConfig().systemModels; }

// 兼容函数
function detectLanguage(t) { return (t?.match(/[\u4e00-\u9fa5]/g) || []).length / (t?.length || 1) > 0.2 ? 'chinese' : 'english'; }
function detectTaskType(t) { const l = (t || '').toLowerCase(); return DIMENSION_CONFIG.codeKeywords.some(k => l.includes(k.toLowerCase())) ? 'code' : 'general'; }
function assessTextLength(t) { const n = (t || '').length; return n < 200 ? 'short' : n < 500 ? 'medium' : 'long'; }
function assessComplexity(t) { const s = (t || '').split(/[。.!?\n]/).filter(x => x.trim()); return s.length <= 2 ? 'low' : s.length <= 5 ? 'medium' : 'high'; }
function validateOutput(mi) { return mi?.provider && mi?.modelId ? mi : getEmergencyFallback(); }
function isModelAvailable(a, c) { const id = a.includes('/') ? a : c.modelMapping[a]; return Object.values(c.systemModels).some(m => m.id === id); }
function resolveToOpenClawAlias(a, c) { if (a.includes('/')) { for (const [al, mi] of Object.entries(c.systemModels)) if (mi.id === a) return al; } return a; }

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--list-models') { console.log(JSON.stringify(listAvailableModels(), null, 2)); process.exit(0); }
  if (args[0] === '--list-profiles') {
    const { listProfiles } = require('./lib/profile');
    console.log('=== 可用 Profiles ===');
    listProfiles().forEach(p => console.log(`  ${p.name}: ${p.description}`));
    process.exit(0);
  }
  if (args[0] === '--test-dimensions') {
    const text = args[1] || '帮我写一个 Python 函数';
    const { dimensions, agenticScore } = scoreAllDimensions(text, estimateTokens(text));
    const ws = calculateWeightedScore(dimensions);
    console.log('=== 维度评分 ===');
    dimensions.filter(d => d.signal).forEach(d => console.log(`${d.name}: ${d.score.toFixed(2)} (${d.signal})`));
    console.log(`\n加权总分: ${ws.toFixed(3)} | Agentic: ${agenticScore.toFixed(2)}`);
    process.exit(0);
  }
  if (args[0] === '--test-profile') {
    const profile = args[1] || 'auto';
    const text = args[2] || '帮我写一个 Python 函数';
    process.env.MODEL_ROUTER_PROFILE = profile;
    const result = route({ text });
    console.log(`=== Profile: ${profile} ===`);
    console.log(`Tier: ${result.features.tier}`);
    console.log(`Model: ${result.model_sequence[0]}`);
    console.log(`Signals: ${result.signals.join(', ')}`);
    process.exit(0);
  }
  if (args[0] === '--stats') {
    console.log('=== 路由统计 ===');
    const metrics = getMetrics();
    console.log(JSON.stringify(metrics, null, 2));
    console.log('\n=== 缓存统计 ===');
    const cache = getRouteCache();
    console.log(JSON.stringify(cache.getStats(), null, 2));
    console.log('\n=== 性能统计 ===');
    console.log(JSON.stringify(globalMonitor.getStats('route'), null, 2));
    process.exit(0);
  }
  if (args[0] === '--warmup') {
    console.log('=== 执行预热 ===');
    const wm = getWarmupManager();
    const results = wm.warmup(route);
    results.forEach(r => {
      console.log(`${r.pattern}: ${r.success ? '✅' : '❌'} ${r.tier || r.error}`);
    });
    process.exit(0);
  }
  if (args[0] === '--reset-stats') {
    resetMetrics();
    getRouteCache().clear();
    console.log('统计已重置');
    process.exit(0);
  }
  if (args[0] === '--help' || !args.length) {
    console.log('Model Router v4 - 维度扩展 + 置信度 + Agentic + Profile + 缓存');
    console.log('');
    console.log('用法:');
    console.log('  node router.js <文本> [--json]          - 路由测试');
    console.log('  node router.js --test-dimensions <文本> - 维度评分');
    console.log('  node router.js --test-profile <p> <文本> - Profile 测试');
    console.log('  node router.js --list-profiles          - 列出 Profiles');
    console.log('  node router.js --list-models            - 列出模型');
    console.log('  node router.js --stats                  - 路由统计');
    console.log('  node router.js --warmup                 - 执行预热');
    console.log('  node router.js --reset-stats            - 重置统计');
    process.exit(args[0] === '--help' ? 0 : 1);
  }
  const fullMode = args.includes('--full');
  const text = args.find(a => !a.startsWith('--')) || '';
  console.log(JSON.stringify(route({ text }, fullMode), null, 2));
}

module.exports = {
  route, getRecommendedModel, getRecommendedModelFull, getRoutingInfo,
  loadOpenClawModels, loadConfig, reloadConfig, listAvailableModels,
  detectLanguage, detectTaskType, assessTextLength, assessComplexity,
  sanitizeInput, validateOutput, getEmergencyFallback, isBlockedModel,
  isModelAvailable, resolveToOpenClawAlias, resolveToFullModelInfo,
  // Phase 1
  scoreAllDimensions, calculateWeightedScore, calculateConfidence, selectModelByTier,
  // Phase 2
  applyProfileTierAdjustment, getCurrentProfile, sortModelsByProfile,
  shouldTriggerFallback, classifyByLLM,
  // Phase 3
  getMetrics, resetMetrics, getRouteCache, getWarmupManager,
  globalMonitor
};