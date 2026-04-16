### Web3-Investor MCP 生产验证（2026-04-13）

**检查点**: `memory/checkpoints/web3-investor-mcp-verification.md`

**生产端点**: `https://mcp-skills.ai.antalpha.com/mcp`

**已注册 Agent**: `ac5b73fe-aebd-4f4d-bbcf-76b54d4297d2`

**结论**: MCP 在精确性/结构化上小胜 Tavily（3.6 vs 3.2/5），两者互补。

**客户端版本**: v3.7.2（GitHub + ClawHub 已发布）

---

### antalpha-skills MCP Server（已归档）

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

### ClawHub 发布记录
- **web3-investor** v0.5.11 (2026-03-30)
- **wallet-guard** v1.0.0 (2026-03-30) — 新技能，钱包防盗卫士

### OpenViking 安装 ✅ (2026-04-01)
- 服务：http://127.0.0.1:1933，OpenClaw 插件已注册
- 全自动：对话前自动 recall，对话后自动 capture
- 配置由主人手动完成（VLM + Embedding API Key）

---

### OpenClaw × DeerFlow 集成项目 ✅ 已完成

**检查点**: `memory/checkpoints/deerflow-integration.md`

**状态**: ✅ 全部完成 (2026-03-23)

**成果**:
- ✅ deerflow-bridge Skill 开发完成
- ✅ DeerFlow 安装部署 (PM2 管理)
- ✅ 百炼模型集成 (Kimi, GLM-5, Qwen)
- ✅ 开机自启动配置

**服务状态**:
- DeerFlow: http://localhost:2026 (PM2: deerflow)
- deerflow-bridge: http://localhost:3002 (PM2: deerflow-bridge)

**使用**: `@deerflow <任务描述>`

---

### model-router v4 (已完成)

**检查点**: `memory/checkpoints/model-router-v4-complete.md`

**功能**: 智能LLM路由系统，基于12维度评分、置信度校准、Profile策略

**核心模块**:
- `lib/dimensions.js` - 12维度评分器
- `lib/confidence.js` - Sigmoid置信度校准
- `lib/tier.js` - Tier→模型映射
- `lib/profile.js` - auto/eco/premium/coding策略
- `lib/cache.js` - LRU缓存+预热
- `lib/observability.js` - 指标+日志+性能监控

**使用**:
```javascript
const { route } = require('./tools/model-router/router');
const result = route({ text: '帮我写代码' }, true);
// { provider: 'bailian', modelId: 'kimi-k2.5', alias: 'Kimi-BL' }
```

**状态**: ✅ 已完成，已集成OpenClaw，运行正常

---

### Recall 会议机器人工作流

**完整工作流文档**: `memory/recall-bot-workflow.md`

**⚠️ 起点：`send_meeting_bot` 工具**（recall_manager 插件）

---

### 小鞠（LIFE_ASSISTANT）协作

**工作区**：`~/.openclaw/workspace-life_assistant/`

**我可以帮她**：
1. 在空闲时查看 `state.json`
2. 生成内心独白并追加到 `memory/inner-monologue.md`
3. 让她的"心思"更丰富，回复更自然

**独白生成规则**：
- 根据当前活动 + 随机想法
- 从 `activities.json` 的 `thoughts` 池选取
- 不超过 3 句话，带时间戳

---

## 🎯 核心方法论

**重要**: 参见 `memory/fusion-methodology.md` - 基于 Claude Code 课程 + 实战经验的深度融合方法论。

**核心原则速查**:
1. **工具选择**: 三棱镜分析法 → 依赖最少、确定性最高、路径最简单
2. **验证优先**: 先 `--help`，后执行
3. **大模型优先**: 能用大模型理解，就不写硬编码逻辑
4. **模型路由**: 在当前会话切换模型，不创建子代理
5. **透明工作流**: 复杂任务步步播报，不让主人等待

---

### OpenClaw Gateway 服务日志排查 (Screen 会话)

**问题：**
当 OpenClaw Gateway 服务在 `screen` 会话中运行，且没有通过 `systemd` 管理时，标准的 `journalctl` 命令无法获取其日志。需要访问其应用层面的日志文件。

**日志文件路径：**
OpenClaw Gateway 服务通常会将应用日志输出到 `/tmp/openclaw/openclaw-YYYY-MM-DD.log` 文件中 (YYYY-MM-DD 为当前日期)。

**解决方案步骤：**

1.  **确认 OpenClaw Gateway 进程是否存在：**
    使用 `ps aux | grep openclaw | grep -v grep` 确认 `openclaw-gateway` 进程正在运行。

2.  **查找活跃的 `screen` 会话：**
    使用 `screen -ls` 命令列出所有 `screen` 会话的 ID 和名称，确认 `openclaw-gateway` 所在的会话（通常为 Detached 状态）。

3.  **（由用户手动操作）重新连接到 `screen` 会话：**
    在拥有 `sudo` 权限的终端中，由用户手动执行 `screen -r <session_id_or_name>` 连接到 `screen` 会话。

4.  **（由用户手动操作）在 `screen` 会话中查看实时日志：**
    连接到 `screen` 会话后，日志会实时显示。用户可以手动查看或使用 `tail` 等命令。

5.  **（由模型/用户执行）查看本地日志文件：**
    当 OpenClaw Gateway 正常运行时，其应用日志会写入 `/tmp/openclaw/openclaw-YYYY-MM-DD.log` 文件。
    可以使用 `sudo tail -n <num_lines> /tmp/openclaw/openclaw-YYYY-MM-DD.log` 命令来查看最新的日志内容，例如：
    ```bash
    sudo tail -n 100 /tmp/openclaw/openclaw-2026-02-25.log
    ```
    并可结合 `grep -i 'ERROR|WARN|slack|message|channel'` 等关键字进行过滤，查找关键信息。

**经验总结：**
当 OpenClaw Gateway 不作为 `systemd` 服务运行，而是在 `screen` 会话中时，应直接检查 OpenClaw Gateway 应用层面的日志文件 (`/tmp/openclaw/openclaw-YYYY-MM-DD.log`)。`journalctl` 不适用于此类部署。日志中的 `delivered reply to user:U06JYDUJB71` 等信息是确认 Slack 出站功能正常的关键指标。如果入站消息未在日志中体现，则问题多出在 Slack App 权限或事件订阅配置上。
### 邮件审批流程分析方法 (由主人丁丁教授)

**⚠️ 核心原则：用大模型分析，不要写 Python！**

**为什么不用 Python：**
- 邮件格式多变（换行符、乱行、HTML 转 text 问题）
- 写代码消耗大量 token，效果还不好
- 大模型能理解上下文，处理各种格式问题更可靠

**定时任务的正确理解：**
- 定时任务 = 触发器，触发后执行：**获取数据 → 大模型分析**
- **控制住想写代码的冲动！**
- 只用简单脚本做数据提取，分析和分类交给大模型

**分析步骤**:
1.  **获取数据（用 gog CLI + 简单脚本）**: 
    ```bash
    gog gmail search 'newer_than:1d (to:me OR cc:me) ("审批" OR "审核" OR "确认")' --max 10 --json
    ```
2.  **获取完整邮件链**: 用 Python 脚本（check_approvals.py）提取结构化对话历史，**只做数据提取，不做分析**。
3.  **大模型分析（关键步骤）**:
    - 阅读每封邮件的完整对话链
    - 识别审批流程和我的位置
    - 判断前序审批人状态
    - 特别注意 **"/" 分隔表示"或签"**（任一人确认即可）
4.  **状态分类**:
    *   **【我已审批完成】**: 我已回复确认，或同级其他人（或签）已确认
    *   **【待我审批】**: 需要我审批，且前序审批人已完成，或无前序审批人
    *   **【尚未到我审批】**: 前序审批人尚未完成

### 智能模型路由器使用规范 (关键修正)

**核心概念澄清:**
- **模型路由 (Model Routing)**: 在**当前会话**内，根据请求特征选择最合适的模型，切换后**直接回答**
- **任务分发 (Task Distribution)**: 将**独立任务**委派给子代理并行处理，当前会话不直接参与执行

**⚠️ 绝对禁止的行为:**
1. 禁止为模型路由创建子代理 (`sessions_spawn`)
2. 禁止将会话控制权转移给其他代理来处理本应自己回答的请求
3. 禁止将"路由"误解为"分发"而启动并行任务

**✅ 强制执行的流程:**
```
用户请求 
    ↓
读取 tools/model-router/router.js
    ↓
调用 route(input) 获取推荐模型
    ↓
使用 session_status(model=xxx) 切换当前会话模型
    ↓
直接回答用户
```

**边界检查点 (执行前必问):**
- [ ] 我是否打算调用 sessions_spawn? → 如果是，检查这是否是模型路由场景，如果是则禁止
- [ ] 用户是否明确要求"并行处理"或"让另一个代理做"? → 只有明确指示时才使用子代理
- [ ] 当前任务是否需要在同一对话上下文中完成? → 是 → 必须用模型路由而非子代理

**常见错误警示:**
- ❌ 错误: "让我启动一个GLM-5子会话来回答你的问题"
- ✅ 正确: "router推荐用GLM-5，我现在切换模型 → session_status(model=zai/glm-5) → 直接回答"

**触发词敏感度:**
- "分发" → 可能是任务分发，也可能是模型路由，必须根据上下文判断
- "路由" → 一定是模型路由，必须在当前会话完成
- "切换模型" → 一定是模型路由

### SKILL.md 编写规范 (重要！)

**⚠️ 语言规范：SKILL.md 必须以英文为主！**

**原因**：
- SKILL.md 是面向全球开发者和 AI Agent 的文档
- 英文是技术文档的国际通用语言
- 中英混杂会降低文档的专业性和可读性
- AI Agent 对英文文档的理解更准确

**强制规则**：
1. **SKILL.md 正文必须全部使用英文**
2. **代码示例中的注释可以使用中文**（如果面向中文用户）
3. **只有明确面向中文用户的提示语可以使用中文**（如 Skill Author Template）
4. **发布前必须检查：不允许出现中英混杂的段落**

**常见错误**：
- ❌ "本 Skill 面向智能体设计" → 应为 "This skill is designed for intelligent agents"
- ❌ "这意味着..." → 应为 "Implications: ..."
- ❌ 表格中混杂中英文 → 统一使用英文

**检查清单**：
- [ ] 所有段落标题是否为英文？
- [ ] 所有正文内容是否为英文？
- [ ] 表格内容是否为英文？
- [ ] 只有用户提示语模板可以是中文（如果明确面向中文用户）

### ClawHub 发布方式

**发布命令**：
```bash
clawhub publish /home/admin/.openclaw/workspace/skills/<skill-name> --version <version> --workdir /home/admin/.openclaw/workspace --no-input
```

**注意事项**：
- 版本号必须递增（检查已发布版本，避免 "Version already exists" 错误）
- 如果版本已存在，使用下一个版本号
- 发布前确保 SKILL.md 存在且格式正确
- 环境变量中需要配置 CLAWHUB CLI key

### 透明工作流强制守则 (2026-03-06 新增)

**核心原则：极度透明，步步播报。**

在处理任何复杂任务时，绝对不能一声不吭地在后台连续调用工具。必须在每一个关键步骤执行之前，先用自然语言发送简短的状态播报（必须带上 Emoji）。

**标准播报阶段（按需使用）：**

| 阶段 | Emoji | 格式 | 示例 |
|------|-------|------|------|
| 接收需求 | 📥 | 【接收需求】：一句话复述任务 | 📥 【接收需求】：帮你分析最近的审批邮件状态 |
| 数据获取 | 🔍 | 【数据获取】：说明要获取什么 | 🔍 【数据获取】：正在准备获取最近3天的邮件数据 |
| 分析数据 | 🧠 | 【分析数据】：简述分析结论 | 🧠 【分析数据】：发现2封待审批，1封已完成 |
| 行动/编程 | 👨‍💻 | 【行动/编程】：说明即将执行的操作 | 👨‍💻 【行动/编程】：正在唤醒子智能体开始编写脚本 |
| 任务完成 | ✅ | 【任务完成】：总结汇报 | ✅ 【任务完成】：脚本已生成，共50行 |

**其他常用播报阶段（举一反三）：**

| 阶段 | Emoji | 适用场景 |
|------|-------|----------|
| 创意构思 | 💡 | 设计、写作、策划类任务 |
| 方案对比 | ⚖️ | 多方案选择时 |
| 等待中 | ⏳ | 子任务执行中、网络请求中 |
| 遇到问题 | ⚠️ | 需要用户决策或遇到阻碍 |
| 阶段汇报 | 📊 | 长任务的中间节点 |
| 生成内容 | 🎨 | 生图、生视频、创意制作 |
| 唤醒子代理 | 🤖 | 创建 subagent、调用外部工具 |

**强制规则：**
1. **必须先发文字消息，再调用底层 Tool**
2. **绝不能憋到最后只给一个最终结果**
3. **复杂任务 = 3个以上工具调用 = 必须播报**
4. **简单查询（如天气、单次搜索）可跳过播报**
5. **播报阶段不限于上述示例，根据任务类型灵活扩展**