# Session: 2026-02-27 19:15:02 UTC

- **Session Key**: agent:main:main
- **Session ID**: c569ae02-ad4b-4a46-a7b1-b35f948df505
- **Source**: webchat

## Conversation Summary

user: [Sat 2026-02-28 02:51 GMT+8] 我的openclaw网关日志报告了如下错误： Config warnings:\n- plugins.entries.model-router: plugin model-router: plugin id mismatch (manifest uses "model-router", entry hints "model-router-plugin") 🦞 OpenClaw 2026.2.24 (df9a474) — Your .env is showing; don't worry, I'll pretend I didn't see it. │ ◇ Config warnings ────────────────────────────────────────────────────────────────────────╮ │ │ │ - plugins.entries.model-router: plugin model-router: plugin id mismatch (manifest uses │ │ "model-router", entry hints "model-router-plugin") │ │ │ ├──────────────────────────────────────────────────────────────────────────────────────────╯ 02:49:04 Config warnings:\n- plugins.entries.model-router: plugin model-router: plugin id mismatch (manifest uses "model-router", entry hints "model-router-plugin") 18:49:04 [gateway] [plugins] plugins.allow is empty; discovered non-bundled plugins may auto-load: model-router (/home/admin/.openclaw/extensions/model-router-plugin/index.ts). Set plugins.allow to explicit trusted ids. 18:49:05 [gateway] [model-router] Plugin loaded 02:49:10 Config warnings:\n- plugins.entries.model-router: plugin model-router: plugin id mismatch (manifest uses "model-router", entry hints "model-router-plugin") 18:49:12 [gateway] [plugins] model-router: loaded without install/load-path provenance; treat as untracked local code and pin trust via plugins.allow or install records (/home/admi n/.openclaw/extensions/model-router-plugin/index.ts) 这个似乎就是你所注册的plugin引起的，这个报警严重吗？
assistant: **不严重，只是命名不一致的警告。**

Plugin 已经成功加载并工作了：
```
[model-router] Plugin loaded
hook runner initialized with 1 registered hooks
```

问题在于：
- 目录名：`model-router-plugin`
- Manifest ID：`model-router`

让我修复这个命名不一致：
assistant: 再添加信任声明，消除另一个警告：
assistant: 验证修复：
assistant: **已修复。** 现在配置正确：

| 项目 | 值 |
|------|-----|
| 目录名 | `model-router` |
| Manifest ID | `model-router` |
| plugins.allow | `["model-router"]` |

下次重启 Gateway 后，这些警告会消失。Plugin 本身已经在工作，你可以测试一下路由效果——发送不同类型的消息，看是否会自动切换模型。[🐾 GLM-5]
user: [Sat 2026-02-28 03:06 GMT+8] hello, 你好呀
assistant: 路由器推荐：**Gemini Flash**（快速响应规则匹配）

但我注意到我仍然在用 GLM-5 —— 让我检查 hook 是否真正在运行时生效：
assistant: 发现问题了！日志显示：
```
hook runner initialized with 1 registered hooks
```

但没有看到 `[model-router] Routing to:` 的输出。让我检查 plugin 代码的问题：
assistant: 让我添加更多调试日志来定位问题：
assistant: 代码已更新，添加了更多日志。**需要重启 Gateway** 才能让新代码生效。

另外，我注意到一个可能的问题：当前会话是通过 **webchat** 发起的，让我检查一下 webchat 的消息处理流程是否和 hook 系统有交互：
assistant: 关键发现！日志显示 `embedded run start` 时模型已经是 `glm-5`，但我没有看到 `before_model_resolve` hook 被触发的痕迹。

让我检查 embedded agent 的 hook 调用逻辑：
assistant: **找到问题了！**

| 方法 | 存储位置 | `hasHooks` 能检测到？ |
|------|----------|----------------------|
| `api.registerHook()` | `registry.hooks` | ❌ |
| `api.on()` | `registry.typedHooks` | ✅ |

我用了错误的方法！应该用 `api.on()` 而不是 `api.registerHook()`：
assistant: **修复完成！**

问题根因：
- `api.registerHook()` → 用于 Gateway 内部 hooks（command:new 等）
- `api.on()` → 用于 Plugin typed hooks（before_model_resolve 等）
- `hasHooks()` 只检查 `api.on()` 注册的 hooks

现在请 **重启 Gateway**，新代码就会生效。重启后你会看到日志：
```
[model-router] Hook triggered!
[model-router] Routing to: moonshot/kimi-k2.5
[hooks] model overridden to moonshot/kimi-k2.5
```[🐾 GLM-5]
user: [Sat 2026-02-28 03:11 GMT+8] 你好呀，我又回来了
user: [Sat 2026-02-28 03:12 GMT+8] 你好像报错了，19:11:18 [gateway] [model-router] Hook triggered! 19:11:18 [gateway] [model-router] Event: 19:11:18 [gateway] [model-router] Analyzing prompt: [Sat 2026-02-28 03:11 GMT+8] 你好呀，我又回来了... 19:11:18 [gateway] [model-router] Routing to: moonshot/kimi-k2.5 19:11:18 [agent/embedded] [hooks] model overridden to moonshot/kimi-k2.5 19:11:19 [agent/embedded] embedded run start: runId=1c7dc36a-5097-4871-ad41-76b19f37370c sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 provider=zai model=moonshot/kimi-k2.5 thinking=low messageChannel=webchat 19:11:19 [agent/embedded] enabling Z.AI tool_stream for zai/moonshot/kimi-k2.5 19:11:19 [diagnostic] session state: sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 sessionKey=agent:main:main prev=idle new=processing reason="run_started" queueDepth=0 19:11:19 [diagnostic] run registered: sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 totalActive=1 19:11:19 [agent/embedded] embedded run prompt start: runId=1c7dc36a-5097-4871-ad41-76b19f37370c sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 19:11:19 [agent/embedded] [context-diag] pre-prompt: sessionKey=agent:main:main messages=136 roleCounts=assistant:59,toolResult:69,user:8 historyTextChars=174591 maxMessageTextChars=22918 historyImageBlocks=0 systemPromptChars=24684 promptChars=38 promptImages=0 historyImageMessages=0 provider=zai/moonshot/kimi-k2.5 sessionFile=/home/admin/.openclaw/agents/main/sessions/c569ae02-ad4b-4a46-a7b1-b35f948df505.jsonl 19:11:19 [agent/embedded] embedded run agent start: runId=1c7dc36a-5097-4871-ad41-76b19f37370c 19:11:21 [agent/embedded] embedded run agent end: runId=1c7dc36a-5097-4871-ad41-76b19f37370c isError=true error=400 模型不存在，请检查模型代码。 19:11:21 [agent/embedded] embedded run prompt end: runId=1c7dc36a-5097-4871-ad41-76b19f37370c sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 durationMs=2520 19:11:21 [diagnostic] session state: sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 sessionKey=agent:main:main prev=processing new=idle reason="run_completed" queueDepth=0 19:11:21 [diagnostic] run cleared: sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 totalActive=0 19:11:21 [agent/embedded] embedded run done: runId=1c7dc36a-5097-4871-ad41-76b19f37370c sessionId=c569ae02-ad4b-4a46-a7b1-b35f948df505 durationMs=3267 aborted=false 19:11:21 [diagnostic] lane task done: lane=main durationMs=3285 active=0 queued=0 19:11:21 [diagnostic] lane task done: lane=session:agent:main:main durationMs=3303 active=0 queued=0
