# 智能模型路由器 v2.1

**预测式预切换架构** - 实现零延迟的智能模型路由

---

## 核心创新

| 维度 | v1 (router.js) | v2.1 (router-v2.js) |
|------|----------------|---------------------|
| **决策时机** | 每轮开始时分析 | 上一轮结束时预测 |
| **切换延迟** | 1轮（当前轮用旧模型） | 0轮（预测准确时） |
| **模型配置** | hard code | 从 OpenClaw 配置动态同步 |
| **状态管理** | 无状态 | 追踪对话连续性 + 粘性机制 |
| **粘性逻辑** | 无 | ✅ 智能粘性延长 |
| **路由历史** | 无 | ✅ 追踪决策历史 |
| **使用统计** | 无 | ✅ 模型使用效率统计 |

---

## v2.1 新增功能

### 1. 智能粘性延长
```javascript
// 根据任务类型自动选择粘性策略
// 连续同类型任务会自动延长粘性
sessionStore.setSmartSticky(sessionId, 'zai/glm-4.7-flashx', 'code', 'auto');

// 粘性策略配置
const STICKY_STRATEGIES = {
  code: { base_duration: 5, extend_threshold: 3, max_duration: 10 },
  analysis: { base_duration: 4, extend_threshold: 3, max_duration: 8 },
  summarization: { base_duration: 3, extend_threshold: 2, max_duration: 6 },
  // ...
};
```

### 2. 会话状态追踪
```javascript
// 获取会话摘要
const digest = sessionStore.getSessionDigest(sessionId);
// {
//   session_id: 'agent:main',
//   current_model: 'zai/glm-4.7-flashx',
//   turn_count: 12,
//   primary_topic: 'code',
//   sticky: { active: true, model: 'zai/glm-4.7-flashx', remaining: 3 },
//   switch_success_rate: '85.7%',
//   ...
// }
```

### 3. 路由历史追踪
```javascript
// 记录路由决策
sessionStore.recordRoutingDecision(sessionId, decision);

// 获取切换成功率
const rate = sessionStore.getSwitchSuccessRate(sessionId);
```

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     路由控制器 (router-v2.js)                 │
│  主入口，暴露 route() 和 endOfTurn() API                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  model-sync   │    │ session-store │    │prediction-engine│
│  模型同步器    │    │  会话状态存储  │    │   预测决策引擎   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ↓                     ↓                     ↓
  openclaw.json          sessions.json          内存计算
```

---

## 快速开始

### 1. 路由决策（每轮对话开始时调用）

```javascript
const router = require('./router-v2');

const decision = router.route({
  session_id: 'agent:main',
  text: '帮我写一段Python代码',
  current_model: 'zai/glm-4.7-flashx'
});

console.log(decision);
// {
//   action: 'stay' | 'switch',
//   current_model: 'zai/glm-4.7-flashx',
//   target_model: 'zai/glm-4.7-flashx',
//   confidence: 0.7,
//   reason: 'code_task',
//   prediction: { ... }
// }
```

### 2. 预切换决策（每轮对话结束时调用）

```javascript
const preSwitch = router.endOfTurn('agent:main');

if (preSwitch.should_pre_switch) {
  // 执行预切换，为下一轮做准备
  console.log(`预切换到: ${preSwitch.target_model}`);
}
```

### 3. 用户显式指定模型

```javascript
const decision = router.route({
  session_id: 'agent:main',
  text: '帮我翻译这段话',
  current_model: 'zai/glm-4.7-flashx',
  user_override: 'google/gemini-2.5-flash'
});
```

### 4. 命令行接口

```bash
# 查看可用模型
node router-v2.js models

# 执行路由决策
node router-v2.js route "agent:main" "帮我写Python代码"

# 查看会话状态
node router-v2.js summary "agent:main"

# 手动切换模型
node router-v2.js switch "agent:main" "moonshot/kimi-k2.5"
```

---

## 工作原理

### 时间线对比

#### v1 方式（慢一拍）
```
第N轮:   用户问"帮我写Python代码"
第N轮:   路由分析 → 推荐 GLM-5
第N轮:   当前模型(Kimi)生成回复  ← 用错模型！
第N轮结束: 切换到 GLM-5
第N+1轮: GLM-5 开始工作
```

#### v2 方式（零延迟）
```
第N-1轮: 用户问"我想做一些数据处理"
第N-1轮: 预测引擎分析 → 可能转向代码
第N-1轮结束: 预切换到 GLM-5  ← 提前准备！
第N轮:   用户问"帮我写Python代码"
第N轮:   GLM-5 已就绪，直接处理  ← 无延迟！
```

---

## 核心组件

### 1. model-sync.js - 模型同步器

从 `~/.openclaw/openclaw.json` 动态加载可用模型，解决 hard code 问题。

```javascript
const models = modelSync.loadModelsFromConfig();
// {
//   'glm': { id: 'zai/glm-4.7-flashx', ... },
//   'kimi': { id: 'moonshot/kimi-k2.5', ... }
// }
```

### 2. session-store.js - 会话状态存储

追踪每个会话的对话向量，包括：
- `primary_topic`: 当前主要话题
- `language_pref`: 语言偏好
- `avg_complexity`: 平均复杂度
- `sticky_model`: 粘性模型
- `sticky_remaining`: 剩余粘性轮数

### 3. prediction-engine.js - 预测决策引擎

核心算法：
- 特征提取（语言、任务类型、复杂度）
- 任务类型预测
- 切换收益计算
- 最佳模型选择

---

## 测试

```bash
cd tools/model-router-v2
node test-v2.js
```

测试覆盖：
1. 模型同步功能
2. 会话状态追踪
3. 预测决策引擎
4. 预测式预切换逻辑
5. v1 vs v2 工作方式对比
6. 完整工作流演示

---

## 配置

### 任务关键词 (prediction-engine.js)

```javascript
const TASK_KEYWORDS = {
  code: ['代码', 'code', '编程', 'Python', 'Java', ...],
  analysis: ['分析', 'analyze', '推理', '为什么', ...],
  translation: ['翻译', 'translate', ...],
  summarization: ['总结', 'summarize', ...],
  quick: ['快速', 'quick', '简单', ...]
};
```

### 模型能力映射

从配置文件动态生成，根据模型名称推断能力：
- GLM 系列 → `['code', 'chinese', 'structured_output']`
- Kimi 系列 → `['chinese', 'long_context', 'summarization']`
- Gemini Pro → `['multimodal', 'complex_reasoning', 'translation']`
- Gemini Flash → `['speed', 'cost_effective', 'quick']`

---

## 文件结构

```
tools/model-router-v2/
├── router-v2.js          # 主入口
├── model-sync.js         # 模型同步器
├── session-store.js      # 会话状态存储
├── prediction-engine.js  # 预测决策引擎
├── test-v2.js            # 测试套件
├── README.md             # 本文档
└── store/
    └── sessions.json     # 会话状态存储
```

---

## 与 OpenClaw 集成

```javascript
// OpenClaw Agent 侧代码（伪代码）
async function handleUserMessage(message, sessionId) {
  // 1. 调用路由决策
  const decision = await routerV2.route({
    session_id: sessionId,
    text: message,
    current_model: getCurrentModel()
  });
  
  // 2. 生成回复（使用当前模型）
  const response = await generateResponse(message, decision.current_model);
  
  // 3. 本轮结束时，执行预切换
  const preSwitch = await routerV2.endOfTurn(sessionId);
  if (preSwitch.should_pre_switch) {
    await session_status({model: preSwitch.target_model});
  }
  
  return response;
}
```

---

## 版本历史

- **v2.1.0** - 智能粘性延长、路由历史追踪、模型使用统计
- **v2.0.0** - 预测式预切换架构，从配置动态同步模型
- **v1.0.0** - 基于规则的路由，hard code 模型 ID（已弃用）

---

🐾 OpenClaw Model Router v2.1.0
