/**
 * 置信度计算模块 - Model Router v4
 * 
 * 基于 Sigmoid 函数校准置信度
 * 借鉴 ClawRouter 的置信度设计
 */

/**
 * Tier 类型定义
 * @typedef {'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'REASONING'} Tier
 */

/**
 * 默认 Tier 边界配置（降低边界，对复杂中文更友好）
 */
const DEFAULT_TIER_BOUNDARIES = {
  simpleMedium: -0.15,      // < -0.15 → SIMPLE
  mediumComplex: 0.15,      // -0.15 ~ 0.15 → MEDIUM（降低边界）
  complexReasoning: 0.55    // 0.15 ~ 0.55 → COMPLEX, > 0.55 → REASONING
};

/**
 * 默认置信度阈值
 */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/**
 * 默认置信度陡峭度（Sigmoid 参数）
 */
const DEFAULT_CONFIDENCE_STEEPNESS = 5;

/**
 * Sigmoid 置信度校准
 * 
 * 将距离边界的距离映射到 [0.5, 1.0] 置信度范围
 * 
 * @param {number} distanceFromBoundary - 距离最近边界的距离
 * @param {number} steepness - Sigmoid 陡峭度（越大变化越快）
 * @returns {number} - 置信度 [0, 1]
 */
function calibrateConfidence(distanceFromBoundary, steepness = DEFAULT_CONFIDENCE_STEEPNESS) {
  // 确保距离为正
  const distance = Math.abs(distanceFromBoundary);
  
  // Sigmoid 函数: 1 / (1 + e^(-steepness * distance))
  // distance = 0 时返回 0.5
  // distance → ∞ 时返回 1.0
  const confidence = 1 / (1 + Math.exp(-steepness * distance));
  
  // 限制在 [0.5, 1.0] 范围内（因为我们对距离取了绝对值）
  return Math.max(0.5, Math.min(1.0, confidence));
}

/**
 * 根据加权总分映射到 Tier
 * 
 * @param {number} weightedScore - 加权总分
 * @param {object} boundaries - Tier 边界配置
 * @returns {{ tier: Tier, distanceFromBoundary: number }}
 */
function mapScoreToTier(weightedScore, boundaries = DEFAULT_TIER_BOUNDARIES) {
  const { simpleMedium, mediumComplex, complexReasoning } = boundaries;
  
  let tier;
  let distanceFromBoundary;
  
  if (weightedScore < simpleMedium) {
    tier = 'SIMPLE';
    distanceFromBoundary = simpleMedium - weightedScore;
  } else if (weightedScore < mediumComplex) {
    tier = 'MEDIUM';
    distanceFromBoundary = Math.min(
      weightedScore - simpleMedium,
      mediumComplex - weightedScore
    );
  } else if (weightedScore < complexReasoning) {
    tier = 'COMPLEX';
    distanceFromBoundary = Math.min(
      weightedScore - mediumComplex,
      complexReasoning - weightedScore
    );
  } else {
    tier = 'REASONING';
    distanceFromBoundary = weightedScore - complexReasoning;
  }
  
  return { tier, distanceFromBoundary };
}

/**
 * 计算路由决策的置信度
 * 
 * @param {number} weightedScore - 加权总分
 * @param {object} boundaries - Tier 边界配置
 * @param {number} steepness - Sigmoid 陡峭度
 * @returns {{ tier: Tier, confidence: number }}
 */
function calculateConfidence(weightedScore, boundaries = DEFAULT_TIER_BOUNDARIES, steepness = DEFAULT_CONFIDENCE_STEEPNESS) {
  const { tier, distanceFromBoundary } = mapScoreToTier(weightedScore, boundaries);
  const confidence = calibrateConfidence(distanceFromBoundary, steepness);
  
  return { tier, confidence };
}

/**
 * 判断置信度是否足够
 * 
 * @param {number} confidence - 置信度
 * @param {number} threshold - 阈值
 * @returns {boolean}
 */
function isConfidenceSufficient(confidence, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  return confidence >= threshold;
}

/**
 * Tier 推理直接覆盖
 * 
 * 当检测到 2+ 推理关键词时，直接返回 REASONING tier
 * 
 * @param {string} text - 输入文本
 * @param {string[]} reasoningKeywords - 推理关键词列表
 * @returns {{ isReasoning: boolean, matchCount: number }}
 */
function checkReasoningOverride(text, reasoningKeywords) {
  const lowerText = text.toLowerCase();
  const matches = reasoningKeywords.filter(kw => lowerText.includes(kw.toLowerCase()));
  
  return {
    isReasoning: matches.length >= 2,
    matchCount: matches.length
  };
}

/**
 * 结构化输出检测
 * 
 * 检测是否需要 JSON 或其他结构化输出
 * 
 * @param {string} text - 输入文本
 * @returns {boolean}
 */
function hasStructuredOutputRequirement(text) {
  return /json|structured|schema|格式|表格|table/i.test(text);
}

/**
 * Tier 排名
 */
const TIER_RANK = {
  SIMPLE: 0,
  MEDIUM: 1,
  COMPLEX: 2,
  REASONING: 3
};

/**
 * 升级 Tier（用于结构化输出等场景）
 * 
 * @param {string} currentTier - 当前 tier
 * @param {string} minTier - 最低 tier
 * @returns {string}
 */
function upgradeTier(currentTier, minTier) {
  if (TIER_RANK[currentTier] < TIER_RANK[minTier]) {
    return minTier;
  }
  return currentTier;
}

module.exports = {
  DEFAULT_TIER_BOUNDARIES,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_CONFIDENCE_STEEPNESS,
  calibrateConfidence,
  mapScoreToTier,
  calculateConfidence,
  isConfidenceSufficient,
  checkReasoningOverride,
  hasStructuredOutputRequirement,
  TIER_RANK,
  upgradeTier
};