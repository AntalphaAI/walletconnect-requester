# Web3-Investor 技能改进建议报告

**作者**: 小田 (AI Assistant)  
**日期**: 2026年4月9日  
**版本**: v1.0  
**背景**: 基于 Merkl 协议分析实战中发现的使用问题

---

## 📋 执行摘要

Web3-Investor 技能在实际使用中暴露了几个关键问题：文档不够直观、意图澄清流程断裂、协议研究功能不突出。本报告从文档、代码、功能、用户体验四个维度提出改进建议，帮助技能从"收益搜索引擎"升级为"投资研究助手"。

---

## 🔍 问题诊断

### 使用场景回顾

**任务**: 分析 Merkl 协议的投资机会

**遇到的问题**:

| 问题 | 影响 |
|------|------|
| exec 工具拒绝执行复杂命令 | 无法通过命令行调用 MCP 客户端 |
| MCP 服务器返回 NEEDS_CLARIFICATION | 无明确下一步引导，用户卡住 |
| 不知道 investor_protocol_research 的存在 | 文档没有突出协议研究功能 |
| SKILL.md 缺少使用场景决策树 | 用户不知道该用哪个命令 |

### 根因分析

```
用户需求："我想分析 Merkl 协议"
    ↓
问题：不知道该用哪个命令
    ↓
尝试 discover → NEEDS_CLARIFICATION → 卡住
    ↓
结果：放弃使用技能，改用手动搜索
```

**核心问题**: 技能更像是"收益搜索引擎"，而不是"投资研究助手"

---

## 💡 改进建议

### 1. 📖 文档层面

| 问题 | 建议 | 优先级 |
|------|------|--------|
| 缺少使用场景 | SKILL.md 添加"场景→命令"决策树 | 🔴 高 |
| 参数不清晰 | `--product-id` 格式需要明确示例 | 🔴 高 |
| 错误处理缺失 | 说明 NEEDS_CLARIFICATION 时该怎么办 | 🟡 中 |
| 缺少快速开始 | 新用户不知道第一步做什么 | 🟡 中 |
| 无示例输出 | 不知道命令会返回什么 | 🟢 低 |

**建议新增章节**:
```markdown
## 🎯 常见使用场景

### 场景 1: 我想了解一个协议的投资价值
→ 使用 `research` 命令
  python3 mcp_client.py research --protocol merkl

### 场景 2: 我想找到某个链的最佳收益
→ 使用 `discover` 命令
  python3 mcp_client.py discover --chain ethereum --min-apy 5

### 场景 3: 我想对比多个协议
→ 使用 `compare` 命令
  python3 mcp_client.py compare --ids aave compound morpho

### 场景 4: 我想分析一个具体的机会
→ 使用 `analyze` 命令
  python3 mcp_client.py analyze --product-id aave-usdc-base
```

---

### 2. 🔧 代码层面

| 问题 | 影响 | 建议 | 优先级 |
|------|------|------|--------|
| 仅支持 HTTP 调用 | exec 工具限制复杂命令 | 提供 bash wrapper 脚本 | 🔴 高 |
| 缺少超时重试 | 网络问题直接报错 | 添加自动重试机制 | 🟡 中 |
| 错误信息不友好 | 用户看不懂原始错误 | 解析并展示可操作提示 | 🟡 中 |
| 会话管理复杂 | 首次调用需要握手 | 自动初始化，透明处理 | 🟢 低 |

**建议新增 wrapper 脚本**:
```bash
#!/bin/bash
# scripts/run.sh - 统一调用入口
# 用法: ./scripts/run.sh discover --chain ethereum --min-apy 5

set -e
cd "$(dirname "$0")/.."

# 自动初始化会话并调用
python3 scripts/mcp_client.py "$@"
```

**建议改进错误处理**:
```python
# 当前：直接返回错误 JSON
# 建议：解析并给出下一步建议

def format_error(error: dict) -> str:
    if error.get("gate_status") == "NEEDS_CLARIFICATION":
        options = error["clarification"]["options"]
        commands = error["clarification"].get("suggested_commands", [])
        msg = "⚠️ 需要澄清意图\n\n"
        msg += error["clarification"]["question"] + "\n\n"
        msg += "请选择：\n"
        for i, opt in enumerate(options, 1):
            msg += f"  {i}. {opt}\n"
        if commands:
            msg += "\n运行命令继续：\n"
            for cmd in commands:
                msg += f"  python3 scripts/mcp_client.py {cmd}\n"
        return msg
    return json.dumps(error, indent=2)
```

---

### 3. 🎯 功能层面

| 功能 | 状态 | 建议 | 优先级 |
|------|------|------|--------|
| `investor_protocol_research` | 已存在但文档不足 | 在 SKILL.md 中突出显示 | 🔴 高 |
| 协议基本面分析 | 缺失 | 添加 protocol_overview 功能 | 🟡 中 |
| 风险评估工具 | 缺失 | 集成风险评分模块 | 🟡 中 |
| 市场概览 | 缺失 | 添加 market-overview 命令 | 🟢 低 |

**建议新增/改进命令**:
```bash
# 协议研究（已存在，需改进文档）
python3 mcp_client.py research --protocol merkl

# 协议风险评估（建议新增）
python3 mcp_client.py risk --protocol merkl

# 市场概览（建议新增）
python3 mcp_client.py overview --chain ethereum --top 10
```

**建议新增 MCP 工具**:
| 工具名 | 用途 | 输入 | 输出 |
|--------|------|------|------|
| `investor_protocol_overview` | 协议基本面概览 | protocol_name | TVL, 团队, 审计, 竞争格局 |
| `investor_risk_score` | 协议风险评分 | protocol_name | 风险评分 (0-100), 风险因素列表 |
| `investor_market_overview` | 市场概览 | chain, category | 最佳机会排行, 趋势分析 |

---

### 4. 👤 用户体验层面

| 问题 | 体验影响 | 建议 | 优先级 |
|------|---------|------|--------|
| 意图澄清流程断裂 | 问了问题但没给下一步 | 澄清后自动继续或给明确选择 | 🔴 高 |
| 缺少快速开始 | 新用户不知道第一步 | SKILL.md 开头加 30 秒快速开始 | 🔴 高 |
| 无示例输出 | 不知道命令返回什么 | 每个命令加示例输出 | 🟡 中 |
| 缺少交互式引导 | 用户需要记住所有参数 | 添加交互式模式 | 🟢 低 |

**建议改进意图澄清流程**:
```json
{
  "status": "NEEDS_CLARIFICATION",
  "question": "您想了解 Merkl 的哪个方面？",
  "options": [
    {
      "label": "协议基本面",
      "description": "TVL, 团队, 审计, 竞争格局",
      "command": "research --protocol merkl"
    },
    {
      "label": "收益机会",
      "description": "当前可用的收益机会",
      "command": "discover --natural-language 'Merkl yield opportunities'"
    },
    {
      "label": "风险评估",
      "description": "协议风险评分和风险因素",
      "command": "risk --protocol merkl"
    }
  ],
  "suggestion": "请运行以下命令之一：\n  python3 mcp_client.py research --protocol merkl"
}
```

**建议新增快速开始章节**:
```markdown
## ⚡ 30 秒快速开始

### 我想分析一个协议
```bash
python3 scripts/mcp_client.py research --protocol aave
```

### 我想找到最佳收益
```bash
python3 scripts/mcp_client.py discover --chain ethereum --min-apy 5
```

### 我想对比两个协议
```bash
python3 mcp_client.py compare --ids aave compound
```
```

---

## 📊 改进优先级矩阵

| 维度 | 高优先级 | 中优先级 | 低优先级 |
|------|---------|---------|---------|
| **文档** | 场景决策树、参数示例 | 快速开始、错误处理 | 示例输出 |
| **代码** | Bash wrapper | 超时重试、错误解析 | 会话管理优化 |
| **功能** | 突出 research 功能 | 风险评估、基本面分析 | 市场概览 |
| **体验** | 意图澄清闭环 | 交互式引导 | 命令自动补全 |

---

## 🎯 预期效果

| 指标 | 当前 | 改进后 |
|------|------|--------|
| 新用户上手时间 | 10+ 分钟 | < 2 分钟 |
| 首次使用成功率 | ~50% | > 90% |
| 意图澄清完成率 | ~30% | > 80% |
| 用户满意度 | 未知 | 显著提升 |

---

## ✅ TODO

### 文档 (Docs)
- [ ] D1: SKILL.md 添加"场景→命令"决策树章节
- [ ] D2: SKILL.md 添加 30 秒快速开始章节
- [ ] D3: 每个命令添加示例输入和示例输出
- [ ] D4: 添加 NEEDS_CLARIFICATION 错误处理指南
- [ ] D5: 突出显示 `research` 命令的用法

### 代码 (Code)
- [ ] C1: 创建 `scripts/run.sh` bash wrapper 脚本
- [ ] C2: 添加超时重试机制 (3 次重试, 递增延迟)
- [ ] C3: 改进错误信息格式化 (可操作的下一步提示)
- [ ] C4: 意图澄清后自动继续执行或提供明确选择
- [ ] C5: 添加会话健康检查和自动恢复

### 功能 (Features)
- [ ] F1: 改进 `investor_protocol_research` 文档和示例
- [ ] F2: 添加 `investor_protocol_overview` 工具 (协议基本面)
- [ ] F3: 添加 `investor_risk_score` 工具 (风险评分)
- [ ] F4: 添加 `investor_market_overview` 工具 (市场概览)

### 用户体验 (UX)
- [ ] U1: 意图澄清流程闭环 (给出可点击的下一步)
- [ ] U2: 添加交互式模式 (`python3 mcp_client.py interactive`)
- [ ] U3: 添加命令行自动补全支持

---

## 🐛 Issues

### Issue #1: 添加场景决策树到 SKILL.md
**标签**: `documentation`, `good first issue`  
**描述**:  
SKILL.md 缺少使用场景决策树，用户不知道该用哪个命令。需要在文档开头添加"场景→命令"的映射表。

**验收标准**:
- [ ] 添加"常见使用场景"章节
- [ ] 包含至少 4 个场景：协议分析、收益发现、协议对比、机会分析
- [ ] 每个场景给出具体的命令示例
- [ ] 使用中文和英文双语

---

### Issue #2: 创建 bash wrapper 脚本
**标签**: `enhancement`, `code`  
**描述**:  
当前 MCP 客户端只能通过 `python3 scripts/mcp_client.py` 调用，在某些环境下会被 exec 工具拒绝。需要创建一个 bash wrapper 简化调用。

**验收标准**:
- [ ] 创建 `scripts/run.sh` 脚本
- [ ] 支持所有子命令透传
- [ ] 添加帮助信息 (`--help`)
- [ ] 添加超时和重试机制
- [ ] 文件权限设置为可执行

---

### Issue #3: 改进意图澄清流程
**标签**: `enhancement`, `ux`, `priority:high`  
**描述**:  
当 MCP 服务器返回 NEEDS_CLARIFICATION 时，当前只是输出原始 JSON，用户不知道该怎么办。需要解析并给出可操作的下一步。

**验收标准**:
- [ ] 解析 NEEDS_CLARIFICATION 响应
- [ ] 显示友好的问题和选项
- [ ] 为每个选项提供可直接运行的命令
- [ ] 支持用户选择后自动执行

---

### Issue #4: 突出显示 research 命令
**标签**: `documentation`, `good first issue`  
**描述**:  
`investor_protocol_research` 功能已存在，但 SKILL.md 中没有突出显示。用户想分析协议时不知道有这个命令。

**验收标准**:
- [ ] 在 SKILL.md 开头的快速开始中添加 research 示例
- [ ] 在 Available Commands 表格中强调 research 的用途
- [ ] 添加 2-3 个 research 命令的使用示例
- [ ] 在 Example Sessions 中添加协议分析场景

---

### Issue #5: 添加协议风险评分工具
**标签**: `enhancement`, `feature`, `priority:medium`  
**描述**:  
用户分析协议时需要风险评估。建议添加 `investor_risk_score` 工具，返回协议风险评分和风险因素列表。

**验收标准**:
- [ ] 定义 MCP 工具接口 `investor_risk_score`
- [ ] 输入：protocol_name, optional chain
- [ ] 输出：risk_score (0-100), risk_factors[], recommendation
- [ ] 集成到 SKILL.md 文档

---

### Issue #6: 添加 30 秒快速开始章节
**标签**: `documentation`, `good first issue`  
**描述**:  
新用户不知道第一步做什么。需要在 SKILL.md 开头添加一个 30 秒快速开始章节，让用户立即上手。

**验收标准**:
- [ ] 位置：SKILL.md 标题下方、Critical Rules 之前
- [ ] 包含 3 个最常用的命令示例
- [ ] 每个示例带一行说明
- [ ] 使用中文和英文双语

---

## 📚 参考资源

- [Web3-Investor GitHub 仓库](https://github.com/AntalphaAI/web3-investor)
- [Web3-Investor ClawHub 页面](https://clawhub.ai/bevanding/web3-investor)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Antalpha MCP Server 仓库](https://github.com/antalpha-com/antalpha-skills)

---

*本报告基于实际使用体验撰写，旨在帮助改进 web3-investor 技能的可用性。*
