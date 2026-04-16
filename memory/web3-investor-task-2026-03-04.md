# Web3 Investor Skill 优化任务

**创建时间**: 2026-03-04 10:36
**状态**: 规划中

---

## 已完成（另一渠道）

| 模块 | 状态 | 说明 |
|------|------|------|
| Dune MCP 连接 | ✅ 完成 | API Key 已配置，连接测试通过 |
| dune_mcp.py | ✅ 完成 | MCP 适配器，支持 search/exec/results |
| unified_search.py | ✅ 完成 | 统一搜索接口，整合 DefiLlama + Dune |

---

## 待完成任务

### 🔴 优先级 1：风险评估方式重构

**目标**: 风险评分不再本地计算，改用 LLM 分析

**当前问题**:
- 本地风险评分算法过于简单（仅基于审计数量、TVL、是否知名协议）
- Uniswap V4 新池子可能被误判
- 缺少对协议类型、代币类型的区分

**新方案**:
```
DefiLlama/Dune → 获取产品筛选范围 → 返回结构化数据 → LLM 风险分析
```

**具体任务**:
- [ ] 移除 `find_opportunities.py` 中的 `calculate_risk_score()` 本地计算
- [ ] 保留数据收集：APY、TVL、协议信息、代币信息
- [ ] 新增字段：`actionable_addresses`（存款合约、底层代币、奖励代币）
- [ ] 输出结构化数据供 LLM 消费

---

### 🔴 优先级 2：交易执行优化

**目标**: 将"发现机会"升级为"可执行线索"

**核心改进点**:

#### 2.1 结构化输出升级
- 新增 `actionable_addresses` 结构：
  ```json
  {
    "deposit_contract_candidates": ["0x..."],
    "underlying_token_addresses": ["0x..."],
    "reward_token_addresses": ["0x..."],
    "has_actionable_address": true
  }
  ```

#### 2.2 协议注册表融合
- 解析 `references/protocols.md` 为静态注册表
- 与 DefiLlama 实时数据融合
- 新增字段：`primary_contract`, `protocol_registry_match`, `docs_url`

#### 2.3 健壮性提升
- 增加 `null` / 类型漂移保护
- Python 3.9 兼容（`dict | None` → `Optional[dict]`）
- 保留旧字段，增量新增

#### 2.4 交易预览 API
- `POST /api/investor/preview-deposit`
- 已接入：Aave、Compound、Lido
- 支持生成授权预览和存款预览

#### 2.5 交互链路改造
- Slack/Telegram 连续流程
- 从线程历史消息恢复 `selected_opportunity`
- 支持 `买入0.0001eth` 紧凑输入

---

### 🟡 优先级 3：后续增强

| 任务 | 说明 |
|------|------|
| Dune 查询执行 | 执行 Dune 查询获取实际 APY 数据 |
| 余额预检 | 交易前检查原生币和输入资产余额 |
| 协议注册表升级 | Markdown → JSON/YAML 更可靠解析 |
| 更多协议映射 | 主合约 → 存款 calldata 映射 |

---

## 设计原则（来自主人）

1. **先做结构化，再做自动化** - skill 输出改成 agent 可消费的数据结构
2. **动态数据和静态知识分层** - 实时性 vs 稳定性
3. **优先修稳定性，再加能力** - 导入失败、字段兼容优先
4. **状态从内存迁移到可恢复文本** - 从线程历史重建上下文

---

## Skill 开发规范（记录）

1. **最小可执行输出**: 至少明确 `protocol`, `chain`, `asset`, `primary_contract`, `action_hint`, `risk_level`
2. **外部 API 一律按不可信输入处理**: 字段可能缺失、为 null、类型不稳定
3. **保持向后兼容**: 旧字段保留，新能力通过新增字段上线
4. **为宿主系统预留接入点**: CLI、API、Slack、Agent Planner、交易执行器
5. **为失败保留足够诊断信息**: 网络、协议、tx selector、quote request id

---

## 文件结构

```
skills/web3-investor/
├── scripts/
│   ├── discovery/
│   │   ├── find_opportunities.py  # 待重构：移除本地风险评分
│   │   ├── dune_mcp.py           # ✅ 已完成
│   │   ├── unified_search.py     # ✅ 已完成
│   │   └── analyze_protocol.py   # 待优化
│   └── trading/
│       ├── safe_vault.py         # 待优化：交易预览
│       └── whitelist.py
├── references/
│   └── protocols.md              # 待升级为 JSON
└── config/
    └── config.json
```

---

**下一步行动**: 确认任务优先级，开始执行