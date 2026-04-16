---
name: model-allocator
description: 自动维护 OpenClaw model-router 的模型能力和路由规则，确保路由决策基于最新 benchmark 数据。当用户添加新模型、购买新 token plan、要求重新评估模型分配、或报告某个模型不好用时触发。
---

# OpenClaw Model Allocator Skill

自动维护 OpenClaw model-router 的模型能力和路由规则，确保路由决策基于最新 benchmark 数据。

## 工作流程

### Step 1: 读取当前配置

读取以下文件了解现有状态：
- `~/.openclaw/openclaw.json` → 所有可用的模型 provider 和 model
- `~/.openclaw/workspace/tools/model-router/config.json` → 路由规则和模型别名
- `~/.openclaw/workspace/tools/model-router/lib/tier.js` → 能力评分表

### Step 2: 识别新增模型

对比 `openclaw.json` 中的 providers 与 `tier.js` 中的评分表：
- 如果 provider 存在但评分表中没有 → NEW model
- 记录哪些是 NEW vs EXISTING

### Step 3: 抓取 Benchmark 数据

**数据源（按优先级）：**

| 优先级 | 数据源 | 说明 |
|--------|--------|------|
| 1 | Arena.AI | 人类盲测投票排名，最真实偏好 |
| 2 | BenchLM.ai | 客观 benchmark，分类全面 |
| 3 | 厂商官方 | 仅作参考，置信度最低 |

**搜索目标 Benchmark（按任务类型）：**

| 任务类型 | 推荐 Benchmark |
|----------|---------------|
| Agentic / 规划 | Terminal-Bench, OSWorld, PinchBench, Arena.Elo |
| Coding | SWE-bench Verified, LiveCodeBench |
| Math / 推理 | AIME, MATH-500 |
| 通用 | Arena.Elo, MMLU, C-Eval |

**搜索查询：**
```
{ModelName} benchmark Terminal-Bench
{ModelName} SWE-bench score
{ModelName} Arena.AI Elo
{ModelName} LiveCodeBench
```

**数据充足性检查：**
- 某模型 < 5 个 benchmark → 数据不可靠，保守处理
- 新发布模型（< 4周）→ 等独立评测出来再上车

### Step 4: 更新能力评分表

根据 benchmark 数据更新 `lib/tier.js` 中的两个表：

#### AGENTIC_CAPABILITY
```javascript
const AGENTIC_CAPABILITY = {
  'Minimax': 0.95,
  'MiMo': 0.93,   // ← 新模型
  'Kimi-BL': 0.9,
  'GLM5-BL': 0.85,
  ...
};
```

评分依据：Terminal-Bench > Arena.Elo > PinchBench

#### CODE_CAPABILITY
```javascript
const CODE_CAPABILITY = {
  'QwenCoder': 0.95,
  'Kimi-BL': 0.85,
  'MiMo': 0.78,   // ← 新模型
  ...
};
```

评分依据：SWE-bench > LiveCodeBench

### Step 5: 更新 Tier 映射

更新 `DEFAULT_TIER_MODEL_MAPPING`：

```javascript
const DEFAULT_TIER_MODEL_MAPPING = {
  SIMPLE: ['Kimi-BL', 'GLM47-BL'],
  MEDIUM: ['Kimi-BL', 'GLM5-BL', 'Qwen3.6'],
  COMPLEX: ['MiMo', 'Minimax-M2.7', 'Qwen3.6', 'GLM5-BL', 'QwenMax'],
  REASONING: ['MiMo', 'Minimax-M2.7', 'Qwen3.6', 'GLM5-BL', 'QwenMax']
};
```

原则：
- 高 agentic 能力的模型 → COMPLEX/REASONING tier 靠前
- 高 coding 能力的模型 → COMPLEX tier 靠前
- 便宜快速的模型 → SIMPLE/MEDIUM tier

### Step 6: 更新模型别名

在 `config.json` 的 `model_aliases` 中添加新模型：

```json
"model_aliases": {
  ...
  "mimo": "MiMo"
}
```

### Step 7: 更新路由规则（如需要）

如果新模型有独特优势（如长上下文），在 `routing_rules` 中添加或调整规则：

```json
{
  "name": "long_context",
  "priority": 7,
  "description": "超长文本任务（>50万token），使用 MiMo（100万上下文）",
  "condition": { "estimated_tokens": ">500k" },
  "action": { "model_sequence": ["mimo", "qwen", "qwen_coder", "kimi"] }
}
```

## Benchmark 数据参考（2026年4月）

### Agentic 能力排名
| 模型 | Terminal-Bench | Arena.Elo | 评分 |
|------|---------------|------------|------|
| MiniMax-M2.7 | 57 | - | 0.95 |
| MiMo-V2-Pro | 86.7 | 1411 | 0.93 |
| Kimi K2.5 | 50.8 | 1447 | 0.90 |
| GLM-5 | 81 | 1456 | 0.85 |

### Coding 能力排名
| 模型 | SWE-bench | LiveCodeBench | 评分 |
|------|-----------|---------------|------|
| Qwen3.6 Plus | - | 1454 (Arena) | 0.95 |
| GLM-5 | - | 1441 (Arena) | 0.88 |
| Kimi K2.5 | 76.8 | 85 | 0.85 |
| MiMo-V2-Pro | - | - | 0.78 |

### 上下文长度
| 模型 | Context |
|------|---------|
| MiMo-V2-Pro | **1M** |
| Qwen2.5-1M | 1M |
| GLM-5 | 200K |
| Kimi K2.5 | 128K |

## 冲突解决原则

当不同数据源冲突时：
- **Agentic 任务**：Terminal-Bench > Arena > BenchLM
- **Coding 任务**：SWE-bench > LiveCodeBench > Arena
- **通用偏好**：Arena.Elo 是最终参考

## 重要原则

1. **数据不足不可信**：< 5 benchmarks 的模型不进关键 slot
2. **新模型等 2-4 周**：等独立评测跟上
3. **用户反馈优先**：实际使用效果 > 任何榜单
4. **保持保守**：不确定时不动，等数据成熟
5. **⚠️ API Key 同步规则**：更新 `.env` 中的 key 后，必须同步更新 `auth-profiles.json` 中对应 provider 的 key。Gateway 从 auth-profiles 加载 key（优先级高于 .env 里的 `${VAR}` 替换）。key 变更后需清除对应 provider 的 `cooldownUntil`、`errorCount`、`failureCounts` 字段并设置 `lastFailureAt: null`，否则 gateway 会继续使用旧 key 并进入 auth cooldown。

## 触发条件

当用户：
- 添加了新的模型 provider
- 购买了新的模型 token plan
- 要求重新评估模型分配
- 报告某个模型"不好用"或"很快但不好"

## 维护文件

| 文件 | 作用 |
|------|------|
| `~/.openclaw/openclaw.json` | 模型定义 |
| `~/.openclaw/workspace/tools/model-router/config.json` | 路由规则 |
| `~/.openclaw/workspace/tools/model-router/lib/tier.js` | 能力评分 |
| `~/.openclaw/agents/main/agent/auth-profiles.json` | ⚠️ Provider API key 缓存 + cooldown 状态 |
| `~/.openclaw/.env` | 环境变量（API key 源） |
