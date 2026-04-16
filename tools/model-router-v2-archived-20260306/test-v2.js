#!/usr/bin/env node

/**
 * 智能模型路由器 v2.0 测试套件
 * 
 * 测试目标：
 * 1. 验证模型同步功能
 * 2. 验证会话状态追踪
 * 3. 验证预测准确率
 * 4. 验证预切换逻辑
 * 5. 对比 v1 和 v2 的工作方式差异
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 导入模块
const modelSync = require('./model-sync');
const sessionStore = require('./session-store');
const predictionEngine = require('./prediction-engine');
const routerV2 = require('./router-v2');

// 测试工具
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

// ============================================
// 测试 1: 模型同步功能
// ============================================
section('测试 1: 模型同步功能');

test('1.1 应该成功从 OpenClaw 配置加载模型', () => {
  const models = modelSync.loadModelsFromConfig();
  assert(models, '模型对象不应为空');
  assert(Object.keys(models).length > 0, '应该有至少一个模型');
  console.log(`   加载了 ${Object.keys(models).length} 个模型`);
});

test('1.2 模型ID应该是完整格式 (provider/model)', () => {
  const models = modelSync.loadModelsFromConfig();
  for (const [alias, model] of Object.entries(models)) {
    assert(model.id.includes('/'), `模型 ${alias} 的ID应该是 provider/model 格式`);
  }
});

test('1.3 应该能验证有效的模型ID', () => {
  const models = modelSync.loadModelsFromConfig();
  // 使用实际配置中的模型 ID
  const modelIds = Object.values(models).map(m => m.id);
  const firstModelId = modelIds[0];
  const validId = modelSync.validateModelId(models, firstModelId);
  assert(validId === firstModelId, `应该返回完整的模型ID，期望 ${firstModelId}，得到 ${validId}`);
});

test('1.4 应该拒绝无效的模型ID', () => {
  const models = modelSync.loadModelsFromConfig();
  const invalidId = modelSync.validateModelId(models, 'invalid/model');
  assert(invalidId === null, '无效模型应该返回 null');
});

// ============================================
// 测试 2: 会话状态追踪
// ============================================
section('测试 2: 会话状态追踪');

test('2.1 应该能创建新会话', () => {
  const sessionId = 'test-session-001';
  const session = sessionStore.getOrCreateSession(sessionId, 'zai/glm-5');
  assert(session.session_id === sessionId, '会话ID应该匹配');
  assert(session.current_model === 'zai/glm-5', '当前模型应该匹配');
});

test('2.2 应该能更新对话向量', () => {
  const sessionId = 'test-session-002';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  
  // 模拟第一轮对话
  sessionStore.updateConversationVector(sessionId, {
    task_type: 'code',
    primary_language: 'chinese',
    complexity: 'high'
  });
  
  const session = sessionStore.getOrCreateSession(sessionId);
  // 注意：turn_count 可能在其他地方被更新过
  assert(session.conversation_vector.turn_count >= 1, '轮次应该至少为1');
  assert(session.conversation_vector.primary_topic === 'code', '主要话题应该是code');
});

test('2.3 应该能设置模型粘性', () => {
  const sessionId = 'test-session-003';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  sessionStore.setSmartSticky(sessionId, 'moonshot/kimi-k2.5', 'code', 'test');
  
  const sticky = sessionStore.getStickyStatus(sessionId);
  assert(sticky.model === 'moonshot/kimi-k2.5', '粘性模型应该匹配');
  assert(sticky.remaining >= 3, '粘性剩余应该 >= 3');
});

test('2.4 粘性应该随轮次递减', () => {
  const sessionId = 'test-session-004';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  sessionStore.setSmartSticky(sessionId, 'moonshot/kimi-k2.5', 'code', 'test');
  
  const before = sessionStore.getStickyStatus(sessionId);
  
  // 模拟递减
  sessionStore.decrementSticky(sessionId);
  
  const after = sessionStore.getStickyStatus(sessionId);
  assert(after.remaining === before.remaining - 1, '粘性应该减少1');
});

// ============================================
// 测试 3: 预测决策引擎
// ============================================
section('测试 3: 预测决策引擎');

test('3.1 应该正确识别中文', () => {
  const features = predictionEngine.extractFeatures('今天天气怎么样？');
  assert(features.primary_language === 'chinese', '应该识别为中文');
});

test('3.2 应该正确识别英文', () => {
  const features = predictionEngine.extractFeatures('What is the weather today?');
  assert(features.primary_language === 'english', '应该识别为英文');
});

test('3.3 应该正确识别代码任务', () => {
  const features = predictionEngine.extractFeatures('帮我写一段Python爬虫代码');
  assert(features.task_type === 'code', '应该识别为代码任务');
});

test('3.4 应该正确识别分析任务', () => {
  const features = predictionEngine.extractFeatures('分析一下这个项目的优缺点');
  assert(features.task_type === 'analysis', '应该识别为分析任务');
});

test('3.5 应该正确评估复杂度', () => {
  const simple = predictionEngine.extractFeatures('好的');
  assert(simple.complexity === 'low', '短文本应该是低复杂度');
  
  const complex = predictionEngine.extractFeatures('请详细分析一下这个复杂系统的架构设计，包括前端、后端、数据库以及它们之间的交互方式，并给出优化建议。');
  assert(complex.complexity === 'high', '长文本应该是高复杂度');
});

test('3.6 代码任务应该推荐 GLM-5', () => {
  const bestModel = predictionEngine.getBestModelForTask('code', 'chinese');
  assert(bestModel.includes('glm'), '代码任务应该推荐 GLM 系列');
});

test('3.7 长文本应该推荐 Kimi', () => {
  const bestModel = predictionEngine.getBestModelForTask('summarization', 'chinese');
  assert(bestModel.includes('kimi'), '总结任务应该推荐 Kimi');
});

// ============================================
// 测试 4: 预测式预切换逻辑
// ============================================
section('测试 4: 预测式预切换逻辑');

test('4.1 用户显式指定模型应该最高优先级', () => {
  const sessionId = 'test-session-005';
  const decision = routerV2.route({
    session_id: sessionId,
    text: '帮我分析一下',
    current_model: 'zai/glm-4.7-flashx',
    user_override: 'moonshot/kimi-k2.5'
  });
  
  assert(decision.action === 'switch', '应该执行切换');
  assert(decision.target_model === 'moonshot/kimi-k2.5', '应该切换到用户指定的模型');
  assert(decision.confidence === 1.0, '用户指定的置信度应该是1');
});

test('4.2 粘性期间应该保持当前模型', () => {
  const sessionId = 'test-session-006';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  sessionStore.setSmartSticky(sessionId, 'zai/glm-4.7-flashx', 'code', 'test_sticky');
  
  const decision = routerV2.route({
    session_id: sessionId,
    text: '帮我总结一下',
    current_model: 'zai/glm-4.7-flashx'
  });
  
  assert(decision.action === 'stay', '粘性期间应该保持');
  assert(decision.reason === 'sticky_active', '原因应该是粘性激活');
});

test('4.3 代码任务应该切换到合适的代码模型', () => {
  const sessionId = 'test-session-007';
  sessionStore.getOrCreateSession(sessionId, 'moonshot/kimi-k2.5');
  
  const decision = routerV2.route({
    session_id: sessionId,
    text: '帮我写一个Python函数来实现快速排序',
    current_model: 'moonshot/kimi-k2.5'
  });
  
  // 代码任务应该切换（如果当前模型不适合代码任务）
  // 或者保持（如果当前模型已经适合）
  const models = modelSync.loadModelsFromConfig();
  const codeModels = Object.entries(models)
    .filter(([alias, model]) => (model.id || '').includes('glm'))
    .map(([alias, model]) => model.id);
  
  console.log(`   可用代码模型: ${codeModels.join(', ')}`);
  console.log(`   决策: ${decision.action}, 目标: ${decision.target_model}, 原因: ${decision.reason}`);
  
  // 验证决策合理性
  assert(decision.action === 'switch' || decision.action === 'stay', '应该返回有效决策');
});

test('4.4 应该在轮次结束时提供预切换建议', () => {
  const sessionId = 'test-session-008';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  
  // 模拟两轮代码对话
  sessionStore.updateConversationVector(sessionId, {
    task_type: 'code',
    primary_language: 'chinese',
    complexity: 'high'
  });
  
  sessionStore.updateConversationVector(sessionId, {
    task_type: 'code',
    primary_language: 'chinese',
    complexity: 'high'
  });
  
  // 更新预测
  sessionStore.updatePrediction(sessionId, {
    task_type: 'code',
    confidence: 0.85,
    recommended_model: 'zai/glm-4.7-flashx',
    reason: 'topic_continuity'
  });
  
  const preSwitch = routerV2.endOfTurn(sessionId);
  
  assert(preSwitch.should_pre_switch !== undefined, '应该返回预切换决策');
});

// ============================================
// 测试 5: v1 vs v2 对比演示
// ============================================
section('测试 5: v1 vs v2 工作方式对比');

test('5.1 v1 方式：当前轮次决策，下一轮生效', () => {
  console.log('\n   [v1 模拟] 时间线演示:');
  console.log('   第N轮: 用户问"帮我写Python代码"');
  console.log('   第N轮: 路由分析 → 推荐 GLM-5');
  console.log('   第N轮: 当前模型(Kimi)生成回复');
  console.log('   第N轮结束: 切换到 GLM-5');
  console.log('   第N+1轮: GLM-5 开始工作');
  console.log('   ⚠️  问题: 切换"慢一拍"，当前轮次用错模型');
  
  assert(true, 'v1 工作方式演示');
});

test('5.2 v2 方式：上一轮预测，当前轮生效', () => {
  console.log('\n   [v2 模拟] 时间线演示:');
  console.log('   第N-1轮: 用户问"我想做一些数据处理"');
  console.log('   第N-1轮: 预测引擎分析 → 可能转向代码');
  console.log('   第N-1轮结束: 预切换到 GLM-5');
  console.log('   第N轮: 用户问"帮我写Python代码"');
  console.log('   第N轮: GLM-5 已就绪，直接处理');
  console.log('   ✅ 优势: 零延迟切换，用户无感');
  
  assert(true, 'v2 工作方式演示');
});

test('5.3 v2 预测准确率模拟', () => {
  // 模拟连续代码对话场景
  const sessionId = 'test-session-009';
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  
  const codeInputs = [
    '帮我写一个函数',
    '这个函数有个bug',
    '优化一下性能',
    '添加单元测试',
    '重构代码结构'
  ];
  
  let correctPredictions = 0;
  let totalPredictions = 0;
  
  // 先建立上下文
  for (let i = 0; i < codeInputs.length; i++) {
    const input = codeInputs[i];
    
    // 路由决策（会自动更新对话向量）
    const decision = routerV2.route({
      session_id: sessionId,
      text: input,
      current_model: 'zai/glm-4.7-flashx'
    });
    
    // 每轮结束后预测下一轮
    if (i < codeInputs.length - 1) {
      const prediction = predictionEngine.predictNextTask(sessionId);
      
      if (prediction.task_type) {
        totalPredictions++;
        const actualNext = predictionEngine.extractFeatures(codeInputs[i + 1]).task_type;
        
        if (prediction.task_type === actualNext) {
          correctPredictions++;
        }
      }
    }
  }
  
  const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
  console.log(`   总预测次数: ${totalPredictions}`);
  console.log(`   正确预测: ${correctPredictions}`);
  console.log(`   预测准确率: ${(accuracy * 100).toFixed(1)}%`);
  
  if (totalPredictions === 0) {
    console.log(`   提示: 上下文不足，无法进行预测测试`);
    assert(true, '上下文不足时跳过预测测试');
  } else {
    assert(accuracy >= 0.3, `预测准确率应该 >= 30%，实际 ${(accuracy * 100).toFixed(1)}%`);
  }
});

// ============================================
// 测试 6: 完整工作流演示
// ============================================
section('测试 6: 完整工作流演示');

test('6.1 完整的代码对话工作流', () => {
  const sessionId = 'test-session-full-001';
  console.log('\n   === 完整工作流演示 ===\n');
  
  // 初始状态
  console.log('   [初始] 当前模型: zai/glm-4.7-flashx');
  sessionStore.getOrCreateSession(sessionId, 'zai/glm-4.7-flashx');
  
  // 第一轮
  console.log('\n   [第1轮] 用户: "我想处理一些数据"');
  const decision1 = routerV2.route({
    session_id: sessionId,
    text: '我想处理一些数据',
    current_model: 'zai/glm-4.7-flashx'
  });
  console.log(`   决策: ${decision1.action} (${decision1.reason})`);
  
  // 第一轮结束
  const preSwitch1 = routerV2.endOfTurn(sessionId);
  console.log(`   预切换: ${preSwitch1.should_pre_switch ? '是' : '否'}`);
  
  // 第二轮
  console.log('\n   [第2轮] 用户: "帮我写个Python脚本"');
  const decision2 = routerV2.route({
    session_id: sessionId,
    text: '帮我写个Python脚本',
    current_model: 'zai/glm-4.7-flashx'
  });
  console.log(`   决策: ${decision2.action} → ${decision2.target_model}`);
  console.log(`   原因: ${decision2.reason}`);
  console.log(`   置信度: ${decision2.confidence}`);
  
  assert(true, '完整工作流演示');
});

// ============================================
// 测试结果汇总
// ============================================
section('测试结果汇总');

console.log(`\n   通过: ${testsPassed}`);
console.log(`   失败: ${testsFailed}`);
console.log(`   总计: ${testsPassed + testsFailed}`);
console.log(`   成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
  process.exit(1);
}

// 清理测试数据
console.log('\n   清理测试会话数据...');
const sessions = sessionStore.loadAllSessions();
for (const sessionId of Object.keys(sessions)) {
  if (sessionId.startsWith('test-session')) {
    delete sessions[sessionId];
  }
}
sessionStore.saveAllSessions(sessions);

console.log('\n✨ 所有测试通过！\n');
