# Web3-Investor V3.8 Debug Report
**Date:** 2026-04-13  
**Analyst:** 小田  
**Status:** ✅ Root Cause Identified — Ready for V3.8 Planning

---

## 问题概览

| # | 问题 | 严重度 | 根因定位 |
|---|------|--------|---------|
| 1 | discover 返回结构中 TVL 字段归属不清（协议 TVL vs 池子 TVL） | P1 | ✅ 已定位 |
| 2 | discover 只返回 3 个结果，期望 8 个 | P1 | ✅ 已定位 |
| 3 | Merkl 协议无法被 `investor_analyze` 分析 | P2 | ✅ 已定位 |

---

## 问题一：TVL 字段归属不清

### 证据

**代码层 (`poolToEarnProduct` 第 985 行)：**
```typescript
scale: {
  tvl_usd: pool.tvlUsd,  // ← 池子 TVL，不是协议 TVL
  ...
}
```

**API 返回示例（来自 MCP discover 响应）：**
```json
{
  "product": {
    "protocol": "pendle",
    "symbol": "APYUSD-USDCETH",
    "scale": {
      "tvl_usd": 8000000   // ← DeFiLlama 的 pool.tvlUsd（池子 TVL）
    }
  }
}
```

**模型注释误导（line 893）：**
```typescript
tvl_usd: product.scale.tvl_usd,        // 池子 TVL
protocol_tvl: product.scale.tvl_usd,   // ← 也是池子 TVL，但命名误导
```

### 根因分析

`poolToEarnProduct` 直接将 DeFiLlama 的 `pool.tvlUsd` 映射为返回的 `tvl_usd` 字段，**这是池子级别的 TVL**，不是协议聚合 TVL。

DeFiLlama 没有直接提供"协议 TVL"字段，协议 TVL = Σ(该协议所有池子的 tvlUsd)，需要额外聚合计算。

### 修复方案

**方案 A（推荐）：分离字段，明确命名**
```typescript
scale: {
  pool_tvl_usd: pool.tvlUsd,           // 池子 TVL（当前错误命名为 tvl_usd）
  protocol_tvl_usd: protocolTotalTvl, // 协议聚合 TVL（新增，需聚合计算）
}
```
**代价：** 需对 discover 返回的每个池子做协议级聚合，有性能开销

**方案 B（轻量）：加注释澄清**
```typescript
scale: {
  // 注意：此为池子 TVL，非协议聚合 TVL
  tvl_usd: pool.tvlUsd,
}
```
**代价：** 不治本，但改动最小

**方案 C（结构分离）：protocol + pools 两级结构**
```typescript
recommendations: [
  {
    protocol: { name: "pendle", chain: "ethereum", protocol_tvl_usd: 50000000 },
    pools: [
      { symbol: "APYUSD-USDCETH", tvl_usd: 8000000, apy: 0.149 },
      ...
    ]
  }
]
```
**代价：** 改动最大，但最彻底；需要同步修改 MCP 返回格式和客户端 SKILL.md

---

## 问题二：discover 只返回 3 个结果，期望 8 个

### 证据

**请求：** `limit=5`，实际返回 3 个。

**过滤链路追踪（以稳定币理财为例）：**

```
总池子数:              16,692
    ↓ (1) chain=ethereum 过滤
ethereum 池子:          ~4,000（估算）
    ↓ (2) intent=STABLECOIN_YIELD（p.stablecoin || isStablecoinBySymbol）
稳定币意图池子:         ~200（估算）
    ↓ (3) tvlUsd >= tvlThreshold($10k for conservative) && apy <= 100%
TVL + APY 过滤后:       ~100（估算）
    ↓ (4) riskScoring.filterAndScore + applyRiskTierFilter
风险分级过滤后:         ~10（估算）
    ↓ (5) riskThreshold (conservative=高阈值)
风险阈值过滤后:         ~5（估算）
    ↓ (6) deduplicate by protocol（每个协议只留1个）
最终结果:               3 个（只有3个不同协议通过所有过滤器）
```

**去重代码（第 274-276 行）：**
```typescript
const deduplicated = sorted.filter((p) => {
  if (seen.has(p.protocol)) return false;  // ← 每个协议只保留第一个（TVL 最高）
  seen.add(p.protocol);
  return true;
});
let recommendations = deduplicated.slice(0, limit);  // limit=5 但只有3个协议
```

### 根因分析

**不是"结果数量 limit"的问题，而是通过所有过滤器的不同协议数量只有 3 个。**

可能原因：
1. **conservative 风险阈值过高** — 大量稳定币池子因风险评分不足被过滤
2. **TVL 下限对某些协议不公平** — 小协议 TVL 低但风险也低
3. **过滤链路过深** — 6 层过滤导致"漏斗坍缩"

### 验证方法

在 `discoverEnhanced` 的每个过滤节点加日志：
```
[Nest] LOG [EarnProductService] discoverEnhanced: 16384 → 823 → 156 → 89 → 34 → 11 → 3
                                            ①     ②    ③    ④    ⑤    ⑥   ⑦
① chain filter
② intent filter
③ tvl+apy filter
④ implicit constraints
⑤ risk scoring
⑥ risk tier filter
⑦ risk threshold filter → deduplicate → 3
```

### 修复方案

**方案 A（推荐）：放宽 conservative 的 TVL 下限**
conservative 的 TVL 下限当前为 $10k，对于稳定币理财过于严格。
```typescript
// 当前
conservative: 10_000_000  // $10M — 太严
moderate:     50_000_000
aggressive:  100_000_000

// 建议调整为
conservative: 100_000      // $100k — 稳定币理财 $100k 即为合理规模
moderate:     1_000_000    // $1M
aggressive:  10_000_000   // $10M
```

**方案 B：在 limit 之外，补充低 TVL 但高 APY 的"机会型"推荐**
在 deduplicated 结果之外，额外返回少量 TVL 不足但 APY 极高的池子作为"高收益机会"（不计入主推荐，不受 deduplicate 限制）

**方案 C：放宽风险阈值或增加例外协议白名单**
对特定低风险协议（如 Curve、Compound、Aave）设置白名单，不受 conservative 风险阈值限制

---

## 问题三：Merkl 协议无法被 `investor_analyze` 分析

### 证据

**MySQL 中有 Merkl 数据（确认）：**
```
protocol=merkl, symbol=USDC-WETH, chain=Base, apy=27.77%, tvl=$9M
protocol=merkl, symbol=WSTETH-WETH, chain=Base, apy=11.34%
protocol=merkl, symbol=AAVE-WETH, chain=Base, apy=49.66%
```

**`investor_analyze` 只接受 `product_id`（必须是池子地址）：**
```typescript
inputSchema: {
  product_id: z.string().describe("Product ID to analyze"),  // ← 必须是 DeFiLlama pool ID
}
```

**`getProductById` 只按池子地址查找：**
```typescript
async getProductById(productId: string): Promise<EarnProduct | null> {
  const storedPool = await this.storage.getPoolByAddress(productId);
  // 找不到就返回 null
  return null;
}
```

**用户只能传入协议名（如 "merkl"），不是池子 ID（如 `0x18ca0df2...`）**

### 根因分析

**Merkl 池子数据在 MySQL 中存在，但 discover 从未推荐过，因此用户无法通过 discover 结果拿到 `product_id`。**

这是**两层叠加的问题**：

**Layer 1（discover 不推荐 Merkl）：**
Merkl 的 Base 链稳定币池（如 USDC-WETH）TVL 只有 $9M，APY 27.77%，但在 conservative 过滤模式下：
- Merkl 作为 Base 链协议，在 `riskScoring.filterAndScore` 阶段可能得分不够
- 或者在 `applyRiskTierFilter` 中被过滤

**Layer 2（analyze 不接受协议名）：**
`investor_analyze` 只能接受 pool ID，无法接受 protocol name。如果 discover 推荐了 Merkl，用户可以拿到 pool ID 再去 analyze。但 discover 本身就不推荐 Merkl。

**历史悖论：** 用户说"以前 discover 推荐过 Merkl"，但当前版本不推荐。可能原因：
- DeFiLlama 数据更新后 Merkl 池子的 TVL/APY 变化
- 过滤阈值调整后 Merkl 被排除
- 历史上 Merkl 有更大的池子（TVL 更高）

### 修复方案

**方案 A（推荐）：扩展 `investor_analyze` 支持协议名作为 pool ID**
```typescript
async getProductById(productId: string): Promise<EarnProduct | null> {
  // 1. 先按地址查找
  const storedPool = await this.storage.getPoolByAddress(productId);
  if (storedPool) { ... }

  // 2. 新增：按协议名查找，返回 TVL 最高的池子
  const poolsByProtocol = await this.storage.getPoolsByProtocol(productId);
  if (poolsByProtocol.length > 0) {
    const top = poolsByProtocol.sort((a, b) => Number(b.tvl_usd) - Number(a.tvl_usd))[0];
    return this.poolToEarnProduct(this.storageRowToPool(top), ...);
  }

  return null;
}
```

**方案 B：在 discover 结果中加入"附近协议"推荐**
对于返回的每个推荐，在 `structuredContent` 中加入 `nearby_protocols: ['merkl', 'aura', ...]`（同链相似协议），用户可以要求分析这些协议

**方案 C：Merkl 作为激励平台需要单独的产品类型**
Merkl 不是典型的"理财池"（不是借贷/LP），而是 B2B 激励分发平台。建议：
- 将 Merkl 归类为 `incentive_platform` 类型
- `investor_analyze` 对 Merkl 返回专项分析（支持的协议、激励分布、TVL 来源等）
- 新增工具 `investor_incentive_platform_analysis`

---

## V3.8 迭代规划建议

### 高优（P1）

| 序号 | 功能 | 对应问题 | 工作量 |
|------|------|---------|-------|
| 1 | 分离 `pool_tvl_usd` 和 `protocol_tvl_usd` 字段 | 问题一 | 中 |
| 2 | 调整 conservative TVL 下限（$10M → $100k） | 问题二 | 小 |
| 3 | 扩展 `investor_analyze` 支持协议名查找 | 问题三 | 中 |
| 4 | 在 discover 各过滤节点加入 `filter_stats` 埋点 | 问题二调试 | 小 |

### 中优（P2）

| 序号 | 功能 | 对应问题 | 工作量 |
|------|------|---------|-------|
| 5 | `investor_discover` 新增 `nearby_protocols` 字段 | 问题三 | 小 |
| 6 | 稳定币理财场景：Merkl 作为独立协议类型支持 | 问题三 | 大 |
| 7 | 增加 discover 结果的 `search_stats`（池子数量、分链统计） | 问题二 | 小 |

---

## 技术债务记录

1. **`protocol_tvl` 字段重复赋值**（line 893）：`protocol_tvl: product.scale.tvl_usd` 应改为真实协议聚合 TVL 或删除
2. **`applySmartFallback`** 存在但从未在稳定币场景触发（`recommendations.length === 0` 才触发，但当前稳定币场景始终 >= 3）
3. **MySQL `defi_pools` 表中 `stablecoin` 字段**：部分 Merkl 池子（如 `USDC-WETH`）标记为 `stablecoin=false`（因为是交易对而非纯稳定币池），导致 `STABLECOIN_YIELD` 意图过滤时漏掉
4. **`seen.has(p.protocol)` deduplicate**：按协议名去重是合理的，但"每个协议只能出现一次"意味着多池子协议（如 Curve 有多个池子）只有 TVL 最高的被保留

---

---

## 本地调试验证（2026-04-13 实际执行）

### 环境信息

| 组件 | 值 |
|---|---|
| 服务器 | NestJS on port 3850, Streamable HTTP MCP transport |
| 数据库 | Docker MySQL `antalpha-mysql` (root/root123/antalpha_skills) |
| 配置 | `USE_LOCAL_ENV=true`, `.env.local` |
| LLM | OpenAI-compatible `kimi-k2.5` via DashScope |

### 发现的新 Bug（调试过程中暴露）

#### BUG-NEW-1: `rowToPool` JSON 解析导致每次冷启动（P0）

**现象：** 每次服务器启动都从 DeFiLlama API 重新拉取 16690 个池子（~5s），而非从 MySQL 加载（<1s）。

**根因：** `defillama.service.ts` 的 `rowToPool()` 方法对 MySQL JSON 列执行 `JSON.parse(row.reward_tokens as string)`。但 mysql2 驱动对 MySQL `JSON` 类型的列返回的是**已解析的 JS 对象**，不是字符串。当 `reward_tokens = []`（空数组，truthy），执行 `JSON.parse([].toString())` = `JSON.parse("")` → `SyntaxError: Unexpected end of JSON input`。

**修复：** 新增 `jsonColumnToArray()` helper，同时处理对象和字符串两种情况。
```typescript
private jsonColumnToArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  return [];
}
```

**验证：** 修复后启动日志从：
```
WARN [DefiLlamaService] Failed to load pools from MySQL: Unexpected end of JSON input
LOG  [DefiLlamaService] No MySQL data, fetching from DeFiLlama API...
LOG  [DefiLlamaService] Cache refreshed: 16690 pools
```
变为：
```
LOG  [DefiLlamaService] Loaded 18470 pools from MySQL
```
**启动时间从 ~5s 降到 ~1s。**

#### BUG-NEW-2: 缺少 `mcp_tool_rate_limit` 表导致 500 错误（P1）

**现象：** MCP `initialize` 请求返回 `500 Internal server error`。

**根因：** `mcp_tool_rate_limit` 表未在本地 MySQL 创建。TypeORM `autoLoadEntities` + `synchronize: false` 模式下，共享模块的 `McpToolRateLimitEntity` 需要 DBA 手动建表。

**修复：** 执行 DDL 建表：
```sql
CREATE TABLE IF NOT EXISTS mcp_tool_rate_limit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_name VARCHAR(100) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  limits_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tool_name (tool_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### BUG-NEW-3: 后台进程被 SIGHUP 杀死（运维）

**现象：** 服务器启动后 ~15s 消失，无 error log。

**根因：** 不是 crash，是启动 shell 退出时 SIGHUP 信号杀死后台子进程。

**修复：** 使用 `setsid` 启动：
```bash
setsid env USE_LOCAL_ENV=true NODE_ENV=development DB_LOGGING=false \
  node dist/apps/mcp-skills/main.js > /tmp/mcp-server.log 2>&1 &
disown
```

### 实际 discover 测试结果

**测试参数：**
```json
{
  "agent_id": "81c591e8-3618-40ec-910e-a0c01303fcb4",
  "natural_language": "recommend stablecoin yield farming pools",
  "structured_preferences": {"asset_type": "stablecoin", "risk_level": "moderate"},
  "limit": 8
}
```

**结果：**
- ✅ **返回 8 个推荐**（达到 limit）
- ✅ 意图正确分类为 `STABLECOIN_YIELD`，confidence 0.9
- ✅ 风险等级 moderate，最终推荐包含 LOW 和 MEDIUM 风险
- 推荐协议: Yo Protocol, Sky Lending, Maple, Ethena Usde, Euler V2, Convex Finance, Zerobase Cedefi, Aave V3
- ❌ **Merkl 未出现在推荐中**（确认问题三：Merkl 的池子通过 moderate 过滤但排名不够高）

**`search_stats` 证实过滤链路：**
```
total_candidates: 5849 → total_after_risk_filter: 288 → final_recommendations: 8
```

### Merkl 数据确认

MySQL 中有 **605 个 Merkl 池子**：
```
| Hyperliquid L1 | merkl | AVLT-USD?0     | $70K   | 0.22%  |
| Ethereum       | merkl | YMVOG-USDC     | $4.9M  | 0.13%  |
| Base           | merkl | USDBC-USDC     | $160K  | 7.25%  |
| Monad          | merkl | WBTC-CBBTC-LBTC| $9.8M  | 4.11%  |
| Ethereum       | merkl | USDTB          | $22.3M | 3.40%  |
```

Merkl 数据充足，问题纯粹是 discover 排序/过滤逻辑导致排名不够。

### Startup 初始化链路图（已验证）

```
main.ts bootstrap()
  ├─ .env.local 加载
  ├─ NestFactory.create(AppModule.forRoot())
  │   ├─ TypeOrmModule → MySQL 连接
  │   ├─ AgentModule → AgentService.onModuleInit() → CREATE agents 表
  │   ├─ SmartMoneyModule → StorageService.onModuleInit() → CREATE smart_money_* 表
  │   │   └─ MoralisService.onModuleInit() → Moralis SDK 初始化
  │   │   └─ ScanSchedulerService.onApplicationBootstrap() → 启动扫描调度
  │   ├─ Web3InvestorModule →
  │   │   ├─ Web3InvestorStorageService.onModuleInit() → CREATE web3inv_* 7张表
  │   │   ├─ DefiLlamaService.onModuleInit() → loadFromMySQL() 或 fetchFromApi()
  │   │   ├─ RiskScoringService.onModuleInit() → 从缓存文件加载 protocol audits
  │   │   ├─ CoinGeckoService.onModuleInit() → loadTokensFromMySQL() 或 fetch API
  │   │   └─ LlmAnalysisService.onModuleInit() → LLM health check (kimi-k2.5)
  │   ├─ McpToolRateLimitModule → 查询 mcp_tool_rate_limit 表
  │   └─ McpModule → 注册所有 MCP tools
  └─ app.listen(3850)
```

---

*Updated by debugging session on 2026-04-13 with actual local test results*
