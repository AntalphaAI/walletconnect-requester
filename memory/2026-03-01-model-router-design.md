# Session: 2026-03-01 05:50:12 UTC

- **Session Key**: agent:main:cron:8c82f13e-7ab5-4894-a332-988bb405cfa6
- **Session ID**: ff27560f-15a9-4f34-9511-42708e90a822
- **Source**: webchat

## Conversation Summary

assistant: 用户指出了两个问题：

1. 模型路由器在 `extension` 目录下，不是 `tools` 目录
2. 这么复杂的任务，我应该用 GLM-5（更强大的模型）来执行

用户让我使用 GLM-5 重新设计方案。根据我之前的模型签名规范，我需要：
1. 先切换到 GLM-5 模型
2. 然后重新设计方案

让我先切换模型。你说得对，复杂任务应该用更强大的模型。让我切换到 GLM-5 来重新设计。
assistant: 好的，已切换到 GLM-5。现在让我先确认模型路由器的正确位置，然后重新设计方案。
assistant: 找到了，确实在 `extensions/model-router` 目录下。让我读取这个目录下的文件结构。
assistant: 原来文件名是 `index.js` 而不是 `router.js`。让我读取正确的文件。
assistant: 好的，现在我理解了整个架构：

1. **extensions/model-router/index.js** - 这是一个 OpenClaw 插件，注册 `before_model_resolve` hook
2. **workspace/tools/model-router/router.js** - 这是核心路由逻辑模块
3. 插件通过调用 `router.js` 的 CLI 来获取推荐模型

现在我需要重新设计一个更优雅的方案。让我继续读取 config.json。
assistant: 现在我完全理解了架构。让我重新设计一个优雅的 v3 方案：

---

## Model Router v3 设计方案 - "Bailian First + Zero-Crash"

### 一、架构理解确认

```
extensions/model-router/index.js (插件)
    ↓ 调用
workspace/tools/model-router/router.js (核心路由逻辑)
    ↓ 读取
workspace/tools/model-router/config.json (路由规则)
```

### 二、核心设计原则

#### 1. 成本优先策略

```
供应商优先级：
bailian (包月无上限) > zai (按量付费) > moonshot (按量付费)

Gemini 系列处理：
- 所有 gemini 相关路由规则 → 映射到 bailian 同等能力模型
- 配置中添加 "blocked_models": ["gemini*", "google/*"]
```

#### 2. Bailian 模型能力矩阵

| 任务类型 | 首选 | 备选1 | 备选2 | 选择理由 |
|---------|------|-------|-------|---------|
| **图像理解** | qwen3.5-plus | kimi-k2.5 | moonshot/kimi-k2.5 | 唯一支持图像的 qwen |
| **代码生成** | qwen3-coder-plus | qwen3-coder-next | glm-5 | 100万上下文代码专用 |
| **超长文本** | qwen3.5-plus | qwen3-max | - | 100万上下文 |
| **复杂推理** | qwen3-max | glm-5 | zai/glm-5 | max 版本推理最强 |
| **通用中文** | glm-5 | kimi-k2.5 | moonshot/kimi-k2.5 | 成本低、速度快 |
| **翻译任务** | kimi-k2.5 | glm-5 | - | 多语言能力强 |
| **英文对话** | glm-5 | qwen3.5-plus | - | 英文能力均衡 |

### 三、稳定性保障机制

#### 核心设计：三级防护 + 候选人机制

**Level 1: 输入防御**
```javascript
function sanitizeInput(input) {
  // 1. 类型检查
  if (typeof input !== 'object' || input === null) {
    return null; // 触发紧急回退
  }
  
  // 2. 内容截断（防止超大输入）
  const MAX_INPUT_LENGTH = 100000;
  if (input.text && input.text.length > MAX_INPUT_LENGTH) {
    input.text = input.text.substring(0, MAX_INPUT_LENGTH);
  }
  
  // 3. 默认值填充
  return {
    text: input.text || '',
    user_model: input.user_model || null,
    images: input.images || [],
    files: input.files || []
  };
}
```

**Level 2: 韧性路由**
```javascript
function resilientRoute(input) {
  // 防御性编程：任何异常都捕获
  try {
    // 1. 获取可用模型列表
    const availableModels = loadOpenClawModels();
    if (Object.keys(availableModels.models).length === 0) {
      return getEmergencyFallback(); // 紧急回退
    }
    
    // 2. 按规则匹配（返回候选列表）
    const candidates = matchRoutingRules(input);
    
    // 3. 验证每个候选模型的可用性
    for (const candidate of candidates) {
      if (isModelAvailable(candidate, availableModels)) {
        return candidate; // 返回第一个可用模型
      }
    }
    
    // 4. 所有候选都不可用，使用紧急回退
    return getEmergencyFallback();
    
  } catch (error) {
    logError(error); // 记录但不抛出
    return getEmergencyFallback();
  }
}

function getEmergencyFallback() {
  // 硬编码的最终防线（不依赖任何配置）
  return {
    provider: 'bailian',
    modelId: 'glm-5',
    alias: 'GLM5-BL'
  };
}
```

**Level 3: 输出验证**
```javascript
function validateOutput(modelInfo) {
  // 1. 基本结构检查
  if (!modelInfo || typeof modelInfo !== 'object') {
    return getEmergencyFallback();
  }
  
  // 2. 必要字段检查
  if (!modelInfo.provider || !modelInfo.modelId) {
    return getEmergencyFallback();
  }
  
  // 3. 格式检查
  if (modelInfo.provider.includes('/') || modelInfo.modelId.includes('/')) {
    return getEmergencyFallback(); // 格式异常
  }
  
  // 4. 黑名单检查
  if (isBlockedModel(modelInfo)) {
    console.warn(`[model-router] Blocked model: ${modelInfo.provider}/${modelInfo.modelId}`);
    return getEmergencyFallback();
  }
  
  return modelInfo; // 验证通过
}

function isBlockedModel(modelInfo) {
  const BLOCKED_MODELS = [
    /^gemini/i,
    /^google/i,
    /^gemini-/i
  ];
  
  const fullName = `${modelInfo.provider}/${modelInfo.modelId}`;
  for (const pattern of BLOCKED_MODELS) {
    if (pattern.test(fullName) || pattern.test(modelInfo.modelId)) {
      return true;
    }
  }
  return false;
}
```

### 四、配置文件重构

```json
{
  "version": "3.0.0",
  "description": "模型路由器 v3 - Bailian First + Zero-Crash",
  
  "stability": {
    "strict_validation": true,
    "auto_fallback": true,
    "never_throw": true,
    "max_input_length": 100000,
    "emergency_fallback": {
      "provider": "bailian",
      "modelId": "glm-5",
      "alias": "GLM5-BL"
    }
  },
  
  "provider_priority": ["bailian", "zai", "moonshot"],
  
  "blocked_models": ["gemini*", "google/*"],
  
  "model_aliases": {
    "qwen_vision": "Qwen35",
    "qwen_max": "QwenMax",
    "qwen_coder": "QwenCoder",
    "qwen_coder_plus": "QwenCoderPlus",
    "glm_bl": "GLM5-BL",
    "glm47_bl": "GLM47-BL",
    "kimi_bl": "Kimi-BL",
    "minimax": "MiniMax"
  },
  
  "routing_rules": [
    {
      "name": "user_specified",
      "priority": 1,
      "description": "用户明确指定模型",
      "condition": { "user_model_specified": true },
      "action": { "use_user_model": true }
    },
    {
      "name": "multimodal_vision",
      "priority": 2,
      "description": "图像理解任务",
      "condition": { "has_image": true },
      "action": {
        "model_sequence": ["qwen_vision", "kimi_bl", "Kimi"]
      }
    },
    {
      "name": "code_generation",
      "priority": 3,
      "description": "代码生成任务",
      "condition": { "task_type": "code" },
      "action": {
        "model_sequence": ["qwen_coder_plus", "qwen_coder", "glm_bl"]
      }
    },
    {
      "name": "complex_reasoning",
      "priority": 4,
      "description": "复杂推理分析",
      "condition": { "task_type": "reasoning", "complexity": "high" },
      "action": {
        "model_sequence": ["qwen_max", "glm_bl", "GLM"]
      }
    },
    {
      "name": "long_context",
      "priority": 5,
      "description": "超长文本任务（>50万字）",
      "condition": { "estimated_tokens": ">500k" },
      "action": {
        "model_sequence": ["qwen_vision", "qwen_coder_plus"]
      }
    },
    {
      "name": "translation",
      "priority": 6,
      "description": "翻译任务",
      "condition": { "task_type": "translation" },
      "action": {
        "model_sequence": ["kimi_bl", "glm_bl", "Kimi"]
      }
    },
    {
      "name": "chinese_general",
      "priority": 7,
      "description": "中文通用对话",
      "condition": { "primary_language": "chinese", "task_type": "general" },
      "action": {
        "model_sequence": ["glm_bl", "kimi_bl", "Kimi"]
      }
    },
    {
      "name": "english_general",
      "priority": 8,
      "description": "英文通用对话",
      "condition": { "primary_language": "english" },
      "action": {
        "model_sequence": ["glm_bl", "qwen_vision", "Kimi"]
      }
    },
    {
      "name": "quick_response",
      "priority": 9,
      "description": "快速响应",
      "condition": { "text_length": "short", "complexity": "low" },
      "action": {
        "model_sequence": ["glm_bl", "glm47_bl", "Kimi"]
      }
    },
    {
      "name": "default_fallback",
      "priority": 99,
      "description": "默认回退",
      "condition": {},
      "action": {
        "model_sequence": ["glm_bl", "Kimi", "GLM"]
      }
    }
  ],
  
  "task_keywords": {
    "code": ["代码", "code", "编程", "写代码", "function", "class", "sql", "json", "脚本", "python", "java", "javascript", "算法", "实现", "函数", "方法", "程序", "bug", "修复", "重构"],
    "reasoning": ["分析", "analyze", "推理", "reasoning", "为什么", "why", "如何", "how", "比较", "compare", "优缺点", "评估", "思考", "论证", "证明"],
    "translation": ["翻译", "translate", "译为", "convert to", "英文", "中文", "日语", "韩语"],
    "summarization": ["总结", "summarize", "摘要", "概括", "归纳", "提炼"],
    "quick": ["快速", "quick", "简单", "simple", "确认", "confirm", "是吗", "ok", "对吗", "好的", "是的"]
  },
  
  "length_thresholds": {
    "short": 200,
    "medium": 500,
    "long": 1000
  }
}
```

### 五、关键改进总结

| 改进点 | 原方案 | v3 方案 |
|-------|-------|--------|
| **供应商优先级** | gemini 优先 | bailian 优先（包月无上限） |
| **稳定性** | 单一模型返回 | 候选列表 + 三级防护 |
| **错误处理** | 可能抛出异常 | 绝不抛出异常，永远返回安全模型 |
| **配置依赖** | 依赖配置完整性 | 硬编码紧急回退，不依赖任何配置 |
| **Gemini 处理** | 正常使用 | 黑名单屏蔽，自动替换为 bailian |

---

这个方案如何？确认后我开始编码实现。

[🐾 GLM]
user: [Sun 2026-03-01 13:32 GMT+8] 我还有些不同意见，bailian的支持模型中，我希望优先使用bailianm模型库中的GLM-5 和 Kimi 2.5, 其次再试在考虑千问系列。我只是想用它的计划来降成本，而不是想要用Qwen. 其他的工程方案我认同
user: [Sun 2026-03-01 13:38 GMT+8] hi，你理解了我的编程预期吗
assistant: 理解了。总结你的核心预期：

**1. 模型优先级**
```
bailian/glm-5 → 主力（日常对话、推理、代码）
bailian/kimi-k2.5 → 视觉场景
bailian/qwen* → 仅在需要超长上下文（100万）时使用
zai/moonshot → 最后保障
Gemini → 完全移除
```

**2. 目标**
- 降低成本：从按量付费切换到 bailian 包月
- 保持熟悉：继续用 GLM-5 和 Kimi，只是换个供应商

**3. 稳定性**
- 三级防护，绝不崩溃
- 紧急回退到 bailian/glm-5

可以开始编码了吗？

[🐾 GLM]
user: [Sun 2026-03-01 13:41 GMT+8] 一个小小的修改，日常对话用bailian/kimi。 推理和编码用bailian/glm-5 开始编码吧，留意我们昨天提到的上下文分析的状态场景，而不是单一通过单词输入判断.
assistant: 明白。开始编码。

**路由优先级调整：**
- 日常对话 → bailian/kimi-k2.5
- 推理/编码 → bailian/glm-5

**上下文继承机制：** 简短回复时继承前序任务的模型选择。

让我开始实现。
assistant: 现在开始编写 v3 版本。先更新 config.json，再更新 router.js。
assistant: config.json 已更新。现在更新 router.js，添加三级防护机制。
assistant: router.js 已更新。现在测试一下路由器是否正常工作。
assistant: 路由器测试通过：

**测试结果：**
```
代码任务 "帮我写一个Python脚本" → GLM5-BL (bailian/glm-5) ✓
日常对话 "你好，今天天气怎么样？" → Kimi-BL (bailian/kimi-k2.5) ✓
```

**v3 更新完成：**

| 功能 | 状态 |
|------|------|
| 日常对话 → bailian/kimi-k2.5 | ✓ |
| 推理/编码 → bailian/glm-5 | ✓ |
| Gemini 黑名单 | ✓ |
| 三级防护（输入/路由/输出） | ✓ |
| 紧急回退机制 | ✓ |
| 上下文继承（简短回复） | 已有（index.js） |

**需要重启 gateway 才能生效。**

你想现在重启吗？或者有其他需要调整的地方？

[🐾 GLM]
