# Web3-Investor 重构计划

**版本**: v2.0  
**日期**: 2026-03-31  
**状态**: 待执行  
**优先级**: 高  

---

## 一、重构目标

### 1.1 战略定位升级

将 Web3-Investor 从 **"发现+分析+执行全链路工具"** 重构为 **"DeFi 投资情报基础设施"**——

专注于 **发现** 和 **分析** 投资机会，为 AI Agent 提供数据驱动的投资决策支持。

### 1.2 核心决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 技能名称 | 保留 `web3-investor` | 品牌延续，减少迁移成本 |
| 数据源 | 长期建设，越多越好 | 参考 Bloomberg 模式，数据即产品 |
| 分析引擎 | 双轨模式（客户端 LLM / 服务端 MCP） | 灵活适配不同使用场景 |
| 输出渠道 | OpenClaw Agent (Agent-to-Agent) | 专注 AI 原生工作流 |
| 目标链 | Phase 1: EVM 优先 → Phase 3: Solana | 渐进式扩展 |

---

## 二、商业战略

### 2.1 核心商业模式

```
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (长期建设)                          │
│  DefiLlama │ Dune │ DeBank │ 链上节点 │ Twitter │ GitHub  │
├─────────────────────────────────────────────────────────────┤
│                    MCP Server (API 服务)                      │
│     统一接口 → 为所有 AI Agent 提供发现+分析能力              │
├─────────────────────────────────────────────────────────────┤
│                    模型层 (核心壁垒)                          │
│  通用大模型分析 │ 领域微调模型 (RLHF + SFT) │ 规则引擎      │
├─────────────────────────────────────────────────────────────┤
│                    输出层 (Agent 消费)                        │
│           OpenClaw Agent (Phase 1) → 更多平台                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 收入模式

#### 模式 A: API 调用付费

| 端点 | 价格 | 说明 |
|------|------|------|
| `/discover` | $0.01/次 | 基础机会发现 |
| `/analyze` | $0.05/次 | 服务端 LLM 深度分析 |
| `/report` | $0.10/次 | 完整结构化报告 |

#### 模式 B: 订阅模式 (SaaS)

| 层级 | 价格 | 配额 |
|------|------|------|
| Free | $0/月 | 100次发现/月 |
| Pro | $29/月 | 无限制发现 + 基础分析 |
| Enterprise | $99/月 | 专属数据源 + 领域模型 + SLA |

#### 模式 C: 领域微调模型服务 ⭐

为 DeFi 分析领域专门训练和强化训练高级模型，通过 API 提供：
- 基于通用大模型 (GPT-4/GLM-5) 的快速分析
- 基于 SFT (Supervised Fine-Tuning) + RLHF 的领域专属模型
- 高质量分析报告（超越通用模型的 DeFi 分析精度）

#### 模式 D: Token 经济 (长期)

发行治理 Token，用于：
- 支付服务费用（Token 持有者折扣）
- 质押获取 Pro 权限
- 治理投票（数据源优先级、模型选择等）
- 生态激励（数据贡献者、模型贡献者）

### 2.3 长期竞争壁垒

| 壁垒类型 | 说明 | 建立周期 |
|----------|------|----------|
| **数据网络效应** | 数据源越多 → 分析越准 → 用户越多 → 数据更多 | 6-12 个月 |
| **领域模型** | RLHF + SFT 训练的 DeFi 专属分析模型 | 3-6 个月 |
| **协议覆盖** | 独家协议接口，形成数据护城河 | 长期 |
| **品牌认知** | "想做 DeFi 分析就找 web3-investor" | 12+ 个月 |

---

## 三、目标架构

### 3.1 架构概览

#### 客户端: OpenClaw Skill (web3-investor)

```
OpenClaw Agent (用户对话)
        │
        ▼
web3-investor Skill (轻量级客户端)
        │
  ┌─────┼─────┐
  │     │     │
  ▼     ▼     ▼
Preference  Discovery  Output
Collector  Engine    Formatter
```

#### 服务端: MCP Server (MCP Skills 扩展模块)

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Skills Server                      │
│              (NestJS + TypeScript)                        │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Analysis Module                     │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────┐  │    │
│  │  │ 通用模型分析 │ │ 领域微调模型 │ │规则引擎 │  │    │
│  │  │ (GPT/GLM)    │ │ (RLHF+SFT)  │ │(快速路径)│  │    │
│  │  └──────────────┘ └──────────────┘ └─────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                            │                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Data Sources Module                  │    │
│  │  DefiLlama │ Dune │ EVM Node │ DeBank │ ...     │    │
│  └─────────────────────────────────────────────────┘    │
│                            │                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Data Lake (SQLite for now)          │    │
│  │   缓存 │ 历史 │ 聚合指标 │                        │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 MCP Skills Server 技术选型

基于现有 `antalpha-skills` Monorepo:

| 维度 | 选择 | 说明 |
|------|------|------|
| **框架** | NestJS v11 | 现有 monorepo 统一技术栈 |
| **语言** | TypeScript 5.9 | 类型安全，团队统一 |
| **MCP SDK** | `@modelcontextprotocol/sdk` v1.12+ | 标准兼容 |
| **包管理** | pnpm | 现有 monorepo 配置 |
| **数据库** | SQLite (via `better-sqlite3`) | 轻量存储，已有依赖 |
| **HTTP** | Express 5 | 已有依赖 |
| **配置** | `@nestjs/config` + Nacos | 配置中心 |
| **HTTP 客户端** | Axios | 已有依赖 |
| **参数校验** | Zod v3.25 | 已有依赖 |
| **代码质量** | Biome v2 | 已有配置 |

### 3.3 Monorepo 结构

```
antalpha-skills/                         (现有 Monorepo)
├── apps/
│   └── mcp-skills/                     (现有应用)
│       └── src/
│           ├── modules/
│           │   ├── agent/              (现有: 鉴权模块)
│           │   ├── asset/              (现有: DeBank 资产模块)
§           │   ├── web3-trader/        (现有: 0x 交易模块)
│           │   ├── smart-money/        (现有: Moralis 模块)
│           │   └── web3-investor/      (新增: 投资机会模块) ⭐
│           │       ├── investor.service.ts
│           │       ├── investor.controller.ts
│           │       ├── investor.module.ts
│           │       ├── data-sources/
│           │       │   ├── defillama.datasource.ts
§           │       │   ├── dune.datasource.ts
│           │       │   ├── evm-node.datasource.ts
│           │       │   └── debank.datasource.ts
│           │       ├── analysis/
│           │       │   ├── rules-engine.service.ts
│           │       │   └── llm-analysis.service.ts
│           │       └── dtos/
│           │           ├── request.dto.ts
§           │           └── response.dto.ts
│           └── ...
├── libs/                               (共享库)
└── package.json
```

---

## 四、模块设计

### 4.1 MCP 工具定义 (Server 端)

| 工具名 | 说明 | 输入 | 输出 |
|--------|------|------|------|
| `discover_opportunities` | 发现投资机会 | chain, min_apy, strategy | 机会列表 |
| `analyze_opportunity` | 分析单个机会 | opportunity_id, depth | 结构化分析报告 |
| `compare_opportunities` | 多项目对比 | [opportunity_ids] | 对比矩阵 |
| `protocol_research` | 协议研究 | protocol_name | 研究报告 |
| `get_yield_history` | 收益历史 | protocol, pool, period | 时间序列数据 |
| `check_risk_alerts` | 风险监控 | portfolio/wallet | 风险告警 |

### 4.2 数据源层

#### 当前已有
| 数据源 | 状态 | 备注 |
|--------|------|------|
| **DefiLlama** | ✅ 已有 | 现有 Skill 通过 Python 调用，需迁移到 TS |
| **Dune** | ✅ 已有 | MCP endpoint `api.dune.com/mcp/v1` |
| **DeBank** | ✅ 已有 | MCP Server 已有 `asset` 模块 |

#### 需要新增
| 数据源 | 优先级 | 实现方式 |
|--------|--------|----------|
| **EVM 节点 (Base/Ethereum)** | P0 | axios + 标准 JSON-RPC |
| **CoinGecko** | P1 | axios + REST API |
| **Solana RPC** | Phase 3 | axios + JSON-RPC |
| **Twitter/X** | Phase 2 | API / 爬虫 |
| **GitHub** | Phase 2 | REST API (安全审计) |

#### 数据源分层设计

```typescript
interface IDataSource {
  id: string;
  priority: 0 | 1 | 2 | 3;  // 0=基础, 1=增强, 2=高级, 3=独家
  fetch(query: QueryParams): Promise<RawData>;
  cacheTTL: number;  // TTL 秒
}

// L1 基础数据源 (必需)
- DefiLlama (P0)
- Dune (P0)
- EVM Node (P0)

// L2 增强数据源 (推荐)
- DeBank (P1)
- CoinGecko (P1)

// L3 高级数据源 (Phase 2+)
- Solana RPC (P2)
- Twitter/X (P2)
- GitHub (P2)

// L4 独家数据 (长期壁垒)
- 链上行为数据
- 跨协议相关性
```

### 4.3 OpenClaw Skill (客户端)

Skill 保持轻量，职责：
1. **收集用户偏好** (chain, APY 范围, 策略类型)
2. **调用 MCP Server** 获取数据和/或分析
3. **格式化输出** (结构化报告)

#### 技能模块变更

| 模块 | 操作 | 原因 |
|------|------|------|
| `discovery/` | ✅ 保留 | 本地缓存 + 基础查询 |
| `trading/` | ❌ 移除 | 执行功能不再需要 |
| `portfolio/` | ⚠️ 保留部分 | 余额查询有用，保留为辅助功能 |
| `analysis/` | ➡️ 迁移到 MCP | 分析引擎在服务端 |
| `output/` | ✅ 保留 | 报告格式化 |

#### 删除文件清单

| 文件 | 说明 |
|------|------|
| `scripts/trading/trade_executor.py` | 交易执行器 |
| `scripts/trading/safe_vault.py` | 本地签名器 |
| `scripts/trading/eip681_payment.py` | EIP-681 支付链接 |
| `scripts/trading/whitelist.py` | 白名单管理 |
| `scripts/trading/simulate_tx.py` | 交易模拟 |

#### 删除文档清单

| 文件 | 说明 |
|------|------|
| `references/trade-executor.md` | 交易执行文档 |
| `references/safe-vault-spec.md` | Safe Vault 规范 |
| `SIGNER_API_SPEC.md` | 签名器 API 规范 |
| `SETUP.md` | 签名器安装手册 |

---

## 五、数据模型

### 5.1 投资机会 (Opportunity)

```typescript
interface Opportunity {
  // === 基础标识 ===
  id: string;              // e.g. "aave-v3-usdc-base"
  protocol: string;        // e.g. "aave-v3"
  pool: string;            // e.g. "USDC"
  chain: string;           // e.g. "base"
  
  // === 收益数据 ===
  apy: number;             // 当前 APY %
  apy_base: number;        // 基础 APY %
  apy_reward: number;      // 奖励 APY %
  tvl_usd: number;         // TVL (USD)
  
  // === 资产信息 ===
  underlying_tokens: string[];   // 底层资产
  reward_tokens: string[];       // 奖励资产
  is_stablecoin: boolean;
  
  // === 风险信号 (LLM 分析用) ===
  risk_signals: RiskSignals;
  
  // === 地址信息 (可执行) ===
  actionable_addresses: ActionableAddresses;
  
  // === 元数据 ===
  defillama_url: string;
  data_sources: string[];   // 数据来源列表
  updated_at: string;       // ISO 8601
}

interface RiskSignals {
  audits: string[];          // 审计记录
  audit_count: number;
  tvl_trend: string;         // "increasing" | "stable" | "decreasing"
  protocol_age: string;      // e.g. "3 years"
  category: string;          // e.g. "lending"
  stablecoin: boolean;
  reward_type: 'none' | 'single' | 'multi';
  has_il_risk: boolean;
  governance?: string;
}

interface ActionableAddresses {
  deposit_contract_candidates: string[];
  underlying_token_addresses: string[];
  reward_token_addresses: string[];
}
```

### 5.2 分析报告 (AnalysisReport)

```typescript
interface AnalysisReport {
  opportunity_id: string;
  analysis_version: string;
  model_used: string;       // "rule_engine" | "general_llm" | "domain_model"
  
  summary: {
    recommendation: 'BUY' | 'HOLD' | 'AVOID';
    confidence: number;     // 0.0 - 1.0
    key_reason: string;
  };
  
  detailed: {
    yield: {
      apy: number;
      vs_category_avg: string;
      vs_competitors: string;
    };
    risk: {
      overall: 'LOW' | 'MEDIUM' | 'HIGH';
      contract_security: 'LOW' | 'MEDIUM' | 'HIGH';
      liquidity_risk: 'LOW' | 'MEDIUM' | 'HIGH';
      protocol_risk: 'LOW' | 'MEDIUM' | 'HIGH';
      signals: RiskSignals;
    };
    execution: {
      complexity: 'LOW' | 'MEDIUM' | 'HIGH';
      estimated_gas_usd: number;
      exit_liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    market_context: {
      narrative: string;
      competitive_landscape: string;
    };
  };
  
  generated_at: string;
}
```

---

## 六、MCP 接口规范

### 6.1 现有架构复用

```
现有 mcp-skills 架构:
- HTTP 端口: 3830
- MCP Endpoint: /mcp (Streamable HTTP)
- 配置中心: Nacos
- 认证: Agent API Key (header: x-antalpha-agent-api-key)

新增 web3-investor 模块作为第5个业务 skill:
1. agent (现有)
2. asset (现有)
3. web3-trader (现有)
4. smart-money (现有)
5. web3-investor (新增)
```

### 6.2 MCP 工具定义

```typescript
// === Tool 1: discover_opportunities ===
Tool: discover_opportunities
Params: {
  chain: string;           // "base", "ethereum", "arbitrum"
  min_apy: number;         // 最小 APY %
  max_apy: number;         // 最大 APY %
  strategy: string;        // "lending", "staking", "lp", "all"
  stablecoin_only: boolean;
  limit: number;           // 结果数量
}
Returns: Opportunity[]

// === Tool 2: analyze_opportunity ===
Tool: analyze_opportunity
Params: {
  opportunity_id: string;
  depth: 'basic' | 'detailed' | 'full';
  analysis_mode: 'rule_engine' | 'general_llm' | 'domain_model';
}
Returns: AnalysisReport

// === Tool 3: compare_opportunities ===
Tool: compare_opportunities
Params: {
  opportunity_ids: string[];
  dimensions: string[];    // ["yield", "risk", "execution"]
}
Returns: ComparisonMatrix[]

// === Tool 4: protocol_research ===
Tool: protocol_research
Params: {
  protocol: string;        // e.g. "aave-v3"
  include: string[];       // ["security", "tokenomics", "governance", "history"]
}
Returns: ProtocolReport

// === Tool 5: get_yield_history ===
Tool: get_yield_history
Params: {
  protocol: string;
  pool: string;
  period: '7d' | '30d' | '90d' | '1y';
}
Returns: { data: Array<{ timestamp: string; apy: number; tvl: number }> }

// === Tool 6: check_risk_alerts ===
Tool: check_risk_alerts
Params: {
  wallet_address: string;
  chain: string;
}
Returns: Array<{
  level: 'warning' | 'critical';
  type: string;
  message: string;
  detail?: object;
}>
```

---

## 七、分析引擎设计

### 7.1 双轨分析架构

```
用户请求
  │
  ├─→ 简单查询 → 规则引擎 (毫秒级响应)
  │     - APY 过滤
  │     - TVL 过滤
  │     - 白名单协议
  │     - 基础风险评估
  │
  └─→ 深度分析 → LLM 分析 (秒级响应)
        ├─ Phase 1: 通用大模型 (GPT-4 / GLM-5)
        │     - 通过 LLM API 调用
        │     - 结构化 Prompt 工程
        │
        └─ Phase 3+: 领域微调模型 ⭐ 核心壁垒
              - SFT 训练 (Supervised Fine-Tuning)
              - RLHF 强化学习
              - 输出精度超越通用模型
```

### 7.2 规则引擎 (Phase 1)

```typescript
interface Rule {
  id: string;
  name: string;
  condition: (opportunity: Opportunity) => boolean;
  weight: number;
}

const defaultRules: Rule[] = [
  {
    id: 'apy_reasonable',
    name: 'APY 合理性',
    condition: (opp) => opp.apy <= get_category_avg(opp.chain) * 3,
    weight: 20,
  },
  {
    id: 'tvl_minimum',
    name: 'TVL 最低门槛',
    condition: (opp) => opp.tvl_usd > 10_000_000,
    weight: 15,
  },
  {
    id: 'has_audit',
    name: '安全审计',
    condition: (opp) => opp.risk_signals.audit_count > 0,
    weight: 25,
  },
  {
    id: 'known_protocol',
    name: '知名协议',
    condition: (opp) => is_known_protocol(opp.protocol),
    weight: 20,
  },
];
```

### 7.3 LLM 分析 Prompt (Phase 1)

```
你将收到一组 DeFi 投资机会数据。请按照以下维度进行分析：

1. **收益评估**: 
   - APY 是否可持续? (区分基础 APY 和奖励 APY)
   - 与同类协议相比竞争力如何?

2. **风险评估**:
   - 合约安全: 审计数量和历史
   - 流动性风险: TVL 和退出流动性
   - 协议风险: 治理结构和团队
   - 市场风险: 叙事和外部环境

3. **市场背景**:
   - 当前 DeFi 趋势
   - 协议最新动态

4. **执行建议**:
   - 操作复杂度
   - Gas 成本估算
   - 退出策略

请输出结构化 JSON 格式的分析报告。

机会数据:
${JSON.stringify(opportunity, null, 2)}
```

---

## 八、实施路线图

### Phase 0: 架构奠基 (1-2 周) ⭐ 本次优先

**目标**: 在现有 Monorepo 中建立 web3-investor 模块基础框架

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 在 `apps/mcp-skills/src/modules/` 下创建 `web3-investor/` 目录 | 编程代理 | ⏳ 待开始 |
| 定义 TypeScript 接口 (Opportunity, AnalysisReport 等) | 编程代理 | ⏳ 待开始 |
| 定义 MCP 工具接口 (6 个工具) | 编程代理 | ⏳ 待开始 |
| 添加 Zod DTO 校验 | 编程代理 | ⏳ 待开始 |
| 连接现有 Nacos 配置中心 | 编程代理 | ⏳ 待开始 |
| 编写模块单元测试 | 编程代理 | ⏳ 待开始 |

**技术约束**:
- 遵循现有 Monorepo 规范 (NestJS v11 + TypeScript 5.9 + pnpm)
- 使用 Zod v3.25 做参数校验
- 使用 Biome v2 做代码质量检查
- 通过 Nacos 管理配置
- 使用 `better-sqlite3` 作为本地缓存

### Phase 1: 数据层建设 (2-4 周)

**目标**: 完善 EVM 链 (Base + Ethereum) 数据覆盖

| 任务 | 状态 |
|------|------|
| DefiLlama API 适配器 (Python → TypeScript 迁移) | ⏳ |
| EVM 节点数据接入 (Base + Ethereum) | ⏳ |
| Dune MCP 适配器完善 | ✅ 已有 |
| DeBank 数据复用 (现有 asset 模块) | ✅ 已有 |
| 本地缓存层 (SQLite) | ⏳ |
| 数据清洗 + 规范化 pipeline | ⏳ |

### Phase 2: 分析引擎 (4-6 周)

**目标**: 核心分析能力上线

| 任务 | 状态 |
|------|------|
| 规则引擎实现 (快速路径) | ⏳ |
| 通用 LLM 分析集成 | ⏳ |
| 分析结果缓存 | ⏳ |
| 报告生成模块 | ⏳ |

### Phase 3: 领域微调模型 (6-10 周) ⭐ 核心壁垒

**目标**: 训练 DeFi 专属分析模型

| 任务 | 状态 |
|------|------|
| 收集 DeFi 分析语料 | ⏳ |
| SFT 微调 | ⏳ |
| RLHF 强化训练 | ⏳ |
| A/B 测试对比通用模型 | ⏳ |

### Phase 4: Solana 扩展 (10-14 周)

| 任务 | 状态 |
|------|------|
| Solana SDK 集成 | ⏳ |
| Solana RPC 数据适配 | ⏳ |
| 跨链分析框架 | ⏳ |

### Phase 5: 产品化 (14-20 周)

| 任务 | 状态 |
|------|------|
| 用户认证 + 权限系统 | ⏳ |
| 计费系统 | ⏳ |
| API 文档站 | ⏳ |
| SDK (Python, JavaScript) | ⏳ |
| OpenClaw Skill 重写 | ⏳ |
| 社区建设 | ⏳ |

---

## 九、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据源 API 限流 | 高 | 本地缓存 + 请求限流 |
| MCP Server 单点故障 | 高 | 降级到本地规则引擎 |
| LLM 分析延迟 | 中 | 规则引擎快速路径 + 结果缓存 |
| 领域模型训练成本高 | 中 | 先用通用模型验证，确认效果后再投入 |
| 链上数据错误 | 高 | 数据交叉验证 (多数据源对比) |

---

## 十、成功标准

### MVP (Phase 1 完成时)

- [ ] Base + Ethereum 链的 DeFi 机会发现
- [ ] 结构化风险信号输出
- [ ] 报告生成 (Markdown + JSON)
- [ ] 本地缓存层

### V1.0 (Phase 2 完成时)

- [ ] 6 个 MCP 工具全部上线
- [ ] 规则引擎正常运行
- [ ] LLM 深度分析集成
- [ ] 分析准确率 > 80% (A/B 测试)

### V2.0 (Phase 3 完成时)

- [ ] 领域微调模型上线
- [ ] 分析准确率 > 90%
- [ ] API 服务对外开放
- [ ] 首批付费用户

---

## 附录

### A. 现有 MCP Skills 架构参考

```
项目: antalpha-skills
路径: ~/antalpha-com/antalpha-skills
端口: 3830
MCP Endpoint: /mcp (Streamable HTTP)
配置: Nacos (NACOS_SERVER + NACOS_NAMESPACE)
认证: x-antalpha-agent-api-key header

技术栈:
- NestJS v11
- TypeScript 5.9
- @modelcontextprotocol/sdk v1.12+
- pnpm
- better-sqlite3
- Axios
- Zod v3.25
- Biome v2 (lint/format)
```

### B. 数据源 URL 参考

| 数据源 | URL | API Key |
|--------|-----|---------|
| DefiLlama Pools | `https://yields.llama.fi/pools` | 无需 |
| DefiLlama Protocols | `https://api.llama.fi/protocols` | 无需 |
| Dune MCP | `https://api.dune.com/mcp/v1` | DUNE_API_KEY |
| Base RPC | `https://base.llamarpc.com` | 无需 |
| Ethereum RPC | `https://eth.llamarpc.com` | 无需 |