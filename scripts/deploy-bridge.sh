#!/bin/bash

# deerflow-bridge 部署脚本
# 将 skill 部署到 OpenClaw

set -e

# 配置
SKILL_DIR="/home/admin/.openclaw/workspace/skills/deerflow-bridge"
OPENCLAW_SKILLS_DIR="${OPENCLAW_SKILLS_DIR:-/opt/openclaw/skills}"
BRIDGE_PORT="${BRIDGE_PORT:-3002}"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "========================================"
echo "  deerflow-bridge 部署脚本"
echo "========================================"

# 1. 检查 skill 目录
if [[ ! -d "$SKILL_DIR" ]]; then
    log_warn "Skill 目录不存在: $SKILL_DIR"
    exit 1
fi

# 2. 创建目标目录
mkdir -p "$OPENCLAW_SKILLS_DIR/deerflow-bridge"

# 3. 复制文件
log_info "复制 skill 文件..."
cp -r "$SKILL_DIR"/* "$OPENCLAW_SKILLS_DIR/deerflow-bridge/"

# 4. 创建数据和日志目录
mkdir -p "$OPENCLAW_SKILLS_DIR/deerflow-bridge/data"
mkdir -p "$OPENCLAW_SKILLS_DIR/deerflow-bridge/logs"

# 5. 安装依赖
log_info "安装 npm 依赖..."
cd "$OPENCLAW_SKILLS_DIR/deerflow-bridge"
npm install --production

# 6. 配置环境
log_info "配置环境..."
cat > .env << EOF
NODE_ENV=production
BRIDGE_PORT=$BRIDGE_PORT
EOF

# 7. 使用 PM2 启动服务
log_info "启动服务..."
pm2 delete deerflow-bridge 2>/dev/null || true
pm2 start index.js --name deerflow-bridge
pm2 save

echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
echo ""
echo "服务已启动在端口: $BRIDGE_PORT"
echo "查看状态: pm2 status"
echo "查看日志: pm2 logs deerflow-bridge"
echo ""