#!/usr/bin/env node

/**
 * 智能模型路由器 v2.0 - 预测式预切换架构
 * 
 * 核心创新：
 * 1. 在上一轮结束时预测下一轮任务类型
 * 2. 提前执行模型切换，实现"无感路由"
 * 3. 基于对话连续性的粘性机制
 * 
 * 与 v1 的区别：
 * - v1: 每轮开始分析 → 切换（慢一拍）
 * - v2: 上一轮结束预测 → 预切换（零延迟）
 */

const modelSync = require('./model-sync');
const sessionStore = require('./session-store');
const predictionEngine = require('./prediction-engine');

// 版本信息
const VERSION = '2.1.0';

/**
 * 主路由函数 - 在收到用户请求时调用
 * 
 * @param {Object} options - 路由选项
 * @param {string} options.session_id - 会话ID
 * @param {string} options.text - 用户输入文本
 * @param {string} options.current_model - 当前模型ID
 * @param {string} options.user_override - 用户显式指定的模型（可选）
 * @returns {Object} - 路由决策结果
 */
function route(options) {
  const { session_id, text, current_model, user_override } = options;
  
  // 验证参数
  if (!session_id || !text) {
    return {
      error: 'Missing required parameters: session_id or text',
      action: 'error'
    };
  }
  
  // 从配置同步模型
  const models = modelSync.loadModelsFromConfig();
  
  // 执行决策
  const decision = predictionEngine.decide(session_id, text, current_model, user_override);
  
  // 如果需要切换，设置粘性
  if (decision.action === 'switch' && decision.sticky_duration) {
    sessionStore.setStickyModel(session_id, decision.target_model, decision.sticky_duration);
  }
  
  // 添加模型信息
  decision.models_available = Object.keys(models);
  decision.timestamp = new Date().toISOString();
  
  return decision;
}

/**
 * 本轮结束时调用 - 执行预切换决策
 * 
 * 这是预测式路由的核心：
 * 在当前回复完成后，为下一轮做好准备
 * 
 * @param {string} sessionId - 会话ID
 * @returns {Object} - 预切换决策
 */
function endOfTurn(sessionId) {
  // 更新当前模型（如果刚刚切换过）
  const session = sessionStore.getOrCreateSession(sessionId);
  
  // 执行预切换决策
  const preSwitchDecision = predictionEngine.endOfTurnDecision(sessionId);
  
  if (preSwitchDecision.should_pre_switch) {
    // 更新会话中的当前模型
    sessionStore.updateCurrentModel(sessionId, preSwitchDecision.target_model);
    
    console.log(`[RouterV2] 预切换: ${session.current_model} → ${preSwitchDecision.target_model}`);
  }
  
  return preSwitchDecision;
}

/**
 * 手动切换模型
 * 
 * @param {string} sessionId - 会话ID
 * @param {string} targetModel - 目标模型
 * @param {number} stickyDuration - 粘性持续轮数
 */
function manualSwitch(sessionId, targetModel, stickyDuration = 5) {
  const models = modelSync.loadModelsFromConfig();
  const validatedModel = modelSync.validateModelId(models, targetModel);
  
  if (!validatedModel) {
    return {
      success: false,
      error: `Invalid model: ${targetModel}`,
      available_models: Object.keys(models)
    };
  }
  
  sessionStore.updateCurrentModel(sessionId, validatedModel);
  sessionStore.setStickyModel(sessionId, validatedModel, stickyDuration);
  
  return {
    success: true,
    current_model: validatedModel,
    sticky_duration: stickyDuration
  };
}

/**
 * 获取会话状态摘要
 */
function getSessionSummary(sessionId) {
  const session = sessionStore.getOrCreateSession(sessionId);
  
  return {
    session_id: session.session_id,
    current_model: session.current_model,
    turn_count: session.conversation_vector.turn_count,
    primary_topic: session.conversation_vector.primary_topic,
    language_pref: session.conversation_vector.language_pref,
    avg_complexity: session.conversation_vector.avg_complexity.toFixed(2),
    sticky_remaining: session.conversation_vector.sticky_remaining,
    prediction: session.prediction
  };
}

/**
 * 列出所有可用模型
 */
function listModels() {
  const models = modelSync.loadModelsFromConfig();
  
  return Object.entries(models).map(([alias, model]) => ({
    alias: alias,
    id: model.id,
    name: model.name,
    provider: model.provider,
    strengths: model.strengths || []
  }));
}

// CLI 接口
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
智能模型路由器 v${VERSION}

用法:
  node router-v2.js route <session_id> <text> [current_model]
  node router-v2.js end-of-turn <session_id>
  node router-v2.js models
  node router-v2.js summary <session_id>
  node router-v2.js switch <session_id> <target_model>

示例:
  node router-v2.js route "agent:main" "帮我写一段Python代码" "zai/glm-5"
  node router-v2.js end-of-turn "agent:main"
  node router-v2.js models
`);
    process.exit(0);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'route': {
      if (args.length < 3) {
        console.error('Usage: route <session_id> <text> [current_model]');
        process.exit(1);
      }
      const result = route({
        session_id: args[1],
        text: args[2],
        current_model: args[3] || 'zai/glm-5'
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    
    case 'end-of-turn': {
      if (args.length < 2) {
        console.error('Usage: end-of-turn <session_id>');
        process.exit(1);
      }
      const result = endOfTurn(args[1]);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    
    case 'models': {
      const models = listModels();
      console.log(JSON.stringify(models, null, 2));
      break;
    }
    
    case 'summary': {
      if (args.length < 2) {
        console.error('Usage: summary <session_id>');
        process.exit(1);
      }
      const summary = getSessionSummary(args[1]);
      console.log(JSON.stringify(summary, null, 2));
      break;
    }
    
    case 'switch': {
      if (args.length < 3) {
        console.error('Usage: switch <session_id> <target_model>');
        process.exit(1);
      }
      const result = manualSwitch(args[1], args[2]);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// 导出
module.exports = {
  route,
  endOfTurn,
  manualSwitch,
  getSessionSummary,
  listModels,
  VERSION
};
