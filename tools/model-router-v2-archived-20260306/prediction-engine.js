/**
 * 预测决策引擎 v2.1 - 增强版
 * 
 * 新增功能：
 * 1. 智能粘性延长
 * 2. 路由历史追踪
 * 3. 更精确的上下文预测
 */

const modelSync = require('./model-sync');
const sessionStore = require('./session-store');

// 任务关键词配置（增强版）
const TASK_KEYWORDS = {
  code: [
    '代码', 'code', '编程', 'programming', '写代码', 'function', 'class', 'SQL', 'JSON', '脚本', 
    '写一个', '函数', '方法', '程序', 'Python', 'Java', 'JavaScript', 'TypeScript', '算法', 
    '实现', 'bug', 'fix', '修复', '优化', '重构', 'API', '接口', '调试', 'debug'
  ],
  analysis: [
    '分析', 'analyze', '推理', 'reasoning', '为什么', 'why', '如何', 'how', '比较', 'compare', 
    '优缺点', '评估', '报告', '总结', '归纳', '建议', '方案', '策略', '风险'
  ],
  translation: [
    '翻译', 'translate', '译为', 'convert to', '英文', '中文', '日语', '韩语', '英语', '中文翻译'
  ],
  summarization: [
    '总结', 'summarize', '摘要', '概括', '归纳', '提炼', '要点', '核心', '主要内容'
  ],
  quick: [
    '快速', 'quick', '简单', 'simple', '确认', 'confirm', '是吗', 'ok', '对吗', '好的', '是的', '收到'
  ],
  email: [
    '邮件', 'email', '审批', 'approval', '回复', 'reply', '发送', 'send'
  ],
  document: [
    '文档', 'document', '报告', 'report', '文章', 'article', '长文', '全文'
  ]
};

// 模型能力映射（动态生成）
let MODEL_STRENGTHS = {};

/**
 * 初始化模型能力映射
 */
function initModelStrengths() {
  const models = modelSync.loadModelsFromConfig();
  MODEL_STRENGTHS = {};
  
  for (const [alias, model] of Object.entries(models)) {
    const strengths = [];
    const modelId = (model.id || '').toLowerCase();
    const modelName = (model.name || '').toLowerCase();
    
    if (modelId.includes('glm')) {
      strengths.push('code', 'chinese', 'structured_output', 'quick_response');
    }
    if (modelId.includes('kimi') || modelName.includes('kimi')) {
      strengths.push('chinese', 'long_context', 'summarization', 'document');
    }
    if (modelId.includes('gemini') && modelId.includes('pro')) {
      strengths.push('multimodal', 'complex_reasoning', 'translation', 'english', 'analysis');
    }
    if (modelId.includes('gemini') && modelId.includes('flash')) {
      strengths.push('speed', 'cost_effective', 'quick', 'simple_tasks');
    }
    
    MODEL_STRENGTHS[model.id] = strengths.length > 0 ? strengths : ['general'];
  }
  
  return MODEL_STRENGTHS;
}

initModelStrengths();

/**
 * 特征提取器
 */
function extractFeatures(text, input = {}) {
  return {
    primary_language: detectLanguage(text),
    task_type: detectTaskType(text),
    text_length: assessTextLength(text),
    complexity: assessComplexity(text),
    has_multimodal: !!(input.images && input.images.length > 0),
    keywords_matched: extractKeywords(text)
  };
}

function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = text.length || 1;
  
  const chineseRatio = chineseChars / total;
  const englishRatio = englishChars / total;
  
  if (chineseRatio > 0.2) {
    return chineseRatio > englishRatio ? 'chinese' : 'mixed';
  } else if (englishRatio > 0.2) {
    return 'english';
  }
  return 'mixed';
}

function detectTaskType(text) {
  const lowerText = text.toLowerCase();
  const matchCounts = {};
  
  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    matchCounts[type] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchCounts[type]++;
      }
    }
  }
  
  // 返回匹配最多的类型
  const sorted = Object.entries(matchCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  return sorted[0] ? sorted[0][0] : 'general';
}

function assessTextLength(text) {
  const length = text.length;
  if (length < 200) return 'short';
  if (length < 500) return 'medium';
  return 'long';
}

function assessComplexity(text) {
  const sentences = text.split(/[。.!?\n]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = text.length / Math.max(sentences.length, 1);
  const wordCount = (text.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g) || []).length;
  
  // 综合评估
  let score = 0;
  if (sentences.length > 5) score += 0.2;
  if (avgSentenceLength > 40) score += 0.3;
  if (wordCount > 100) score += 0.2;
  if (text.includes('分析') || text.includes('比较') || text.includes('评估')) score += 0.3;
  
  if (score > 0.5) return 'high';
  if (score > 0.2) return 'medium';
  return 'low';
}

function extractKeywords(text) {
  const keywords = [];
  const lowerText = text.toLowerCase();
  
  for (const [type, words] of Object.entries(TASK_KEYWORDS)) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        keywords.push(word);
      }
    }
  }
  
  return [...new Set(keywords)].slice(0, 5);
}

/**
 * 预测引擎 - 增强版
 */
function predictNextTask(sessionId) {
  const session = sessionStore.getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  // 1. 粘性优先
  if (cv.sticky_remaining > 0 && cv.sticky_model) {
    return {
      task_type: cv.primary_topic,
      confidence: 0.95,
      recommended_model: cv.sticky_model,
      reason: 'sticky_active',
      sticky_remaining: cv.sticky_remaining
    };
  }
  
  // 2. 基于话题连续性预测
  const recentTopics = cv.recent_topics || [];
  if (recentTopics.length >= 2) {
    const lastTwo = recentTopics.slice(-2);
    if (lastTwo[0] === lastTwo[1]) {
      const predictedType = lastTwo[1];
      const recommendedModel = getBestModelForTask(predictedType, cv.language_pref);
      
      // 计算置信度（连续轮数越多，置信度越高）
      let consecutiveCount = 1;
      for (let i = recentTopics.length - 2; i >= 0; i--) {
        if (recentTopics[i] === predictedType) {
          consecutiveCount++;
        } else {
          break;
        }
      }
      
      const confidence = Math.min(0.6 + consecutiveCount * 0.1, 0.95);
      
      return {
        task_type: predictedType,
        confidence: confidence,
        recommended_model: recommendedModel,
        reason: 'topic_continuity',
        consecutive_count: consecutiveCount
      };
    }
  }
  
  // 3. 基于复杂度预测
  if (cv.avg_complexity > 0.7) {
    return {
      task_type: 'analysis',
      confidence: 0.65,
      recommended_model: getBestModelForTask('analysis', cv.language_pref),
      reason: 'high_complexity_trend'
    };
  }
  
  // 4. 基于历史切换成功率调整
  const successRate = sessionStore.getSwitchSuccessRate(sessionId);
  if (successRate < 0.5 && cv.turn_count > 5) {
    // 历史预测不准确，降低预测频率
    return {
      task_type: null,
      confidence: 0,
      recommended_model: null,
      reason: 'low_historical_accuracy'
    };
  }
  
  // 5. 默认：不预测
  return {
    task_type: null,
    confidence: 0,
    recommended_model: null,
    reason: 'insufficient_context'
  };
}

/**
 * 为任务类型选择最佳模型
 */
function getBestModelForTask(taskType, languagePref = 'mixed') {
  const taskRequirements = {
    'code': ['code', 'structured_output', 'quick_response'],
    'analysis': ['complex_reasoning', 'analysis'],
    'translation': ['translation', 'english'],
    'summarization': ['long_context', 'summarization'],
    'quick': ['speed', 'cost_effective', 'quick'],
    'email': ['chinese', 'structured_output'],
    'document': ['long_context', 'document', 'chinese'],
    'general': []
  };
  
  const requirements = [...(taskRequirements[taskType] || [])];
  
  if (languagePref === 'chinese') {
    requirements.push('chinese');
  } else if (languagePref === 'english') {
    requirements.push('english');
  }
  
  const modelScores = {};
  for (const [modelId, strengths] of Object.entries(MODEL_STRENGTHS)) {
    let score = 0;
    for (const req of requirements) {
      if (strengths.includes(req)) {
        score += 1;
      }
    }
    // 通用性加分
    if (strengths.includes('general')) {
      score += 0.5;
    }
    modelScores[modelId] = score;
  }
  
  const sortedModels = Object.entries(modelScores)
    .sort((a, b) => b[1] - a[1]);
  
  return sortedModels[0] ? sortedModels[0][0] : Object.keys(MODEL_STRENGTHS)[0];
}

/**
 * 核心决策函数 - 增强版
 */
function decide(sessionId, text, currentModel, userOverride = null) {
  // 1. 用户显式指定
  if (userOverride) {
    const models = modelSync.loadModelsFromConfig();
    const validatedModel = modelSync.validateModelId(models, userOverride);
    
    if (validatedModel) {
      // 用户指定：设置强粘性
      sessionStore.setSmartSticky(sessionId, validatedModel, 'general', 'user_explicit');
      
      return {
        action: 'switch',
        current_model: currentModel,
        target_model: validatedModel,
        confidence: 1.0,
        reason: 'user_explicit',
        should_pre_switch: true,
        sticky_duration: 10,
        features: { task_type: 'general' }
      };
    }
  }
  
  // 2. 提取特征
  const features = extractFeatures(text);
  
  // 3. 获取会话状态
  const session = sessionStore.getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  // 4. 检查粘性
  const stickyStatus = sessionStore.getStickyStatus(sessionId);
  if (stickyStatus.active) {
    // 递减粘性计数
    sessionStore.decrementSticky(sessionId);
    
    return {
      action: 'stay',
      current_model: currentModel,
      target_model: stickyStatus.model || currentModel,
      confidence: 0.95,
      reason: 'sticky_active',
      sticky_remaining: stickyStatus.remaining - 1,
      sticky_reason: stickyStatus.reason,
      features: features
    };
  }
  
  // 5. 更新对话向量
  sessionStore.updateConversationVector(sessionId, features);
  
  // 6. 重新获取更新后的状态
  const updatedSession = sessionStore.getOrCreateSession(sessionId);
  const updatedCv = updatedSession.conversation_vector;
  
  // 7. 选择最佳模型
  const bestModel = getBestModelForTask(features.task_type, features.primary_language);
  
  // 8. 计算切换收益
  const switchBenefit = calculateSwitchBenefit(currentModel, bestModel, features, updatedCv);
  
  // 9. 更新预测
  const prediction = predictNextTask(sessionId);
  sessionStore.updatePrediction(sessionId, prediction);
  
  // 10. 返回决策
  const needsSwitch = !isSameModel(currentModel, bestModel);
  
  if (needsSwitch && switchBenefit.should_switch) {
    // 设置智能粘性
    const stickyInfo = sessionStore.setSmartSticky(
      sessionId, 
      bestModel, 
      features.task_type, 
      switchBenefit.reason
    );
    
    const decision = {
      action: 'switch',
      current_model: currentModel,
      target_model: bestModel,
      confidence: switchBenefit.confidence,
      reason: switchBenefit.reason,
      should_pre_switch: true,
      sticky_duration: stickyInfo.duration,
      prediction: prediction,
      features: features
    };
    
    // 记录路由历史
    sessionStore.recordRoutingDecision(sessionId, decision);
    
    return decision;
  } else {
    return {
      action: 'stay',
      current_model: currentModel,
      target_model: currentModel,
      confidence: 0.7,
      reason: 'no_benefit',
      prediction: prediction,
      features: features
    };
  }
}

/**
 * 比较两个模型ID是否相同
 */
function isSameModel(modelA, modelB) {
  if (!modelA || !modelB) return false;
  const normalize = (id) => id.replace(/[-_/]/g, '').toLowerCase();
  const a = normalize(modelA);
  const b = normalize(modelB);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * 计算切换收益
 */
function calculateSwitchBenefit(currentModel, targetModel, features, cv) {
  // 相同模型
  if (isSameModel(currentModel, targetModel)) {
    return { should_switch: false, confidence: 0, reason: 'same_model' };
  }
  
  // 简单任务不切换
  if (features.complexity === 'low' && features.text_length === 'short') {
    return { should_switch: false, confidence: 0.5, reason: 'simple_task' };
  }
  
  // 高复杂度
  if (features.complexity === 'high') {
    return { 
      should_switch: true, 
      confidence: 0.85, 
      reason: 'high_complexity',
      sticky_duration: 3
    };
  }
  
  // 代码任务
  if (features.task_type === 'code' && targetModel.includes('glm')) {
    return { 
      should_switch: true, 
      confidence: 0.9, 
      reason: 'code_task',
      sticky_duration: 5
    };
  }
  
  // 文档任务
  if ((features.task_type === 'document' || features.task_type === 'summarization') && 
      targetModel.includes('kimi')) {
    return { 
      should_switch: true, 
      confidence: 0.85, 
      reason: 'document_task',
      sticky_duration: 4
    };
  }
  
  // 长文本
  if (features.text_length === 'long') {
    return { 
      should_switch: true, 
      confidence: 0.8, 
      reason: 'long_text',
      sticky_duration: 3
    };
  }
  
  // 分析任务
  if (features.task_type === 'analysis') {
    return { 
      should_switch: true, 
      confidence: 0.75, 
      reason: 'analysis_task',
      sticky_duration: 3
    };
  }
  
  // 多轮对话 + 话题一致
  if (cv.turn_count >= 3) {
    const recentTopics = cv.recent_topics || [];
    const lastTwo = recentTopics.slice(-2);
    if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
      return { 
        should_switch: true, 
        confidence: 0.7, 
        reason: 'topic_consistency',
        sticky_duration: 3
      };
    }
  }
  
  // 默认
  return { 
    should_switch: true, 
    confidence: 0.6, 
    reason: 'default_optimization',
    sticky_duration: 2
  };
}

/**
 * 本轮结束时的预切换决策
 */
function endOfTurnDecision(sessionId) {
  const session = sessionStore.getOrCreateSession(sessionId);
  const prediction = session.prediction;
  
  if (prediction && prediction.confidence > 0.7 && prediction.recommended_model) {
    const currentModel = session.current_model;
    const targetModel = prediction.recommended_model;
    
    if (!isSameModel(currentModel, targetModel)) {
      return {
        should_pre_switch: true,
        target_model: targetModel,
        reason: prediction.reason,
        confidence: prediction.confidence
      };
    }
  }
  
  return {
    should_pre_switch: false,
    target_model: null,
    reason: 'no_prediction_or_low_confidence'
  };
}

/**
 * 标记预测成功/失败（用于后续优化）
 */
function markPredictionResult(sessionId, wasCorrect) {
  sessionStore.updateModelStats(sessionId, null, wasCorrect);
}

// 导出
module.exports = {
  extractFeatures,
  predictNextTask,
  getBestModelForTask,
  decide,
  endOfTurnDecision,
  markPredictionResult,
  calculateSwitchBenefit,
  detectLanguage,
  detectTaskType,
  assessTextLength,
  assessComplexity,
  isSameModel,
  MODEL_STRENGTHS,
  TASK_KEYWORDS
};
