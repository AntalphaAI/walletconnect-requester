# Recall 会议机器人工作流

## 起点：send_meeting_bot 工具

**工具位置**：`recall_manager` 插件（已安装）

**调用方式**：
```
send_meeting_bot(meeting_url, bot_name)
```

---

## 完整工作流

### 1️⃣ 派遣机器人

```
用户提供会议链接
        ↓
调用 send_meeting_bot 工具（⚠️ 这是起点！不要用其他方式）
        ↓
Recall.ai API 创建 Bot
        ↓
Bot 名称："丁丁的会议助理：小田"
        ↓
Bot 加入会议 → 开始录音
```

**关键配置**：
- Recall API Region: `ap-northeast-1`
- Webhook URL: `https://kiss77.top/webhook/recall`
- 服务端口: 8080（PM2 托管）

---

### 2️⃣ 监听 Webhook 事件

```
Bot 状态变化 → Recall.ai 发送 webhook
        ↓
Cloudflare 隧道 (HTTPS 443 → HTTP 8080)
        ↓
recall-webhook 服务接收 POST 请求
        ↓
处理 bot.done 事件
```

**服务管理**：PM2 托管，稳定运行

---

### 3️⃣ 转录录音

```
收到 bot.done 事件
        ↓
调用 Recall API 获取 Bot Metadata
        ↓
提取录音 URL（S3 预签名链接）
        ↓
调用阿里云百炼 Qwen3-ASR-Flash
        ↓
转录完成 → 返回文本
```

**注意**：S3 URL 有有效期，需及时处理（URL 过期会导致 FILE_403_FORBIDDEN）

---

### 4️⃣ 提示用户

```
转录完成
        ↓
保存到 workspace/recall-record/meeting-{id}-{timestamp}.txt
        ↓
写入 pending-tasks.json（新增待处理任务）
        ↓
用户下次交互时检测到待处理任务
        ↓
通知用户
```

---

### 5️⃣ 生成文档并发送链接

```
检测到待处理任务
        ↓
读取转录文本
        ↓
调用大模型生成：
  - 会议总结
  - 关键要点
  - 行动项
  - 详细明细
        ↓
创建在线文档（优先级）
  1. Google Docs（gog docs create）
  2. Notion（失败时备用）
        ↓
写入会议纪要内容
        ↓
发送文档链接给用户
```

**⚠️ 关键**：最后一步必须发送**在线文档链接**，不是本地 Markdown 文件！

---

## 配置文件位置

| 配置 | 路径 |
|------|------|
| Webhook 服务 | `~/.openclaw/recall-webhook/server.js` |
| 环境变量 | `~/.openclaw/recall-webhook/.env` |
| 录音存储 | `~/.openclaw/workspace/recall-record/` |
| 待处理任务 | `~/.openclaw/workspace/recall-record/pending-tasks.json` |

---

## 环境变量

```bash
RECALL_API_KEY=4f4f35551818434e13f487c0cddc7c5dad4a5e45
RECALL_API_REGION=ap-northeast-1  # ⚠️ 必须使用此区域，不能用默认的 api.recall.ai
BAILIAN_API_KEY=sk-b3672ee7eb254808a390cd8f85eb0056
```

**API 端点对比**：
| 端点 | 状态 |
|------|------|
| `https://api.recall.ai/api/v1` | ❌ 不可用 |
| `https://ap-northeast-1.recall.ai/api/v1` | ✅ 必须使用此端点 |

---

## ⚠️ 重要提醒

1. **起点永远是 `send_meeting_bot` 工具**，不要用 curl 直接调用 Recall API
2. **S3 URL 有效期**：收到 webhook 后尽快转录，避免 URL 过期
3. **Cloudflare 隧道**：webhook URL 不要加 `:8080` 端口，使用 `https://kiss77.top/webhook/recall`