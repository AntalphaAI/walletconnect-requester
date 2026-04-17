# OpenClaw 迁移指南：阿里云 VPS → Mac Mini

> 生成时间：2026-04-17
> 目标：将完整的 OpenClaw 环境从阿里云 VPS 迁移到上海家中的 Mac Mini

---

## 📋 迁移清单

| 类别 | 内容 | 预估大小 |
|------|------|---------|
| OpenClaw 配置 | `openclaw.json` + `config.json` + `.env` + `node.json` | ~50KB |
| 工作区 | `workspace/`（记忆、技能、脚本、brain） | ~150MB |
| 凭据 | `credentials/` + `exec-approvals.json` | ~KB |
| npm 全局包 | openclaw + mcporter + clawhub | ~200MB |
| 环境变量 | `.zshrc` 里的 PATH 和 API Keys | — |
| 系统级 Crontab | 邮件审批脚本 + Obsidian 同步 + 小鞠健康同步 | — |

---

## Phase 1：Mac Mini 基础环境

### 1.1 安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1.2 安装 Node.js 22

```bash
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node -v    # 验证：v22.x
```

### 1.3 安装全局 npm 包

```bash
npm install -g openclaw mcporter clawhub
```

### 1.4 安装 autossh（用于 SSH 隧道）

```bash
brew install autossh
```

---

## Phase 2：网络配置（翻墙）

### 2.1 SSH 密钥配置（如果还没有）

```bash
# 在 Mac Mini 上生成密钥
ssh-keygen -t ed25519

# 复制公钥到 VPS（免密登录）
ssh-copy-id admin@<VPS-IP>
```

### 2.2 建立 SOCKS5 隧道

```bash
# 测试连接
autossh -M 0 -f -N \
  -D 1080 \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=3" \
  admin@<VPS-IP>

# 验证代理
curl --socks5 127.0.0.1:1080 https://api.telegram.org
# 应返回 Telegram 页面内容
```

### 2.3 配置 OpenClaw 代理（只让 OpenClaw 走代理）

```bash
# 写入 ~/.zshrc（不要加到全局，只给 OpenClaw 用）
cat >> ~/.zshrc << 'EOF'

# OpenClaw proxy via VPS SOCKS5 tunnel
export OPENCLAW_HTTP_PROXY=socks5://127.0.0.1:1080
export OPENCLAW_HTTPS_PROXY=socks5://127.0.0.1:1080
EOF
source ~/.zshrc
```

### 2.4 开机自启隧道

创建 `~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/autossh</string>
        <string>-M</string>
        <string>0</string>
        <string>-f</string>
        <string>-N</string>
        <string>-D</string>
        <string>1080</string>
        <string>-o</string>
        <string>ServerAliveInterval=30</string>
        <string>-o</string>
        <string>ServerAliveCountMax=3</string>
        <string>admin@<VPS-IP></string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist
```

---

## Phase 3：打包传输

### 3.1 在 VPS 上打包

```bash
cd ~
tar czf openclaw-migration.tar.gz \
  --exclude='openclaw/logs' \
  --exclude='openclaw/subagents' \
  --exclude='openclaw/sandboxes' \
  --exclude='openclaw/tasks' \
  --exclude='openclaw/delivery-queue' \
  --exclude='openclaw/media' \
  --exclude='openclaw/canvas' \
  --exclude='*.bak' \
  --exclude='*.bak.*' \
  .openclaw/
```

### 3.2 传输到 Mac Mini

```bash
# 方法 A：scp（如果 Mac Mini 有公网 IP 或 Tailscale）
scp ~/openclaw-migration.tar.gz admin@<MacMini-IP>:~/

# 方法 B：从 Mac Mini 上拉取
# 先在 VPS 上临时开 HTTP：
cd ~ && python3 -m http.server 8888
# 然后在 Mac Mini 上：
curl -O http://<VPS-IP>:8888/openclaw-migration.tar.gz
```

### 3.3 在 Mac Mini 上解压

```bash
cd ~
tar xzf openclaw-migration.tar.gz
# ~/.openclaw/ 完整恢复
```

---

## Phase 4：配置修复

### 4.1 环境变量

```bash
# 写入 ~/.zshrc
cat >> ~/.zshrc << 'EOF'

# npm global bin
export PATH="$HOME/.npm-global/bin:$PATH"

# Tavily API Key
export TAVILY_API_KEY="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"
EOF
source ~/.zshrc
```

### 4.2 OpenViking 路径修复

编辑 `~/.openclaw/openviking.env`，将路径改为 macOS 格式：
```
# 原来（Linux）
export OPENVIKING_PYTHON='/home/admin/.openviking/venv/bin/python'
# 改为（macOS）
export OPENVIKING_PYTHON='/Users/admin/.openviking/venv/bin/python'
```

### 4.3 登录 ClawHub

```bash
clawhub login
# 按提示在浏览器中认证
```

### 4.4 系统级 Crontab

```bash
crontab -e
# 添加以下内容（与 VPS 一致）：
# 邮件审批脚本（每天 10:00、15:00、20:00）
0 10,15,20 * * * /usr/bin/python3 /Users/admin/.openclaw/workspace/scripts/run_and_classify.py
# 清理 CosyVoice 缓存（每周日凌晨 3 点）
0 3 * * 0 rm -rf /tmp/cosyvoice-tts/*
```

> ⚠️ 注意：macOS 没有 `/usr/bin/python3`，需要用 `which python3` 确认路径后替换

---

## Phase 5：启动验证

### 5.1 启动 SSH 隧道

```bash
# 确认隧道在运行
ps aux | grep autossh
# 如果没有，手动启动：
autossh -M 0 -f -N -D 1080 -o "ServerAliveInterval=30" -o "ServerAliveCountMax=3" admin@<VPS-IP>
```

### 5.2 启动 OpenClaw

```bash
screen -S openclaw-gateway
OPENCLAW_HTTP_PROXY=socks5://127.0.0.1:1080 \
OPENCLAW_HTTPS_PROXY=socks5://127.0.0.1:1080 \
openclaw gateway start
# Ctrl+A, D 退出 screen
```

### 5.3 验证清单

```bash
# ✅ 隧道连通
curl --socks5 127.0.0.1:1080 https://api.telegram.org

# ✅ 记忆文件完整
ls ~/.openclaw/workspace/memory/
ls ~/.openclaw/workspace/brain/

# ✅ 技能完整（应有 41 个目录）
ls ~/.openclaw/workspace/skills/ | wc -l

# ✅ 环境变量
echo $TAVILY_API_KEY

# ✅ OpenClaw 状态
openclaw status

# ✅ Telegram 连接
# 给自己发一条消息，确认收到回复
```

---

## ⚠️ 注意事项

| 事项 | 说明 |
|------|------|
| **Telegram** | 当前用 long polling 模式，不需要公网 IP，迁移后直接可用 |
| **Slack** | Socket 模式，不需要公网 IP，直接可用 |
| **小鞠工作区** | 路径：`~/.openclaw/workspace-life_assistant/`，需要单独迁移 |
| **DeerFlow** | 路径：`~/antalpha-com/antalpha-skills/`，PM2 管理，需单独迁移 |
| **OpenViking** | 路径：`~/.openviking/`，需单独安装 Python 虚拟环境 |
| **VPS 保留** | 迁移完成后 VPS 保留做：SSH 隧道中转、Nginx 反向代理 |
| **用户名差异** | VPS 是 `admin`，Mac Mini 默认可能是你的 macOS 用户名，注意路径 |
| **Python 路径** | macOS 的 python3 路径与 Linux 不同，crontab 需要确认 |

---

## 🏗️ 迁移后架构

```
Mac Mini M4/24GB/512GB (上海家里)
├── OpenClaw Gateway (小田) — 主 agent
├── 小鞠 (Life Assistant) — OpenClaw session
├── 77 — OpenClaw session
├── OpenCode CLI — 编程 agent
├── Qwen Code CLI — 编程 agent
├── autossh 隧道 → 127.0.0.1:1080 SOCKS5
└── screen openclaw-gateway

阿里云 US VPS (保留)
├── SSH 隧道中转（SOCKS5）
├── Nginx 反向代理（可选）
└── 轻量服务
```

---

## 🔁 回滚方案

如果迁移出问题：
1. VPS 上的 OpenClaw **暂时不要停**
2. Mac Mini 上调试通过后，再切换 Telegram 的活跃 session
3. VPS 降级为纯隧道 + 备用
