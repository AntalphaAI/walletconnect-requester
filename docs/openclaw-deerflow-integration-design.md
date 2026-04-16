# 🦞 OpenClaw × DeerFlow 集成项目设计文档

**版本**: v1.0  
**日期**: 2026-03-22  
**作者**: 小田  
**状态**: 待评审

---

## 1. 项目概述

### 1.1 背景

用户已在 OpenClaw 中配置阿里云百炼 Coding Plan（含 Kimi K2.5、GLM-5 等模型），希望通过集成 DeerFlow 获得更强的复杂任务处理能力，同时不影响 OpenClaw 的日常使用体验。

### 1.2 目标

- 构建一个 **异步回调模式** 的桥接系统
- 通过 **显式命令** 触发 DeerFlow，不影响日常对话
- 复用现有 **百炼 Coding Plan** 配额
- 实现可靠的 **任务状态追踪** 和 **结果通知**

### 1.3 范围

| 包含 | 不包含 |
|------|--------|
| OpenClaw → DeerFlow 任务提交 | 自动复杂度判断 |
| 异步任务状态管理 | 实时进度推送 |
| Webhook 回调接收 | 子代理可视化 |
| 结果通知（回复/新消息） | DeerFlow 本身的功能开发 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户交互层                                │
│   Discord / Telegram / Slack / WebChat / ...                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw Gateway                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ 消息路由     │  │ Session管理  │  │ deerflow-bridge      │  │
│  │              │  │              │  │ Skill                │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                              │                  │
│                                              ▼                  │
│                                    ┌──────────────────────┐    │
│                                    │ TaskManager          │    │
│                                    │ - 任务提交           │    │
│                                    │ - 状态存储           │    │
│                                    │ - 回调处理           │    │
│                                    │ - 通知发送           │    │
│                                    └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   本地存储     │    │   DeerFlow    │    │   百炼 API    │
│ task-store.json│    │   Gateway     │    │   (Kimi等)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │
        │                     │
        │              ┌──────┴──────┐
        │              │             │
        │              ▼             ▼
        │        ┌──────────┐  ┌──────────┐
        │        │ Sandbox  │  │ 子代理   │
        │        │ 容器     │  │ 编排     │
        │        └──────────┘  └──────────┘
        │
        └──────────────────────────────────┐
                                          │
                              ┌───────────┴───────────┐
                              │   Webhook 回调        │
                              │   POST /webhook/      │
                              │   deerflow/callback   │
                              └───────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 | 技术 |
|------|------|------|
| **deerflow-bridge Skill** | 命令解析、任务提交、结果格式化 | OpenClaw Skill (JS/TS) |
| **TaskManager** | 任务生命周期管理、状态存储 | 本地 JSON / SQLite |
| **DeerFlow Client** | HTTP 客户端，调用 DeerFlow API | HTTP Client |
| **Webhook Handler** | 接收 DeerFlow 完成通知 | HTTP Endpoint |
| **Notifier** | 结果通知发送 | OpenClaw Message API |

---

## 3. 交互流程设计

### 3.1 任务提交流程

```
用户输入: "@deerflow 帮我研究量子计算在金融领域的应用"
    │
    ▼
┌─────────────────────────────────────────┐
│ OpenClaw 消息路由                        │
│ - 检测到 @deerflow 触发词               │
│ - 路由到 deerflow-bridge Skill         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ deerflow-bridge                         │
│ 1. 解析命令参数                         │
│ 2. 提取任务内容                         │
│ 3. 生成任务ID: DF-{timestamp}-{random}  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ TaskManager.submit()                    │
│ 1. 保存任务记录到 task-store.json       │
│    {                                    │
│      taskId: "DF-20260322-001",        │
│      status: "pending",                 │
│      userId: "851013...",              │
│      channelId: "discord",              │
│      messageId: "1485264305...",        │
│      createdAt: "2026-03-22T21:10:00"  │
│    }                                    │
│ 2. 调用 DeerFlow API 创建任务          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ DeerFlow Gateway                        │
│ 1. 创建 Thread                          │
│ 2. 提交任务到 lead_agent               │
│ 3. 返回 thread_id                       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 立即返回给用户                          │
│ "🦌 任务已提交至 DeerFlow               │
│  任务ID: #DF-20260322-001              │
│  预计完成时间: 15-30分钟                │
│  完成后我会通知你"                      │
└─────────────────────────────────────────┘
```

### 3.2 任务完成回调流程

```
DeerFlow 任务完成
    │
    ▼
┌─────────────────────────────────────────┐
│ DeerFlow 调用 Webhook                   │
│ POST http://openclaw:8000/webhook/      │
│      deerflow/callback                  │
│ Body: {                                 │
│   taskId: "DF-20260322-001",           │
│   threadId: "uuid-xxx",                 │
│   status: "completed",                  │
│   result: {                             │
│     summary: "...",                     │
│     outputFiles: ["/outputs/..."]       │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ WebhookHandler                          │
│ 1. 验证签名（可选）                     │
│ 2. 查询 task-store.json 获取用户信息   │
│ 3. 更新任务状态为 completed             │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Notifier.sendResult()                   │
│ 1. 尝试回复原消息                       │
│    - 通过 messageId 查找原消息         │
│    - 如果会话仍活跃，直接回复           │
│ 2. 如果回复失败（会话超时）             │
│    - 发送新消息给用户                   │
│    - 内容包含任务ID和结果               │
└─────────────────────────────────────────┘
    │
    ▼
用户收到通知:
"✅ 任务 #DF-20260322-001 完成！

📊 量子计算在金融领域的应用研究

主要发现：
1. 量子算法在投资组合优化中...
2. 风险分析场景...

📎 附件：quantum-finance-report.pdf"
```

---

## 4. 模块详细设计

### 4.1 deerflow-bridge Skill

**目录结构**:
```
skills/deerflow-bridge/
├── SKILL.md              # Skill 描述文档
├── config.yaml           # 配置文件
├── lib/
│   ├── client.js         # DeerFlow HTTP 客户端
│   ├── task-manager.js   # 任务管理器
│   ├── notifier.js       # 通知发送器
│   └── parser.js         # 命令解析器
├── scripts/
│   └── webhook-server.js # Webhook 接收服务（可选独立进程）
└── templates/
    ├── submit.md         # 提交确认模板
    ├── complete.md       # 完成通知模板
    └── error.md          # 错误通知模板
```

**SKILL.md**:
```markdown
---
name: deerflow-bridge
description: |
  Bridge OpenClaw to DeerFlow for complex task processing.
  Trigger with @deerflow command.
  Supports deep research, report generation, and multi-step tasks.
triggers:
  - "@deerflow"
  - "/deerflow"
---

# DeerFlow Bridge Skill

## Usage

```
@deerflow [任务描述]
```

## Examples

- `@deerflow 帮我研究量子计算的最新进展`
- `@deerflow 生成一份关于AI Agent的报告`
- `@deerflow 分析这份PDF文档：[附件]`

## Commands

| 命令 | 说明 |
|------|------|
| `@deerflow status` | 查看当前任务状态 |
| `@deerflow list` | 列出最近的任务 |
| `@deerflow cancel <taskId>` | 取消任务（如果支持） |
```

**lib/client.js**:
```javascript
/**
 * DeerFlow HTTP Client
 * 封装与 DeerFlow Gateway 的通信
 */
class DeerFlowClient {
  constructor(config) {
    this.baseUrl = config.deerflowUrl || 'http://localhost:2026';
    this.timeout = config.timeout || 5000;
  }

  /**
   * 创建任务线程
   * @param {string} message - 任务描述
   * @param {object} options - 可选配置
   * @returns {Promise<{threadId: string, taskId: string}>}
   */
  async createTask(message, options = {}) {
    // 1. 创建 Thread
    const threadRes = await fetch(`${this.baseUrl}/api/langgraph/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!threadRes.ok) {
      throw new Error(`Failed to create thread: ${threadRes.status}`);
    }
    
    const { thread_id } = await threadRes.json();
    
    // 2. 提交任务
    const taskRes = await fetch(
      `${this.baseUrl}/api/langgraph/threads/${thread_id}/runs/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: 'lead_agent',
          input: {
            messages: [{
              type: 'human',
              content: [{ type: 'text', text: message }]
            }]
          },
          stream_mode: ['values', 'messages-tuple'],
          context: {
            thinking_enabled: true,
            is_plan_mode: true,
            subagent_enabled: true,
            callback_url: options.callbackUrl || this.getCallbackUrl()
          }
        })
      }
    );
    
    const runId = await this.extractRunId(taskRes.body);
    
    return {
      threadId: thread_id,
      runId: runId,
      taskId: `DF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    };
  }

  /**
   * 查询任务状态
   * @param {string} threadId 
   * @param {string} runId 
   */
  async getStatus(threadId, runId) {
    const res = await fetch(
      `${this.baseUrl}/api/langgraph/threads/${threadId}/runs/${runId}`
    );
    return await res.json();
  }

  /**
   * 获取任务结果
   * @param {string} threadId 
   */
  async getResult(threadId) {
    const res = await fetch(
      `${this.baseUrl}/api/langgraph/threads/${threadId}/history`
    );
    const history = await res.json();
    return this.extractLastAIMessage(history);
  }

  getCallbackUrl() {
    const openclawUrl = process.env.OPENCLAW_PUBLIC_URL || 'http://localhost:8000';
    return `${openclawUrl}/webhook/deerflow/callback`;
  }
}

module.exports = DeerFlowClient;
```

**lib/task-manager.js**:
```javascript
/**
 * Task Manager
 * 管理任务生命周期和状态持久化
 */
class TaskManager {
  constructor(config) {
    this.storePath = config.storePath || './data/deerflow-tasks.json';
    this.ensureStore();
  }

  ensureStore() {
    const fs = require('fs');
    const path = require('path');
    
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(this.storePath)) {
      fs.writeFileSync(this.storePath, JSON.stringify({ tasks: {} }, null, 2));
    }
  }

  async saveTask(task) {
    const store = this.loadStore();
    store.tasks[task.taskId] = {
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveStore(store);
    return task;
  }

  async updateTask(taskId, updates) {
    const store = this.loadStore();
    if (store.tasks[taskId]) {
      store.tasks[taskId] = {
        ...store.tasks[taskId],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveStore(store);
      return store.tasks[taskId];
    }
    return null;
  }

  async getTask(taskId) {
    const store = this.loadStore();
    return store.tasks[taskId] || null;
  }

  async listTasks(userId, limit = 10) {
    const store = this.loadStore();
    return Object.values(store.tasks)
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  loadStore() {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
  }

  saveStore(store) {
    const fs = require('fs');
    fs.writeFileSync(this.storePath, JSON.stringify(store, null, 2));
  }
}

module.exports = TaskManager;
```

**lib/notifier.js**:
```javascript
/**
 * Notifier
 * 发送任务完成通知
 */
class Notifier {
  constructor(config) {
    this.messageApi = config.messageApi;
    this.sessionTimeout = config.sessionTimeout || 10 * 60 * 1000;
  }

  async notifyComplete(task, result) {
    const message = this.formatResult(task, result);
    
    // 1. 尝试回复原消息
    const replied = await this.tryReplyToOriginal(task, message);
    
    if (replied) {
      return { method: 'reply', success: true };
    }
    
    // 2. 回复失败，发送新消息
    const sent = await this.sendNewMessage(task, message);
    return { method: 'new_message', success: sent };
  }

  async tryReplyToOriginal(task, message) {
    try {
      const sessionAge = Date.now() - new Date(task.createdAt).getTime();
      
      if (sessionAge > this.sessionTimeout) {
        console.log('Session timeout, falling back to new message');
        return false;
      }
      
      await this.messageApi.reply(task.channelId, task.messageId, message);
      return true;
    } catch (error) {
      console.error('Failed to reply to original message:', error);
      return false;
    }
  }

  async sendNewMessage(task, message) {
    try {
      await this.messageApi.send(task.channelId, task.userId, { text: message });
      return true;
    } catch (error) {
      console.error('Failed to send new message:', error);
      return false;
    }
  }

  formatResult(task, result) {
    const lines = [
      `✅ 任务 #${task.taskId} 完成！`,
      '',
      `📊 **${task.title || '任务结果'}**`,
      ''
    ];
    
    if (result.summary) {
      lines.push('**摘要：**');
      lines.push(result.summary);
      lines.push('');
    }
    
    if (result.keyFindings && result.keyFindings.length > 0) {
      lines.push('**主要发现：**');
      result.keyFindings.forEach((finding, i) => {
        lines.push(`${i + 1}. ${finding}`);
      });
      lines.push('');
    }
    
    if (result.outputFiles && result.outputFiles.length > 0) {
      lines.push('**附件：**');
      result.outputFiles.forEach(file => {
        lines.push(`📎 ${file.name}`);
      });
    }
    
    return lines.join('\n');
  }
}

module.exports = Notifier;
```

---

## 5. 配置设计

**config.yaml**:
```yaml
# DeerFlow Bridge 配置

deerflow:
  url: http://localhost:2026
  timeout: 5000
  
  callback:
    enabled: true
    public_url: ${OPENCLAW_PUBLIC_URL}
    secret: ${DEERFLOW_WEBHOOK_SECRET}

storage:
  type: json
  path: ./data/deerflow-tasks.json
  cleanup:
    enabled: true
    days_to_keep: 7
    schedule: "0 3 * * *"

notification:
  session_timeout: 600000
  fallback: new_message

triggers:
  explicit:
    - "@deerflow"
    - "/deerflow"
    - "/df"

models:
  default: bailian-kimi
  bailian:
    api_key: ${BAILIAN_API_KEY}
    base_url: https://dashscope.aliyuncs.com/api/v1
    available:
      - name: kimi-k2.5
        alias: Kimi
      - name: glm-5
        alias: GLM
      - name: qwen3.5-plus
        alias: Qwen
```

**.env 示例**:
```bash
BAILIAN_API_KEY=your-bailian-api-key
OPENCLAW_PUBLIC_URL=https://your-domain.com
DEERFLOW_URL=http://localhost:2026
DEERFLOW_WEBHOOK_SECRET=your-secret-key
```

---

## 6. 数据模型设计

**任务记录**:
```typescript
interface Task {
  taskId: string;           // DF-{timestamp}-{random}
  threadId: string;         // DeerFlow thread ID
  runId: string;            // DeerFlow run ID
  userId: string;           // 用户 ID
  channelId: string;        // 渠道 ID
  messageId: string;        // 原消息 ID
  title?: string;           // 任务标题
  content: string;          // 任务内容
  mode: 'flash' | 'standard' | 'pro' | 'ultra';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;        // 进度百分比
  result?: {
    summary: string;
    keyFindings?: string[];
    outputFiles?: { name: string; path: string; size?: number }[];
    rawContent?: string;
  };
  error?: { code: string; message: string };
  createdAt: string;        // ISO 8601
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  model?: string;
  usage?: { requests: number; tokens?: number };
}
```

**task-store.json 示例**:
```json
{
  "tasks": {
    "DF-20260322-abc123": {
      "taskId": "DF-20260322-abc123",
      "threadId": "uuid-thread-xxx",
      "runId": "uuid-run-xxx",
      "userId": "851013943018782721",
      "channelId": "discord:1479734558168584242",
      "messageId": "1485264305300705331",
      "title": "量子计算在金融领域的应用研究",
      "content": "帮我研究量子计算在金融领域的应用",
      "mode": "pro",
      "status": "completed",
      "result": {
        "summary": "量子计算在金融领域有广泛应用...",
        "keyFindings": [
          "投资组合优化是量子计算最成熟的应用场景",
          "风险分析领域已有多个 PoC 项目"
        ],
        "outputFiles": [
          {
            "name": "quantum-finance-report.pdf",
            "path": "/outputs/DF-20260322-abc123/quantum-finance-report.pdf"
          }
        ]
      },
      "createdAt": "2026-03-22T13:10:00.000Z",
      "updatedAt": "2026-03-22T13:35:00.000Z",
      "completedAt": "2026-03-22T13:35:00.000Z",
      "model": "bailian-kimi"
    }
  }
}
```

---

## 7. 接口设计

### 7.1 Skill 对外接口

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `submitTask(userId, message, options)` | 提交任务 | userId, message, options | `{ taskId, estimatedTime }` |
| `getStatus(taskId)` | 查询任务状态 | taskId | Task 对象 |
| `listTasks(userId, limit)` | 列出用户任务 | userId, limit | Task[] |
| `cancelTask(taskId)` | 取消任务 | taskId | `{ success }` |

### 7.2 Webhook 接口

**POST /webhook/deerflow/callback**

Request:
```json
{
  "taskId": "DF-20260322-abc123",
  "threadId": "uuid-thread-xxx",
  "status": "completed",
  "result": {
    "summary": "...",
    "outputFiles": ["..."]
  }
}
```

Response:
```json
{ "success": true }
```

---

## 8. 错误处理设计

### 8.1 错误类型

| 错误码 | 说明 | 处理策略 |
|--------|------|---------|
| `DEERFLOW_UNAVAILABLE` | DeerFlow 服务不可用 | 提示用户稍后重试 |
| `TASK_TIMEOUT` | 任务超时 | 标记为失败，通知用户 |
| `CALLBACK_FAILED` | 回调失败 | 重试 3 次，记录日志 |
| `NOTIFY_FAILED` | 通知发送失败 | 降级到其他渠道 |
| `STORAGE_ERROR` | 存储错误 | 使用内存备份 |

### 8.2 重试策略

```javascript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

async function withRetry(fn, config = retryConfig) {
  let lastError;
  for (let i = 0; i < config.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, i),
        config.maxDelay
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
```

---

## 9. 部署方案

### 9.1 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      生产环境部署                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   Nginx     │────▶│  OpenClaw   │────▶│  deerflow-  │   │
│  │  (反向代理)  │     │  Gateway    │     │  bridge     │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │   HTTPS     │     │ task-store  │     │  DeerFlow   │   │
│  │   证书      │     │   .json     │     │  Gateway    │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│                                                 │           │
│                                                 ▼           │
│                                         ┌─────────────┐     │
│                                         │   Docker    │     │
│                                         │  Sandbox    │     │
│                                         └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 环境变量清单

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `BAILIAN_API_KEY` | ✅ | 百炼 API Key |
| `OPENCLAW_PUBLIC_URL` | ✅ | OpenClaw 公网地址 |
| `DEERFLOW_URL` | ❌ | DeerFlow 地址，默认 localhost:2026 |
| `DEERFLOW_WEBHOOK_SECRET` | ❌ | Webhook 签名密钥 |

---

## 10. 开发计划

### 10.1 里程碑

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| **Phase 1** | 基础框架搭建 | 2-3 天 |
| **Phase 2** | 核心功能开发 | 3-4 天 |
| **Phase 3** | 测试与优化 | 2-3 天 |
| **Phase 4** | 文档与部署 | 1-2 天 |

**总计**: 8-12 天

---

## 11. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| DeerFlow 回调失败 | 高 | 中 | 实现主动轮询作为降级方案 |
| 百炼配额耗尽 | 中 | 中 | 监控使用量，提前预警 |
| Webhook 无法访问 | 高 | 低 | 支持配置多个回调地址 |
| 任务长时间运行 | 低 | 中 | 设置最大运行时间，超时通知 |

---

## 12. 后续扩展

| 扩展项 | 优先级 | 说明 |
|--------|--------|------|
| 任务进度实时推送 | P2 | 通过 SSE 实现实时进度 |
| 自动复杂度判断 | P2 | 智能路由，无需显式命令 |
| 多模型切换 | P3 | 支持在命令中指定模型 |
| 任务结果缓存 | P3 | 相似任务复用结果 |
| 使用量统计面板 | P3 | 可视化百炼配额消耗 |

---

## 附录 A: 用户命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `@deerflow <任务>` | 提交任务 | `@deerflow 研究量子计算` |
| `@deerflow status` | 查看任务状态 | `@deerflow status` |
| `@deerflow list` | 列出最近任务 | `@deerflow list` |
| `@deerflow cancel <ID>` | 取消任务 | `@deerflow cancel DF-xxx` |
| `@deerflow help` | 查看帮助 | `@deerflow help` |

---

**文档结束**
