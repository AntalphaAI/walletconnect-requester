# AntAlpha AI 项目

## 核心定位
**Web3 领域的 OpenRouter** — 统一 API 网关，屏蔽底层碎片化，成为 Web3 AI 基础设施的流量入口。

**Slogan**: "The Router For Web3 AI"

**官网**: https://antalpha-ai.vercel.app/

## 创始人
- **联合创始人**: Bevan (丁丁)
- **运营性质**: 长期项目，持续运营数年

## 当前状态
**Demo 阶段** — 2026-04-01

## 五层架构
```
Layer 1 → Agent/客户端层 (AI Agent, 前端应用)
Layer 2 → Skill 层 (意图接收器)
Layer 3 → AntAlpha MCP 核心路由层 ← 核心竞争力
Layer 4 → 底层服务商 (Provider)
Layer 5 → 多链 (Blockchains)
```

## Layer 3 核心引擎
- **意图识别** (Intent Router)
- **策略引擎** (Path Selector)
- **容错兜底** (Fallback)

## 已规划意图路由

| 意图 | Skill | 主 Provider | 备 Provider |
|------|-------|-----------|------------|
| balance | skill_wallet_balance | DeBank | Etherscan |
| swap | skill_trader | 1inch | 0x/Uniswap |
| smart_money | skill_smart_money | Nansen | Arkham/Dune |
| gas | skill_gas_tracker | Etherscan Gas | GasNow |
| history | skill_transaction_history | Etherscan | Alchemy |
| nft_floor | skill_nft_floor | OpenSea | Blur |

## 与现有项目的关系
- **antalpha-skills** (NestJS MCP Server, port 3830) → 可作为 Layer 4 Provider 层
- **Antalpha RWA Skill** → OpenClaw Skill，已发布

## 关键设计原则
1. OpenAI-compatible REST API — 一次调用跨链执行
2. 自动容错 Fallback — Provider 挂了无缝切换
3. 策略引擎选最优 — 比费率、延迟、成功率
4. 对上层透明 — Agent 不用关心底层哪条链哪个服务

## 集成生态目标
OpenAI, Claude Desktop, Claude Code, Cursor, OpenClaw, Dify

## 关键里程碑
- 2026-04-01: 项目立项，架构文档整理完毕，开始讨论产品路线图
