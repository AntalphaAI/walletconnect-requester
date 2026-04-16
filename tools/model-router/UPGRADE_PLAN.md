# Model Router 迭代改进计划 v4.0

> 目标：优化模型分配，实现更精准的意图识别与模型匹配

---

## 一、现状分析

### 1.1 当前架构

```
用户请求 → sanitizeInput() → 特征提取 → 规则匹配 → 模型选择
                ↓
         [语言检测] [任务类型] [文本长度] [复杂度] [图像检测]
                ↓
         按 priority 匹配 routing_rules
                ↓
         返回 model_sequence
```

### 1.2 当前问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 维度较少（仅 5 个） | 意图识别粒度不够 | 🔴 高 |
| 无置信度机制 | 无法判断路由可靠性 | 🔴 高 |
| 无 Agentic 检测 | Agent 任务可能选错模型 | 🔴 高 |
| 无 Profile 策略 | 无法根据成本预算调整 | 🟡 中 |
| 边界硬编码 | 难以调优 | 🟡 中 |
| 无缓存机制 | 相似请求重复计算 | 🟢 低 |

---

## 二、目标与原则

### 2.1 核心目标

1. **意图识别准确率提升 30%+**
2. **模型选择合理性提升（主观评估）**
3. **保持 <10ms 路由延迟**
4. **零崩溃保证（继承 v3 设计）**

### 2.2 设计原则

1. **Bailian 优先** - 包月无上限，成本可控
2. **渐进式增强** - 兼容现有配置，平滑升级
3. **可配置化** - 所有权重、阈值、关键词可调
4. **可观测性** - 路由决策可追溯、可调试

---

## 三、分阶段实施计划

### Phase 1：置信度框架 + 维度扩展（预计 2-3 天）

#### 1.1 新增置信度机制

```javascript
// 新增类型定义
interface RoutingResult {
  matched_rule: string;
  reason: string;
  features: FeatureSet;
  model_sequence: string[];
  confidence: number;  // 新增：0.0 ~ 1.0
  signals: string[];   // 新增：匹配信号列表
}

// 置信度计算（基于 Sigmoid）
function calibrateConfidence(distanceFromBoundary: number, steepness: number = 5): number {
  return 1 / (1 + Math.exp(-steepness * distanceFromBoundary));
}
```

#### 1.2 扩展评分维度（从 5 个 → 12 个）

| 维度 | 权重 | 关键词示例 | 分数范围 |
|------|------|-----------|----------|
| tokenCount | 0.10 | - | -1 ~ +1 |
| codePresence | 0.12 | 函数, class, API, bug, 脚本 | 0 ~ +1 |
| reasoningMarkers | 0.15 | 分析, 推理, 为什么, 比较, 评估 | 0 ~ +1 |
| technicalTerms | 0.08 | 架构, 部署, 优化, 算法 | 0 ~ +1 |
| creativeMarkers | 0.06 | 写作, 故事, 创意, 设计 | 0 ~ +0.7 |
| simpleIndicators | 0.08 | 是什么, 定义, 怎么读 | -1 |
| multiStepPatterns | 0.06 | 首先, 然后, 第一步 | 0 ~ +0.5 |
| questionComplexity | 0.05 | 多个问号 | 0 ~ +0.5 |
| imperativeVerbs | 0.06 | 写, 生成, 创建, 实现 | 0 ~ +0.5 |
| constraintCount | 0.07 | 必须, 不能, 只能, 需要 | 0 ~ +0.7 |
| outputFormat | 0.06 | JSON, 表格, 列表, Markdown | 0 ~ +0.7 |
| agenticTask | 0.11 | 工具, 调用, 执行, 文件, 系统 | 0 ~ +1 |

#### 1.3 加权评分 → Tier 映射

```javascript
// Tier 边界配置（可调整）
const TIER_BOUNDARIES = {
  simpleMedium: -0.15,      // < -0.15 → SIMPLE
  mediumComplex: 0.25,      // -0.15 ~ 0.25 → MEDIUM
  complexReasoning: 0.65    // 0.25 ~ 0.65 → COMPLEX, > 0.65 → REASONING
};
```

---

### Phase 2：Agentic 检测 + Profile 策略（预计 2 天）

#### 2.1 Agentic 任务检测

```javascript
// Agentic 任务关键词（独立维度）
const AGENTIC_KEYWORDS = [
  // 工具调用
  'tool', '工具', '调用', 'call', 'invoke',
  // 文件操作
  '文件', 'file', '读取', '写入', '保存', 'read', 'write', 'save',
  // 系统操作
  '系统', '命令', '执行', 'shell', 'bash', 'terminal',
  // 网络请求
  '请求', 'request', 'api', 'fetch', 'http',
  // 数据处理
  '数据', '处理', '解析', 'parse', 'process',
  // 自动化
  '自动', 'auto', '批量', 'batch', '定时', 'cron',
  // Agent 相关
  'agent', '智能体', '助手', 'assistant', 'workflow'
];

// Agentic 评分逻辑
function scoreAgenticTask(text: string): { score: number; level: string } {
  const matches = countMatches(text, AGENTIC_KEYWORDS);
  
  if (matches >= 5) return { score: 1.0, level: 'high' };
  if (matches >= 3) return { score: 0.7, level: 'medium' };
  if (matches >= 1) return { score: 0.3, level: 'low' };
  return { score: 0, level: 'none' };
}
```

#### 2.2 Profile 策略系统

```javascript
// 路由策略配置
const PROFILES = {
  auto: {
    name: 'auto',
    description: '平衡模式：质量/成本均衡',
    tierUpgrades: {},
    modelPreference: 'balanced'
  },
  eco: {
    name: 'eco',
    description: '省钱模式：优先选择便宜模型',
    tierDowngrades: { REASONING: 'COMPLEX', COMPLEX: 'MEDIUM' },
    modelPreference: 'cost_first'
  },
  premium: {
    name: 'premium',
    description: '高质量模式：优先选择强模型',
    tierUpgrades: { MEDIUM: 'COMPLEX', COMPLEX: 'REASONING' },
    modelPreference: 'quality_first'
  },
  coding: {
    name: 'coding',
    description: '编程模式：优先选择代码能力强的模型',
    taskBoost: { code: 1.5 },
    modelPreference: 'code_optimized'
  }
};
```

---

### Phase 3：LLM Fallback 机制（预计 1 天）

#### 3.1 低置信度时调用 LLM 分类

```javascript
// 当 confidence < 0.5 时，触发 LLM Fallback
const FALLBACK_CONFIG = {
  enabled: true,
  confidenceThreshold: 0.5,
  model: 'bailian/glm-4-flash',  // 最便宜的模型
  maxTokens: 10,
  temperature: 0,
  cacheTtlMs: 3600000  // 1 小时缓存
};

const CLASSIFIER_PROMPT = `你是查询复杂度分类器。将用户查询分为一个类别。

类别：
- SIMPLE: 事实问答、定义、翻译、简短回答
- MEDIUM: 总结、解释、中等代码生成
- COMPLEX: 多步骤代码、系统设计、创意写作、分析
- REASONING: 数学证明、形式逻辑、逐步推理

只需回答一个词：SIMPLE、MEDIUM、COMPLEX 或 REASONING。`;
```

---

### Phase 4：配置化 + 可观测性（预计 1 天）

#### 4.1 配置文件结构重构

```json
{
  "version": "4.0.0",
  "profiles": {
    "default": "auto",
    "available": ["auto", "eco", "premium", "coding"]
  },
  "dimensions": {
    "tokenCount": { "weight": 0.10, "thresholds": { "simple": 100, "complex": 500 } },
    "codePresence": { "weight": 0.12, "keywords": ["函数", "class", "API"] },
    "reasoningMarkers": { "weight": 0.15, "keywords": ["分析", "推理", "为什么"] },
    "agenticTask": { "weight": 0.11, "keywords": ["工具", "调用", "执行"] }
  },
  "tierBoundaries": {
    "simpleMedium": -0.15,
    "mediumComplex": 0.25,
    "complexReasoning": 0.65
  },
  "fallback": {
    "enableLLMClassifier": true,
    "confidenceThreshold": 0.5,
    "model": "bailian/glm-4-flash"
  },
  "tierModelMapping": {
    "SIMPLE": ["kimi", "glm47"],
    "MEDIUM": ["kimi", "glm"],
    "COMPLEX": ["glm", "qwen_max"],
    "REASONING": ["glm", "qwen_max"]
  }
}
```

---

## 四、模型选择策略

### 4.1 Tier → 模型映射（Bailian 优先）

| Tier | 首选 | 备选 | 特殊场景 |
|------|------|------|----------|
| SIMPLE | Kimi-BL | GLM47-BL | - |
| MEDIUM | Kimi-BL | GLM5-BL | 代码 → QwenCoder |
| COMPLEX | GLM5-BL | QwenMax | 长文本 → Qwen35 |
| REASONING | GLM5-BL | QwenMax | - |

### 4.2 Agentic 能力评分

```javascript
const AGENTIC_CAPABILITY = {
  'Kimi-BL': 0.9,      // 视觉 + 工具调用
  'GLM5-BL': 0.85,     // 工具调用
  'QwenMax': 0.8,      // 长上下文 + 工具
  'QwenCoder': 0.7,    // 代码专注
  'GLM47-BL': 0.6      // 轻量级
};
```

---

## 五、实施时间表

| 阶段 | 内容 | 预计时间 | 依赖 |
|------|------|----------|------|
| Phase 1 | 置信度 + 维度扩展 | 2-3 天 | 无 |
| Phase 2 | Agentic + Profile | 2 天 | Phase 1 |
| Phase 3 | LLM Fallback | 1 天 | Phase 1 |
| Phase 4 | 配置化 + 可观测 | 1 天 | Phase 1-3 |
| 测试 | 验证 + 调优 | 1-2 天 | 全部 |
| **总计** | | **7-9 天** | |

---

## 六、成功指标

| 指标 | 当前 | 目标 | 测量方法 |
|------|------|------|----------|
| 意图识别准确率 | ~70% | >90% | 测试用例通过率 |
| 路由延迟 | ~5ms | <10ms | 性能测试 |
| 置信度校准准确率 | N/A | >85% | 低置信度请求比例 |
| Agentic 检测召回率 | N/A | >80% | 人工标注测试 |

---

*文档版本: v4.0*
*创建时间: 2026-03-22*
*作者: 小田*