# 项目状态追踪

## Web3 Investor Skill

**当前版本**: v0.4.0 → v0.5.0 (开发中)
**状态**: 功能升级中 (借鉴 xaut-trade 设计)
**Registry**: https://clawhub.com/skills/web3-investor

### 关键里程碑
- **v0.4.0** (2026-03-05): 框架优化，实现 Progressive Disclosure，SKILL.md 从 ~700 行精简至 263 行
- **v0.3.0** (2026-03-05): Trade Executor REST API 适配器
- **v0.2.1** (2026-03-04): 投资偏好系统，增强风险信号
- **v0.2.0** (2026-03-04): 风险重设计，可执行地址
- **v0.1.0** (2026-03-03): 初始版本

### v0.5.0 升级任务 (借鉴 xaut-trade)
- [x] **任务 1: 环境预检** (2026-03-07)
  - 新增 `scripts/utils/preflight.py` - 可配置的预检框架
  - 支持 signer_api, rpc_reachable, env_completeness, gas_balance, token_balance, allowance 检查
  - 按交易类型配置不同检查清单 (swap/deposit/transfer)
  - 严重级别分级 (critical/warning/info)
  - CLI 新增 `preflight` 命令用于测试
  - 修改 `config.json` 添加 `preflight` 和 `rpc` 配置段
  - `trade_executor.py` 集成预检，preview 前自动执行

- [x] **任务 2: RPC 容错** (2026-03-07)
  - 新增 `scripts/utils/rpc_manager.py` - RPC 管理模块
  - 支持多节点配置，主节点失败时自动切换到 fallback
  - Session stickiness：一旦切换，整个 session 保持使用该节点
  - 区分网络错误（429/502/503/timeout）和业务错误（余额不足等）
  - 网络错误触发 fallback，业务错误直接报错
  - 修改 `preflight.py` 的 RPC 检查，集成 fallback 逻辑
  - CLI 新增 `rpc` 命令用于查看状态和测试连接
  - 配置化：节点列表、超时时间、fallback 开关、session sticky 开关

- [x] **任务 3: 确认机制** (2026-03-07)
  - 修改 `config.json` 添加 `double_confirm` 配置段
    - 大额交易阈值 (large_trade_threshold_usd)
    - 高滑点阈值 (high_slippage_threshold_bps)
    - 新协议确认开关 (new_protocol_confirm)
    - 确认短语 (confirm_phrase)
  - 修改 `trade_executor.py`
    - 新增 `_check_double_confirm_required()` 函数判断是否需要双重确认
    - 修改 `preview_swap()` 在返回结果中标记双重确认需求
    - 修改 `approve_transaction()` 验证确认短语
    - CLI `approve` 命令新增 `--confirm` 参数
    - 更新 `_format_output()` 显示双重确认提示
  - 支持多场景：大额交易、高滑点、新协议首次使用

- [x] **任务 4: 输出标准化** (2026-03-07)
  - 新增 `scripts/schemas/output_schema.py` - 统一输出 Schema
  - 定义核心数据类：
    - `Stage`: 阶段枚举 (preview/ready_to_execute/executed/failed)
    - `RiskLevel`: 风险级别枚举 (low/medium/high)
    - `RiskWarning`: 风险警告结构
    - `InputInfo`: 交易输入信息
    - `QuoteInfo`: 报价信息（支持 swap/deposit 不同字段）
    - `PreviewOutput`: 标准化预览输出
    - `ApprovalResult`: 标准化审批结果
    - `ExecutionResult`: 标准化执行结果
  - 每个输出类支持三种格式：
    - `to_dict()`: 字典格式
    - `to_json()`: JSON 字符串
    - `to_text()`: 人类可读文本
  - 工厂函数：`create_preview_output()`, `create_approval_result()`, `create_execution_result()`

### 待办事项
- [x] 任务 1-4 全部完成 (2026-03-07)
- [ ] 更新 SKILL.md 文档
- [ ] 发布 v0.5.0 到 ClawHub

---

## ClawHub 发布记录（最新）

### web3-investor
- **v0.5.11** (2026-03-30): 发布成功 → GitHub + ClawHub
- **v0.5.10** (2026-03-30): 版本号已存在（多次重试）
- **v0.5.9** (2026-03-30): 版本号已存在

### wallet-guard（新技能）
- **v1.0.0** (2026-03-30): 首次发布
- **功能**：钱包防盗卫士，扫描高风险授权
- **发布 ID**: `k975geygpj7gtam12fkt4nkbm183xmdr`

---

## OpenViking 安装（2026-04-01）

**状态**: ✅ 安装完成并正常运行

| 组件 | 状态 | 地址/备注 |
|------|------|----------|
| OpenViking Server | ✅ 在线 | http://127.0.0.1:1933 |
| OpenClaw Plugin | ✅ 已注册 | context-engine |
| 自动记忆回忆 | ✅ | before_prompt_build=auto-recall |
| 自动记忆捕获 | ✅ | afterTurn=auto-capture |

**配置**：需 VLM API Key + Embedding API Key（由主人手动配置）

---

## antalpha-skills 项目归档（2026-03-31）

**检查点**: `~/antalpha-com/antalpha-skills/memory/checkpoint-antalpha-skills.md`

**定位**: NestJS + MCP SDK Monorepo，通过 Streamable HTTP 暴露链上业务工具

**本地路径**: `~/antalpha-com/antalpha-skills`

**关键信息**:
- HTTP 端口: **3830**
- MCP Endpoint: `/mcp`（Streamable HTTP / SSE）
- 配置中心: **Nacos**（必填 NACOS_SERVER + NACOS_NAMESPACE）
- 业务技能: agent(鉴权)、asset(DeBank)、web3-trader(0x)、smart-money(Moralis)

**OpenClaw Skill 对接要点**:
- MCP Endpoint: `http://<host>:3830/mcp`
- Header: `x-antalpha-agent-api-key`
- 需先注册 Agent 获取 API Key

---

## 智能模型路由器 (Model Router)

**状态**: 稳定运行
**位置**: `tools/model-router/`

### 关键修复记录
- **2026-03-01**: 任务上下文继承机制 - 解决简短回复路由错误问题
- **2026-02-28**: 架构重构 v2 - 从系统配置动态读取模型，不再 hardcode
- **2026-02-27**: 概念修正 - 明确区分"模型路由"与"任务分发"

### 核心原则
- 模型路由：当前会话内切换模型直接回答
- 任务分发：将独立任务委派给子代理
- 绝对禁止为路由创建子代理

---

---

## Antalpha RWA Skill

**状态**: 已发布
**位置**: `skills/antalpha-rwa/`
**GitHub**: https://github.com/AntalphaRWA/antalpha-rwa-skill

### 关键里程碑
- **2026-03-10**: 发布到 AntalphaRWA 组织 GitHub
- **2026-03-11**: 修复三大问题
  - EIP-681 支付链接格式（原生 ETH → USDT ERC-20 transfer）
  - MCP_URL 从硬编码改为配置文件读取
  - SKILL.md 从 206 行精简至 99 行

### 核心功能
- RWA 产品发现和投资
- EIP-681 支付链接生成
- 投资流程引导

### 技术要点
- USDT 合约 (Base): `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
- EIP-681 格式: `ethereum:{USDT_CONTRACT}@{chain_id}/transfer?address={to}&uint256={amount_raw}`
- 配置文件: `config/mcp.json`

---

## antalpha AI 项目 (Intent Router 架构)

**状态**: 架构设计中
**关键文件**: `~/antalpha-com/antalpha-skills/`
**时间**: 2026-04-01 ~ 2026-04-02

### 核心架构：三层设计
```
用户请求 → Intent Gate → Skill Dispatcher → Provider Pool
                                    ↓
                            Confirmation Gate (安全兜底)
```

### Intent Gate (意图识别层)
- **M1**: Prompt-based 零样本分类+提取（轻量模型如 Haiku/GLM/Qwen）
- **M2**: 微调 Intent Classification 模型（500-1000 条训练数据）
- **M3**: 多意图理解（一句话拆解多步 pipeline）
- 置信度 < 0.6 时要求用户澄清

### Category 解耦设计
- **Intent** → 用户意图分类（swap/balance/smart_money 等）
- **Skill** → 技能执行器（可插拔）
- **Provider** → 实际 API 提供方（可降级）

### Confirmation Gate (安全兜底)
- 高风险操作（swap）触发风险评级 HIGH
- 要求用户确认交易参数（金额、汇率、Gas）
- 确认后才执行（不可逆操作必须)

### 待办
- [ ] 明确 Intent Extraction 的参数格式
- [ ] 设计 Skill 注册机制
- [ ] 实现 Provider Fallback 路由

---

## 邮件审批助手

**状态**: 运行中
**检查频率**: Crontab 定时任务 (10:00, 15:00, 20:00)

### 方法论确立 (2026-03-01)
- 定时任务 = 触发器，只做数据提取
- 分析和分类必须用大模型能力
- "/" 分隔表示"或签"（任一人确认即可）

### 心跳调整 (2026-03-06)
- 移除 OpenClaw 心跳中的邮件审批分析（与 Crontab 重复）
- 心跳频率调整为 4 小时一次
---

## Antalpha Skills 文档自动化项目

**状态**: ✅ 技能创建完成，已实际使用验证
**时间**: 2026-04-09 ~ 2026-04-10

### 验证记录
- **2026-04-10**: 首次实际使用，成功为 antalpha-skills 服务端生成 MCP 文档
- 生成文件: `docs/mcp-documentation.md`
- 工作流程验证通过：读取源码 → 生成文档 → Git 提交

### 相关技能

| 技能 | 用途 | GitHub |
|------|------|--------|
| `antalpha-ai-setup` | 安装手册 (v1.1.0) | https://github.com/AntalphaAI/antalpha-ai-setup |
| `antalpha-ai-docs` | 文档生成器 (内部) | https://github.com/AntalphaAI/antalpha-ai-docs |

### antalpha-ai-setup 技能 (v1.1.0)
- **修复问题**: OpenClaw 配置错误（直连替代 npx mcp-remote）、API Key 鉴权描述含糊、缺少 README.md
- **关键规范**: description 压缩到 2 句话、钱包地址占位符用 `0x\<your_wallet_address\>`
- **发布记录**: v1.0.0 (2026-04-09) → v1.1.0 (2026-04-09)

### antalpha-ai-docs 技能设计
- **触发方式**: 手动调用
- **方案选择**: AI + Markdown 指令方案（非脚本程序），由大语言模型读取源代码生成文档
- **工作流程**:
  1. 读取源代码 `~/antalpha-com/antalpha-skills/libs/skills/*/src/tools/*.tools.ts`
  2. 生成技术文档 → `~/antalpha-com/antalpha-skills/docs/mcp-documentation.md`
  3. 生成安装手册 → `antalpha-ai-setup/SKILL.md`
  4. Git 提交（服务端 MR，客户端 direct push）
- **Git 规范**:
  - antalpha-skills (服务端): `docs/update-mcp-reference-YYYYMMDD` 分支 → 提 MR
  - antalpha-ai-setup (客户端): 直接 push 到 main
- **规范要求**: 永远先从 main 更新，再创建文档分支

### 参考文档格式
- 技术文档格式: `/home/admin/antalpha-skills-mcp-documentation.md`
- 安装手册格式: `~/.openclaw/workspace/skills/antalpha-ai-setup/SKILL.md`

### 待办
- [ ] 首次实际使用验证
