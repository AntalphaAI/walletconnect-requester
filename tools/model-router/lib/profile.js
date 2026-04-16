/**
 * Profile 策略模块 - Model Router v4
 * 
 * 支持多种路由策略：auto, eco, premium, coding
 */

/**
 * Profile 类型
 * @typedef {'auto' | 'eco' | 'premium' | 'coding'} Profile
 */

/**
 * 默认 Profile 配置
 */
const DEFAULT_PROFILES = {
  auto: {
    name: 'auto',
    description: '平衡模式：质量/成本均衡',
    tierUpgrades: {},
    tierDowngrades: {},
    taskBoost: {},
    modelPreference: 'balanced',
    costWeight: 0.5,
    qualityWeight: 0.5
  },
  
  eco: {
    name: 'eco',
    description: '省钱模式：优先选择便宜模型',
    tierUpgrades: {},
    tierDowngrades: {
      REASONING: 'COMPLEX',
      COMPLEX: 'MEDIUM'
    },
    taskBoost: {},
    modelPreference: 'cost_first',
    costWeight: 0.9,
    qualityWeight: 0.1
  },
  
  premium: {
    name: 'premium',
    description: '高质量模式：优先选择强模型',
    tierUpgrades: {
      MEDIUM: 'COMPLEX',
      COMPLEX: 'REASONING'
    },
    tierDowngrades: {},
    taskBoost: {},
    modelPreference: 'quality_first',
    costWeight: 0.1,
    qualityWeight: 0.9
  },
  
  coding: {
    name: 'coding',
    description: '编程模式：优先选择代码能力强的模型',
    tierUpgrades: {},
    tierDowngrades: {},
    taskBoost: {
      code: 1.5  // 代码任务加权 1.5 倍
    },
    modelPreference: 'code_optimized',
    costWeight: 0.3,
    qualityWeight: 0.7
  }
};

/**
 * Tier 排名（用于升级/降级）
 */
const TIER_RANK = {
  SIMPLE: 0,
  MEDIUM: 1,
  COMPLEX: 2,
  REASONING: 3
};

const RANK_TO_TIER = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING'];

/**
 * 应用 Profile 策略调整 Tier
 * 
 * @param {string} tier - 原始 Tier
 * @param {string} profile - Profile 名称
 * @param {object} profiles - Profile 配置
 * @returns {string} - 调整后的 Tier
 */
function applyProfileTierAdjustment(tier, profile, profiles = DEFAULT_PROFILES) {
  const p = profiles[profile] || profiles.auto;
  
  // 降级优先（省钱）
  if (p.tierDowngrades[tier]) {
    return p.tierDowngrades[tier];
  }
  
  // 升级（追求质量）
  if (p.tierUpgrades[tier]) {
    return p.tierUpgrades[tier];
  }
  
  return tier;
}

/**
 * 应用任务加权（用于 coding profile）
 * 
 * @param {number} weightedScore - 原始加权分数
 * @param {string} taskType - 任务类型
 * @param {string} profile - Profile 名称
 * @param {object} profiles - Profile 配置
 * @returns {number} - 调整后的分数
 */
function applyTaskBoost(weightedScore, taskType, profile, profiles = DEFAULT_PROFILES) {
  const p = profiles[profile] || profiles.auto;
  const boost = p.taskBoost[taskType];
  
  if (boost && boost > 0) {
    return weightedScore * boost;
  }
  
  return weightedScore;
}

/**
 * 根据 Profile 排序模型
 * 
 * @param {string[]} models - 候选模型列表
 * @param {string} profile - Profile 名称
 * @param {object} options - 选项
 * @returns {string[]} - 排序后的模型列表
 */
function sortModelsByProfile(models, profile, options = {}) {
  const { isCodeTask = false, agenticScore = 0 } = options;
  
  // 模型能力评分（基于 benchmark）
  // MiniMax-M2.7: XSCT Arena 84.5 #11, 文字强推理弱, Agentic强
  // Qwen3.6: 新发布, 100万context, SOTA, agentic coding强
  // GLM-5: 编程与Agent能力提升，对标Claude
  // Kimi-K2.5: 多模态强，AgentIF基准突出
  const CODE_CAPABILITY = {
    'QwenCoder': 0.95,
    'Qwen3.6': 0.90,
    'GLM5-BL': 0.88,
    'Kimi-BL': 0.85,
    'Minimax-M2.7': 0.82,
    'Minimax-M2.5': 0.80,
    'QwenMax': 0.78,
    'Minimax-BL': 0.75,
    'GLM47-BL': 0.65
  };
  
  const AGENTIC_CAPABILITY = {
    'Minimax-M2.7': 0.95,
    'Qwen3.6': 0.93,
    'GLM5-BL': 0.88,
    'Kimi-BL': 0.85,
    'Minimax-M2.5': 0.82,
    'QwenMax': 0.78,
    'QwenCoder': 0.72,
    'Minimax-BL': 0.70,
    'GLM47-BL': 0.60
  };
  
  // 成本评分（越低越便宜/风险越高）
  // bailian高级计划无限量，minimax有用量限制，Qwen3.6免费
  const COST_SCORE = {
    'Qwen3.6': 0.95,   // 免费，无用量限制
    'GLM47-BL': 0.90,
    'Kimi-BL': 0.85,
    'GLM5-BL': 0.75,
    'QwenMax': 0.70,
    'QwenCoder': 0.80,
    'Minimax-BL': 0.60,
    'Minimax-M2.5': 0.50,
    'Minimax-M2.7': 0.40
  };
  
  return [...models].sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    
    switch (profile) {
      case 'eco':
        // 成本优先
        scoreA = COST_SCORE[a] || 0.5;
        scoreB = COST_SCORE[b] || 0.5;
        break;
        
      case 'premium':
        // 质量优先（成本评分的反向）
        scoreA = 1 - (COST_SCORE[a] || 0.5);
        scoreB = 1 - (COST_SCORE[b] || 0.5);
        break;
        
      case 'coding':
        // 代码能力优先
        scoreA = CODE_CAPABILITY[a] || 0.5;
        scoreB = CODE_CAPABILITY[b] || 0.5;
        break;
        
      case 'auto':
      default:
        // 平衡：考虑 Agentic 能力
        if (agenticScore >= 0.5) {
          scoreA = AGENTIC_CAPABILITY[a] || 0.5;
          scoreB = AGENTIC_CAPABILITY[b] || 0.5;
        } else if (isCodeTask) {
          scoreA = CODE_CAPABILITY[a] || 0.5;
          scoreB = CODE_CAPABILITY[b] || 0.5;
        } else {
          // 默认保持原顺序
          return 0;
        }
    }
    
    return scoreB - scoreA;  // 降序排列
  });
}

/**
 * 获取当前 Profile（从环境变量或配置）
 * 
 * @param {object} config - 配置对象
 * @returns {string} - Profile 名称
 */
function getCurrentProfile(config) {
  // 优先级：环境变量 > 配置文件 > 默认值
  return process.env.MODEL_ROUTER_PROFILE || 
         config?.profile?.default || 
         'auto';
}

/**
 * 验证 Profile 是否有效
 * 
 * @param {string} profile - Profile 名称
 * @param {object} profiles - Profile 配置
 * @returns {boolean}
 */
function isValidProfile(profile, profiles = DEFAULT_PROFILES) {
  return profile in profiles;
}

/**
 * 列出可用 Profiles
 * 
 * @param {object} profiles - Profile 配置
 * @returns {object[]}
 */
function listProfiles(profiles = DEFAULT_PROFILES) {
  return Object.entries(profiles).map(([name, p]) => ({
    name,
    description: p.description,
    costWeight: p.costWeight,
    qualityWeight: p.qualityWeight
  }));
}

module.exports = {
  DEFAULT_PROFILES,
  TIER_RANK,
  RANK_TO_TIER,
  applyProfileTierAdjustment,
  applyTaskBoost,
  sortModelsByProfile,
  getCurrentProfile,
  isValidProfile,
  listProfiles
};