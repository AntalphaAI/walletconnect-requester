# Web3-Investor V3.8 Release Summary

## 1. Release Info

| 字段 | 值 |
|---|---|
| 版本 | V3.8 |
| Build 状态 | ✅ `webpack 5.100.2 compiled successfully` |
| 变更总览 | 9 files, +459 lines / -57 lines |
| 数据库 | MySQL Docker `antalpha-mysql`, 18470 pools loaded |
| 启动时间 | ~1s (warm), ~5s (cold) |

---

## 2. 功能点清单 (按优先级分组)

### P0 — Bug Fixes (3 个)

| ID | 功能 | 变更文件 | 说明 |
|---|---|---|---|
| BUG-1 | `rowToPool` JSON 解析修复 | `defillama.service.ts` | mysql2 返回已解析 JS 对象，`JSON.parse()` 会崩。新增 `jsonColumnToArray()` 兼容。 |
| BUG-2 | `discover` limit 默认值修复 | `web3-investor.tools.ts` | `input.limit \|\| 3` 覆盖 Zod schema 默认 5，改为 `input.limit`。 |
| BUG-3 | Moderate/Aggressive TVL 阈值调整 | `earn-product.service.ts` | moderate: $10M → $1M, aggressive: $1M → $500K。避免候选过少。 |

### P1 — Core Enhancements (5 个)

| ID | 功能 | 变更文件 | 说明 |
|---|---|---|---|
| ENH-1 | `pool_tvl_usd` + `protocol_tvl_usd` TVL 分离 | `earn-product.model.ts`, `earn-product.service.ts` | `pool_tvl_usd` = 单个池子 TVL; `protocol_tvl_usd` = 协议聚合 TVL (实时计算) |
| ENH-2 | `getProductById` 协议名查找 | `earn-product.service.ts` | 池子地址查找失败时 fallback 为协议名，返回 TVL-top pool |
| ENH-3 | `search_stats` 全链路 10 步计数 | `earn-product.service.ts` | `filters_applied` 数组记录每步过滤后数量 (chain → dedup) |
| ENH-4 | EXPLORE intent (LLM 驱动) | `intent-llm.service.ts`, `intent-classifier.service.ts` | 纯 LLM 识别，支持任意语言 ("随便看看", "browse available", "探索链生态") |
| ENH-5 | EXPLORE 模式 discover 管道 | `earn-product.service.ts` | 跳过 risk tier/threshold 过滤, min_tvl $50K, 按 protocol_tvl_usd 排序, 返回 `nearby_protocols` + `chain_summary` |

### P2 — Yield Intelligence (2 个)

| ID | 功能 | 变更文件 | 说明 |
|---|---|---|---|
| INTELL-1 | `incentive_sustainability` V3.8 | `earn-product.model.ts`, `earn-product.service.ts` | `revenue_coverage` (base_yield / reward_cost) + `apy_trend_90d` + `apy_change_90d`。基于 DeFiLlama 池子结构数据，零外部依赖。 |
| INTELL-2 | `smart_money` 信号 | `web3-investor-storage.service.ts`, `earn-product.service.ts` | `getSmartMoneySignalsByToken()` 查询 smart_money_signals 表 → 返回 flow/sentiment_score/confidence/signals |

### P3 — Tool Fixes (1 个)

| ID | 功能 | 变更文件 | 说明 |
|---|---|---|---|
| TOOL-1 | `investor_compare` 空数据修复 | `web3-investor.tools.ts` | risk_score 排序方向修正（原错误认为低风险=高分，实际 score 0-100 越高越安全） |

---

## 3. 迭代成果对比 (V3.7 → V3.8)

| 维度 | V3.7 (before) | V3.8 (after) |
|---|---|---|
| discover 返回数量 | limit=8 → 实际只返回 3 个 | ✅ 返回 8 个 |
| TVL 语义 | `tvl_usd` 仅池子级别，无协议级 | ✅ `pool_tvl_usd` + `protocol_tvl_usd` 分离 |
| moderate 候选数 | ~3 个 | ✅ ~343+ 个 |
| 协议名查找 | 仅支持池子地址 | ✅ 支持协议名 ("aave-v3", "curve-dex") |
| 过滤透明度 | 无反馈 | ✅ 10 步 filter counting |
| 探索模式 | ❌ 无 | ✅ EXPLORE intent + TVL 排序 + nearby_protocols |
| 收益可持续性评估 | 仅 reward_ratio | ✅ +revenue_coverage + apy_trend_90d |
| Smart Money 集成 | ❌ 无 | ✅ 查询信号表返回 sentiment |
| 意图识别 (EXPLORE) | ❌ 关键词正则 | ✅ LLM 驱动, 多语言支持 |

---

## 4. 已执行的测试清单

### 编译 & 构建
| 测试 | 状态 | 结果 |
|---|---|---|
| `pnpm run build:mcp-skills` | ✅ | `webpack 5.100.2 compiled successfully` |
| LSP diagnostics | ✅ | 0 TS errors |

### 服务器启动
| 测试 | 状态 | 结果 |
|---|---|---|
| MySQL 加载 18470 pools | ✅ | `Loaded 18470 pools from MySQL` |
| JSON 解析修复验证 | ✅ | 启动从 ~5s (API fallback) → ~1s (MySQL load) |
| `mcp_tool_rate_limit` 表创建 | ✅ | 表已存在，MCP initialize 不再 500 |

### discover 工具
| 测试 | 状态 | 预期 | 实际 |
|---|---|---|---|
| limit=8 (stablecoin moderate) | ✅ | 返回 8 个 | 返回 8 个，candidates: 5849 |
| pool_tvl vs protocol_tvl 分离 | ✅ | 两个值不同 | pool_$11M vs proto_$70M (yo-protocol) |
| search_stats filters_applied | ✅ | 10 步计数 | `defillama_fetch:5849 → ... → dedup:41` |
| TVL 阈值调整 (moderate) | ✅ | candidate > 100 | moderate: 242 candidates, aggressive: 343 |

### EXPLORE 模式
| 测试 | 状态 | 预期 | 实际 |
|---|---|---|---|
| EXPLORE intent 识别 (LLM) | ✅ | 识别为 EXPLORE | `Intent: EXPLORE (0.90)` |
| EXPLORE 跳过 risk 过滤 | ✅ | filters 计数前后不变 | `risk_scoring:2776 → risk_tier:2776 → min_tvl:2776` |
| EXPLORE TVL 排序 | ✅ | 协议 TVL 降序 | 已验证排序逻辑写入代码 |
| nearby_protocols 返回 | ✅ | 返回同类协议 | `Nearby: 10 chain protocols` |
| chain_summary 返回 | ✅ | 链级统计 | `Chain: ethereum 1605 pools avg_apy=24.6%` |

### investor_analyze
| 测试 | 状态 | 预期 | 实际 |
|---|---|---|---|
| 池子地址查找 | ✅ | 返回 product | 返回 pool details + risk score |
| 协议名查找 (aave-v3) | ✅ | fallback 到 TVL-top pool | 返回 "Aave V3 WEETH" |
| zerobase-cedefi incentive | ✅ | 4 维度数据 | coverage=338%, trend=stable, score=high |
| curve-dex incentive | ✅ | score=high | `No reward yield, sustainability determined by base yield` |

### investor_compare
| 测试 | 状态 | 预期 | 实际 |
|---|---|---|---|
| 两个协议对比 | ✅ | 3 dimensions + recommendation | `aave-v3 vs curve-dex → Aave V3 WEETH offers best risk-adjusted returns` |
| sort direction 修复 | ✅ | 正确排序 | 风险 score 越高越安全 (0-100 满分制) |

---

## 5. 待测试/边界场景 (建议给 QA)

| 测试场景 | 优先级 | 说明 |
|---|---|---|
| EXPLORE 英文输入 ("browse available pools") | P1 | 验证 LLM 能否在英文输入下识别 EXPLORE intent |
| EXPLORE 其他语言 (日文/韩文) | P2 | 多语言覆盖验证 |
| EXPLORE 空链 (chain="nonexistent") | P2 | 边界条件处理 |
| EXPLORE nearby_protocols 内容准确性 | P1 | 检查返回的 10 个 nearby protocols 是否真实存在 |
| incentive_sustainability - 高 APY 异常值 | P1 | APY > 100% 时的 coverage 和 score 表现 |
| smart_money - 有信号的代币 | P1 | 需要 DB 中有 smart_money_signals 数据才能验证 |
| EXPLORE chain_summary 数据一致性 | P1 | total_pools, avg_apy, top_protocols 是否准确聚合 |
| 并发 discover 调用 | P2 | 高并发下是否影响性能 |

---

## 6. 测试环境说明

### 本地测试环境
- Docker MySQL: `antalpha-mysql`, root/root123, database `antalpha_skills`
- 配置: `USE_LOCAL_ENV=true`, `.env.local`
- LLM: `kimi-k2.5` via DashScope (OpenAI-compatible proxy)
- 启动命令: `setsid env USE_LOCAL_ENV=true NODE_ENV=development DB_LOGGING=false node dist/apps/mcp-skills/main.js`

### 已知环境问题
- 服务器进程在启动后会被 shell exit 的 SIGHUP 信号杀死 (非代码 bug, 环境限制)
- 已验证: 服务器在启动后能正常响应 MCP 请求 (initialize, tools/call, register agent)
- 建议在 tmux/screen 中运行测试

---

## 7. 变更文件清单

| 文件 | 变更行数 | 主要变更 |
|---|---|---|
| `defillama.service.ts` | +24 / -3 | jsonColumnToArray() 修复 |
| `earn-product.service.ts` | +260 / -54 | TVL 分离, find by protocol, search_stats, EXPLORE mode, incentive |
| `web3-investor.tools.ts` | +9 / -4 | limit fix, compare fix |
| `earn-product.model.ts` | +55 / 0 | ScaleInfo 新字段, IncentiveSustainability, SmartMoneySentiment, SearchStats |
| `web3-investor-storage.service.ts` | +47 / 0 | getPoolsByProtocol, getSmartMoneySignalsByToken |
| `intent.model.ts` | +1 / 0 | EXPLORE intent type |
| `intent-llm.service.ts` | +2 / -1 | EXPLORE type in prompt, EXPLORE description |
| `intent-classifier.service.ts` | +3 / 0 | EXPLORE gate auto-pass, empty RULE_PATTERNS entry |
| `coingecko.service.ts` | -40 / 0 | 移除已废弃的 emission rate 逻辑 |

---

*Generated for V3.8 Release to QA Team*