# Checkpoint: DeerFlow 启动故障排查经验

**日期**: 2026-03-30  
**时间**: 2:18 PM (Asia/Shanghai)  
**状态**: ✅ 已解决

---

## 问题描述

DeerFlow 服务在重启后无法正常启动，表现为：
1. PM2 管理的 deerflow 进程启动失败
2. 使用 screen 启动后进程自动退出
3. 健康检查端口 2026 无响应

---

## 根本原因

**日志目录权限问题**

DeerFlow 的启动脚本 `scripts/serve.sh` 第 125 行尝试写入日志文件：
```bash
(cd backend && NO_COLOR=1 uv run langgraph dev ... > ../logs/langgraph.log 2>&1) &
```

但 `/home/admin/deer-flow/logs/` 目录及其文件的所有者是 `root`，而 PM2/screen 以 `admin` 用户运行，导致：
```
./scripts/serve.sh: line 125: ../logs/langgraph.log: Permission denied
```

---

## 解决方案

### 1. 修复日志目录权限

```bash
sudo chown -R admin:admin /home/admin/deer-flow/logs
sudo chmod -R 755 /home/admin/deer-flow/logs
```

### 2. 使用 Screen 启动（推荐方式）

```bash
cd /home/admin/deer-flow
screen -dmS deerflow bash -c 'export PATH="/home/admin/.local/bin:/home/admin/.npm-global/bin:$PATH" && exec make dev'
```

**关键点**：
- 使用 `exec` 确保进程替换，避免 shell 中间层
- 必须设置 `PATH` 环境变量，包含 `uv` 和 `pnpm` 的路径
- Screen 会话保持 Detached 状态，服务在后台持续运行

### 3. 验证启动

```bash
# 检查 screen 会话
screen -ls

# 健康检查
curl http://localhost:2026/health
# 预期输出: {"status":"healthy","service":"deer-flow-gateway"}
```

---

## 服务架构回顾

```
┌─────────────────────────────────────────────────────────────┐
│                     DeerFlow 服务架构                        │
├─────────────────────────────────────────────────────────────┤
│  Nginx (2026)  ←──  统一入口，反向代理                       │
│       │                                                     │
│       ├──→  Frontend (3000)  ←── Next.js 前端              │
│       ├──→  Gateway (8001)   ←── Python FastAPI 网关       │
│       └──→  LangGraph (2024) ←── 核心工作流引擎            │
└─────────────────────────────────────────────────────────────┘
```

**启动顺序**：
1. LangGraph (port 2024) - 核心引擎
2. Gateway API (port 8001) - API 网关
3. Frontend (port 3000) - 前端界面
4. Nginx (port 2026) - 反向代理

---

## 管理命令备忘

### Screen 管理
```bash
# 查看会话
screen -ls

# 附加到会话（查看实时日志）
screen -r deerflow

# 分离会话（保持后台运行）
Ctrl+A, D

# 停止服务
screen -S deerflow -X quit
```

### 服务状态检查
```bash
# 健康检查
curl http://localhost:2026/health

# 查看各端口
curl http://localhost:2024/health  # LangGraph
curl http://localhost:8001/health  # Gateway
curl http://localhost:3000         # Frontend
```

---

## 经验教训

1. **权限问题优先排查**：当服务启动失败时，首先检查文件/目录权限
2. **日志是关键**：错误信息通常藏在日志文件中，如 `logs/pm2-error-*.log`
3. **环境变量**：DeerFlow 依赖 `PATH` 中的 `uv` 和 `pnpm`，启动时必须正确设置
4. **Screen vs PM2**：对于 DeerFlow 这种多进程服务，Screen 比 PM2 更可靠，因为：
   - 可以保留交互式输出
   - 更容易排查启动问题
   - 进程关系更清晰

---

## 相关文件

- 启动脚本: `/home/admin/deer-flow/scripts/serve.sh`
- 日志目录: `/home/admin/deer-flow/logs/`
- 主配置: `/home/admin/deer-flow/config.yaml`
- 环境变量: `/home/admin/deer-flow/.env`

---

## 关联检查点

- 主项目文档: `memory/checkpoints/deerflow-integration.md`
