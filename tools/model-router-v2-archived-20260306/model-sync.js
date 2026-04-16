/**
 * 模型同步器 - 从 OpenClaw 主配置文件动态读取模型信息
 * 解决 hard code 模型 ID 的问题
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_CONFIG_PATH = path.join(process.env.HOME, '.openclaw', 'openclaw.json');

/**
 * 从 OpenClaw 配置文件加载所有可用模型
 * @returns {Object} - 模型映射表 { alias: { id, name, provider, ... } }
 */
function loadModelsFromConfig() {
  try {
    const configContent = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configContent);
    
    const models = {};
    
    if (!config.models || !config.models.providers) {
      console.warn('[ModelSync] 未找到 providers 配置，使用默认模型');
      return getDefaultModels();
    }
    
    for (const [provider, providerData] of Object.entries(config.models.providers)) {
      if (!providerData.models) continue;
      
      for (const model of providerData.models) {
        const fullId = `${provider}/${model.id}`;
        const alias = generateAlias(model.id, provider);
        
        models[alias] = {
          id: fullId,
          shortId: model.id,
          name: model.name || model.id,
          provider: provider,
          contextWindow: model.contextWindow || 8192,
          maxTokens: model.maxTokens || 4096,
          reasoning: model.reasoning || false,
          cost: model.cost || { input: 0, output: 0 }
        };
      }
    }
    
    console.log(`[ModelSync] 成功加载 ${Object.keys(models).length} 个模型`);
    return models;
  } catch (error) {
    console.error(`[ModelSync] 加载配置失败: ${error.message}`);
    return getDefaultModels();
  }
}

/**
 * 生成模型别名（用于路由规则中的简短引用）
 * @param {string} modelId - 模型ID（如 glm-5）
 * @param {string} provider - 提供商（如 zai）
 * @returns {string} - 别名（如 glm5）
 */
function generateAlias(modelId, provider) {
  // 移除常见后缀和分隔符
  const alias = modelId
    .replace(/-/g, '')
    .replace(/_/g, '')
    .toLowerCase();
  
  // 特殊别名映射
  const specialAliases = {
    'kimi': 'kimi',
    'glm5': 'glm5',
    'glm4': 'glm4',
    'gemini2': 'gemini_flash',
    'gemini3': 'gemini_pro'
  };
  
  for (const [key, value] of Object.entries(specialAliases)) {
    if (alias.includes(key.replace(/[0-9]/g, ''))) {
      // 检查是否有版本号
      const versionMatch = alias.match(/(\d+)/);
      if (versionMatch) {
        return `${key.replace(/[0-9]/g, '')}${versionMatch[1] === '2' ? '_flash' : versionMatch[1] === '3' ? '_pro' : ''}`;
      }
    }
  }
  
  return alias;
}

/**
 * 默认模型配置（配置文件加载失败时的回退）
 */
function getDefaultModels() {
  return {
    'glm5': {
      id: 'zai/glm-5',
      shortId: 'glm-5',
      name: 'GLM-5',
      provider: 'zai',
      contextWindow: 204800,
      maxTokens: 131072,
      reasoning: true,
      strengths: ['code', 'chinese', 'structured_output']
    },
    'kimi': {
      id: 'moonshot/kimi-k2.5',
      shortId: 'kimi-k2.5',
      name: 'Kimi K2.5',
      provider: 'moonshot',
      contextWindow: 131072,
      maxTokens: 8192,
      reasoning: false,
      strengths: ['chinese', 'long_context', 'summarization']
    },
    'gemini_pro': {
      id: 'google/gemini-3-pro-preview',
      shortId: 'gemini-3-pro-preview',
      name: 'Gemini 3 Pro',
      provider: 'google',
      contextWindow: 1000000,
      maxTokens: 8192,
      reasoning: true,
      strengths: ['multimodal', 'complex_reasoning', 'translation']
    },
    'gemini_flash': {
      id: 'google/gemini-2.5-flash',
      shortId: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'google',
      contextWindow: 1000000,
      maxTokens: 8192,
      reasoning: false,
      strengths: ['speed', 'cost_effective']
    }
  };
}

/**
 * 根据模型能力获取最佳匹配
 * @param {Object} models - 模型映射表
 * @param {string[]} requirements - 能力要求（如 ['code', 'chinese']）
 * @returns {string} - 最佳模型的完整ID
 */
function getBestModelForRequirements(models, requirements) {
  let bestModel = null;
  let bestScore = -1;
  
  for (const [alias, model] of Object.entries(models)) {
    const strengths = model.strengths || [];
    let score = 0;
    
    for (const req of requirements) {
      if (strengths.includes(req)) {
        score += 1;
      }
    }
    
    // 成本调整（优先低成本）
    const costLevel = model.cost?.input || 2;
    score -= costLevel * 0.1;
    
    if (score > bestScore) {
      bestScore = score;
      bestModel = model.id;
    }
  }
  
  return bestModel || 'zai/glm-5'; // 默认回退
}

/**
 * 验证模型ID是否存在于配置中
 * @param {Object} models - 模型映射表
 * @param {string} modelId - 模型ID（可以是别名或完整ID）
 * @returns {string|null} - 完整模型ID，如果不存在返回 null
 */
function validateModelId(models, modelId) {
  if (!modelId) return null;
  
  // 检查是否是别名
  if (models[modelId]) {
    return models[modelId].id;
  }
  
  // 检查是否是完整ID（如 "zai/glm-5"）
  for (const [alias, model] of Object.entries(models)) {
    if (model.id === modelId || model.shortId === modelId) {
      return model.id;
    }
  }
  
  // 尝试模糊匹配（处理格式差异）
  const normalizedInput = modelId.replace(/[-_]/g, '').toLowerCase();
  for (const [alias, model] of Object.entries(models)) {
    const normalizedAlias = alias.replace(/[-_]/g, '').toLowerCase();
    const normalizedId = model.id.replace(/[-_/]/g, '').toLowerCase();
    
    if (normalizedAlias === normalizedInput || normalizedId.includes(normalizedInput)) {
      return model.id;
    }
  }
  
  return null;
}

// 导出
module.exports = {
  loadModelsFromConfig,
  getDefaultModels,
  getBestModelForRequirements,
  validateModelId,
  OPENCLAW_CONFIG_PATH
};
