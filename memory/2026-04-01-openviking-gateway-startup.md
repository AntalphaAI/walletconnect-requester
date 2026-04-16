# Session: 2026-04-01 10:20:12 UTC

- **Session Key**: agent:main:discord:direct:851013943018782721
- **Session ID**: d5ab3d17-4bbf-42f2-9b2b-4b2bfca341c8
- **Source**: discord

## Conversation Summary

assistant: 需要先装 python3-venv，让系统安装它：

assistant: ✅ 安装成功！现在需要配置 VLM 和 Embedding 模型。

assistant: 配置已生成，但 API Key 还没填。OpenViking 支持 **litellm**（统一接入各种模型），我需要你提供一组 API Key 来配置 VLM 和 Embedding。

---

## 🔑 需要配置的 API Key

OpenViking 需要两个模型能力：

| 能力 | 用途 | 推荐模型 |
|------|------|---------|
| **VLM** | 记忆提取、内容理解 | GPT-4o / Qwen-VL / Claude |
| **Embedding** | 向量化语义检索 | text-embedding-3-large / BGE |

### 请问你有什么可用的 API Key？

**方案一：使用你现有的百炼 Key（推荐）**
- 如果你已有阿里云 DashScope API Key，可以配置 Qwen-VL + text-embedding

**方案二：使用 OpenAI Key**
- 如果你有 OpenAI API Key，可以配置 GPT-4o + text-embedding-3-large

**方案三：使用免费额度**
- Jina Embedding（免费，无需 API Key）
- 需要一个 VLM API Key

---

**你手边有哪种 API Key？** 告诉我，我立刻帮你填入配置文件并启动。🍬⚡
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1488819281813569698",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Wed 2026-04-01 16:36 GMT+8"
}
```

Sender (untrusted metadata):
```json
{
  "label": "0xBevan (851013943018782721)",
  "id": "851013943018782721",
  "name": "0xBevan",
  "username": "0xbevan",
  "tag": "0xbevan"
}
```

我已经配置好了OpenViking 需要的两个模型能力，重启了服务，下一步我要做什么？
assistant: 太好了！既然你已经配置好 API Key 并重启了服务，下一步就是**验证安装并启用 OpenClaw 插件**。

让我帮你检查状态并启动：
assistant: ✅ OpenViking 服务已运行，OpenClaw 插件已配置！现在需要**重启 OpenClaw Gateway** 让插件生效：
assistant: 看起来 OpenClaw Gateway 服务没有安装。让我先安装并启动它：
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1488822234993660076",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Wed 2026-04-01 16:48 GMT+8"
}
```

Sender (untrusted metadata):
```json
{
  "label": "0xBevan (851013943018782721)",
  "id": "851013943018782721",
  "name": "0xBevan",
  "username": "0xbevan",
  "tag": "0xbevan"
}
```

刚才服务中断了，我们继续。我已经配置好了OpenViking 需要的两个模型能力，重启了服务，下一步我要做什么？
assistant: 好的，继续。既然服务中断了，让我重新检查状态并帮你完成最后的启动步骤。
assistant: ✅ OpenViking 运行正常，插件已配置！现在启动 OpenClaw Gateway：
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1488824020190367898",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Wed 2026-04-01 16:55 GMT+8"
}
```

Sender (untrusted metadata):
```json
{
  "label": "0xBevan (851013943018782721)",
  "id": "851013943018782721",
  "name": "0xBevan",
  "username": "0xbevan",
  "tag": "0xbevan"
}
```

openclaw Gateway 已经启动啦
assistant: 太好了！既然 OpenClaw Gateway 已启动，现在让我验证 OpenViking 插件是否正常工作，然后告诉你如何使用。
assistant: ✅ **OpenViking 安装完成并正常运行！**

从日志可以看到：
- `openviking: registered context-engine` — 插件已注册
- `before_prompt_build=auto-recall` — 自动回忆记忆
- `afterTurn=auto-capture` — 自动捕获新记忆
- `assemble=archive+active` — 组装上下文（归档+活跃）

---

## 🎉 安装完成总结

| 组件 | 状态 |
|------|------|
| OpenViking Server | ✅ 运行中 (http://127.0.0.1:1933) |
| OpenClaw Plugin | ✅ 已注册为 context-engine |
| 自动记忆回忆 | ✅ 每次对话前自动执行 |
| 自动记忆捕获 | ✅ 每次对话后自动执行 |

---

## 🤖 如何使用（全自动，无需手动命令）

**OpenViking 是全自动运行的，你不需要输入任何特殊命令或提示词！**

### 自动工作机制

```
每次你和我对话时：
  1. 自动回忆 — 对话开始前，OpenViking 自动搜索相关记忆并注入上下文
  2. 正常对话 — 你和我像平常一样交流
  3. 自动捕获 — 对话结束后，OpenViking 自动提取并保存长期记忆
```

### 你可以感知到的变化

| 场景 | 效果 |
|------|------|
| **长期项目** | 隔几天再聊同一个项目，我能记住之前的进展和决策 |
| **个人偏好** | 记住你喜欢的模型、工作习惯、代码风格 |
| **复杂任务** | 长对话不会被截断，重要信息自动归档 |
| **跨会话** | 不同 channel/会话间记忆隔离，不会串台 |

---

## 🛠️ 可选的手动工具（高级用法）

如果你需要手动操作记忆，可以使用这些工具：

| 工具 | 用途 | 示例 |
|------|------|------|
| `memory_recall` | 主动搜索长期记忆 | "回忆一下我们上周讨论的 web3-investor 架构" |
| `memory_store` | 手动保存信息到记忆 | "记住：我偏好使用 Kimi 模型进行代码审查" |
| `memory_forget` | 删除某条记忆 | "忘记我之前说的那个错误配置" |
| `ov_archive_expand` | 展开归档的会话详情 | 当摘要不够详细时，查看完整历史 |

---

## ✅ 验证安装成功

现在你可以直接开始对话，测试 OpenViking 是否工作：

**测试 1**：告诉我一个你的偏好，然后过一会儿再问我是否记得
> "我偏好使用 GLM-5 作为默认模型"

**测试 2**：开启一个长期项目，几天后继续聊
> "我们开始规划 web3-investor 的重构，第一阶段是..."

---

**一句话总结**：OpenViking 已就绪，**像平常一样和我对话即可**，它会自动在后台管理长期记忆，让你的 AI 助手越用越聪明！🍬⚡
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1488828076614877244",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Wed 2026-04-01 17:11 GMT+8"
}
```

Sender (untrusted metadata):
```json
{
  "label": "0xBevan (851013943018782721)",
  "id": "851013943018782721",
  "name": "0xBevan",
  "username": "0xbevan",
  "tag": "0xbevan"
}
```

小田，你帮忙记住一条工作守则：你不要自己重启或启动openclaw, 所有重启的的指令由我在服务器执行。
assistant: 记住了！已写入 AGENTS.md 安全规范中：

```
⛔ 绝对禁止：AI Agent 自行启动、重启或修改 OpenClaw Gateway 进程。
所有 OpenClaw Gateway 的启动、重启、配置变更，必须由主人手动执行。
```

以后涉及到 OpenClaw 重启的事情，我会直接请你处理，不会自己动手。🍬⚡
