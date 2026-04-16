#!/usr/bin/env node

/**
 * 模型路由器测试脚本
 * 测试各种场景下的路由决策
 */

const router = require('./router.js');

// 定义测试用例
const testCases = [
  {
    name: '中文通用对话',
    input: {
      text: '你好，请帮我分析一下这个项目的优缺点。'
    },
    expected_model: 'moonshot/kimi-k2.5'
  },
  {
    name: '中文长文本摘要',
    input: {
      text: '这是一段很长的文本...' + '这是一个关于人工智能发展历程的详细描述，从最早的图灵测试开始，到专家系统，再到机器学习和深度学习的兴起，每一步都充满了挑战和突破。'.repeat(5)
    },
    expected_model: 'moonshot/kimi-k2.5'
  },
  {
    name: '英文复杂推理',
    input: {
      text: 'Please analyze why the stock market crashed in 2008 and compare it with the current economic situation.'
    },
    expected_model: 'google/gemini-3-pro-preview'
  },
  {
    name: '代码生成任务',
    input: {
      text: '帮我写一个Python函数，实现快速排序算法。'
    },
    expected_model: 'zai/glm-5'
  },
  {
    name: '快速响应任务',
    input: {
      text: '确认一下这个对吗？'
    },
    expected_model: 'google/gemini-2.5-flash'
  },
  {
    name: '用户指定模型',
    input: {
      text: '帮我分析这个问题。',
      user_model: 'zai/glm-5'
    },
    expected_model: 'zai/glm-5'
  },
  {
    name: '翻译任务',
    input: {
      text: '请把这段话翻译成英文：人工智能正在改变我们的生活。'
    },
    expected_model: 'google/gemini-3-pro-preview'
  },
  {
    name: 'SQL生成任务',
    input: {
      text: '写一个SQL查询，找出销售额最高的前10个产品。'
    },
    expected_model: 'zai/glm-5'
  }
];

// 执行测试
console.log('========================================');
console.log('模型路由器测试开始');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`测试用例 ${index + 1}: ${testCase.name}`);
  console.log('输入:', testCase.input.text.substring(0, 50) + (testCase.input.text.length > 50 ? '...' : ''));
  
  const result = router.route(testCase.input);
  const actualModel = result.model_sequence[0];
  
  console.log('匹配规则:', result.matched_rule);
  console.log('决策理由:', result.reason);
  console.log('输入特征:', JSON.stringify(result.features));
  console.log('推荐模型序列:', result.model_sequence);
  console.log('首推模型:', actualModel);
  
  if (actualModel === testCase.expected_model) {
    console.log('✅ 通过 - 模型符合预期');
    passCount++;
  } else {
    console.log(`❌ 失败 - 期望: ${testCase.expected_model}, 实际: ${actualModel}`);
    failCount++;
  }
  
  console.log('----------------------------------------\n');
});

// 输出测试总结
console.log('========================================');
console.log('测试总结');
console.log('========================================');
console.log(`总计: ${testCases.length} 个测试`);
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！模型路由器工作正常。');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查路由规则配置。');
  process.exit(1);
}
