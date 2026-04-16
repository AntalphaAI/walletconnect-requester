/**
 * LLM Fallback 模块 - Model Router v4
 * 
 * 当置信度低时，调用便宜模型进行分类
 * 借鉴 ClawRouter 的 LLM Classifier 设计
 */

const fs = require('fs');
const path = require('path');

/**
 * 默认配置
 */
const DEFAULT_FALLBACK_CONFIG = {
  enabled: true,
  confidenceThreshold: 0.5,  // 低于此阈值触发 fallback
  model: 'bailian/glm-4-flash',  // 最便宜的模型
  maxTokens: 10,
  temperature: 0,
  cacheTtlMs: 3600000,  // 1 小时缓存
  truncationChars: 500  // 截断长度
};

/**
 * 分类器 Prompt
 */
const CLASSIFIER_PROMPT = `你是查询复杂度分类器。将用户查询分为一个类别。

类别：
- SIMPLE: 事实问答、定义、翻译、简短回答
- MEDIUM: 总结、解释、中等代码生成
- COMPLEX: 多步骤代码、系统设计、创意写作、分析
- REASONING: 数学证明、形式逻辑、逐步推理

只需回答一个词：SIMPLE、MEDIUM、COMPLEX 或 REASONING。`;

/**
 * 简单哈希函数（用于缓存 key）
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * 内存缓存
 */
const cache = new Map();

/**
 * 清理过期缓存
 */
function pruneCache() {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (value.expires <= now) {
      cache.delete(key);
    }
  }
}

/**
 * 从缓存获取分类结果
 * 
 * @param {string} text - 输入文本
 * @param {number} ttlMs - 缓存时间
 * @returns {string|null} - Tier 或 null
 */
function getCachedClassification(text, ttlMs = DEFAULT_FALLBACK_CONFIG.cacheTtlMs) {
  const hash = simpleHash(text.slice(0, 500));
  const cached = cache.get(hash);
  
  if (cached && cached.expires > Date.now()) {
    return cached.tier;
  }
  
  return null;
}

/**
 * 缓存分类结果
 * 
 * @param {string} text - 输入文本
 * @param {string} tier - Tier 结果
 * @param {number} ttlMs - 缓存时间
 */
function setCachedClassification(text, tier, ttlMs = DEFAULT_FALLBACK_CONFIG.cacheTtlMs) {
  const hash = simpleHash(text.slice(0, 500));
  cache.set(hash, { tier, expires: Date.now() + ttlMs });
  
  // 清理过期缓存
  if (cache.size > 1000) {
    pruneCache();
  }
}

/**
 * 解析 LLM 响应为 Tier
 * 
 * @param {string} text - LLM 响应文本
 * @returns {string} - Tier
 */
function parseTierFromLLM(text) {
  const upper = text.trim().toUpperCase();
  
  if (/\bREASONING\b/.test(upper)) return 'REASONING';
  if (/\bCOMPLEX\b/.test(upper)) return 'COMPLEX';
  if (/\bMEDIUM\b/.test(upper)) return 'MEDIUM';
  if (/\bSIMPLE\b/.test(upper)) return 'SIMPLE';
  
  return 'MEDIUM';  // 安全默认值
}

/**
 * 使用 LLM 进行分类
 * 
 * 注意：这是一个模拟实现，实际应该调用 OpenClaw 的模型 API
 * 由于 router 本身不能调用模型，这里返回模拟结果
 * 
 * @param {string} text - 输入文本
 * @param {object} config - Fallback 配置
 * @returns {Promise<{tier: string, confidence: number}>}
 */
async function classifyByLLM(text, config = DEFAULT_FALLBACK_CONFIG) {
  const truncated = text.slice(0, config.truncationChars);
  
  // 检查缓存
  const cached = getCachedClassification(truncated, config.cacheTtlMs);
  if (cached) {
    return { tier: cached, confidence: 0.75, fromCache: true };
  }
  
  // 模拟 LLM 分类（基于启发式规则）
  // 实际实现应该调用模型 API
  const lower = truncated.toLowerCase();
  
  // 简单启发式分类
  let tier = 'MEDIUM';
  
  // REASONING 指标
  if (/为什么|分析|推理|证明|推导|逻辑|比较.*优劣|权衡|评估/.test(lower)) {
    tier = 'REASONING';
  }
  // COMPLEX 指标
  else if (/设计|架构|系统|多步骤|完整|详细|深入/.test(lower)) {
    tier = 'COMPLEX';
  }
  // SIMPLE 指标
  else if (/是什么|定义|怎么|如何|介绍|解释.*概念/.test(lower) && 
           truncated.length < 100) {
    tier = 'SIMPLE';
  }
  
  // 缓存结果
  setCachedClassification(truncated, tier, config.cacheTtlMs);
  
  return { tier, confidence: 0.7, fromCache: false };
}

/**
 * 是否应该触发 LLM Fallback
 * 
 * @param {number} confidence - 当前置信度
 * @param {object} config - Fallback 配置
 * @returns {boolean}
 */
function shouldTriggerFallback(confidence, config = DEFAULT_FALLBACK_CONFIG) {
  if (!config.enabled) return false;
  return confidence < config.confidenceThreshold;
}

/**
 * 获取 Fallback 统计信息
 * 
 * @returns {object}
 */
function getFallbackStats() {
  return {
    cacheSize: cache.size,
    cacheKeys: Array.from(cache.keys()).slice(0, 10)  // 前 10 个 key
  };
}

/**
 * 清空缓存
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  DEFAULT_FALLBACK_CONFIG,
  CLASSIFIER_PROMPT,
  classifyByLLM,
  shouldTriggerFallback,
  parseTierFromLLM,
  getCachedClassification,
  setCachedClassification,
  getFallbackStats,
  clearCache
};