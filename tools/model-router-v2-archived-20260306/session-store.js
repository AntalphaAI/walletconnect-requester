/**
 * 会话状态存储器 v2.1 - 增强版
 * 
 * 新增功能：
 * 1. 路由历史追踪
 * 2. 模型使用效率统计
 * 3. 智能粘性延长
 */

const fs = require('fs');
const path = require('path');

// 状态存储路径
const STORE_DIR = path.join(process.env.HOME, '.openclaw', 'workspace', 'tools', 'model-router-v2', 'store');
const SESSION_FILE = path.join(STORE_DIR, 'sessions.json');

// 确保存储目录存在
if (!fs.existsSync(STORE_DIR)) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
}

/**
 * 会话状态结构（增强版）
 */
const DEFAULT_SESSION_STATE = {
  session_id: null,
  current_model: null,
  
  // 对话向量（核心状态）
  conversation_vector: {
    primary_topic: 'general',
    language_pref: 'mixed',
    avg_complexity: 0.5,
    turn_count: 0,
    recent_topics: [],           // 最近N轮的话题队列
    recent_models: [],           // 最近N轮使用的模型
    sticky_model: null,
    sticky_remaining: 0,
    sticky_reason: null          // 粘性原因记录
  },
  
  // 新增：路由历史（用于分析决策有效性）
  routing_history: [],           // 最近的路由决策记录
  
  // 新增：模型使用统计
  model_stats: {
    total_switches: 0,           // 总切换次数
    successful_switches: 0,      // 成功切换次数（预测准确）
    model_usage: {}              // 各模型使用时长/次数
  },
  
  // 预测状态
  prediction: {
    next_task_type: null,
    confidence: 0,
    recommended_model: null
  },
  
  last_updated: null
};

// 粘性策略配置
const STICKY_STRATEGIES = {
  code: {
    base_duration: 5,            // 基础粘性轮数
    extend_threshold: 3,         // 延长阈值（连续N轮同类型）
    max_duration: 10             // 最大粘性轮数
  },
  analysis: {
    base_duration: 4,
    extend_threshold: 3,
    max_duration: 8
  },
  summarization: {
    base_duration: 3,
    extend_threshold: 2,
    max_duration: 6
  },
  translation: {
    base_duration: 2,
    extend_threshold: 2,
    max_duration: 4
  },
  general: {
    base_duration: 2,
    extend_threshold: 3,
    max_duration: 5
  }
};

/**
 * 加载所有会话状态
 */
function loadAllSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const content = fs.readFileSync(SESSION_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`[SessionStore] 加载失败: ${error.message}`);
  }
  return {};
}

/**
 * 保存所有会话状态
 */
function saveAllSessions(sessions) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (error) {
    console.error(`[SessionStore] 保存失败: ${error.message}`);
  }
}

/**
 * 获取或创建会话状态
 */
function getOrCreateSession(sessionId, currentModel = null) {
  const sessions = loadAllSessions();
  
  if (!sessions[sessionId]) {
    sessions[sessionId] = JSON.parse(JSON.stringify(DEFAULT_SESSION_STATE));
    sessions[sessionId].session_id = sessionId;
    sessions[sessionId].current_model = currentModel;
    sessions[sessionId].last_updated = new Date().toISOString();
    saveAllSessions(sessions);
  }
  
  // 确保所有字段存在（向后兼容）
  const session = sessions[sessionId];
  session.conversation_vector = {
    ...DEFAULT_SESSION_STATE.conversation_vector,
    ...session.conversation_vector
  };
  session.routing_history = session.routing_history || [];
  session.model_stats = {
    ...DEFAULT_SESSION_STATE.model_stats,
    ...session.model_stats
  };
  
  return session;
}

/**
 * 更新会话状态
 */
function updateSession(sessionId, updates) {
  const sessions = loadAllSessions();
  
  if (!sessions[sessionId]) {
    sessions[sessionId] = JSON.parse(JSON.stringify(DEFAULT_SESSION_STATE));
    sessions[sessionId].session_id = sessionId;
  }
  
  // 深度合并
  sessions[sessionId] = deepMerge(sessions[sessionId], updates);
  sessions[sessionId].last_updated = new Date().toISOString();
  
  saveAllSessions(sessions);
  return sessions[sessionId];
}

/**
 * 更新对话向量
 */
function updateConversationVector(sessionId, features) {
  const session = getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  // 确保 recent_topics 是数组
  const existingTopics = Array.isArray(cv.recent_topics) ? cv.recent_topics : [];
  const recentTopics = [...existingTopics.slice(-4), features.task_type];
  
  // 计算主要话题（加权投票，近期权重更高）
  const topicWeights = {};
  recentTopics.forEach((t, idx) => {
    const weight = 1 + idx * 0.2;
    topicWeights[t] = (topicWeights[t] || 0) + weight;
  });
  const primaryTopic = Object.entries(topicWeights)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // 更新语言偏好
  const prevLang = cv.language_pref;
  const newLang = features.primary_language;
  const languagePref = newLang === prevLang ? newLang : 
    (prevLang === 'mixed' ? newLang : 'mixed');
  
  // 更新平均复杂度
  const alpha = 0.3;
  const complexityScore = features.complexity === 'high' ? 0.85 : 
                          features.complexity === 'medium' ? 0.5 : 0.2;
  const avgComplexity = cv.avg_complexity * (1 - alpha) + complexityScore * alpha;
  
  // 更新轮次和最近模型
  const turnCount = cv.turn_count + 1;
  
  // 确保 recent_models 是数组
  const existingModels = Array.isArray(cv.recent_models) ? cv.recent_models : [];
  const currentModel = session.current_model;
  const recentModels = currentModel ? [...existingModels.slice(-4), currentModel] : existingModels;
  
  updateSession(sessionId, {
    conversation_vector: {
      primary_topic: primaryTopic,
      language_pref: languagePref,
      avg_complexity: avgComplexity,
      turn_count: turnCount,
      recent_topics: recentTopics,
      recent_models: recentModels,
      sticky_model: cv.sticky_model,
      sticky_remaining: cv.sticky_remaining,
      sticky_reason: cv.sticky_reason
    }
  });
}

/**
 * 设置智能粘性
 */
function setSmartSticky(sessionId, model, taskType, reason = 'auto') {
  const session = getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  // 确保 recent_topics 是数组
  const recentTopics = Array.isArray(cv.recent_topics) ? cv.recent_topics : [];
  
  // 获取粘性策略
  const strategy = STICKY_STRATEGIES[taskType] || STICKY_STRATEGIES.general;
  
  // 检查是否需要延长粘性
  let duration = strategy.base_duration;
  
  // 连续同类型任务计数
  let consecutiveCount = 0;
  for (let i = recentTopics.length - 1; i >= 0; i--) {
    if (recentTopics[i] === taskType) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  
  // 延长粘性
  if (consecutiveCount >= strategy.extend_threshold) {
    duration = Math.min(duration + 2, strategy.max_duration);
    reason = 'extended_' + reason;
  }
  
  updateSession(sessionId, {
    conversation_vector: {
      sticky_model: model,
      sticky_remaining: duration,
      sticky_reason: reason
    }
  });
  
  console.log(`[SessionStore] 设置粘性: ${model}, 持续 ${duration} 轮, 原因: ${reason}`);
  
  return { model, duration, reason };
}

/**
 * 兼容旧API：设置模型粘性
 */
function setStickyModel(sessionId, model, duration = 3) {
  updateSession(sessionId, {
    conversation_vector: {
      sticky_model: model,
      sticky_remaining: duration,
      sticky_reason: 'legacy_api'
    }
  });
}

/**
 * 递减粘性计数
 */
function decrementSticky(sessionId) {
  const session = getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  if (cv.sticky_remaining > 0) {
    updateSession(sessionId, {
      conversation_vector: {
        sticky_remaining: cv.sticky_remaining - 1
      }
    });
  }
}

/**
 * 检查是否处于粘性状态
 */
function isStickyActive(sessionId) {
  const session = getOrCreateSession(sessionId);
  return session.conversation_vector.sticky_remaining > 0;
}

/**
 * 获取粘性状态
 */
function getStickyStatus(sessionId) {
  const session = getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  return {
    active: cv.sticky_remaining > 0,
    model: cv.sticky_model,
    remaining: cv.sticky_remaining,
    reason: cv.sticky_reason
  };
}

/**
 * 清除粘性
 */
function clearSticky(sessionId) {
  updateSession(sessionId, {
    conversation_vector: {
      sticky_model: null,
      sticky_remaining: 0,
      sticky_reason: null
    }
  });
}

/**
 * 记录路由决策历史
 */
function recordRoutingDecision(sessionId, decision) {
  const session = getOrCreateSession(sessionId);
  
  // 保留最近20条记录
  const history = [...(session.routing_history || []), {
    timestamp: new Date().toISOString(),
    action: decision.action,
    from_model: decision.current_model,
    to_model: decision.target_model,
    reason: decision.reason,
    confidence: decision.confidence,
    task_type: decision.features?.task_type
  }].slice(-20);
  
  updateSession(sessionId, {
    routing_history: history
  });
}

/**
 * 更新模型使用统计
 */
function updateModelStats(sessionId, modelId, switchSuccess = null) {
  const session = getOrCreateSession(sessionId);
  const stats = session.model_stats || DEFAULT_SESSION_STATE.model_stats;
  
  // 更新使用次数
  stats.model_usage[modelId] = (stats.model_usage[modelId] || 0) + 1;
  
  // 更新切换统计
  if (switchSuccess !== null) {
    stats.total_switches++;
    if (switchSuccess) {
      stats.successful_switches++;
    }
  }
  
  updateSession(sessionId, {
    model_stats: stats
  });
}

/**
 * 获取模型切换成功率
 */
function getSwitchSuccessRate(sessionId) {
  const session = getOrCreateSession(sessionId);
  const stats = session.model_stats;
  
  if (stats.total_switches === 0) return 0;
  return stats.successful_switches / stats.total_switches;
}

/**
 * 更新当前模型
 */
function updateCurrentModel(sessionId, modelId) {
  updateSession(sessionId, {
    current_model: modelId
  });
}

/**
 * 更新预测
 */
function updatePrediction(sessionId, prediction) {
  updateSession(sessionId, {
    prediction: prediction
  });
}

/**
 * 深度合并对象
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * 清理过期会话
 */
function cleanupExpiredSessions(maxAgeHours = 24) {
  const sessions = loadAllSessions();
  const now = Date.now();
  const expiredThreshold = maxAgeHours * 60 * 60 * 1000;
  
  let cleaned = 0;
  for (const [id, session] of Object.entries(sessions)) {
    if (session.last_updated) {
      const lastUpdated = new Date(session.last_updated).getTime();
      if (now - lastUpdated > expiredThreshold) {
        delete sessions[id];
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    saveAllSessions(sessions);
    console.log(`[SessionStore] 清理了 ${cleaned} 个过期会话`);
  }
  
  return cleaned;
}

/**
 * 获取会话摘要（用于调试）
 */
function getSessionDigest(sessionId) {
  const session = getOrCreateSession(sessionId);
  const cv = session.conversation_vector;
  
  return {
    session_id: session.session_id,
    current_model: session.current_model,
    turn_count: cv.turn_count,
    primary_topic: cv.primary_topic,
    avg_complexity: cv.avg_complexity.toFixed(2),
    sticky: {
      active: cv.sticky_remaining > 0,
      model: cv.sticky_model,
      remaining: cv.sticky_remaining,
      reason: cv.sticky_reason
    },
    recent_topics: cv.recent_topics.slice(-5),
    switch_success_rate: (getSwitchSuccessRate(sessionId) * 100).toFixed(1) + '%',
    prediction: session.prediction
  };
}

// 导出
module.exports = {
  // 基础操作
  getOrCreateSession,
  updateSession,
  loadAllSessions,
  saveAllSessions,
  
  // 对话向量
  updateConversationVector,
  
  // 粘性管理
  setSmartSticky,
  setStickyModel,           // 兼容旧API
  decrementSticky,
  isStickyActive,
  getStickyStatus,
  clearSticky,
  
  // 路由历史
  recordRoutingDecision,
  
  // 统计
  updateModelStats,
  getSwitchSuccessRate,
  
  // 其他
  updateCurrentModel,
  updatePrediction,
  cleanupExpiredSessions,
  getSessionDigest,
  
  // 常量
  DEFAULT_SESSION_STATE,
  STICKY_STRATEGIES,
  STORE_DIR,
  SESSION_FILE
};
