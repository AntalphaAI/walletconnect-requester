# web3-investor V3.7 Code Review + 测试报告

> **分支**: `dingding-202604011-web3investor-V3.7`  
> **日期**: 2026-04-11  
> **评审人**: McBit（Code Review）、莫妮卡（白盒测试 + 编译测试）  
> **汇总**: 小田

---

## V3.7 核心变更

| 升级方向 | 具体内容 |
|---------|---------|
| 交互体验 | 结构化澄清 + `guidance_for_agent` + `suggested_next_actions`，Agent 上下文传递更完整 |
| LLM 分析 | 5步链式推理 Prompt + 指数退避重试 + provider fallback |
| 数据层 | MarketContextService（市场周期/DeFi TVL/利率环境）、ProtocolProfileService、De.Fi 安全评分 stub |

---

## 亮点（双方一致认可）

- ✅ `content + structuredContent` 双输出，规范合规
- ✅ `isError: true` 错误包装存在
- ✅ Agent 鉴权（`agentService.validate`）覆盖大部分 tool
- ✅ 测试覆盖：11 个测试文件，2166 行，含 intent/risk/LLM retry/filter 场景
- ✅ `discoverEnhanced` filter 每步均有 logger，全链路可观测
- ✅ Smart Fallback 三轮降级策略，零结果时给 `honest_no_result` 而非静默空值
- ✅ 协议去重（`deduplicateByProtocol`）防止同协议刷屏
- ✅ conservative/moderate/aggressive 三路排序逻辑分离
- ✅ 渐进式 Intent 收集 + `guidance_for_agent`，交互设计优秀
- ✅ Protocol Audit 预取缓存，启动预热
- ✅ 编译通过：webpack 无报错，6 秒内完成

---

## 产品评估

| 维度 | 评分 | 备注 |
|------|------|------|
| 架构设计 | ⭐⭐⭐⭐⭐ | 意图→澄清→确认→推荐完整闭环 |
| 测试覆盖 | ⭐⭐⭐⭐ | 单元覆盖好，E2E 完整流程可补充 |
| 安全 | ⭐⭐⭐ | BUG-1 漏鉴权需修后重评 |
| LLM 工程 | ⭐⭐⭐⭐⭐ | 重试/fallback/provider 切换设计成熟 |
| 可观测性 | ⭐⭐⭐⭐⭐ | 每个 filter 步骤均有 logger，调试友好 |
| 用户体验 | ⭐⭐⭐⭐ | 澄清流程完整，README 同步后满分 |

---

## 问题清单（合并前 Checklist）

### 🔴 P1 — 必须修复

**BUG-1: `investor_confirm_intent` 缺少 agent_id 鉴权**

- **问题**: 其他 5 个 tool 都有 `agentService.validate()` 调用，唯独 `investor_confirm_intent` 的 inputSchema 没有 `agent_id` 字段，完全跳过鉴权
- **风险**: 任何人拿到 `session_id`（明文返回在 `NEEDS_CLARIFICATION` 的 `metadata` 中）就可以覆盖任意用户的 Intent，存在越权/session 劫持风险
- **修复**（6 行代码）:
  ```typescript
  // inputSchema 加：
  agent_id: agentIdSchema,

  // handler 开头加：
  if (!(await this.agentService.validate(input.agent_id, "web3-investor", getMcpAgentApiKey()))) {
    return fail(AGENT_FAIL);
  }
  ```

### 🟡 P2 — 建议本版本一并处理

**BUG-2: `investor_analyze` 仅搜索 ethereum + arbitrum**

- **问题**: `getProductById` 硬编码只搜 ethereum + arbitrum（各 500 条），但 `discoverEnhanced` 已支持任意链
- **影响**: 用户从 base/optimism discover 到产品再 analyze，必然返回 `product not found`
- **建议**: 扩展到全支持链，或在 `discoverEnhanced` 阶段把 pool 写入 MySQL（`storage.getPoolByAddress` 优先路径已有）

**BUG-3: `investor_compare` 排序方向错误**

- **问题**: `calculateRiskAdjustedScore` 返回 `apy × riskFactor`（分值越高越好），但 sort 是升序（`a - b`），`topProduct` 拿的是最差的那个
- **修复**: sort 改为 `b - a`（降序）
- **状态**: 双方确认是 bug，非 intentional

**BUG-4: `calculateRiskAdjustedScore` 同名函数语义混乱**

- **问题**: tools 层和 service 层各有一个同名函数，逻辑完全不同：
  - tools 层（`investor_compare` 用）: `apy × (riskScore / 100)` — 简单线性
  - service 层（`discoverEnhanced` 用）: `qualityScore×0.65 + apyScore×0.35×riskPenalty` — 含 TRUSTED_PROTOCOLS 权重
- **建议**: tools 层重命名为 `calculateCompareScore`

### 🔵 P3 — 上线前同步

**MINOR-5: `market-context.service.ts` 市场周期判断逻辑 bug**

- **问题**: 死代码 + 逻辑可能反转
  ```typescript
  if (btc_dominance > 55 || total_defi_tvl > 500B) return "bull";
  if (btc_dominance > 58) return "bear"; // ← 永远执行不到
  ```
- `> 58` 必然满足 `> 55`，已在上一行返回，是死代码
- 业界惯例 BTC 主导率 >55% 是熊市特征（山寨跌），这里判成 bull，逻辑可能反了
- **建议**: 确认并修正阈值逻辑

**MINOR-6: README 与实现 tool name 不一致**

- **问题**: README 仍写旧版名（`investor_discover_opportunities` / `investor_analyze_opportunity`），实现已是 `investor_discover` / `investor_analyze`
- **影响**: Agent 按 README 调用直接报错
- **建议**: 6 个 tool name 全量对齐

---

## 回归测试用例（修复后需跑）

| 编号 | 场景 | 回归关联 |
|------|------|---------|
| TC-V37-001 | intent 澄清 → confirm → discover 完整链路 | BUG-1 |
| TC-V37-002 | `investor_get_stored_intent` 正常/不存在/过期（30min TTL） | — |
| TC-V37-003 | Base/Optimism 链产品 analyze 能命中 | BUG-2 |
| TC-V37-004 | LLM 重试日志 + fallback 降级验证 | — |
| TC-V37-005 | `investor_feedback` 合法/非法入参校验 | — |
| TC-V37-006 | `market_context` 字段合法性校验 | MINOR-5 |

---

## 结论

整体质量高，架构设计和 LLM 工程表现优秀。**BUG-1 安全漏洞必须合并前修完**，BUG-2/3/4 建议本版本一并处理。修完 P1~P2（4 项）后跑 TC-V37-001/003 回归，通过后发起 Code Review。
