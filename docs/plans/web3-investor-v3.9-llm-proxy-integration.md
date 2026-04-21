# Web3 Investor V3.9 — LLM Proxy 计费集成

> 作者：丁丁 & Sisyphus AI Agent
> 日期：2026-04-20
> 分支：`web3-investor-v3.9-llm-proxy`

---

## 1. 为什么要做这个

之前 Web3 Investor 调用大模型的方式很"原始"——每个 Service 自己用 axios 直接调 OpenAI / Anthropic 的 API。这带来几个问题：

- **没法按 agent 计量 token 用量** — 不知道哪个 bot / agent 花了多少钱
- **没有额度控制** — 一个异常 agent 可以把共享的 API key 额度用完
- **API key 管理分散** — 每个 skill 独立读取 `LLM_API_KEY`，不安全
- **没有可观测性** — 无集中日志记录谁调用、何时、多少 token
- **重试 / 熔断逻辑不一致** — 每个 skill 自己实现一套

**一句话目标**：把直接 HTTP 调大模型的方式，换成调公司内部的 `LlmProxyService` 统一代理层。

---

## 2. 架构变化

```
之前:
  IntentLlmService ──axios──→ OpenAI / Anthropic API
  LlmAnalysisService ──axios──→ OpenAI / Anthropic API

之后:
  IntentLlmService ──→ LlmProxyService ──→ BillingWorker ──→ DB (llm_token_usage)
  LlmAnalysisService ──→ LlmProxyService ──→ BillingWorker ──→ DB (llm_token_usage)
```

---

## 3. 具体改了什么

### 3.1 模块接入 (`web3-investor.module.ts`)

加了 `LlmProxyModule` 的 import，让 NestJS 的依赖注入体系能把 `LlmProxyService` 注入到我们的 Service 里。

```typescript
// 只加了这一行 import 和 module 引用
import { LlmProxyModule } from "@antalpha/libs-skills-llm-proxy";

@Module({
  imports: [ConfigModule, LlmProxyModule],
  // ...
})
```

### 3.2 IntentLlmService 重构 (`intent-llm.service.ts`)

**之前**：自己拼 HTTP 请求，根据 `LLM_PROVIDER` 环境变量判断调 OpenAI 还是 Anthropic，自己处理重试。包含 6 个辅助方法。

**之后**：一行 `this.llmProxy.createChatCompletion(...)` 搞定。

```typescript
const response = await this.llmProxy.createChatCompletion({
  prompt,
  systemPrompt: this.SYSTEM_PROMPT,
  agentId: agentId || "unknown",
  operationType: "web3-investor-intent-classification",
  tier: "fast-cheap",
  temperature: 0.3,
  modelOverride: INTENT_MODEL,  // 默认 gemini-3-flash-preview
});
```

**删除了**：`callOpenAI()`、`callAnthropic()`、`getProvider()`、`getModel()`、`getApiKey()`、`getBaseUrl()` 共 6 个方法，以及 `axios` 和 `ConfigService` 的依赖。

### 3.3 LlmAnalysisService 重构 (`llm-analysis.service.ts`)

**这是改动最大的文件**，839 行 → 556 行（砍了约 280 行）。

#### 深度分析 `analyzeOpportunityWithLLM()`

```typescript
const response = await this.llmProxy.createChatCompletion({
  prompt: userPrompt,
  systemPrompt,
  agentId: agentId || "unknown",
  operationType: "web3-investor-yield-analysis",
  tier: depth === "basic" ? "fast-cheap" : "high-reasoning",
  temperature: 0.7,
  modelOverride: ANALYSIS_MODEL,  // 默认 zai.glm-5
});
```

- `tier` 根据 depth 动态选择：basic → `fast-cheap`，detailed/full → `high-reasoning`
- temperature 0.7（分析场景需要一定创造性）

#### 产品对比 `analyzeComparison()`

```typescript
const content = await this.llmProxy.createChatCompletion({
  prompt,
  systemPrompt,
  agentId: agentId || "unknown",
  operationType: "web3-investor-product-comparison",
  tier: "fast-cheap",
  temperature: 0.3,
});
```

#### 缓存计费 (Cache Billing)

当命中 L1 内存缓存或 L2 MySQL 缓存时，以 fire-and-forget 方式记录一笔计费：

```typescript
// 命中缓存时，异步记账（不阻塞用户响应）
if (agentId) {
  this.llmProxy.recordCacheUsage({
    agentId,
    operationType: "web3-investor-yield-analysis",
    originalTokens: 800,
  }).catch(err => this.logger.warn("Cache billing failed", err));
}
```

#### 删除了 12 个方法

`analyzeWithOpenAI()`、`analyzeWithAnthropic()`、`callWithRetry()`、`sleep()`、`healthCheck()`、`healthCheckOpenAI()`、`healthCheckAnthropic()`、`getProvider()`、`getModel()`、`getApiKey()`、`getBaseUrl()`、以及 `axios` 和 `ConfigService` 依赖。

### 3.4 agentId 穿透 (3 个文件)

从 MCP Tools 层到 Proxy 调用的完整链路：

```
investor_discover ──→ intentService.classifyIntent(input, agent_id)
                        └──→ intentLlmService.analyzeIntent(input, agentId)
                                  └──→ llmProxy.createChatCompletion({ agentId })

investor_analyze ──→ earnProductService.analyzeProduct(product, depth, agent_id)
                       └──→ llmAnalysisService.analyzeOpportunityWithLLM(..., agentId)
                                └──→ llmProxy.createChatCompletion({ agentId })

investor_compare ──→ llmAnalysisService.analyzeComparison(products, agent_id)
                        └──→ llmProxy.createChatCompletion({ agentId })
```

这样 proxy 才能知道"这次调用是哪个 agent 发起的"，才能按 agent 记账。

### 3.5 模型可配置化 (`llm-models.ts`)

新增一个小文件，让模型名称可以通过环境变量覆盖：

```typescript
// libs/skills/web3-investor/src/services/llm-models.ts
export const INTENT_MODEL = process.env.WEB3_INVESTOR_INTENT_MODEL || "gemini-3-flash-preview";
export const ANALYSIS_MODEL = process.env.WEB3_INVESTOR_ANALYSIS_MODEL || "zai.glm-5";
```

**本地开发**：在 `.env.local` 中设置自己的模型即可：
```bash
WEB3_INVESTOR_INTENT_MODEL=kimi-k2.5
WEB3_INVESTOR_ANALYSIS_MODEL=kimi-k2.5
```

**生产环境**：不设这两个变量，走默认的 gemini / glm-5。

---

## 4. 3 个 LLM 调用点总览

| # | Service | Method | operationType | Tier | Temperature | 默认模型 |
|---|---------|--------|---------------|------|-------------|----------|
| 1 | IntentLlmService | `analyzeIntent()` | `web3-investor-intent-classification` | `fast-cheap` | 0.3 | gemini-3-flash-preview |
| 2 | LlmAnalysisService | `analyzeOpportunityWithLLM()` | `web3-investor-yield-analysis` | `fast-cheap` / `high-reasoning` | 0.7 | zai.glm-5 |
| 3 | LlmAnalysisService | `analyzeComparison()` | `web3-investor-product-comparison` | `fast-cheap` | 0.3 | zai.glm-5 |

---

## 5. 没改什么

这一点很重要——**解析逻辑、回退逻辑、缓存逻辑完全没动**：

- `parseLLMResponse()` — LLM 返回文本的解析函数，原封不动
- `parseTextResponse()` — 非 JSON 文本的解析函数，原封不动
- `getRuleBasedFallback()` — LLM 失败时的规则回退，原封不动
- `getSystemPrompt()` / `buildUserPrompt()` — prompt 构建逻辑，原封不动
- L1 内存缓存 (Map + TTL) + L2 MySQL 缓存 — 缓存读写逻辑，原封不动
- `getRuleBasedFallback()` 中的 `REVIEW` / `BUY` / `AVOID` 推荐逻辑 — 原封不动

proxy 只替换了 **"发 HTTP 请求给大模型"** 这一层，其他业务逻辑不动。

---

## 6. 文件改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `web3-investor.module.ts` | +2 行 | 导入 LlmProxyModule |
| `intent-llm.service.ts` | 242→165 行 | 删除 axios 调用，改用 proxy |
| `llm-analysis.service.ts` | 839→556 行 | 删除 ~280 行 HTTP 逻辑，改用 proxy + cache billing |
| `intent.service.ts` | +2 行 | agentId 参数穿透 |
| `earn-product.service.ts` | +2 行 | agentId 参数穿透 |
| `web3-investor.tools.ts` | +3 行 | 传递 agent_id 到 3 个调用点 |
| `llm-models.ts` | 新建 | 模型名称可配置化 |
| `test-utils.ts` | 新建 | 测试 mock 工具 |
| `llm-analysis-retry.test.ts` | 重写 | 14 个测试全改用 proxy mock |
| `llm-prompt.test.ts` | +2 行 | 构造函数更新 |
| `discover-enhanced.test.ts` | +5 行 | 添加 vi.mock |

**总计**：~400 行删除，~80 行新增

---

## 7. LlmProxyService API 参考

```typescript
interface LlmRequestParams {
  prompt: string;           // 用户 prompt
  systemPrompt?: string;    // 系统 prompt (v1.3+)
  agentId: string;          // agent 标识（用于计费）
  operationType: string;    // 操作类型（用于分类计费）
  tier?: "fast-cheap" | "high-reasoning";  // 模型路由策略
  temperature?: number;     // 温度（默认 0.1）
  modelOverride?: string;   // 直接指定模型（跳过 tier 路由）
  cacheHit?: boolean;       // 缓存命中标记
}

// 普通调用（会实际调 LLM）
llmProxy.createChatCompletion(params): Promise<string>

// 缓存计费（不发 LLM 请求，只记账）
llmProxy.recordCacheUsage(params): Promise<void>
```

---

## 8. 如何为其他 Skill 做同样的集成

如果你的 skill 也需要接入 LlmProxyService，步骤如下：

1. **Module 层**：在你的 `<skill>.module.ts` 中 `import { LlmProxyModule } from "@antalpha/libs-skills-llm-proxy"`
2. **Service 层**：构造函数注入 `private readonly llmProxy: LlmProxyService`
3. **替换调用**：把 `axios.post(...)` 替换为 `this.llmProxy.createChatCompletion({ prompt, agentId, operationType, tier, temperature })`
4. **agentId 穿透**：从 Tools 层一路传递 `agentId` 到 proxy 调用
5. **删掉旧代码**：`ConfigService`（LLM 相关）、axios（LLM 相关）、provider 切换逻辑、重试逻辑
6. **测试更新**：mock `LlmProxyService` 替代 mock axios
7. **添加 vi.mock**：`vi.mock("@antalpha/libs-skills-llm-proxy", () => ({ LlmProxyService: class {}, LlmProxyModule: class {} }))`

---

## 9. 本地开发配置

在 `apps/mcp-skills/.env.local` 中添加：

```bash
# Web3 Investor — 本地模型覆盖（可选，不设则走 proxy 默认模型）
WEB3_INVESTOR_INTENT_MODEL=你的本地模型
WEB3_INVESTOR_ANALYSIS_MODEL=你的本地模型
```

需要确保 `LLM_PROVIDER`、`LLM_API_KEY`、`LLM_BASE_URL` 这些 proxy 所需的配置也在 `.env.local` 中正确设置。
