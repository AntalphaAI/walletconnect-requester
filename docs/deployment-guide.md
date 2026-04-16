# DeerFlow 与 OpenClaw 集成部署指南

本文档描述如何部署 DeerFlow 并将其与 OpenClaw 集成。

## 架构概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     用户        │────▶│    OpenClaw     │────▶│ deerflow-bridge │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                      │
                                                      ▼
                        ┌─────────────────────────────────────────┐
                        │              DeerFlow                    │
                        │         (异步任务执行引擎)                │
                        └─────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────────────────────┐
                        │            百炼 API                       │
                        │        (或其他 LLM 提供商)                 │
                        └─────────────────────────────────────────┘
```

## 组件说明

| 组件 | 端口 | 说明 |
|------|------|------|
| OpenClaw | 3000 | 主服务，接收用户消息 |
| deerflow-bridge | 3002 | Skill，处理命令和 Webhook |
| DeerFlow | 3001 | 异步任务执行引擎 |
| Redis | 6379 | 任务队列和缓存 |

## 部署步骤

### Step 1: 安装 DeerFlow

在远程服务器上执行：

```bash
# SSH 连接到服务器
ssh root@47.99.135.228

# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/.../install-deerflow.sh | bash

# 或者手动安装
git clone https://github.com/bytedance/deer-flow.git /opt/deerflow
cd /opt/deerflow
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 2: 配置 DeerFlow

编辑 `/opt/deerflow/.env`:

```bash
# 服务配置
PORT=3001

# 百炼 API Key (必需)
BAILIAN_API_KEY=sk-your-api-key-here

# Redis
REDIS_URL=redis://localhost:6379

# 日志
LOG_LEVEL=info
```

### Step 3: 启动 DeerFlow

```bash
# 使用 PM2 管理
pm2 start "cd /opt/deerflow && source venv/bin/activate && python -m deerflow.main" --name deerflow

# 或者直接启动
cd /opt/deerflow
source venv/bin/activate
python -m deerflow.main --port 3001
```

### Step 4: 部署 deerflow-bridge Skill

```bash
# 复制 skill 到 OpenClaw 目录
cp -r /home/admin/.openclaw/workspace/skills/deerflow-bridge /opt/openclaw/skills/

# 安装依赖
cd /opt/openclaw/skills/deerflow-bridge
npm install --production

# 配置
cp config.yaml config.yaml.bak
nano config.yaml  # 编辑配置

# 启动
pm2 start index.js --name deerflow-bridge
```

### Step 5: 配置 OpenClaw

在 OpenClaw 中注册 deerflow-bridge skill：

```yaml
# openclaw-config.yaml
skills:
  - name: deerflow-bridge
    path: /opt/openclaw/skills/deerflow-bridge
    enabled: true
    triggers:
      - type: command
        pattern: "@deerflow"
```

### Step 6: 配置防火墙

```bash
# 开放端口
ufw allow 3000/tcp comment 'OpenClaw'
ufw allow 3001/tcp comment 'DeerFlow'
ufw allow 3002/tcp comment 'deerflow-bridge'

# 重载防火墙
ufw reload
```

## 使用方法

### 基本命令

```
@deerflow <任务描述>              # 提交新任务
@deerflow status <任务ID>         # 查询任务状态
@deerflow list                    # 列出所有任务
@deerflow cancel <任务ID>         # 取消任务
@deerflow health                  # 检查 DeerFlow 状态
@deerflow stats                   # 显示统计信息
@deerflow help                    # 显示帮助
```

### 示例

```
用户: @deerflow 分析 /var/log/nginx/error.log 文件，找出所有 500 错误并生成报告

Bot: 🦌 任务已提交
     📋 任务ID: df_1704067200_abc123
     📝 描述: 分析 /var/log/nginx/error.log 文件...
     任务正在处理中，完成后将通知您。

... (几分钟后)

Bot: ✅ 任务完成
     📋 任务ID: df_1704067200_abc123
     📊 结果摘要: 发现 127 个 500 错误，主要集中在...
     📎 输出文件: /tmp/error-report-20240101.txt
     ⏱️ 执行时间: 45 秒
```

## 配置文件

### config.yaml

```yaml
# DeerFlow 服务配置
deerflow:
  url: "http://127.0.0.1:3001"
  timeout: 30000
  retries: 3

# Webhook 配置
webhook:
  port: 3002
  path: "/webhook/deerflow"
  public_url: "http://47.99.135.228:3002"

# OpenClaw 配置
openclaw:
  url: "http://47.99.135.228:3000"
  notify_endpoint: "/api/notify"

# 任务管理
task:
  state_file: "./data/deerflow-tasks.json"
  timeout: 3600
  max_concurrent: 5

# 触发配置
trigger:
  prefix: "@deerflow"
  enabled: true
```

## 监控与维护

### PM2 命令

```bash
pm2 status              # 查看所有服务状态
pm2 logs deerflow       # 查看 DeerFlow 日志
pm2 logs deerflow-bridge  # 查看 bridge 日志
pm2 restart deerflow    # 重启 DeerFlow
pm2 monit               # 实时监控
```

### 健康检查

```bash
# 检查 DeerFlow
curl http://localhost:3001/health

# 检查 deerflow-bridge
curl http://localhost:3002/health

# 检查 OpenClaw
curl http://localhost:3000/health
```

### 日志查看

```bash
# 实时日志
pm2 logs --lines 100

# 特定服务日志
pm2 logs deerflow --lines 50
```

## 故障排除

### DeerFlow 无法启动

1. 检查 Python 依赖：
   ```bash
   cd /opt/deerflow
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. 检查 Redis：
   ```bash
   redis-cli ping
   ```

3. 检查 API Key 配置：
   ```bash
   cat /opt/deerflow/.env
   ```

### Webhook 回调失败

1. 检查端口是否开放：
   ```bash
   netstat -tlnp | grep 3002
   ```

2. 检查防火墙：
   ```bash
   ufw status
   ```

3. 测试 Webhook 端点：
   ```bash
   curl -X POST http://localhost:3002/webhook/deerflow \
     -H "Content-Type: application/json" \
     -d '{"taskId": "test", "status": "completed"}'
   ```

### 任务状态不同步

1. 检查任务数据文件：
   ```bash
   cat /opt/openclaw/skills/deerflow-bridge/data/deerflow-tasks.json
   ```

2. 清理过期任务（重启服务自动清理）

## 文件结构

```
/opt/
├── deerflow/                    # DeerFlow 安装目录
│   ├── .env                     # 环境配置
│   ├── venv/                    # Python 虚拟环境
│   └── ...
│
└── openclaw/
    └── skills/
        └── deerflow-bridge/    # deerflow-bridge Skill
            ├── config.yaml     # 配置文件
            ├── index.js       # 主入口
            ├── lib/           # 核心模块
            ├── scripts/       # 脚本
            ├── templates/     # 模板
            ├── data/          # 数据存储
            └── logs/          # 日志文件
```

## 安全建议

1. **API Key 保护**
   - 不要在代码中硬编码 API Key
   - 使用环境变量或加密配置文件

2. **网络安全**
   - 仅开放必要端口
   - 使用 HTTPS
   - 配置访问控制

3. **权限控制**
   - 使用非 root 用户运行服务
   - 限制文件系统访问

## 更新与升级

```bash
# 更新 deerflow-bridge
cd /opt/openclaw/skills/deerflow-bridge
git pull
npm install --production
pm2 restart deerflow-bridge

# 更新 DeerFlow
cd /opt/deerflow
git pull
source venv/bin/activate
pip install -r requirements.txt
pm2 restart deerflow