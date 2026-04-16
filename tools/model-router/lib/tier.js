/**
 * Tier 模型映射模块 - Model Router v4
 * 
 * 将 Tier 映射到具体的模型选择
 * Bailian 优先策略
 */

/**
 * Tier 类型
 * @typedef {'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'REASONING'} Tier
 */

/**
 * 默认 Tier → 模型映射
 */
const DEFAULT_TIER_MODEL_MAPPING = {
  SIMPLE: ['Kimi-BL', 'GLM47-BL'],
  MEDIUM: ['Kimi-BL', 'GLM5-BL', 'Qwen3.6'],
  COMPLEX: ['MiMo', 'Minimax-M2.7', 'Qwen3.6', 'GLM5-BL', 'QwenMax'],
  REASONING: ['MiMo', 'Minimax-M2.7', 'Qwen3.6', 'GLM5-BL', 'QwenMax']
};

/**
 * Agentic 能力评分
 */
const AGENTIC_CAPABILITY = {
  'Minimax': 0.95,
  'MiMo': 0.93,
  'Kimi-BL': 0.9,
  'GLM5-BL': 0.85,
  'QwenMax': 0.8,
  'QwenCoder': 0.7,
  'GLM47-BL': 0.6
};

/**
 * 代码能力评分
 */
const CODE_CAPABILITY = {
  'QwenCoder': 0.95,
  'Qwen3.6': 0.90,
  'GLM5-BL': 0.88,
  'Kimi-BL': 0.85,
  'Minimax-M2.7': 0.82,
  'MiMo': 0.78,
  'Minimax-M2.5': 0.80,
  'QwenMax': 0.78,
  'Minimax-BL': 0.75,
  'GLM47-BL': 0.65
};

/**
 * 根据 Tier 选择模型
 * 
 * @param {Tier} tier - 任务复杂度 tier
 * @param {object} options - 选项
 * @param {number} options.agenticScore - Agentic 评分 [0, 1]
 * @param {boolean} options.isCodeTask - 是否为代码任务
 * @param {object} options.availableModels - 可用模型列表（从 OpenClaw 配置读取）
 * @param {object} options.modelMapping - Tier → 模型映射
 * @returns {{ modelSequence: string[], reason: string }}
 */
function selectModelByTier(tier, options = {}) {
  const {
    agenticScore = 0,
    isCodeTask = false,
    availableModels = null,
    modelMapping = DEFAULT_TIER_MODEL_MAPPING
  } = options;
  
  // 获取该 tier 的候选模型
  let candidates = [...(modelMapping[tier] || modelMapping.MEDIUM)];
  
  // 如果是代码任务，优先选择代码能力强的模型
  if (isCodeTask) {
    candidates = candidates.sort((a, b) => 
      (CODE_CAPABILITY[b] || 0) - (CODE_CAPABILITY[a] || 0)
    );
  }
  
  // 如果 Agentic 评分高，优先选择 Agentic 能力强的模型
  if (agenticScore >= 0.5) {
    candidates = candidates.sort((a, b) => 
      (AGENTIC_CAPABILITY[b] || 0) - (AGENTIC_CAPABILITY[a] || 0)
    );
  }
  
  // 如果有可用模型列表，过滤掉不可用的
  if (availableModels) {
    const modelKeyMap = {};
    for (const key of Object.keys(availableModels)) {
      modelKeyMap[key.toLowerCase()] = key;
    }
    
    candidates = candidates.filter(model => {
      const lowerModel = model.toLowerCase();
      const actualKey = modelKeyMap[lowerModel];
      if (!actualKey) return false;
      const val = availableModels[actualKey];
      return val !== undefined && val !== null;
    });
    
    // 如果全部过滤掉了，使用默认回退
    if (candidates.length === 0) {
      candidates = Object.keys(availableModels).slice(0, 2);
    }
  }
  
  const reason = buildSelectionReason(tier, agenticScore, isCodeTask);
  
  return {
    modelSequence: candidates,
    reason
  };
}

/**
 * 构建选择原因描述
 */
function buildSelectionReason(tier, agenticScore, isCodeTask) {
  const parts = [`tier=${tier}`];
  
  if (agenticScore >= 0.7) {
    parts.push('agentic-high');
  } else if (agenticScore >= 0.5) {
    parts.push('agentic-mid');
  }
  
  if (isCodeTask) {
    parts.push('code-optimized');
  }
  
  return parts.join(' | ');
}

/**
 * 从路由结果提取模型别名
 * 
 * @param {object} routingResult - 路由结果
 * @returns {string} - 模型别名
 */
function getFirstModel(routingResult) {
  if (routingResult.model_sequence && routingResult.model_sequence.length > 0) {
    return routingResult.model_sequence[0];
  }
  return 'Kimi-BL'; // 默认回退
}

module.exports = {
  DEFAULT_TIER_MODEL_MAPPING,
  AGENTIC_CAPABILITY,
  CODE_CAPABILITY,
  selectModelByTier,
  getFirstModel
};