# Session: 2026-04-15 03:54:55 UTC

- **Session Key**: agent:main:discord:direct:851013943018782721
- **Session ID**: a2bc6184-dcf0-4344-a750-6f98268539cd
- **Source**: discord

## Conversation Summary

user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1493620520397308066",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Tue 2026-04-14 22:34 GMT+8"
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

好呀，你帮我查一下呗
assistant: 继续查，别中断～

assistant: 查清楚了，汇总一下：

---

## OpenCode 现状分析

OpenCode 有自己的原则体系，叫 **Three Principles**：

| OpenCode 已有 | vs Karpathy 缺失 |
|---------------|-----------------|
| ✅ Explore Before Asking（先探索再提问） | ❌ 没有"Think Before Coding"强制显式推理 |
| ✅ Surgical Changes（最小改动） | ❌ 没有"Simplicity First"防过度工程 |
| ✅ 决策完整性（Decision Complete） | ❌ 没有"Goal-Driven Execution"可验证成功标准 |

**结论：** OpenCode 的框架已经很接近 Karpathy 了，但少了两条——**Simplicity First**（防过度设计）和**Goal-Driven Execution**（有可检验的成功标准）。

---

## Qwen Coder 现状分析

Qwen Coder 是一个**外包调度工具**，不是 Agent 自己——它的 SKILL.md 里只有"必须外包出去"的规则，**没有任何编程原则**。它的 sub-agent（Qwen）收到指令后怎么想、怎么写代码，完全没有约束。

---

## 具体建议

**OpenCode：** 可以把缺失的两条补进去，在 Three Principles 下面加两条：

```markdown
4. **Think Before Coding** — 不要假设，先说清楚你的理解和假设
5. **Simplicity First** — 200行能解决的不要写1000行
```

**Qwen Coder：** 给它接的 sub-agent 加一个轻量的 AGENTS.md，里面放这 4 条原则。尤其是"Simplicity First"——Qwen 本身比较喜欢写大而全的代码，这个约束很有必要。

---

要我帮你写一个可以直接给 Qwen Coder 用的 AGENTS.md 片段吗？

[🐾 glm-5-turbo]
user: 【压缩前写入】上下文即将压缩。请立即将当前任务的进度写入 memory/checkpoints/{任务名}.md，格式遵循 checkpoint 规范。回复 NO_REPLY。

Store durable memories only in memory/2026-04-14.md (create memory/ if needed).

If memory/2026-04-14.md already exists, APPEND new content only and do not overwrite existing entries.

Treat workspace bootstrap/reference files such as MEMORY.md, DREAMS.md, SOUL.md, TOOLS.md, and AGENTS.md as read-only during this flush; never overwrite, replace, or edit them.
Current time: Tuesday, April 14th, 2026 - 11:00 PM (Asia/Shanghai) / 2026-04-14 15:00 UTC
assistant: NO_REPLY
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1493626932791869500",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Tue 2026-04-14 23:00 GMT+8"
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

opencode按你的执行。 Qwen不仅仅是一个外包调度工具，我还有一个专门的qwen code cli的程序，他是一个编程专用agent， 你可以找一下
assistant: 先找 Qwen Code CLI，同时看 OpenCode 的原则文件在哪里。

assistant: 情况摸清了。开始执行：

**Qwen Code**：在 `~/.qwen/skills/` 下建一个 AGENTS.md，把 4 条原则写进去
**OpenCode**：在 `~/.config/opencode/skills/` 下创建原则增强 skill

assistant: 情况完全清楚了。OpenCode 已经有 `superpowers` skill 覆盖了类似原则，但可以再增强。Qwen Code 需要新建一个。

**两件事并行：**
1. 给 Qwen Code 新建 `~/.qwen/skills/karpathy-principles/SKILL.md`
2. 给 OpenCode 补充缺失 2 条（Simplicity First + Goal-Driven）进 `superpowers` skill

assistant: Qwen Code 好了。现在看 OpenCode 的 superpowers 需要补哪两条：

assistant: OpenCode 的 superpowers 覆盖了大部分，但 Simplicity First 不够显式。新增一个专注这一条的 skill：

assistant: 完成。汇报一下：

---

## 执行结果

### Qwen Code ✅
新建了 `~/.qwen/skills/karpathy-principles/SKILL.md`
- 4条原则全部内置：Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution
- Qwen Code 会自动加载 `~/.qwen/skills/` 下的所有 skill，下次对话就生效

### OpenCode ✅
新建了 `~/.config/opencode/skills/simplicity-first/SKILL.md`
- 专门补 OpenCode Three Principles 缺的那条：**Simplicity First**
- 补充了具体反模式和简化检查方法

OpenCode 已经有 superpowers skill 覆盖了其他三条，新增的这个是专项补强。

---

## 生效方式

| 工具 | 生效方式 |
|------|---------|
| **Qwen Code** | 自动加载 `~/.qwen/skills/karpathy-principles/SKILL.md` |
| **OpenCode** | 需要在任务里**主动加载** `simplicity-first` skill，或者让 OpenCode 的 superpowers 默认开启 |

Qwen Code 这两个 skill 下次用就生效了，不需要重启。

[🐾 glm-5-turbo]
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "1493633773810745385",
  "sender_id": "851013943018782721",
  "sender": "0xBevan",
  "timestamp": "Tue 2026-04-14 23:27 GMT+8"
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

opencode每次启动会加载oh-my-agent 插件，会被覆盖吗
assistant: 
好问题，让我查一下 oh-my-openagent 自己的 skill 定义，看会不会覆盖我们建的：

assistant: 不会被覆盖，而且刚好相反——**你的 skill 优先级更高**。

找到了官方说明（oh-my-openagent 源码 87695 行）：

```
User-installed skills OVERRIDE built-in defaults.
ALWAYS prefer YOUR SKILLS when domain matches.
```

也就是说：
- oh-my-openagent 启动时扫描 `~/.config/opencode/skills/`
- **找到你的 skill → 用你的**
- 找到同名的内置 skill → 你的覆盖内置的

所以 `superpowers` 和 `simplicity-first` 这两个 skill：
- ✅ 不会被覆盖
- ✅ 会自动被加载
- ✅ 优先级高于 oh-my-openagent 内置同名skill（如果有名冲突的话）

不需要做任何额外配置，下次 OpenCode 启动就生效了。

[🐾 glm-5-turbo]
