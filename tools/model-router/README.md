# 智能模型路由器

一个基于任务特征自动选择最佳模型的智能路由系统。

## 核心功能

- **自动语言检测**：识别输入文本的主要语言（中文、英文、混合）
- **任务意图识别**：根据关键词判断任务类型（代码、摘要、推理等）
- **智能模型选择**：基于任务特征自动推荐最合适的模型序列
- **用户指定优先**：支持用户明确指定模型，具有最高优先级
- **配置化管理**：所有路由规则均可通过配置文件修改

## 快速开始

### 1. 运行测试

```bash
cd tools/model-router
node test.js
```

### 2. 命令行使用

```bash
# 基本用法
node router.js "你的问题或任务"

# 示例
node router.js "帮我写一段Python代码"
node router.js "Please analyze this problem"
```

### 3. 作为模块引入

```javascript
const router = require('./tools/model-router/router.js');

// 获取推荐模型
const model = router.getRecommendedModel({
  text: '帮我写一段代码'
});

// 获取完整路由信息
const info = router.getRoutingInfo({
  text: '帮我写一段代码'
});
console.log(info);
```

## 配置说明

所有路由规则都在 `config.json` 中定义。您可以根据需要修改：

### 模型定义 (`models`)

定义每个模型的特点：

```json
{
  "kimi": {
    "id": "moonshot/kimi-k2.5",
    "strengths": ["chinese", "long_context", "summarization"],
    "cost_level": 2,
    "speed_level": 2
  }
}
```

- `id`: 模型的完整标识符
- `strengths`: 模型的优势领域
- `cost_level`: 成本等级 (1=低, 2=中, 3=高)
- `speed_level`: 速度等级 (1=慢, 2=中, 3=快)

### 路由规则 (`routing_rules`)

定义任务类型与模型的映射关系：

```json
{
  "name": "code_generation",
  "priority": 5,
  "condition": {
    "task_type": "code"
  },
  "action": {
    "model_sequence": ["glm5", "gemini_pro"]
  }
}
```

- `name`: 规则名称
- `priority`: 优先级（数字越小优先级越高）
- `condition`: 匹配条件（基于输入特征）
- `action`: 匹配成功后的动作（模型序列）

### 任务关键词 (`task_keywords`)

定义识别任务类型的关键词：

```json
{
  "code": ["代码", "code", "编程", "SQL", "JSON"]
}
```

### 长度阈值 (`length_thresholds`)

定义文本长度的判定标准：

```json
{
  "short": 200,
  "medium": 500,
  "long": 1000
}
```

## 路由决策流程

1. **用户指定检查**：如果用户明确指定模型，直接使用该模型
2. **特征分析**：
   - 语言检测
   - 任务类型识别
   - 文本长度评估
   - 复杂度评估
   - 多模态元素检查
3. **规则匹配**：按优先级匹配路由规则
4. **返回结果**：返回推荐的模型序列和决策理由

## 可用的输入特征

在路由规则的条件中，可以使用以下特征：

- `user_model_specified`: 是否用户指定了模型（布尔值）
- `primary_language`: 主要语言（'chinese', 'english', 'mixed'）
- `task_type`: 任务类型（'code', 'summarization', 'reasoning', 'translation', 'quick', 'general'）
- `text_length`: 文本长度（'short', 'medium', 'long'）
- `complexity`: 任务复杂度（'low', 'medium', 'high'）
- `input_types`: 输入类型数组（['text'], ['text', 'image']）

## 示例规则

### 中文长文本摘要
```json
{
  "name": "chinese_long_context",
  "priority": 3,
  "condition": {
    "primary_language": "chinese",
    "text_length": "long",
    "task_type": "summarization"
  },
  "action": {
    "model_sequence": ["kimi", "glm5"]
  }
}
```

### 快速响应
```json
{
  "name": "quick_response",
  "priority": 6,
  "condition": {
    "text_length": "short",
    "complexity": "low"
  },
  "action": {
    "model_sequence": ["gemini_flash", "kimi"]
  }
}
```

## 修改建议

1. **添加新模型**：在 `config.json` 的 `models` 部分添加新模型定义
2. **调整优先级**：修改 `routing_rules` 中规则的 `priority` 值
3. **添加新规则**：在 `routing_rules` 数组中添加新的规则对象
4. **修改关键词**：在 `task_keywords` 中添加或修改关键词

## 文件结构

```
tools/model-router/
├── config.json      # 路由配置文件
├── router.js        # 核心路由逻辑
├── test.js          # 测试脚本
└── README.md        # 本文档
```

## 记忆原则

**重要**：所有任务需求都必须通过此模型路由器进行分发。这是系统设计的一个核心原则，确保每个请求都能匹配到最合适的模型。

---

🐾 OpenClaw Model Router v1.0.0
