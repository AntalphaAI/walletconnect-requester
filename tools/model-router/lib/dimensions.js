/**
 * 维度评分器 - Model Router v4
 * 
 * 实现 12 个评分维度，每个维度返回 [-1, 1] 范围的分数
 * 借鉴 ClawRouter 的加权评分设计
 */

/**
 * 维度评分结果
 * @typedef {Object} DimensionScore
 * @property {string} name - 维度名称
 * @property {number} score - 分数 [-1, 1]
 * @property {string|null} signal - 匹配信号（用于调试和日志）
 */

/**
 * 配置默认值
 */
const DEFAULT_CONFIG = {
  // Token 数量阈值（降低惩罚，对短中文更友好）
  tokenCountThresholds: {
    simple: 50,     // < 50 tokens → SIMPLE 倾向（降低阈值）
    complex: 300    // > 300 tokens → COMPLEX 倾向（降低阈值）
  },
  
  // 代码关键词
  codeKeywords: [
    '代码', 'code', '函数', 'function', 'class', '方法', 'method',
    'API', '接口', 'bug', '修复', '脚本', 'script', '编程',
    'python', 'javascript', 'java', 'sql', '实现', '算法',
    '模块', '组件', '服务', '后台', '服务器', '部署',
    '调试', 'debug', '编译', '运行', '执行', '重构', 'refactor',
    '重构', '优化', '重写', '迁移', '移植'
  ],
  
  // 推理关键词
  reasoningKeywords: [
    '分析', 'analyze', '推理', 'reasoning', '为什么', 'why',
    '比较', 'compare', '评估', 'evaluate', '思考', '论证',
    '证明', '解释', '原因', '逻辑', '推导', '结论',
    '判断', '决策', '方案', '建议', '利弊', '权衡',
    '可能性', '假设', '验证', '思路', '策略'
  ],
  
  // 技术术语（降低阈值，更容易触发）
  technicalKeywords: [
    '架构', 'architecture', '部署', 'deploy', '优化', 'optimize',
    '算法', 'algorithm', '系统', 'system', '性能', 'performance',
    '安全', 'security', '加密', 'encrypt', '分布式', 'distributed',
    '微服务', 'microservice', '容器', 'container', '数据库', 'database',
    '架构师', '技术选型', '方案', '设计模式', '重构'
  ],
  
  // 创意关键词
  creativeKeywords: [
    '写作', 'write', '故事', 'story', '创意', 'creative',
    '设计', 'design', '文章', 'article', '文案', 'copy',
    '小说', 'novel', '诗歌', 'poem', '剧本', 'script'
  ],
  
  // 简单任务指示词
  simpleKeywords: [
    '是什么', 'what is', '定义', 'definition', '怎么读', 'how to read',
    '翻译', 'translate', '意思是', 'meaning', '介绍', 'introduce'
  ],
  
  // 多步骤模式
  multiStepPatterns: [
    /首先.*然后/i, /第一步/i, /第二步/i, /step\s*\d/i,
    /\d+\.\s/, /先.*再/i, /首先.*最后/i
  ],
  
  // 命令动词
  imperativeVerbs: [
    '写', 'write', '生成', 'generate', '创建', 'create',
    '实现', 'implement', '帮我', 'help me', '请', 'please',
    '做', 'make', '构建', 'build', '设计', 'design'
  ],
  
  // 约束指示词
  constraintIndicators: [
    '必须', 'must', '不能', 'cannot', '只能', 'only',
    '需要', 'need', '要求', 'require', '限制', 'limit',
    '不要', '不要', '禁止', 'forbid'
  ],
  
  // 输出格式关键词
  outputFormatKeywords: [
    'JSON', 'json', '表格', 'table', '列表', 'list',
    'Markdown', 'markdown', '格式', 'format', '结构', 'structure',
    '模板', 'template'
  ],
  
  // 引用关键词
  referenceKeywords: [
    '引用', 'quote', '参考', 'reference', '来源', 'source',
    '文献', 'literature', '根据', 'according to', '链接', 'link'
  ],
  
  // 否定关键词
  negationKeywords: [
    '不要', 'do not', '不能', 'cannot', '不要', 'no',
    '避免', 'avoid', '排除', 'exclude', '不是', 'not'
  ],
  
  // 领域特定关键词（增强版）
  domainSpecificKeywords: [
    '金融', 'finance', '医疗', 'medical', '法律', 'legal',
    '科学', 'science', '工程', 'engineering', '教育', 'education',
    '商业', 'business', '投资', 'investment', '加密', 'crypto',
    '区块链', 'blockchain', 'AI', '机器学习', 'machine learning',
    'web3', 'Web3', 'DeFi', 'NFT', 'DAO', 'Token', '合约', 'defi'
  ],
  
  // Agentic 任务关键词
  agenticKeywords: [
    '工具', 'tool', '调用', 'call', '执行', 'execute',
    '文件', 'file', '读取', 'read', '写入', 'write',
    '系统', 'system', '命令', 'command', 'shell', 'bash',
    'API', '请求', 'request', 'fetch', 'http',
    '自动', 'auto', '批量', 'batch', '定时', 'cron',
    'agent', '智能体', '助手', 'assistant', 'workflow',
    '操作', 'operate', '处理', 'process', '解析', 'parse'
  ],
  
  // 维度权重（降低tokenCount权重，对短中文更公平）
  dimensionWeights: {
    tokenCount: 0.05,
    codePresence: 0.12,
    reasoningMarkers: 0.15,
    technicalTerms: 0.10,
    creativeMarkers: 0.06,
    simpleIndicators: 0.08,
    multiStepPatterns: 0.06,
    questionComplexity: 0.05,
    imperativeVerbs: 0.06,
    constraintCount: 0.07,
    outputFormat: 0.06,
    agenticTask: 0.11
  }
};

/**
 * Token 数量评分
 * @param {number} estimatedTokens - 估计的 token 数量
 * @param {object} thresholds - 阈值配置
 * @returns {DimensionScore}
 */
function scoreTokenCount(estimatedTokens, thresholds = DEFAULT_CONFIG.tokenCountThresholds) {
  if (estimatedTokens < thresholds.simple) {
    return { name: 'tokenCount', score: -1.0, signal: `short (${estimatedTokens} tokens)` };
  }
  if (estimatedTokens > thresholds.complex) {
    return { name: 'tokenCount', score: 1.0, signal: `long (${estimatedTokens} tokens)` };
  }
  return { name: 'tokenCount', score: 0, signal: null };
}

/**
 * 关键词匹配评分（通用）
 * @param {string} text - 输入文本
 * @param {string[]} keywords - 关键词列表
 * @param {string} name - 维度名称
 * @param {string} signalLabel - 信号标签
 * @param {object} thresholds - 阈值 { low, high }
 * @param {object} scores - 分数 { none, low, high }
 * @returns {DimensionScore}
 */
function scoreKeywordMatch(text, keywords, name, signalLabel, thresholds, scores) {
  const lowerText = text.toLowerCase();
  const matches = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
  
  if (matches.length >= thresholds.high) {
    return {
      name,
      score: scores.high,
      signal: `${signalLabel} (${matches.slice(0, 3).join(', ')})`
    };
  }
  if (matches.length >= thresholds.low) {
    return {
      name,
      score: scores.low,
      signal: `${signalLabel} (${matches.slice(0, 3).join(', ')})`
    };
  }
  return { name, score: scores.none, signal: null };
}

/**
 * 代码存在评分
 */
function scoreCodePresence(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.codeKeywords,
    'codePresence',
    'code',
    { low: 1, high: 2 },
    { none: 0, low: 0.5, high: 1.0 }
  );
}

/**
 * 推理标记评分
 */
function scoreReasoningMarkers(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.reasoningKeywords,
    'reasoningMarkers',
    'reasoning',
    { low: 1, high: 2 },
    { none: 0, low: 0.7, high: 1.0 }
  );
}

/**
 * 技术术语评分（降低阈值，更容易触发）
 */
function scoreTechnicalTerms(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.technicalKeywords,
    'technicalTerms',
    'technical',
    { low: 1, high: 3 },
    { none: 0, low: 0.5, high: 1.0 }
  );
}

/**
 * 创意标记评分
 */
function scoreCreativeMarkers(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.creativeKeywords,
    'creativeMarkers',
    'creative',
    { low: 1, high: 2 },
    { none: 0, low: 0.5, high: 0.7 }
  );
}

/**
 * 简单指示词评分（负分，表示简单任务）
 */
function scoreSimpleIndicators(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.simpleKeywords,
    'simpleIndicators',
    'simple',
    { low: 1, high: 2 },
    { none: 0, low: -1.0, high: -1.0 }
  );
}

/**
 * 多步骤模式评分
 */
function scoreMultiStepPatterns(text, config = DEFAULT_CONFIG) {
  const hits = config.multiStepPatterns.filter(p => p.test(text));
  if (hits.length > 0) {
    return { name: 'multiStepPatterns', score: 0.5, signal: 'multi-step' };
  }
  return { name: 'multiStepPatterns', score: 0, signal: null };
}

/**
 * 问题复杂度评分（基于问号数量）
 */
function scoreQuestionComplexity(text) {
  const count = (text.match(/\?|？/g) || []).length;
  if (count > 3) {
    return { name: 'questionComplexity', score: 0.5, signal: `${count} questions` };
  }
  return { name: 'questionComplexity', score: 0, signal: null };
}

/**
 * 命令动词评分
 */
function scoreImperativeVerbs(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.imperativeVerbs,
    'imperativeVerbs',
    'imperative',
    { low: 1, high: 2 },
    { none: 0, low: 0.3, high: 0.5 }
  );
}

/**
 * 约束条件评分
 */
function scoreConstraintCount(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.constraintIndicators,
    'constraintCount',
    'constraints',
    { low: 1, high: 3 },
    { none: 0, low: 0.3, high: 0.7 }
  );
}

/**
 * 输出格式评分
 */
function scoreOutputFormat(text, config = DEFAULT_CONFIG) {
  return scoreKeywordMatch(
    text,
    config.outputFormatKeywords,
    'outputFormat',
    'format',
    { low: 1, high: 2 },
    { none: 0, low: 0.4, high: 0.7 }
  );
}

/**
 * Agentic 任务评分（独立维度，额外返回 agenticScore）
 * @param {string} text - 输入文本
 * @param {object} config - 配置
 * @returns {{ dimensionScore: DimensionScore, agenticScore: number }}
 */
function scoreAgenticTask(text, config = DEFAULT_CONFIG) {
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  const signals = [];
  
  for (const keyword of config.agenticKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchCount++;
      if (signals.length < 3) {
        signals.push(keyword);
      }
    }
  }
  
  // 阈值评分
  if (matchCount >= 5) {
    return {
      dimensionScore: {
        name: 'agenticTask',
        score: 1.0,
        signal: `agentic-high (${signals.join(', ')})`
      },
      agenticScore: 1.0
    };
  }
  if (matchCount >= 3) {
    return {
      dimensionScore: {
        name: 'agenticTask',
        score: 0.7,
        signal: `agentic-mid (${signals.join(', ')})`
      },
      agenticScore: 0.7
    };
  }
  if (matchCount >= 1) {
    return {
      dimensionScore: {
        name: 'agenticTask',
        score: 0.3,
        signal: `agentic-low (${signals.join(', ')})`
      },
      agenticScore: 0.3
    };
  }
  
  return {
    dimensionScore: { name: 'agenticTask', score: 0, signal: null },
    agenticScore: 0
  };
}

/**
 * 计算所有维度评分
 * @param {string} text - 用户输入文本
 * @param {number} estimatedTokens - 估计的 token 总数（包含 system prompt）
 * @param {object} config - 配置对象
 * @returns {{ dimensions: DimensionScore[], agenticScore: number }}
 */
function scoreAllDimensions(text, estimatedTokens, config = DEFAULT_CONFIG) {
  const dimensions = [
    // Token 数量使用总量
    scoreTokenCount(estimatedTokens, config.tokenCountThresholds),
    
    // 其他维度只对用户输入评分
    scoreCodePresence(text, config),
    scoreReasoningMarkers(text, config),
    scoreTechnicalTerms(text, config),
    scoreCreativeMarkers(text, config),
    scoreSimpleIndicators(text, config),
    scoreMultiStepPatterns(text, config),
    scoreQuestionComplexity(text),
    scoreImperativeVerbs(text, config),
    scoreConstraintCount(text, config),
    scoreOutputFormat(text, config)
  ];
  
  // Agentic 任务（独立维度）
  const agenticResult = scoreAgenticTask(text, config);
  dimensions.push(agenticResult.dimensionScore);
  
  return {
    dimensions,
    agenticScore: agenticResult.agenticScore
  };
}

/**
 * 计算加权总分
 * @param {DimensionScore[]} dimensions - 各维度评分
 * @param {object} weights - 权重配置
 * @returns {number} - 加权总分
 */
function calculateWeightedScore(dimensions, weights = DEFAULT_CONFIG.dimensionWeights) {
  let weightedScore = 0;
  
  for (const d of dimensions) {
    const w = weights[d.name] ?? 0;
    weightedScore += d.score * w;
  }
  
  return weightedScore;
}

/**
 * 收集非空信号
 * @param {DimensionScore[]} dimensions - 各维度评分
 * @returns {string[]}
 */
function collectSignals(dimensions) {
  return dimensions
    .filter(d => d.signal !== null)
    .map(d => d.signal);
}

module.exports = {
  DEFAULT_CONFIG,
  scoreTokenCount,
  scoreKeywordMatch,
  scoreCodePresence,
  scoreReasoningMarkers,
  scoreTechnicalTerms,
  scoreCreativeMarkers,
  scoreSimpleIndicators,
  scoreMultiStepPatterns,
  scoreQuestionComplexity,
  scoreImperativeVerbs,
  scoreConstraintCount,
  scoreOutputFormat,
  scoreAgenticTask,
  scoreAllDimensions,
  calculateWeightedScore,
  collectSignals
};