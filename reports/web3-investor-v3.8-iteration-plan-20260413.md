# Web3-Investor V3.8 迭代规划
**版本目标：** Web3-Investor 能力必须全面领先于直接调用 LLM 的返回结果  
**规划日期：** 2026-04-13  
**负责人：** 小田 + 团队  

---

## 一、竞争定位：MCP vs LLM 各自优劣势

这是 V3.8 设计的核心出发点。

| 维度 | Web3-Investor MCP | 直接 LLM 搜索（Tavily） |
|------|-----------------|----------------------|
| **数据实时性** | ✅ DeFiLlama 实时池数据 | ⚠️ 受爬虫频率限制 |
| **结构化数值**（APY/TVL/风险评分） | ✅ 精确到小数点 | ❌ 模糊区间或过时 |
| **覆盖范围** | ⚠️ 仅 DeFiLlama 收录的协议 | ✅ 任意网络协议 |
| **新兴协议发现** | ❌ 新协议未收录则无法推荐 | ✅ 可搜索任意协议 |
| **风险评估** | ✅ 量化风险评分模型 | ❌ 定性描述 |
| **历史表现** | ⚠️ 仅当次 discover 结果 | ⚠️ 依赖网络文章 |
| **洞察深度** | ❌ 池子数据分析 | ✅ 跨源综合叙事能力 |
| **用户意图理解** | ⚠️ 需要 structured_preferences | ✅ 自然语言全支持 |
| **结果可解释性** | ⚠️ 只有数值，无叙事 | ✅ AI 整合解释 |

**V3.8 的核心策略：** 强化 MCP 的结构性数据优势，补足 LLM 的叙事性洞察优势，在每一个维度上都胜出。

---

## 二、竞争差距根因分析（V3.7 问题清单）

基于 V3.7 Debug Report，确认以下能力差距：

### Gap 1：数据深度不足（导致 LLM 叙事优势明显）
- `tvl_usd` 字段含义不清（池子 vs 协议）
- 返回结果没有**协议聚合 TVL**、**历史 APY**、**风险调整收益**
- `investor_analyze` 的 `llm_insights` 内容空洞，无风险调整建议

### Gap 2：覆盖率不足（LLM 可发现任意协议，MCP 只能推荐数据库中的池子）
- Merkl 协议在 MySQL 有池子数据，但 discover 从未推荐
- `investor_analyze` 只接受 pool ID，不接受 protocol name
- 没有"探索发现"模式（只按意图过滤，没有相似协议扩展）

### Gap 3：结果数量不足（LLM 能给出更多候选，MCP 只有 3 个）
- conservative 模式 TVL 下限 $10M 过高
- 去重后只有 3 个协议，无法满足用户"给我更多选择"的需求
- 没有 `search_stats` 让用户感知剩余机会

### Gap 4：洞察质量不足（LLM 能整合多源信息，MCP 只有池子数据）
- 没有智能排序（按"风险调整收益"而非简单 APY）
- 没有"相比市场平均"的基准对比
- 没有"当前是否适合入场"的时机信号

---

## 三、V3.8 功能规划

### 3.1 能力矩阵：每个查询场景，MCP 都必须比 LLM 强

| 用户查询类型 | MCP V3.8 能力 | LLM 弱项 |
|------------|------------|---------|
| "我该投哪个稳定币理财" | Top 8 池子 + 风险调整排序 + 基准对比 | 只有泛泛推荐，无结构化数据 |
| "帮我分析 Curve 和 Pendle" | 结构化对比 + 风险雷达图 + 收益来源拆解 | 模糊定性，无真实数字 |
| "Merkl 是什么，能投吗" | ✅ 支持协议名查询 + Merkl 专项分析 | 需要多次搜索，无结构化 |
| "我亏钱的概率大吗" | 量化风险评分 + 历史最大回撤 + 清算风险 | 定性描述 |
| "给我所有 Base 链稳定币理财" | 全量列表 + 链级聚合统计 | 无结构化，只能列几个 |

---

### 3.2 功能清单（按优先级）

#### 🔴 P0 — 必须修复（直接影响核心信任）

**P0.1：修复 TVL 字段语义**
- 新增 `pool_tvl_usd` 替换 `tvl_usd`（保持向后兼容alias）
- 新增 `protocol_tvl_usd`（按协议聚合，需估算）
- 在返回结构中明确标注 `scale.pool_tvl_usd` vs `scale.protocol_tvl_usd`
- **竞争价值：** 消除用户最大困惑，数据可信度提升

**P0.2：修复 stablecoin discover 只返回 3 个的问题**
- 调整 conservative 模式 TVL 下限：$10M → $100k
- 调整 moderate 模式 TVL 下限：$50M → $1M
- 增加 `search_stats`：每个过滤步骤的池子数量，让用户看到"为什么只有3个"
- **竞争价值：** 覆盖率直接提升，LLM 能列出更多，MCP 必须更多

**P0.3：扩展 `investor_analyze` 支持协议名**
- `getProductById` 增加"按协议名查找"逻辑：找到该协议 TVL 最高的池子
- 如果是 Merkl 协议，返回 Merkl 专项分析（incentive platform 类型）
- **竞争价值：** 消除"知道但查不了"的体验断层，LLM 可以直接分析任意协议

#### 🟡 P1 — 增强洞察（让 LLM 叙事优势消失）

**P1.1：增强 `investor_analyze` 的洞察质量**
- 增加"风险调整收益"：`apy / risk_score` 标准化分数
- 增加"收益来源拆解"：`apy_base`（基础收益）+ `apy_reward`（激励收益）+ 激励可持续性评估
- 增加"对比基准"：`vs_aave_usdc_apy`（给你一个市场基准）
- 增加"清算风险评估"（针对借贷类协议）
- **竞争价值：** 超越 LLM 泛泛而谈，给出有行动价值的分析

**P1.2：增强 `investor_compare` 返回质量**
- 当前只返回 3 个维度的空数据（`apy: {}`, `risk_score: {}`, `tvl_usd: {}`）
- 修复为真实数据对比，并增加：
  - `risk_adjusted_score` 排名
  - `best_for` 标签（"最适合保守型"、"最高收益"等）
  - `winner` 标记
- **竞争价值：** 结构化对比碾压 LLM 的文字对比

**P1.3：新增 `investor_explore`（探索模式）**
- 给定一个协议或链，推荐"相似协议"和"相邻机会"
- 例：`investor_explore({ protocol: "pendle" })` → 返回同类收益聚合协议（Aera、Apwine、Tempus）
- 例：`investor_explore({ chain: "base" })` → 返回 Base 链所有稳定币池的聚合统计
- **竞争价值：** LLM 的"你可能也喜欢"能力，但基于数据而非猜测

#### 🟢 P2 — 差异化护城河（让 LLM 无法追赶）

**P2.1：新增"风险调整排名"模式**
- 默认排序不再是 `apy` 或 `tvl`，而是 `apy / risk_score`
- 用户能一眼看出"性价比最高的池子"
- **竞争价值：** LLM 无法量化这个比值，需要自己计算

**P2.2：新增 `smart_money_signals`（智能资金信号）**
- 复用的是现有的 `smart-money-signal` 工具（位于 `libs/skills/smart-money/src/tools/smart-money.tools.ts`），**无需修改 Smart Money 模块本身**
- 在 `investor_analyze` 的 `analyzeProduct` 阶段，根据池子的 `underlying_tokens` 提取底层资产（如 USDC/USDT/WETH），调用 `smart-money-signal(tokenSymbol=XXX, limit=5)`，将结果作为 `insight.smart_money_signal` 字段附加
- **竞争价值：** 独家链上资金流数据，LLM 无法从公开文章获取

**P2.3：新增 `incentive_sustainability_score`（激励可持续性）**
- 对有激励收益的池子，评估激励代币的可持续性（TVL/激励代币排放率）
- 防止用户被超高 APY（但激励即将结束）的池子误导
- **竞争价值：** 防止用户踩坑，这是 LLM 文章里很少明确说的

**P2.4：Merkl 协议专项支持**
- 将 Merkl 识别为 `incentive_platform` 类型
- `investor_analyze` 对 Merkl 返回：
  - 支持哪些协议（Curve、Aave、Compound 等）
  - 当前激励分布（哪些池子获得激励，力度多大）
  - 历史激励变化趋势
- **竞争价值：** LLM 对 Merkl 这类 B2B 平台的信息极少且过时

---

## 四、技术方案

### 4.1 字段结构变更（SKILL.md v3.8）

**新增统一返回格式（recommendation 项）：**
```typescript
interface EarnProductV38 {
  protocol: string;
  chain: string;
  symbol: string;
  pool_id: string;                    // ← 新增：明确为池子ID，非协议ID
  
  scale: {
    pool_tvl_usd: number;             // ← 重命名：原 tvl_usd，池子 TVL
    protocol_tvl_usd: number;         // ← 新增：协议聚合 TVL
  };
  
  yield: {
    apy: number;                      // 总 APY
    apy_base: number;                 // 基础收益（借贷利率/手续费）
    apy_reward: number;               // 激励收益（代币激励）
    apy_total_reported: number;       // DeFiLlama 报告的 APY（用于对比）
    vs_benchmark_bps: number;         // ← 新增：相对 Aave USDC 的超额收益（basis points）
    risk_adjusted_score: number;      // ← 新增：apy / risk_score，标准化风险调整收益
  };
  
  risk: {
    risk_score: number;               // 量化风险评分（0-100，越高越安全）
    risk_level: "conservative" | "moderate" | "aggressive";
    liquidation_depth_pct?: number;   // ← 新增：清算阈值距离（%）
    impermanent_loss_risk: boolean;
    audit_count: number;
    stablecoin: boolean;
  };
  
  insight: {
    yield_source: string;             // ← 新增："借贷利率+流动性手续费+协议激励"
    incentive_sustainability: "high" | "medium" | "low";  // ← 新增
    smart_money_signal?: {            // ← 新增
      flow: "inflow" | "outflow" | "neutral";
      confidence: "high" | "medium" | "low";
    };
  };
  
  compare?: {
    vs_aave_usdc_apy_pct: number;     // 相对 Aave USDC 的年化超额收益
    best_for: string[];               // ["保守型投资者", "短期持有"]
    recommendation: "首选" | "候选" | "高风险";
  };
}
```

**新增 explore 返回格式：**
```typescript
interface ExploreResultV38 {
  intent: {
    source_protocol?: string;
    source_chain?: string;
  };
  nearby_protocols: Array<{
    protocol: string;
    chain: string;
    tvl_usd: number;
    apy: number;
    similarity_reason: string;         // "同为收益聚合器"、"同在Base链"
    top_pool_id: string;              // 可以直接传入 analyze
  }>;
  chain_summary?: {                   // 如果是 chain explore
    total_tvl_usd: number;
    pool_count: number;
    top_protocols: string[];
    avg_apy: number;
  };
}
```

### 4.2 API 变更

**investor_discover v3.8 新增参数：**
```typescript
{
  agent_id: string;
  natural_language?: string;
  structured_preferences?: {
    asset_type?: "stablecoin" | "btc" | "eth" | "any";
    risk_level?: "conservative" | "moderate" | "aggressive";
    chain?: string;
    min_apy?: number;
    max_apy?: number;
    min_tvl?: number;
    sort_by?: "apy" | "tvl" | "risk_adjusted";  // ← 新增
  };
  limit?: number;         // 上限从 10 提升到 20
  include_explore?: boolean;  // ← 新增：是否返回 nearby_protocols
}
```

**investor_analyze v3.8 新增参数：**
```typescript
{
  agent_id: string;
  product_id: string | ProtocolName;  // ← 支持协议名
  protocol_type?: "pool" | "incentive_platform";  // ← 新增：自动识别
  analysis_depth?: "basic" | "detailed" | "full";
  include_comparison?: boolean;        // ← 新增：是否包含与同类产品的对比
  include_smart_money?: boolean;      // ← 新增：是否包含聪明钱信号
}
```

**新增 investor_explore：**
```typescript
{
  agent_id: string;
  explore_type: "similar_protocol" | "chain_overview";
  protocol?: string;    // 用于 similar_protocol
  chain?: string;       // 用于 chain_overview
  limit?: number;
}
```

### 4.3 数据层增强

**A. TVL 聚合计算（新增 `getProtocolTvl`）：**
```typescript
// 在 EarnProductService 中
async getProtocolTvl(protocol: string, chain?: string): Promise<number> {
  const pools = await this.storage.getPoolsByProtocol(protocol, chain);
  return pools.reduce((sum, p) => sum + Number(p.tvl_usd || 0), 0);
}
```

**B. 基准对比计算：**
```typescript
// Aave USDC 基础收益作为市场基准（可缓存，每天更新）
const BENCHMARK_APY = 0.045; // 从 DeFiLlama API 获取实时值

// 每个池子的 vs_benchmark_bps
vs_benchmark_bps = (pool_apy - BENCHMARK_APY) * 10000; // 转换为 basis points
```

**C. 激励可持续性评分：**
```typescript
// 对每个有激励收益的池子
incentive_sustainability = (pool_tvl_usd / annual_reward_token_value) > 3 ? "high" : 
                          (pool_tvl_usd / annual_reward_token_value) > 1 ? "medium" : "low";
// TVL 远大于激励代币价值 = 激励可持续，不依赖新资金持续流入
```

### 4.4 Smart Money 集成（Token 级情绪信号）

**前提条件：** Smart Money MCP 模块已在 `libs/skills/smart-money/` 完整实现并可用，无需修改该模块。

**现有 Smart Money 工具能力盘点：**

| 工具 | 功能 | 关键字段 |
|------|------|---------|
| `smart-money-signal` | 获取聪明钱信号 | `direction`(in/out) + `level`(high/medium/low) + `tokenSymbol` + `valueUsd` |
| `smart-money-list` | 列出监控地址 | 公开 whale 池 + 用户自添加地址 |
| `smart-money-watch` | 监控特定地址 | 实时推送 |
| `smart-money-custom` | 添加自定义钱包 | 按类型(fund/whale/dex_trader)分组 |
| `smart-money-scan` | 主动扫描 | 批量扫描自添加地址 |

**数据来源：** Moralis API（链上 token 转账追踪）

**⚠️ 当前限制（Scope 边界）：**
- Smart Money 模块是**钱包级**信号（地址 A 转了 X USDC）
- 无法直接判断该 USDC 是否流入了某个特定 DeFi 池子合约
- **V3.8 接入的是 Token 级情绪**，不是 Pool 级流入信号

**集成方案（V3.8 — Token 级，复用现有工具，无需修改 Smart Money）：**

```typescript
// earn-product.service.ts 新增方法
async getSmartMoneySentiment(tokenSymbol: string): Promise<SmartMoneySentiment | null> {
  try {
    // 调用 Smart Money MCP 工具（内部 HTTP 调用）
    const signals = await this.smartMoneyService.getSignals({
      tokenSymbol,
      limit: 5,
    });

    if (!signals || signals.length === 0) {
      return { sentiment: "neutral", confidence: "low", signals: [] };
    }

    // 计算情绪净值：buy - sell
    const buySignals = signals.filter(s => s.action === "buy");
    const sellSignals = signals.filter(s => s.action === "sell");
    const buyVolume = buySignals.reduce((sum, s) => sum + s.valueUsd, 0);
    const sellVolume = sellSignals.reduce((sum, s) => sum + s.valueUsd, 0);
    const totalVolume = buyVolume + sellVolume;

    const sentimentScore = totalVolume > 0
      ? (buyVolume - sellVolume) / totalVolume  // -1 到 +1
      : 0;

    const confidence = signals.length >= 5 ? "high" : signals.length >= 2 ? "medium" : "low";

    return {
      sentiment: sentimentScore > 0.2 ? "inflow" : sentimentScore < -0.2 ? "outflow" : "neutral",
      sentiment_score: (sentimentScore + 1) / 2,  // 转换为 0-1
      confidence,
      signals: signals.slice(0, 3).map(s => ({
        action: s.action,
        value_usd: s.valueUsd,
        level: s.level,
        token_symbol: s.tokenSymbol,
      })),
    };
  } catch (e) {
    // Smart Money 服务不可用时降级，不阻塞主流程
    return null;
  }
}
```

**在 `analyzeProduct` 中集成：**
```typescript
// 当 include_smart_money=true 时，提取池子底层资产获取情绪信号
if (includeSmartMoney) {
  const underlyingToken = product.asset?.underlying_tokens?.[0];
  if (underlyingToken) {
    const smSentiment = await this.getSmartMoneySentiment(underlyingToken);
    product.insight.smart_money_signal = smSentiment;
  }
}
```

**V3.9 目标（Pool 级，需扩展 Smart Money）：**
```typescript
// 扩展 smart-money.config.ts，增加池子合约地址追踪
const PUBLIC_POOL_PROTOCOLS = [
  { protocol: "pendle", poolAddress: "0x6080608...", chain: "ethereum" },
  { protocol: "curve", poolAddress: "0x...", chain: "ethereum" },
];

// 新增工具：smart-money-protocol-signal
// 直接返回 whale 地址与特定 DeFi 池子合约的交互信号
```

### 4.5 Merkl 专项处理

```typescript
// 在 earn-product.service.ts 中
async analyzeMerklProtocol(poolId: string): Promise<MerklAnalysis> {
  // 获取 Merkl API 数据（如果 DeFiLlama 没有）
  // 或通过网页抓取 merkl.xyz 的激励数据

  return {
    type: "incentive_platform",
    supported_protocols: ["curve", "aave", "compound", "balancer"],
    active_incentives: [...],
    tvl_contribution_per_protocol: {...},
    incentive_sustainability: assessIncentiveSustainability(...),
  };
}

// 在 getProductById 中
if (protocolName === "merkl") {
  return this.analyzeMerklProtocol(productId);
}
```

---

## 五、SKILL.md 变更要点（英文版）

**针对客户端 SKILL.md v3.8 更新：**

1. **更新 `investor_discover` 返回字段说明**（全英文重写）
2. **更新 `investor_analyze` 新增参数**（protocol_type、include_comparison、include_smart_money）
3. **新增 `investor_explore` 工具说明**
4. **删除所有对旧字段的引用**（tvl_usd → pool_tvl_usd）
5. **新增"竞争优势"说明**（为什么选 MCP 而非 LLM 直搜）

---

## 六、交付检查清单

| 功能 | 类型 | 状态 | 文件变更 |
|------|------|------|---------|
| `pool_tvl_usd` + `protocol_tvl_usd` 分离 | P0 | 待开发 | earn-product.service.ts |
| conservative TVL 下限调整 | P0 | 待开发 | earn-product.service.ts |
| `search_stats` 全链路埋点 | P0 | 待开发 | earn-product.service.ts |
| `investor_analyze` 支持协议名 | P0 | 待开发 | earn-product.service.ts |
| 修复 `investor_compare` 空数据 | P1 | 待开发 | web3-investor.tools.ts |
| `vs_benchmark_bps` + `risk_adjusted_score` | P1 | 待开发 | earn-product.service.ts |
| `investor_explore` 新工具 | P1 | 待开发 | web3-investor.tools.ts |
| `incentive_sustainability_score` | P2 | 待开发 | earn-product.service.ts |
| `smart_money_signals`（Token级） | P2 | 待开发 | earn-product.service.ts（调用现有 smart-money-signal，无需改 SmartMoney 模块） |
| Merkl 专项分析 | P2 | 待开发 | earn-product.service.ts |
| SKILL.md v3.8 英文版更新 | 所有 | 待开发 | SKILL.md |
| GitHub 提交 + ClawHub 发布 | - | 待开发 | - |

---

## 七、竞争护城河构建策略

**让 LLM 在以下维度永远追不上 Web3-Investor：**

1. **量化风险调整收益**：`apy / risk_score` 是独家计算，LLM 无法从公开文章获取
2. **激励可持续性评分**：需要池子 TVL 和激励代币排放的精确数据，LLM 只能定性描述
3. **全链路过滤透明度**：`search_stats` 让用户看到数据规模，LLM 做不到
4. **结构化多池子对比**：一次性返回 8 个池子的完整对比，LLM 只能列出 3-4 个
5. **协议级 + 池子级双维度**：LLM 只有协议描述，MCP 有协议+池子两级数据
6. **聪明钱链上信号**：`smart-money-signal` 提供实时链上资金流向，LLM 的信息有延迟

**V3.8 的核心哲学：**
> "不只告诉你投哪个池子，而是告诉你**为什么这个池子在这个时刻是最佳选择**，以及**相比市场基准的超额收益有多少**、**顶级 whale 最近在怎么操作这个资产**。"

**Smart Money 集成要点（重要！）：**
- **V3.8 用 Token 级**，只需在 `earn-product.service.ts` 调用现有 `smart-money-signal`，**不碰 `libs/skills/smart-money/`**
- Smart Money 模块在 `~/antalpha-com/antalpha-skills/libs/skills/smart-money/`
- 关键文件：`smart-money.tools.ts`（工具注册）、`signal-engine.service.ts`（信号生成）、`storage.service.ts`（MySQL 读写）
- Smart Money MySQL 表前缀：`signals_`（交易表）、`transactions`（转账表）

---

*Generated by 小田 | Web3-Investor V3.8 Planning*
*基于 V3.7 Debug Report + Web3-Investor vs Tavily Comparison Report*
*Smart Money 集成方案：2026-04-13 确认可复用现有 `smart-money-signal` 工具，无需修改 Smart Money 模块*
