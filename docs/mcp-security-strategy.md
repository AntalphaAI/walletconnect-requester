# MCP Server 流量安全与限频策略

> 日期：2026-04-02
> 作者：小田

## 设计目标

| 目标 | 说明 | 约束 |
|------|------|------|
| **G1: 冷启动不挡用户** | 不增加复杂的访问门限，保留用户体验弹性 | 不引入注册审核、OAuth、IP 黑白名单 |
| **G2: SSE 资源优化** | SSE 长连接消耗大量资源，需限制总量 | 代码轻量，< 200 行 |
| **G3: 防篡改** | MCP 响应从 Server 返回到 Skill 时不被中间人篡改 | 必须基于行业标准，非自造轮子 |

---

## 当前状态分析

### 已有能力
- ✅ 支持 SSE + Streamable HTTP 两种传输协议
- ✅ 已有 `MCP_MAX_BODY_BYTES` 限制单次请求大小（默认 1 MiB）
- ✅ 已读取 `x-antalpha-agent-api-key` 头部但未实际验证

### 缺失能力
- ❌ 没有连接数限制，SSE 会话无限堆积
- ❌ 没有会话 TTL 超时，断线连接永久残留
- ❌ 没有 TLS，数据明文传输（HTTP）
- ❌ 没有 API Key 实际校验逻辑

---

## 方案设计

### 目标一：冷启动不挡用户（极简门限）

#### 不引入的复杂度
- ❌ 注册审核流程
- ❌ OAuth 认证
- ❌ IP 黑白名单

#### 方案：预埋 API Key 验证（可选）

新增 `MCP_AUTH_MODE` 环境变量：

| 值 | 行为 | 适用阶段 |
|----|------|---------|
| `open` | 不验证，当前默认行为 | **冷启动期（现在）** |
| `apikey` | 校验 Key，无效返回 401 | 正式运营期 |

**关键设计**：
- 冷启动期间设为 `open`，不设任何门限
- 代码预埋好校验逻辑，设为 `apikey` 即可开启
- Key 发放 = 生成 UUID 入库，零管理成本

**环境变量**：
```
# 认证模式: open | apikey
MCP_AUTH_MODE=open

# API Key 存储
MCP_API_KEYS=key1,key2,key3
# 或指向 Nacos/配置文件
```

---

### 目标二：SSE 长连接资源优化

#### 轻量策略（~100 行代码）

| 策略 | 实现方式 | 效果 |
|------|---------|------|
| **最大会话数** | `MCP_MAX_SESSIONS=50`，超限返回 503 | 防止连接爆炸 |
| **会话 TTL 超时** | `MCP_SESSION_TTL=30m`，超时自动清理 | 断线残留自动回收 |
| **空闲检测** | 30 分钟无请求 → 清理（配合客户端自动重连） | 释放空闲连接 |

**环境变量**：
```
# SSE/Streamable HTTP 最大并发会话数
MCP_MAX_SESSIONS=50

# 会话存活时间（毫秒），0 为不禁用
MCP_SESSION_TTL=1800000

# 心跳检测间隔（毫秒）
MCP_SESSION_HEARTBEAT=60000
```

#### 架构引导：推荐 Streamable HTTP

SSE 的长连接特性决定了它**永远不适合高并发场景**。

| 维度 | SSE | Streamable HTTP |
|------|-----|-----------------|
| 连接方式 | 长连接（持续占用） | 短连接（请求-响应） |
| 内存占用 | 高（每个 session 独立进程） | 低（复用 HTTP） |
| 官方推荐 | ❌ 已标记为替代方案 | ✅ MCP SDK 推荐 |
| 代理兼容 | 需要特殊配置 | 标准 HTTP |

**策略**：
- 在 SSE 初始化响应中提示客户端使用 Streamable HTTP
- 对 SSE 施加比 Streamable HTTP 更严格的限制

---

### 目标三：防篡改

#### 🔴 P0（必须做）：TLS/HTTPS

**核心结论：没有 TLS，所有"防篡改"都是空谈。**

HTTP 明文传输 = 中间人可以随意读取和修改内容。这是**物理层面的问题**，任何应用层的补救都无法弥补。

**方案：Nginx 反向代理 + Let's Encrypt 免费证书**

```
互联网 → [Nginx + TLS] → localhost:3830 (MCP Server)
```

**Nginx 配置模板**：
```nginx
server {
    listen 443 ssl http2;
    server_name mcp.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/mcp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /mcp {
        # Streamable HTTP 代理
        proxy_pass http://127.0.0.1:3830;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 特殊头
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;

        # 限制同时连接数（Nginx 层面）
        limit_conn addr 10;
    }
}

# HTTP 重定向
server {
    listen 80;
    server_name mcp.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

**部署步骤**：
```bash
# 1. 安装 Nginx + Certbot
sudo apt install nginx certbot python3-certbot-nginx

# 2. 申请证书（自动配置 Nginx）
sudo certbot --nginx -d mcp.yourdomain.com

# 3. 自动续期（Certbot 已配置）
sudo certbot renew --dry-run
```

#### 🟢 P3（可选）：HMAC 响应签名

如果 TLS 之外还想加一层**来源验证**（防止伪造响应而非防中间人）：

**原理**：
1. MCP Server 对每个响应计算 `HMAC-SHA256(body + timestamp, secret_key)`
2. 响应头包含 `X-MCP-Signature` 和 `X-MCP-Timestamp`
3. Skill 客户端用相同 secret 验证签名

**限制**：
- 不能替代 TLS（HMAC 不加密，只验证来源）
- 增加每次请求的计算开销
- 需要双方共享密钥

**建议**：TLS + 可选 API Key 已经够用。HMAC 在以下场景才有额外价值：
- 需要通过不安全的 CDN/代理转发
- 需要审计响应的真实来源

---

## 实施优先级

| 优先级 | 项目 | 代码改动 | 紧急度 | 负责人 |
|--------|------|---------|--------|--------|
| 🔴 P0 | Nginx + TLS | 零代码（运维配置） | 安全底线，必须 | 运维/丁丁 |
| 🟡 P1 | SSE 资源限制（连接数 + TTL） | ~100 行 NestJS | 本周内 | 小田 |
| 🟢 P2 | API Key 预埋（open 模式） | ~30 行 NestJS | 本周内 | 小田 |
| ⚪ P3 | HMAC 响应签名 | ~50 行 NestJS | 可选，看需求 | 小田/待定 |

---

## 环境变量汇总

```env
# ---- 认证 ----
MCP_AUTH_MODE=open                    # open | apikey
MCP_API_KEYS=key1,key2,key3           # 逗号分隔的有效 Key
AGENT_API_KEY_HEADER=x-antalpha-agent-api-key  # API Key 请求头名称

# ---- 资源限制 ----
MCP_MAX_SESSIONS=50                   # 最大并发会话数
MCP_SESSION_TTL=1800000               # 会话超时（毫秒），30 分钟
MCP_MAX_BODY_BYTES=1048576            # 单次请求最大 body（1 MiB）

# ---- 日志 ----
MCP_LOG_LEVEL=info                    # debug | info | warn | error
```

---

## 风险提醒

1. **没有 TLS 是最高风险** — 即使其他措施都做了，明文传输意味着所有安全策略无效
2. **SSE 连接泄漏** — 客户端断线不通知服务端时，连接会永久占 **Nacos 配置** — 如果 API Keys 走 Nacos，需确保 Nacos 本身有 ACL 保护

---

## 下一步

- [ ] 主人确认 Nginx 域名和证书配置
- [ ] P1: 实现 SSE 资源限制代码
- [ ] P2: 实现 API Key 预埋逻辑
- [ ] 代码推送到 `2024.0402-DINGDING` 分支（或新建分支）

[🐾 GLM]
