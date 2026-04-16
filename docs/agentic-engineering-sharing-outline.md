# Agentic Engineering 分享大纲

**面向**: 会使用 vibe coding 和 agentic coding 的实际开发人员
**总时长**: 60 分钟

---

## 第一章：工具选择——什么时候用 OpenClaw，什么时候用 Claude Code（15 分钟）

### 1.1 工具光谱

```
轻量任务              重度任务
  │                      │
  ▼                      ▼
OpenClaw ←──────→ Claude Code / Codex
(个人助理)        (专业编程 Agent)
```

### 1.2 核心差异对比

| 维度 | OpenClaw | Claude Code / Codex |
|------|----------|---------------------|
| 会话模式 | 一问一答，串行 | 持久上下文，可并行编辑多文件 |
| Subagent | 需手动 spawn，超时严格 | 智能调度，可嵌套，超时可配置 |
| 上下文 | 对话窗口，易耗尽 | 文件系统级上下文，超长代码库友好 |
| Git 操作 | 需通过 exec 调用 git | 原生 git 命令支持 |
| 编译反馈 | 需转发日志 | 实时终端反馈 |
| 适合场景 | 知识库、文档、简单脚本 | 复杂重构、多文件并行、长期项目 |

### 1.3 OpenClaw 的真实局限（实践总结）

**我们 model-router 项目中的教训：**

- **对话必须一来一回**：无法像 Claude Code 那样在一个终端里持续编辑多个文件然后统一测试
- **Subagent 超时问题**：spawn 出来的子 Agent 有严格的超时限制，复杂任务容易中断
- **上下文耗尽**：长对话后期模型容易"遗忘"早期上下文的关键信息
- **不适合场景**：超过 2 小时的复杂重构、涉及 10+ 文件联动的工作

### 1.4 决策框架

```
任务判断：
│
├── 独立脚本 (< 100 行，无依赖文件)
│   └── OpenClaw ✅
│
├── 多文件重构 (> 5 个文件联动)
│   └── Claude Code ✅
│
├── 需要并行调研多个模块
│   └── Claude Code + Subagents ✅
│
├── 简单问答 / 知识库 / 文档生成
│   └── OpenClaw ✅
│
└── 长期项目 (> 1 小时工作量的功能)
    └── Claude Code ✅
```

### 1.5 实际案例：antalpha-skills 项目开发分配

| 任务 | 工具 | 原因 |
|------|------|------|
| MCP Server 架构设计 | Claude Code | 多文件联动，需要持续上下文 |
| 单个 skill 工具实现 | OpenClaw | 小型独立任务，一问一答足够 |
| SKILL.md 文档生成 | OpenClaw | 文档结构清晰，不需要复杂上下文 |
| web3-investor 功能重构 | Claude Code | 涉及 5+ 文件联动 |

---

## 第二章：大语言模型的选择（10 分钟）

### 2.1 编程模型的关键维度

| 维度 | 说明 | 为什么重要 |
|------|------|----------|
| **上下文窗口** | 单次对话能处理的 token 数 | 代码库越大，需要越大上下文 |
| **推理能力** | 复杂逻辑、多步骤推导能力 | 决定能否处理有依赖的任务 |
| **代码能力** | HumanEval / SWE-bench 分数 | 编程任务的核心能力 |
| **成本** | 每 token 价格 | 决定大规模使用的经济性 |

### 2.2 主流编程模型对比

| 模型 | 上下文 | 代码能力 | 适合场景 |
|------|--------|---------|---------|
| **Qwen 3.6 Plus** | 1M tokens | 强（最新 benchmark 前列）| 超长代码库、多文件分析 |
| **GLM-5** | 128K | 强 | 复杂推理，数学 |
| **Kimi K2.5** | 200K | 强 | 中文项目、文档分析 |
| **MiniMax-M2.7** | 100K | 中 | 快速简单任务 |

### 2.3 实际项目中的模型选择策略

```
日常对话 / 简单查询  → MiniMax（便宜，快速）
中文内容理解        → Kimi / GLM（中文优化）
超长代码分析        → Qwen 3.6 Plus（1M 上下文）
复杂推理 + 安全     → GLM-5（强推理）
```

### 2.4 上下文耗尽的真实案例

在我们项目中，一次长对话后期，模型突然"遗忘"了我们之前约定的代码规范。

解决方案：
- 每个项目建立 CLAUDE.md / AGENTS.md 规范文件
- 重要决策记录到 memory/checkpoints/
- 长任务分段执行，不在一个对话里做太多

---

## 第三章：开源 AI 编程工具生态（10 分钟）

### 3.1 工具全景图

| 工具 | 类型 | 开源 | 费用 | 推荐度 |
|------|------|------|------|--------|
| **Claude Code** | 专业编程 Agent | 否 | $20-200/月 | ⭐⭐⭐⭐⭐ |
| **Cursor** | AI IDE | 否 | $15-60/月 | ⭐⭐⭐⭐ |
| **Cline** | VS Code 扩展 | ✅ | 免费 + BYO API Key | ⭐⭐⭐⭐ |
| **OpenCode** | 终端编程 Agent | ✅ | $0-10/月 | ⭐⭐⭐⭐⭐ |
| **Windsurf** | AI IDE | 否 | $15-30/月 | ⭐⭐⭐ |
| **Codex CLI** | 终端编程 Agent | 否 | OpenAI 订阅 | ⭐⭐⭐ |
| **Gemini CLI** | 终端编程 Agent | ✅ | 免费/企业版 | ⭐⭐⭐ |
| **GitHub Copilot** | IDE 扩展 | 否 | $10-19/月 | ⭐⭐⭐ |

### 3.2 重点工具详细介绍

#### Cline（开源）

**定位**: VS Code 扩展 + 终端工具，完全开源

**特点**:
- 完全免费（个人开发者）
- 支持自带 API Key（BYO，pay-as-you-go）
- 支持 75+ LLM Provider（Anthropic、Gemini、OpenAI、OpenRouter、DeepSeek 等）
- 企业版 Teams：$20/月/人（含 10 个免费席位）

**适用场景**: 习惯 VS Code 的个人开发者，不想要订阅制

**安装**:
```bash
code --install-extension cialai.cline
```

**配置**:
```json
{
  "cline": {
    "preferredProider": "anthropic",
    "apiKey": "your-api-key"
  }
}
```

#### OpenCode（开源）

**定位**: 纯终端编程 Agent，多会话并行

**特点**:
- 完全开源，不存储代码和上下文数据
- 支持多会话并行（同一个项目多个 Agent 同时工作）
- 支持 75+ LLM Provider
- 支持 GitHub Copilot 账号登录
- 可通过 Models.dev 接入本地模型

**适用场景**: 高级用户，需要最大灵活性和隐私控制

**安装**:
```bash
# macOS
brew install opencode-ai/opencode/opencode

# 或直接下载
curl -L -O https://github.com/opencode-ai/opencode/releases/latest/download/opencode-x86_64-apple-darwin.tar.gz
```

#### Gemini CLI（开源）

**定位**: Google 官方终端编程工具

**特点**:
- 免费个人使用
- 内置 Google Search grounding（Agent 可以搜索网页验证答案）
- 1M token 上下文窗口
- 支持企业 Vertex AI 集成

**适用场景**: 需要实时联网搜索的编程任务

#### Codex CLI

**定位**: OpenAI 官方终端工具

**特点**:
- 与 OpenAI API Key 绑定
- 支持 Agent Teams（多 Agent 协作）
- 2026 年 2 月推出多 Agent 支持

### 3.3 选型建议

| 场景 | 推荐工具 |
|------|---------|
| 个人开发者，预算有限 | Cline + 自带 API Key ✅ |
| 需要多会话并行 | OpenCode ✅ |
| 追求最佳编程体验 | Claude Code ✅ |
| 习惯 IDE 界面 | Cursor ✅ |
| 需要联网搜索验证 | Gemini CLI ✅ |
| 企业，隐私要求高 | Cline + 自托管模型 ✅ |

---

## 第四章：各大厂 Coding Plan 价格对比（10 分钟）

### 4.1 概述：什么是 Coding Plan

Coding Plan 是各大模型厂商推出的编程订阅方案，特点：

- **按月订阅，不按 token 计费**
- 包含多个模型，一个 Key 通吃
- 比单独买 API Key 更划算（对重度编程用户）

### 4.2 阿里云百炼 Coding Plan

**官网**: https://modelstudio.alibaba.com

**套餐详情**:

| 套餐 | 价格 | 请求数限制 | 支持模型 |
|------|------|-----------|---------|
| **Lite** | $10/月（约 70 元/月） | 18,000 次请求/月（约 3,000 次/天） | Qwen3.5-plus, Qwen3-coder-plus, Qwen3-coder-next |
| **Pro** | $50/月 | 180,000 次请求/月 | 同上 + Qwen3-max |

**注意**: 这是国际版阿里云的价格，国内版价格更低（约 70 元 Lite，350 元 Pro）。

**配置方式（OpenClaw）**:
```json
{
  "provider": "bailian",
  "apiKey": "sk-sp-xxxxx",
  "baseUrl": "https://coding.dashscope.aliyuncs.com/compatible-mode/v1"
}
```

**一个 API Key 同时支持**:
- Claude Code
- OpenClaw
- Qwen Code
- Cline
- Cursor
- OpenCode
- 等所有兼容 OpenAI API 格式的工具

### 4.3 火山引擎 Kilo Code

**官网**: https://console.volcengine.com/kilo-code

**套餐详情**:

| 套餐 | 价格 | 包含 | QPS 上限 |
|------|------|------|---------|
| **Lite** | ¥39.9/月起 | 约 10M tokens/天 | QPS=5 |
| **Pro** | ¥39.9首购 + ¥199追加/月 | 约 50M tokens/天 | QPS=20 |

**支持模型**: GLM-5, Kimi-K2.5, DeepSeek-V3, Qwen3.5, MiniMax-M2.5 等

### 4.4 OpenCode Go 计划

**官网**: https://opencode.ai/go

**套餐详情**:

| 套餐 | 价格 | Token 包含 |
|------|------|-----------|
| **Go** | $5 首月，$10/月 | 1,200 GLM-5 / 1,850 Kimi K2.5 / 20,000 MiniMax M2.7 |

**特点**: 专注于开源模型，成本极低，适合预算有限的个人开发者

### 4.5 百炼国内版价格参考

| 套餐 | 价格 | Token 包含 |
|------|------|-----------|
| Lite | ¥70/月 | 40M tokens/5小时 |
| Pro | ¥350/月 | 更大额度 + QPS=20 |

### 4.6 综合价格对比（个人开发者）

| 方案 | 月费 | 模型覆盖 | QPS | 适合人群 |
|------|------|---------|-----|---------|
| **OpenCode Go** | $10 | 开源全家桶 | 低 | 预算有限，极致性价比 |
| **百炼 Lite（国际）** | $10 | Qwen 系列 | 低 | 主要用 Qwen |
| **百炼 Lite（国内）** | ¥70 | Qwen + GLM + Kimi | 中 | 国内用户，多模型切换 |
| **火山引擎 Pro** | ¥239 | GLM + Kimi + DeepSeek | 高 | 高频使用 |
| **Claude Code Pro** | $20 | Claude Sonnet 4 | 中 | 追求最佳体验 |
| **Claude Code Max** | $200 | Opus 4（20x 使用）| 高 | 重度专业用户 |

### 4.7 选型建议

| 需求 | 推荐方案 |
|------|---------|
| 预算有限，只用开源模型 | OpenCode Go ($10/月) |
| 国内用户，需要多模型 | 百炼 Lite (¥70/月) 或火山引擎 |
| 重度专业编程 | Claude Code Pro ($20/月) |
| 团队多人使用 | 百炼/火山引擎企业版（统一 Key，统一账单）|
| 想要同时用 Claude + 国产模型 | 百炼国际版（一个 Key 兼容多个工具）|

---

## 第五章：工程方法论——需求 → 测试 → 编程（10 分钟）

### 5.1 为什么顺序不能乱

**反例：model-router 项目早期教训**

我们最初没有写需求文档，直接让 AI 开始写。结果：
- AI 写的架构和预期完全不同
- 返工 3 次，浪费了 2 天
- 最后还是回到先写规范，再让 AI 写代码

### 5.2 AI 时代的 TDD 工作流

```
Step 1: 写需求 (SPEC.md)
         ↓
Step 2: 写测试用例 (TEST.md)
         ↓
Step 3: AI 执行编程
         ↓
Step 4: 运行测试验证
```

### 5.3 实际项目案例：antalpha-ai-docs 技能

**Step 1: 写需求文档**

```markdown
# antalpha-ai-docs 技能需求

## 功能
读取 antalpha-skills 源代码，生成两份文档

## 输入
- 源代码: ~/antalpha-com/antalpha-skills/libs/skills/*/src/tools/*.tools.ts

## 输出
1. 技术文档: ~/antalpha-com/antalpha-skills/docs/mcp-documentation.md
2. 安装手册: ~/.openclaw/workspace/skills/antalpha-ai-setup/SKILL.md

## Git 规范
- 技术文档: docs/update-mcp-reference-YYYYMMDD 分支 → PR
- 安装手册: 直接 push 到 main
```

**Step 2: 写测试用例**

```markdown
## 测试 1: 源代码解析
输入: libs/skills/web3-investor/src/tools/*.tools.ts
验证: 所有 registerTool 调用都被正确解析

## 测试 2: 文档格式一致性
验证: 生成文档包含 Overview / Quick Start / Tool Reference / Security 四大章节
```

**Step 3: AI 执行 + Step 4: 人工 Review**

### 5.4 核心原则

> **不写需求，直接让 AI 写代码 = 在没有设计图的情况下让工人开工。**

---

## 第六章：Git 协作与代码发布规范（10 分钟）

### 6.1 每日开始工作前（AGENTS.md 规范）

```bash
# 在功能分支上
git fetch origin main
git merge origin/main

# 有冲突时
git stash push          # 暂存改动
git merge origin/main   # 合并最新
git stash pop          # 取回改动
```

### 6.2 分支命名规范

| 类型 | 格式 | 例子 |
|------|------|------|
| 功能 | `feat/xxx` | `feat/add-poly-master-trading` |
| 文档 | `docs/update-*-YYYYMMDD` | `docs/update-mcp-reference-20260410` |
| 热修复 | `hotfix/xxx` | `hotfix/fix-rate-limit-bug` |
| 实验 | `experiment/xxx` | `experiment/try-new-mcp-sdk` |

### 6.3 Commit 规范（Conventional Commits）

```bash
git commit -m "feat: add investor_protocol_research tool"
git commit -m "fix: resolve API key header issue in swap-quote"
git commit -m "docs: update MCP reference from source code"
git commit -m "refactor: extract shared error handling"
```

### 6.4 质量门禁（必须通过才能合并）

```bash
# 构建必须通过
pnpm run build:mcp-skills

# AI 写的代码"看起来对" ≠ 实际能跑
# 构建失败 = 明确红线，AI 必须修复
```

### 6.5 Agent 生成文件管理

> 临时文件放在 `.local/` 目录，不进入 Git。

```bash
.local/agent/test_script.py    # ✅ 不进入 Git
src/test/generated_test.py     # ❌ 错误，会被 CI 跑
```

---

## 第七章：多 Agent 协作——并行与调度（5 分钟）

### 7.1 什么任务可以并行

**可以并行（无依赖）**:
- 同时调研多个模块
- 同时生成多个独立文档
- 同时扫描多个代码文件

**不能并行（有依赖）**:
- 先生成 API 文档，再生成 SDK
- 先写数据模型，再写业务逻辑

### 7.2 任务锁机制（防止多 Agent 抢任务）

```bash
# 开始任务前
if [ -f task_running.lock ]; then
    echo "任务正在其他终端处理中"
    exit 1
fi

echo "时间戳: $(date), 任务: xxx" > task_running.lock

# ... 执行任务 ...

rm task_running.lock
```

### 7.3 人类兜底原则

| Agent 能做 | Agent 不能做 |
|-----------|------------|
| 调研、代码、文档、测试 | 业务决策、法律责任、道德判断 |

---

## 第八章：记忆与上下文管理（5 分钟）

### 8.1 记忆层级

| 层级 | 文件 | 生命周期 |
|------|------|---------|
| 项目级 | SPEC.md / AGENTS.md | 项目期间 |
| 迭代级 | memory/checkpoints/*.md | 迭代后归档 |
| Agent 级 | MEMORY.md / memory/*.md | 长期 |
| 临时 | 对话窗口 | 单次会话 |

### 8.2 Checkpoint 格式（实际规范）

```markdown
# Checkpoint: {任务名称}

## 任务目标
一句话描述目标

## 已完成步骤
1. ✅ 步骤一
2. 🔄 步骤二（进行中）

## 下一步
1. 待办一
2. 待办二

## 关键文件
- `path/to/file1`

## 错误记录
| 错误 | 原因 | 解决方案 |
|------|------|----------|
| xxx | xxx | xxx |
```

### 8.3 Lessons 知识库（错误经验归档）

```markdown
## 【工具选择】用 Python 硬编码解析邮件格式

**日期**: 2026-02-27
**错误**: 尝试用 Python 正则解析所有邮件格式
**原因**: 邮件格式多变，代码无法覆盖所有 edge case
**教训**: 应该用大模型理解上下文 + 简单脚本提取
```

---

## 总结

| 章节 | 核心要点 |
|------|---------|
| **第一章** | OpenClaw 适合轻量任务，Claude Code 适合复杂项目 |
| **第二章** | 选对模型：简单任务用便宜模型，复杂推理用强模型 |
| **第三章** | Cline、OpenCode 是免费开源首选；Claude Code 是最佳体验 |
| **第四章** | 百炼国际版 $10/月性价比最高；火山引擎适合高频团队 |
| **第五章** | 先写需求，再编程——不要在无设计图的情况下让 AI 开工 |
| **第六章** | Git 规范是 AI 编程的安全网——分支、Commit、构建检查、Review |
| **第七章** | 并行加速，但有依赖的任务必须串行 |
| **第八章** | 记忆分层管理，重要结论写文件，不依赖 AI 记忆 |
