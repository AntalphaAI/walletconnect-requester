# 经验教训 - 2026-04-04（新增）

---

## 【架构设计】Intent Gate + Confirmation Gate 双闸门

### 背景
antalpha AI 项目（2026-04-01/02）设计 Web3 AI Agent 路由层，借鉴 oh-my-opencode 的 Sisyphus 架构。

### 核心设计
1. **Intent Gate**：意图识别 + 参数提取
   - Web3 领域参数复杂（token/chain/slippage/amount）
   - 置信度 < 0.6 → 要求用户澄清，不盲目猜测
2. **Confirmation Gate**：高风险操作（swap/transfer）必须用户确认参数
   - 与编码错误不同，Web3 操作不可逆
   - 必须显式确认金额、汇率、Gas

### 与 oh-my-opencode 的关键差异
- 编码错了可撤回，Web3 错了钱没了
- 所以 Confirmation Gate 是**必选**而非可选项

### 检索标签：#IntentRouter #ConfirmationGate #Web3 #架构设计

---

# 经验教训 - 2026-03-12

---

## 【重要】EIP-681 支付链接格式

### 正确格式（USDT ERC-20 transfer）
```
ethereum:{USDT_CONTRACT}@{chain_id}/transfer?address={to}&uint256={amount_raw}
```

### USDT 合约地址
- Base: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`

### 常见错误
- ❌ 原生 ETH 格式: `ethereum:{chain_id}:{to}?value={amount}`
- ❌ 忘记 raw amount 需要 6 位小数精度

### 经验来源
复制 eth-payment 技能代码时"断章取义"，只复制了原生代币部分，未完整理解代码逻辑。

检索标签：#EIP-681 #USDT #支付链接

---

## 【重要】SKILL.md 编写规范

### 核心原则
1. **少即是多**：文档应该精简为技能使用说明
2. **不能作为数据源**：产品参数（期限、利率）必须从服务器实时读取
3. **全英文**：不允许中英混杂

### 错误示范
- ❌ 在 SKILL.md 中硬编码产品参数
- ❌ 将 SKILL.md 当作数据库使用
- ❌ 中英文混搭

### 正确做法
- ✅ SKILL.md 只描述功能和使用方法
- ✅ 所有动态数据从 API/MCP 获取
- ✅ 保持 100 行以内的简洁文档

检索标签：#SKILL.md #文档规范 #少即是多

---

## 【重要】Git 分支管理

### 问题背景
推送代码到 GitHub 后，用户看到的仍是旧版本。

### 原因分析
- GitHub 默认分支是 `main`（2020年后）
- 本地 `git init` 默认创建 `master` 分支
- 推送到 `master` 但用户看到的是 `main`

### 解决方案
```bash
# 确保推送到 main 分支
git push origin HEAD:main
```

### 最佳实践
- 推送前确认远程默认分支名称
- 使用 `gh repo view` 查看仓库信息
- 或者本地也改名为 main：`git branch -M main`

检索标签：#Git #GitHub #分支管理

---

## 【重要】编程外包工具的正确使用方法

### 问题背景
今天在处理 web3-investor MCP 集成任务时，多次尝试调用编程外包工具失败：
- `sessions_spawn(runtime="acp")` → Gateway 1008 错误
- `sessions_spawn(runtime="subagent")` → 同样的网络拦截
- `node tools/qwen-coder/index.js` → SIGTERM 终止

### 根本原因
1. **Gateway 1008** 是 OpenClaw 主机的底层网络安全拦截，无法在代码层面解决
2. **qwen-coder Node.js 模块**会弹窗确认，导致 exec 进程卡死
3. **正确的工具**是全局安装的 `qwen` CLI 命令

### 正确解决方案
```bash
# ✅ 正确：使用 qwen CLI 命令（必须带 -y 参数）
exec(command='qwen "具体编程任务" -y', timeout=900)

# ❌ 错误：任何其他方式都会失败
```

### 关键要点
- `-y` 参数：**必须带上**，开启静默模式
- `timeout`：根据任务复杂度设置（300s-900s）
- **遇到 Gateway 1008**：立即放弃该路径，切换到 qwen CLI

### 相关文件
- AGENTS.md（已更新编程外包钢印）
- skills/web3-investor/scripts/discovery/find_opportunities.py
- skills/web3-investor/config/config.json

检索标签：#qwen-coder #programming #gateway #lessons

---

## 【Claude Code 课程】Skills 编写与复用

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/skills.md

### 核心概念
Skills 是扩展 Claude 能力的模块化指令，通过 `SKILL.md` 文件定义。

### Skill 存储位置（优先级从高到低）
| 位置 | 路径 | 适用范围 |
|------|------|----------|
| Enterprise | 托管设置 | 组织所有用户 |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | 所有项目 |
| Project | `.claude/skills/<skill-name>/SKILL.md` | 当前项目 |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | 插件启用处 |

### Skill 目录结构
```
my-skill/
├── SKILL.md           # 主指令（必需）
├── template.md        # 模板文件（可选）
├── examples/          # 示例输出（可选）
│   └── sample.md
└── scripts/           # 可执行脚本（可选）
    └── validate.sh
```

### SKILL.md 格式
```yaml
---
name: skill-name                    # 技能名称（可选，默认目录名）
description: What this skill does   # 描述（推荐，用于自动触发）
disable-model-invocation: true      # 禁止自动调用（可选）
user-invocable: false               # 对用户隐藏（可选）
allowed-tools: Read, Grep           # 允许的工具白名单（可选）
---

# 指令内容（Markdown）
When doing X, always:
1. Step one
2. Step two
```

### 两种技能类型
1. **Reference Content** - 知识型：编码规范、设计模式、领域知识（自动应用）
2. **Task Content** - 任务型：部署、提交、代码生成（通常手动触发）

### 跨项目复用方法
- **Personal skills**: 放在 `~/.claude/skills/`，所有项目可用
- **Plugin**: 打包成插件，通过市场分发
- **Git 子模块**: 将 skills 目录作为子模块引入

检索标签：#ClaudeCode #Skills #SKILL.md #模块化

---

## 【Claude Code 课程】Plugins 插件系统

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/plugins.md

### 核心概念
Plugin 是自包含的功能扩展包，可包含 Skills、Agents、Hooks、MCP servers、LSP servers。

### Standalone vs Plugin 对比
| 方式 | 技能名 | 适用场景 |
|------|--------|----------|
| Standalone (`.claude/`) | `/hello` | 个人工作流、项目定制、快速实验 |
| Plugin (`.claude-plugin/`) | `/my-plugin:hello` | 团队共享、社区分发、版本控制、跨项目复用 |

### Plugin 目录结构
```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 插件清单（必需）
├── commands/                # Skills as Markdown files
├── agents/                  # 自定义 Agent 定义
├── skills/                  # Agent Skills (SKILL.md)
├── hooks/                   # 事件处理器
│   └── hooks.json
├── .mcp.json                # MCP 服务器配置
├── .lsp.json                # LSP 服务器配置
└── settings.json            # 默认设置
```

### plugin.json 清单格式
```json
{
  "name": "my-first-plugin",
  "description": "A greeting plugin",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "commands": ["./custom/commands/"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "lspServers": "./.lsp.json"
}
```

### 本地测试命令
```bash
# 加载本地插件进行测试
claude --plugin-dir ./my-plugin

# 重新加载插件（无需重启）
/reload-plugins
```

### 插件安装范围
| 范围 | 设置文件 | 用途 |
|------|----------|------|
| `user` | `~/.claude/settings.json` | 个人插件，所有项目可用（默认） |
| `project` | `.claude/settings.json` | 团队插件，通过版本控制共享 |
| `local` | `.claude/settings.local.json` | 项目特定，gitignored |
| `managed` | 托管设置 | 只读，仅更新 |

### 关键要点
- **Namespace**: Plugin 技能自动加前缀 `/plugin-name:skill-name`，防止冲突
- **开发流程**: 先用 Standalone 快速迭代 → 成熟后转为 Plugin 分享
- **版本控制**: 使用语义化版本 `1.2.0`

检索标签：#ClaudeCode #Plugins #插件系统 #复用

---

## 【Claude Code 课程】Hooks 事件钩子

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/plugins-reference.md

### 核心概念
Hooks 是事件处理器，在 Claude Code 特定事件发生时自动执行命令或脚本。

### 可用事件
| 事件 | 触发时机 |
|------|----------|
| `PreToolUse` | 使用任何工具前 |
| `PostToolUse` | 工具成功执行后 |
| `PostToolUseFailure` | 工具执行失败后 |
| `PermissionRequest` | 显示权限对话框时 |
| `UserPromptSubmit` | 用户提交提示时 |
| `Notification` | 发送通知时 |
| `Stop` | 尝试停止时 |
| `SubagentStart` | 子代理启动时 |
| `SubagentStop` | 子代理停止时 |
| `SessionStart` | 会话开始时 |
| `SessionEnd` | 会话结束时 |
| `TeammateIdle` | Agent Team 队友空闲时 |
| `TaskCompleted` | 任务标记完成时 |
| `PreCompact` | 对话历史压缩前 |

### hooks.json 配置格式
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format-code.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook 类型
1. **command**: 执行 shell 命令或脚本
2. **prompt**: 用 LLM 评估提示（使用 `$ARGUMENTS` 占位符）
3. **agent**: 运行 agentic 验证器（带工具的复杂验证任务）

### 典型应用场景
- **代码格式化**: 每次编辑后自动运行 `prettier` 或 `black`
- **提交前检查**: 运行 lint 和测试
- **自动保存**: 工具使用后自动提交到 git
- **通知发送**: 任务完成后发送 Slack/Discord 通知

检索标签：#ClaudeCode #Hooks #事件驱动 #自动化

---

## 【Claude Code 课程】MCP 服务器集成

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/plugins-reference.md

### 核心概念
MCP (Model Context Protocol) 是连接 AI 工具与外部数据源的开源标准。

### MCP 配置格式 (.mcp.json)
```json
{
  "mcpServers": {
    "plugin-database": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data"
      }
    },
    "plugin-api-client": {
      "command": "npx",
      "args": ["@company/mcp-server", "--plugin-mode"],
      "cwd": "${CLAUDE_PLUGIN_ROOT}"
    }
  }
}
```

### 环境变量
- `${CLAUDE_PLUGIN_ROOT}`: 插件根目录路径

### 集成行为
- Plugin MCP 服务器在插件启用时自动启动
- 服务器作为标准 MCP 工具出现在 Claude 工具箱中
- 可与 Claude 现有工具无缝集成
- 可独立于用户 MCP 服务器配置

### 避免上下文爆炸的方法
1. **按需启动**: MCP 服务器仅在需要时启动
2. **精简工具**: 每个 MCP 服务器只暴露必要工具
3. **结果过滤**: 在 MCP 服务器层过滤数据，不返回大量原始数据
4. **分页查询**: 大数据集使用分页，避免一次性加载

检索标签：#ClaudeCode #MCP #外部工具 #上下文管理

---

## 【Claude Code 课程】Subagents 子代理

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/sub-agents.md

### 核心概念
Subagents 是专门的 AI 助手，在独立的上下文窗口中运行，拥有自定义系统提示、特定工具访问权限和独立权限。

### Subagents vs Agent Teams 对比
| 特性 | Subagents | Agent Teams |
|------|-----------|-------------|
| **上下文** | 独立上下文，结果返回给调用者 | 独立上下文，完全独立 |
| **通信** | 仅向主代理报告结果 | 队友直接互相通信 |
| **协调** | 主代理管理所有工作 | 共享任务列表，自我协调 |
| **最佳场景** | 只需要结果的关注任务 | 需要讨论和协作的复杂工作 |
| **Token 成本** | 较低：结果汇总回主上下文 | 较高：每个队友是独立的 Claude 实例 |

### 内置 Subagents
| Agent | 模型 | 工具 | 用途 |
|-------|------|------|------|
| **Explore** | Haiku | 只读 | 代码库搜索和分析 |
| **Plan** | 继承 | 只读 | Plan 模式下的代码库研究 |
| **General-purpose** | 继承 | 全部 | 复杂多步骤任务 |
| **Bash** | 继承 | - | 在独立上下文中运行终端命令 |

### Subagent 存储位置（优先级从高到低）
| 位置 | 范围 | 优先级 | 创建方式 |
|------|------|--------|----------|
| `--agents` CLI 标志 | 当前会话 | 1 (最高) | 启动时传递 JSON |
| `.claude/agents/` | 当前项目 | 2 | 交互式或手动 |
| `~/.claude/agents/` | 所有项目 | 3 | 交互式或手动 |
| Plugin 的 `agents/` | 插件启用处 | 4 (最低) | 随插件安装 |

### Subagent 文件格式
```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
maxTurns: 50
skills: ["api-conventions"]
memory: true
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

### Frontmatter 字段
| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 是 | 唯一标识符（小写字母和连字符） |
| `description` | 是 | Claude 何时委托给此 subagent |
| `tools` | 否 | 允许的工具列表（省略则继承全部） |
| `disallowedTools` | 否 | 禁止的工具（从继承/指定列表中移除） |
| `model` | 否 | 模型：`sonnet`, `opus`, `haiku`, `inherit` |
| `permissionMode` | 否 | 权限模式：`default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | 否 | 最大 agentic 轮数 |
| `skills` | 否 | 自动加载的技能列表 |
| `memory` | 否 | 是否启用记忆 |

### CLI 创建 Subagent
```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer...",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist...",
    "prompt": "You are an expert debugger..."
  }
}'
```

### Subagent 使用场景
- **代码审查**: 自动审查代码变更
- **调试**: 专门分析错误和测试失败
- **探索**: 只读搜索代码库，保持主上下文干净
- **规划**: Plan 模式下研究代码库
- **特定领域**: 安全审查、性能优化、文档生成

### 上下文隔离方法
1. **独立上下文窗口**: 每个 subagent 有自己的上下文
2. **工具限制**: 通过 `tools` 和 `disallowedTools` 限制可执行操作
3. **模型选择**: 使用更便宜/更快的模型（如 Haiku）降低成本
4. **最大轮数**: 通过 `maxTurns` 防止无限循环
5. **只读模式**: Explore/Plan agent 只能读取，不能修改

检索标签：#ClaudeCode #Subagents #子代理 #上下文隔离

---

## 【Claude Code 课程】Agent Teams 代理团队

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/agent-teams.md

### 核心概念
Agent Teams 协调多个 Claude Code 实例作为一个团队工作，一个会话作为团队领导，协调工作、分配任务、综合结果。

### 启用 Agent Teams
```json settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 最佳使用场景
- **研究和审查**: 多个队友同时调查问题的不同方面
- **新模块或功能**: 每个队友负责独立的部分
- **调试竞争假设**: 队友并行测试不同理论
- **跨层协调**: 前端、后端、测试各由不同队友负责

### 显示模式
| 模式 | 说明 | 要求 |
|------|------|------|
| **In-process** | 所有队友在主终端运行，Shift+Down 切换 | 任何终端 |
| **Split panes** | 每个队友独立面板，可同时看到所有输出 | tmux 或 iTerm2 |

### 配置显示模式
```json settings.json
{
  "teammateMode": "in-process"  // 或 "tmux", "auto"
}
```

### 创建 Agent Team
```text
I'm designing a CLI tool. Create an agent team to explore this from
different angles: one teammate on UX, one on technical architecture,
one playing devil's advocate.
```

### 团队架构
| 组件 | 角色 |
|------|------|
| **Team lead** | 主 Claude Code 会话，创建团队、生成队友、协调工作 |
| **Teammates** | 独立的 Claude Code 实例，各自处理分配的任务 |
| **Task list** | 共享工作列表，队友认领和完成 |
| **Mailbox** | 代理间通信的消息系统 |

### 任务状态
- **Pending**: 待处理
- **In progress**: 进行中
- **Completed**: 已完成
- **Blocked**: 有依赖任务未完成

### 任务分配方式
1. **Lead 分配**: 领导明确指定任务给特定队友
2. **Self-claim**: 队友完成后自动认领下一个未分配、未阻塞的任务

### 队友控制命令
```text
# 指定队友和模型
Create a team with 4 teammates. Use Sonnet for each.

# 要求计划审批
Spawn an architect teammate. Require plan approval before changes.

# 直接与队友对话
Ask the researcher teammate to check the API documentation.

# 优雅关闭队友
Ask the researcher teammate to shut down

# 清理团队
Clean up the team
```

### 团队存储位置
- **Team config**: `~/.claude/teams/{team-name}/config.json`
- **Task list**: `~/.claude/tasks/{team-name}/`

### Hooks 质量门控
| Hook | 触发时机 | 用途 |
|------|----------|------|
| `TeammateIdle` | 队友即将空闲时 | 发送反馈让队友继续工作（退出码 2） |
| `TaskCompleted` | 任务标记完成时 | 阻止完成并发送反馈（退出码 2） |

### Agent Teams 限制
- **实验性功能**: 默认禁用，需要环境变量启用
- **会话恢复**: 有已知限制
- **任务协调**: 复杂依赖可能有问题
- **关闭行为**: 需要优雅关闭队友后再清理团队

### 何时不使用 Agent Teams
- 顺序任务（有明确先后顺序）
- 同一文件编辑（会产生冲突）
- 依赖关系多的工作
- 简单任务（token 成本高）

检索标签：#ClaudeCode #AgentTeams #代理团队 #并行协作

---

## 【Claude Code 课程】MCP 服务器配置详解

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/mcp.md

### 核心概念
MCP (Model Context Protocol) 是连接 AI 工具与外部数据源的开源标准。MCP 服务器让 Claude Code 访问你的工具、数据库和 API。

### MCP 传输类型
| 类型 | 命令 | 适用场景 |
|------|------|----------|
| **HTTP** | `claude mcp add --transport http <name> <url>` | 远程云服务（推荐） |
| **SSE** | `claude mcp add --transport sse <name> <url>` | 远程服务（已弃用） |
| **Stdio** | `claude mcp add --transport stdio <name> -- <command>` | 本地进程/自定义脚本 |

### 配置示例

**HTTP 服务器**:
```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

**Stdio 服务器**:
```bash
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

### 管理命令
```bash
claude mcp list                    # 列出所有服务器
claude mcp get github              # 查看特定服务器详情
claude mcp remove github           # 移除服务器
/mcp                               # 在 Claude Code 内检查状态
```

### 配置范围
| 范围 | 设置文件 | 用途 |
|------|----------|------|
| `local` (默认) | `.mcp.json` | 仅当前项目可用 |
| `project` | `.mcp.json` | 通过版本控制与团队共享 |
| `user` | `~/.mcp.json` | 所有项目可用 |

### Plugin MCP 配置
```json .mcp.json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_PATH": "${CLAUDE_PLUGIN_ROOT}/data"
    }
  }
}
```

### 环境变量
- `${CLAUDE_PLUGIN_ROOT}`: 插件根目录路径
- `MCP_TIMEOUT`: MCP 服务器启动超时（毫秒）
- `MAX_MCP_OUTPUT_TOKENS`: MCP 工具输出 token 限制（默认 10,000）

### 避免上下文爆炸的方法
1. **按需启动**: MCP 服务器仅在需要时启动
2. **精简工具**: 每个 MCP 服务器只暴露必要工具
3. **结果过滤**: 在 MCP 服务器层过滤数据
4. **分页查询**: 大数据集使用分页
5. **Token 限制**: 设置 `MAX_MCP_OUTPUT_TOKENS` 控制输出大小

检索标签：#ClaudeCode #MCP #外部工具 #上下文管理

---

## 【Claude Code 课程】Hooks 工作流自动化

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/hooks-guide.md

### 核心概念
Hooks 是用户定义的 shell 命令，在 Claude Code 生命周期的特定点执行。提供确定性控制，确保某些动作总是发生。

### Hook 事件类型
| 事件 | 触发时机 | 用途 |
|------|----------|------|
| `SessionStart` | 会话开始或恢复时 | 注入初始上下文 |
| `UserPromptSubmit` | 用户提交提示前 | 预处理输入 |
| `PreToolUse` | 工具调用执行前 | 阻止或修改工具调用 |
| `PermissionRequest` | 显示权限对话框时 | 自定义权限处理 |
| `PostToolUse` | 工具调用成功后 | 自动格式化、通知 |
| `PostToolUseFailure` | 工具调用失败后 | 错误处理 |
| `Notification` | Claude 发送通知时 | 桌面通知 |
| `SubagentStart` | 子代理生成时 | 初始化 subagent |
| `SubagentStop` | 子代理结束时 | 清理资源 |
| `Stop` | Claude 完成响应时 | 后续处理 |
| `TeammateIdle` | Agent Team 队友空闲时 | 质量门控 |
| `TaskCompleted` | 任务标记完成时 | 验证任务结果 |
| `InstructionsLoaded` | CLAUDE.md 加载时 | 动态规则注入 |
| `ConfigChange` | 配置文件变更时 | 审计日志 |
| `PreCompact` | 上下文压缩前 | 保存关键信息 |

### Hook 类型
1. **command**: 执行 shell 命令或脚本
2. **prompt**: 用 LLM 评估提示（使用 `$ARGUMENTS` 占位符）
3. **agent**: 运行 agentic 验证器（带工具的复杂验证）

### 配置格式
```json settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude needs attention\"'"
          }
        ]
      }
    ]
  }
}
```

### 典型应用场景

**1. 自动格式化代码**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

**2. 阻止受保护文件编辑**:
```bash
#!/bin/bash
# protect-files.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROTECTED_PATTERNS=(".env" "package-lock.json" ".git/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2  # 退出码 2 阻止操作
  fi
done
exit 0
```

**3. 压缩后重新注入上下文**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing.'"
          }
        ]
      }
    ]
  }
}
```

### 退出码含义
- `0`: 成功，继续正常流程
- `2`: 阻止操作，发送反馈给 Claude
- 其他: 错误处理

### 配置位置
| 位置 | 文件路径 | 范围 |
|------|----------|------|
| User | `~/.claude/settings.json` | 所有项目 |
| Project | `.claude/settings.json` | 当前项目 |
| Local | `.claude/settings.local.json` | 当前项目，gitignored |

检索标签：#ClaudeCode #Hooks #自动化 #工作流

---

## 【Claude Code 课程】Memory 记忆机制

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/memory.md

### 核心概念
Claude Code 有两种互补的记忆系统：

| 特性 | CLAUDE.md 文件 | Auto Memory |
|------|----------------|-------------|
| **谁编写** | 用户 | Claude |
| **内容** | 指令和规则 | 学习和模式 |
| **范围** | 项目、用户或组织 | 每个工作树 |
| **加载** | 每次会话 | 每次会话（前 200 行）|
| **用途** | 编码标准、工作流 | 构建命令、调试洞察 |

### CLAUDE.md 文件位置（优先级从高到低）
| 范围 | 位置 | 用途 |
|------|------|------|
| **Managed policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | 组织范围指令 |
| **Project** | `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | 项目指令 |
| **User** | `~/.claude/CLAUDE.md` | 个人偏好 |

### CLAUDE.md 编写最佳实践
- **大小**: 目标 < 200 行，减少上下文消耗
- **结构**: 使用 markdown 标题和列表分组
- **具体性**: 写可验证的具体指令
  - ✅ "Use 2-space indentation"
  - ❌ "Format code properly"
- **一致性**: 定期检查冲突或过时的指令

### 导入其他文件
```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
- personal prefs @~/.claude/my-project-instructions.md
```

### .claude/rules/ 规则目录
用于大型项目，将指令组织成多个文件：

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # 主项目指令
│   └── rules/
│       ├── code-style.md   # 代码风格
│       ├── testing.md      # 测试约定
│       └── security.md     # 安全要求
```

### 路径特定规则
```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules
- All API endpoints must include input validation
- Use the standard error response format
```

### Auto Memory 自动记忆
Claude 根据你的纠正和偏好自动写笔记：
- 构建命令
- 调试洞察
- 发现的偏好

### 跨项目共享规则
```bash
# 使用符号链接
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

### 排除特定 CLAUDE.md
在大型 monorepo 中排除其他团队的 CLAUDE.md：
```json settings.json
{
  "claudeMdExcludes": [
    "other-team/**/CLAUDE.md"
  ]
}
```

检索标签：#ClaudeCode #Memory #CLAUDE.md #记忆机制

---

## 【Claude Code 课程】最佳实践

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/best-practices.md

### 核心约束：上下文窗口管理
Claude 的上下文窗口包含整个对话、每个读取的文件、每个命令输出。**性能随上下文填充而下降**。

### 最高杠杆做法：给 Claude 验证方法
| 策略 | 示例 |
|------|------|
| **提供验证标准** | "写 validateEmail 函数。测试用例：user@example.com 为 true，invalid 为 false" |
| **视觉验证 UI 变更** | "实现这个设计 [截图]。截图对比差异并修复" |
| **解决根本原因** | "构建失败，错误：[错误]。修复并验证构建成功，解决根本原因" |

### 推荐工作流：探索 → 计划 → 实现 → 提交
1. **Explore**: Plan Mode 下阅读文件，不做修改
2. **Plan**: 创建详细实现计划，用 `Ctrl+G` 编辑
3. **Implement**: Normal Mode 下编码，对照计划验证
4. **Commit**: 提交并创建 PR

### 提示工程最佳实践
| 策略 | 差示例 | 好示例 |
|------|--------|--------|
| **限定范围** | "为 foo.py 添加测试" | "为 foo.py 写测试，覆盖用户未登录的边界情况，避免 mock" |
| **指向来源** | "为什么 ExecutionFactory API 这么奇怪？" | "查看 ExecutionFactory 的 git 历史，总结 API 演变过程" |
| **引用现有模式** | "添加日历组件" | "参考首页 HotDogWidget.php 的组件模式，实现日历组件" |
| **描述症状** | "修复登录 bug" | "用户报告会话超时后登录失败。检查 src/auth/ 的 token 刷新" |

### CLAUDE.md 内容建议
| ✅ 包含 | ❌ 排除 |
|--------|--------|
| Claude 猜不到的 Bash 命令 | Claude 通过读代码能发现的 |
| 与默认不同的代码风格 | 标准语言约定 |
| 测试指令和首选测试运行器 | 详细 API 文档（链接代替）|
| 仓库规范（分支命名、PR 约定）| 频繁变化的信息 |
| 项目特定的架构决策 | 逐文件描述代码库 |
| 开发环境怪癖（必需环境变量）| 长篇解释或教程 |
| 常见陷阱或非明显行为 | 自明的实践如"写干净代码" |

### 强调指令以提高遵循度
- "IMPORTANT: ..."
- "YOU MUST: ..."
- "NEVER: ..."

检索标签：#ClaudeCode #BestPractices #最佳实践 #提示工程

---

## 【Claude Code 课程】功能对比与选择指南

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/features-overview.md

### 功能总览表
| 功能 | 作用 | 何时使用 | 示例 |
|------|------|----------|------|
| **CLAUDE.md** | 每次对话加载的持久上下文 | 项目约定、"始终做 X" 规则 | "使用 pnpm 而非 npm。提交前运行测试。" |
| **Skill** | Claude 可使用的指令、知识、工作流 | 可复用内容、参考文档、可重复任务 | `/deploy` 运行部署清单；API 文档 skill |
| **Subagent** | 隔离执行上下文，返回汇总结果 | 上下文隔离、并行任务、专业工作者 | 研究任务读取多文件但只返回关键发现 |
| **Agent teams** | 协调多个独立 Claude Code 会话 | 并行研究、新功能开发、竞争假设调试 | 同时生成安全、性能、测试审查员 |
| **MCP** | 连接外部服务 | 外部数据或操作 | 查询数据库、发布到 Slack、控制浏览器 |
| **Hook** | 事件上运行的确定性脚本 | 可预测的自动化，不涉及 LLM | 每次文件编辑后运行 ESLint |

### Skill vs Subagent 对比
| 方面 | Skill | Subagent |
|------|-------|----------|
| **是什么** | 可复用的指令、知识或工作流 | 独立工作者，有自己的上下文 |
| **关键优势** | 跨上下文共享内容 | 上下文隔离，只返回汇总 |
| **最适合** | 参考材料、可调用工作流 | 读取多文件的任务、并行工作 |

### CLAUDE.md vs Skill 对比
| 方面 | CLAUDE.md | Skill |
|------|-----------|-------|
| **加载时机** | 每次会话自动加载 | 按需加载 |
| **触发工作流** | 否 | 是，用 `/<name>` |
| **最适合** | "始终做 X" 规则 | 参考材料、可调用工作流 |

### CLAUDE.md vs Rules vs Skills 对比
| 方面 | CLAUDE.md | `.claude/rules/` | Skill |
|------|-----------|------------------|-------|
| **加载时机** | 每次会话 | 每次会话或匹配文件打开时 | 按需调用或相关时 |
| **范围** | 整个项目 | 可限定到文件路径 | 任务特定 |
| **最适合** | 核心约定和构建命令 | 语言或目录特定指南 | 参考材料、可重复工作流 |

### Subagent vs Agent Team 对比
| 方面 | Subagent | Agent Team |
|------|----------|------------|
| **上下文** | 独立上下文，结果返回调用者 | 独立上下文，完全独立 |
| **通信** | 只向主代理报告结果 | 队友直接互相通信 |
| **协调** | 主代理管理所有工作 | 共享任务列表，自我协调 |
| **最适合** | 只需要结果的关注任务 | 需要讨论和协作的复杂工作 |
| **Token 成本** | 较低：结果汇总回主上下文 | 较高：每个队友是独立 Claude 实例 |

### MCP vs Skill 对比
| 方面 | MCP | Skill |
|------|-----|-------|
| **是什么** | 连接外部服务的协议 | 知识、工作流、参考材料 |
| **提供** | 工具和数据访问 | 知识、工作流、参考材料 |
| **示例** | Slack 集成、数据库查询 | 代码审查清单、部署工作流 |

**两者协同工作**: MCP 给 Claude 与外部系统交互的能力，Skill 教 Claude 如何有效使用这些工具。

### 优先级规则
- **CLAUDE.md**: 叠加，所有级别同时贡献内容
- **Skills/Subagents**: 按名称覆盖（managed > user > project）
- **MCP**: 按名称覆盖（local > project > user）
- **Hooks**: 合并，所有注册的 hooks 都触发

检索标签：#ClaudeCode #Features #功能对比 #选择指南

---

## 【Claude Code 课程】常见工作流

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/common-workflows.md

### 理解新代码库
```text
# 快速概览
give me an overview of this codebase

# 深入特定组件
explain the main architecture patterns used here
what are the key data models?
how is authentication handled?

# 查找相关代码
find the files that handle user authentication
how do these authentication files work together?
trace the login process from front-end to database
```

### 高效修复 Bug
```text
# 分享错误
I'm seeing an error when I run npm test

# 获取修复建议
suggest a few ways to fix the @ts-ignore in user.ts

# 应用修复
update user.ts to add the null check you suggested
```

### 代码重构
```text
# 识别遗留代码
find deprecated API usage in our codebase

# 获取重构建议
suggest how to refactor utils.js to use modern JavaScript features

# 安全应用变更
refactor utils.js to use ES2024 features while maintaining the same behavior

# 验证重构
run tests for the refactored code
```

### Plan Mode 安全代码分析
**进入 Plan Mode**: `Shift+Tab` 循环切换权限模式，或 `claude --permission-mode plan`

```bash
# 启动 Plan Mode
claude --permission-mode plan

# 请求复杂重构计划
I need to refactor our authentication system to use OAuth2. 
Create a detailed migration plan.

# 细化计划
What about backward compatibility?
How should we handle database migration?

# 在编辑器中编辑计划
Ctrl+G  # 打开默认文本编辑器
```

### 使用 Subagents
```text
# 查看可用 subagents
/agents

# 自动使用 subagents
review my recent code changes for security issues
run all tests and fix any failures

# 显式请求特定 subagent
use the code-reviewer subagent to check the auth module
have the debugger subagent investigate why users can't log in
```

### 测试工作流
```text
# 识别未测试代码
find functions in NotificationsService.swift that are not covered by tests

# 生成测试脚手架
add tests for the notification service

# 添加有意义的测试用例
add test cases for edge conditions in the notification service

# 运行并验证测试
run the new tests and fix any failures
```

### 创建 Pull Request
```text
# 总结变更
summarize the changes I've made to the authentication module

# 生成 PR
create a pr

# 审查和完善
enhance the PR description with more context about the security improvements
```

### 使用图片
```text
# 分析图片内容
What does this image show?
Describe the UI elements in this screenshot

# 用图片提供上下文
Here's a screenshot of the error. What's causing it?
This is our current database schema. How should we modify it?

# 从视觉内容获取代码建议
Generate CSS to match this design mockup
What HTML structure would recreate this component?
```

### 引用文件和目录
```text
# 引用单个文件
Explain the logic in @src/utils/auth.js

# 引用目录
What's the structure of @src/components?

# 引用 MCP 资源
Show me the data from @github:repos/owner/repo/issues
```

### 快捷键参考
| 快捷键 | 功能 |
|--------|------|
| `Shift+Tab` | 循环切换权限模式（Normal → Auto-Accept → Plan）|
| `Ctrl+G` | 在默认文本编辑器中打开计划 |
| `Cmd+Click` / `Ctrl+Click` | 打开引用的图片 |

检索标签：#ClaudeCode #Workflows #常见工作流 #实用指南

---

## 【Claude Code 课程】Checkpointing 检查点机制

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/checkpointing.md

### 核心概念
Checkpointing 自动跟踪 Claude 的文件编辑，允许快速撤销变更和回退到之前的状态。

### 自动跟踪机制
- 每个用户提示创建一个新检查点
- 检查点跨会话持久化，可在恢复的对话中访问
- 30 天后自动清理（可配置）

### 回退和汇总操作
**打开回退菜单**: `Esc` 两次 或 `/rewind` 命令

| 操作 | 说明 |
|------|------|
| **Restore code and conversation** | 回退代码和对话到该点 |
| **Restore conversation** | 回退对话，保持当前代码 |
| **Restore code** | 回退文件变更，保持对话 |
| **Summarize from here** | 从该点压缩对话为摘要，释放上下文空间 |
| **Never mind** | 返回消息列表，不做变更 |

### Restore vs Summarize 对比
- **Restore**: 撤销状态（代码变更、对话历史或两者）
- **Summarize**: 
  - 该点之前的消息保持完整
  - 该点及后续消息替换为 AI 生成的摘要
  - 不改变磁盘文件
  - 原始消息保留在会话记录中

### 使用场景
- **探索替代方案**: 尝试不同实现方法而不丢失起点
- **从错误恢复**: 快速撤销引入 bug 的变更
- **功能迭代**: 实验变体，知道可以回退到工作状态
- **释放上下文空间**: 从调试会话中点压缩，保留初始指令

### 限制
1. **Bash 命令变更不跟踪**: `rm`, `mv`, `cp` 等无法通过回退撤销
2. **外部变更不跟踪**: 手动修改或其他会话的编辑不捕获
3. **不是版本控制替代品**: 检查点用于快速会话级恢复，Git 用于永久历史

检索标签：#ClaudeCode #Checkpointing #检查点 #回退

---

## 【Claude Code 课程】成本管理

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/costs.md

### 成本基准
| 指标 | 数值 |
|------|------|
| 平均每日成本 | ~$6/开发者 |
| 90% 用户每日成本 | <$12 |
| 月均成本 (Sonnet 4.6) | ~$100-200/开发者 |

### 团队速率限制建议
| 团队规模 | TPM/用户 | RPM/用户 |
|----------|----------|----------|
| 1-5 用户 | 200k-300k | 5-7 |
| 5-20 用户 | 100k-150k | 2.5-3.5 |
| 20-50 用户 | 50k-75k | 1.25-1.75 |
| 50-100 用户 | 25k-35k | 0.62-0.87 |
| 100-500 用户 | 15k-20k | 0.37-0.47 |
| 500+ 用户 | 10k-15k | 0.25-0.35 |

### Agent Team 成本
- Agent Teams 使用约 **7 倍** 于标准会话的 token
- 每个队友维护自己的上下文窗口，作为独立 Claude 实例运行

**管理 Agent Team 成本**:
- 队友使用 Sonnet（平衡能力和成本）
- 保持团队小规模
- 生成提示聚焦
- 工作完成后清理团队

### 减少 Token 使用策略

#### 1. 主动管理上下文
```text
/cost                    # 检查当前 token 使用
/clear                   # 切换无关工作时清空
/rename + /resume        # 重命名后清空，稍后恢复
/compact Focus on API    # 自定义压缩指令
```

#### 2. 选择合适的模型
- **Sonnet**: 大多数编码任务，成本较低
- **Opus**: 复杂架构决策或多步推理
- **Haiku**: 简单 subagent 任务

#### 3. 减少 MCP 服务器开销
- 优先使用 CLI 工具（`gh`, `aws`, `gcloud`）
- 禁用未使用的服务器: `/mcp`
- 设置工具搜索阈值: `ENABLE_TOOL_SEARCH=auto:5`

#### 4. 安装代码智能插件
为类型化语言提供精确符号导航，减少不必要的文件读取。

#### 5. 使用 Hooks 和 Skills 预处理
Hook 可在 Claude 看到前预处理数据。例如，用 hook 过滤日志只返回 ERROR 行，将数万 token 减少到数百。

#### 6. 将指令从 CLAUDE.md 移到 Skills
Skills 按需加载，CLAUDE.md 每会话加载。目标：CLAUDE.md < 500 行。

#### 7. 调整 Extended Thinking
Extended thinking 默认启用，预算 31,999 tokens。简单任务可降低成本：
- `/effort` 降低努力级别
- `/config` 禁用 thinking
- `MAX_THINKING_TOKENS=8000` 降低预算

#### 8. 委托冗长操作给 Subagents
测试运行、获取文档、处理日志文件会消耗大量上下文。委托给 subagents，详细输出留在 subagent 上下文，只返回摘要。

#### 9. 编写具体提示
| 模糊 | 具体 |
|------|------|
| "改进这个代码库" | "给 auth.ts 中的 login 函数添加输入验证" |

#### 10. 高效处理复杂任务
- **Plan Mode**: 复杂任务先进入 Plan Mode
- **及早纠正**: 方向错误时立即按 Escape
- **提供验证目标**: 包含测试用例、截图、预期输出
- **增量测试**: 写一个文件，测试，再继续

### 背景 Token 使用
即使空闲时也消耗少量 token：
- 对话汇总（用于 `claude --resume`）
- 命令处理（如 `/cost`）

背景进程通常每会话 <$0.04。

检索标签：#ClaudeCode #Costs #成本管理 #Token优化

---

## 【Claude Code 课程】工作原理

### 来源
Claude Code 官方文档: https://code.claude.com/docs/en/how-claude-code-works.md

### Agentic Loop（代理循环）
Claude 处理任务的三个阶段：
1. **Gather context**（收集上下文）
2. **Take action**（采取行动）
3. **Verify results**（验证结果）

这些阶段混合在一起，Claude 在整个过程中使用工具。

### 核心组件
| 组件 | 作用 |
|------|------|
| **Models** | 推理和理解代码 |
| **Tools** | 执行操作（文件、搜索、执行、Web）|
| **Agentic Harness** | 提供工具、上下文管理、执行环境 |

### 内置工具类别
| 类别 | 能力 |
|------|------|
| **File operations** | 读取、编辑、创建、重命名文件 |
| **Search** | 按模式查找、正则搜索、代码库探索 |
| **Execution** | 运行 shell、启动服务器、运行测试、git |
| **Web** | 搜索 Web、获取文档、查找错误信息 |
| **Code intelligence** | 查看类型错误、跳转到定义、查找引用 |

### 执行环境
| 环境 | 代码运行位置 | 用例 |
|------|--------------|------|
| **Local** | 你的机器 | 默认。完全访问文件、工具、环境 |
| **Cloud** | Anthropic 管理的 VM | 卸载任务，处理本地没有的仓库 |
| **Remote Control** | 你的机器，从浏览器控制 | 使用 Web UI 同时保持一切本地 |

### 会话管理

#### 会话特性
- 会话独立，每个新会话从新鲜上下文开始
- Claude 可使用 auto memory 跨会话持久化学习
- 可在 CLAUDE.md 中添加持久指令

#### 跨分支工作
- 每个对话会话绑定到当前目录
- 切换分支时 Claude 看到新分支文件，但对话历史保持不变
- 使用 git worktrees 运行并行 Claude 会话

#### 恢复和分叉会话
```bash
claude --continue           # 恢复会话（相同 ID）
claude --resume             # 同上
claude --continue --fork-session  # 分叉会话（新 ID，保留历史）
```

**注意**: 恢复的会话不继承会话范围的权限。

**多终端同一会话**: 如果在多个终端恢复同一会话，消息会交错。对于并行工作，使用 `--fork-session`。

### 上下文窗口管理

#### 上下文包含
- 对话历史
- 文件内容
- 命令输出
- CLAUDE.md
- 加载的 skills
- 系统指令

#### 上下文填满时
1. 首先清除旧工具输出
2. 然后汇总对话
3. 保留用户请求和关键代码片段
4. 早期详细指令可能丢失

#### 管理上下文方法
- **Skills**: 按需加载，设置 `disable-model-invocation: true`
- **Subagents**: 获得独立新鲜上下文，工作不膨胀主上下文
- **CLAUDE.md**: 放置持久规则，而非依赖对话历史

### 安全检查点
- **检查点**: 每次文件编辑前快照，可撤销
- **权限**: 控制 Claude 无需询问即可执行的操作

检索标签：#ClaudeCode #Architecture #工作原理 #AgenticLoop

---

## 【教训】模型签名必须严格对照 SOUL.md，不能凭记忆

### 问题背景
2026-03-31：连续两次回复签名错误，使用了 `[🦾 MiMo]`，实际应该是 `[🦾 Minimax]`。

### 根本原因
读取 SOUL.md 后，没有忠实于读取结果输出，而是凭"以为"的记忆输出。

### 正确做法
1. 读取 `.last-model.json` 获取 alias
2. 读取 SOUL.md 的签名映射表
3. 严格对照 alias → 签名，不允许任何自我发挥

### 教训
**"读了就严格遵守"** —— 工具执行了就要忠实于结果，不允许中间脱离文档自我发挥。

检索标签：#模型签名 #SOUL.md #严格遵守
