#!/bin/bash

# DeerFlow 安装脚本
# 用于在远程服务器上安装和配置 DeerFlow

set -e

# 配置变量
DEERFLOW_DIR="/home/admin/deer-flow"
DEERFLOW_PORT="${DEERFLOW_PORT:-3001}"
DEERFLOW_REPO="https://github.com/bytedance/deer-flow.git"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行"
        exit 1
    fi
}

# 安装系统依赖
install_dependencies() {
    log_info "更新系统包..."
    apt-get update -y

    log_info "安装基础依赖..."
    apt-get install -y \
        git \
        curl \
        wget \
        build-essential \
        python3 \
        python3-pip \
        python3-venv \
        nodejs \
        npm \
        redis-server

    log_info "依赖安装完成"
}

# 安装 Node.js (如果需要更高版本)
install_nodejs() {
    log_info "检查 Node.js 版本..."
    NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
    
    if [[ "$NODE_VERSION" -lt 18 ]]; then
        log_warn "Node.js 版本过低 (v$NODE_VERSION)，正在安装 v18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
        log_info "Node.js 安装完成: $(node --version)"
    else
        log_info "Node.js 版本满足要求: $(node --version)"
    fi
}

# 安装 PM2
install_pm2() {
    log_info "安装 PM2..."
    npm install -g pm2
    log_info "PM2 安装完成"
}

# 克隆 DeerFlow 仓库
clone_deerflow() {
    log_info "克隆 DeerFlow 仓库..."
    
    if [[ -d "$DEERFLOW_DIR" ]]; then
        log_warn "目录 $DEERFLOW_DIR 已存在"
        read -p "是否删除并重新安装? (y/N): " confirm
        if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
            rm -rf "$DEERFLOW_DIR"
        else
            log_info "跳过克隆，使用现有目录"
            return 0
        fi
    fi
    
    git clone "$DEERFLOW_REPO" "$DEERFLOW_DIR"
    log_info "DeerFlow 克隆完成"
}

# 安装 Python 依赖
install_python_deps() {
    log_info "安装 Python 依赖..."
    cd "$DEERFLOW_DIR"
    
    # 创建虚拟环境
    python3 -m venv venv
    source venv/bin/activate
    
    # 安装依赖
    pip install --upgrade pip
    pip install -r requirements.txt 2>/dev/null || {
        log_warn "requirements.txt 不存在，尝试其他方式安装..."
        pip install langchain openai anthropic requests fastapi uvicorn
    }
    
    deactivate
    log_info "Python 依赖安装完成"
}

# 配置 DeerFlow
configure_deerflow() {
    log_info "配置 DeerFlow..."
    cd "$DEERFLOW_DIR"
    
    # 创建 .env 文件
    cat > .env << EOF
# DeerFlow 配置

# 服务端口
PORT=$DEERFLOW_PORT

# 百炼 API Key (请替换为您的实际 API Key)
BAILIAN_API_KEY=your_api_key_here

# 或者使用其他 LLM 提供商
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key

# Redis 配置
REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=info
EOF

    log_warn "请编辑 $DEERFLOW_DIR/.env 文件配置您的 API Key"
}

# 创建 systemd 服务或 PM2 配置
setup_service() {
    log_info "设置 DeerFlow 服务..."
    cd "$DEERFLOW_DIR"
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
cd /home/admin/deer-flow
source venv/bin/activate
python -m deerflow.main --port 3001
EOF
    chmod +x start.sh
    
    # 使用 PM2 管理服务
    log_info "使用 PM2 启动服务..."
    pm2 delete deerflow 2>/dev/null || true
    pm2 start start.sh --name deerflow
    pm2 save
    
    log_info "DeerFlow 服务已启动"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        ufw allow "$DEERFLOW_PORT/tcp" comment 'DeerFlow'
        log_info "防火墙已配置，端口 $DEERFLOW_PORT 已开放"
    else
        log_warn "ufw 未安装，请手动配置防火墙"
    fi
}

# 验证安装
verify_installation() {
    log_info "验证安装..."
    sleep 3
    
    if curl -s "http://localhost:$DEERFLOW_PORT/health" > /dev/null 2>&1; then
        log_info "DeerFlow 服务运行正常!"
        log_info "访问地址: http://$(hostname -I | awk '{print $1}'):$DEERFLOW_PORT"
    else
        log_warn "DeerFlow 服务可能未正常启动，请检查日志"
        log_info "查看日志: pm2 logs deerflow"
    fi
}

# 打印安装信息
print_info() {
    echo ""
    echo "========================================"
    echo "  DeerFlow 安装完成"
    echo "========================================"
    echo ""
    echo "安装目录: $DEERFLOW_DIR"
    echo "服务端口: $DEERFLOW_PORT"
    echo ""
    echo "下一步操作:"
    echo "1. 编辑配置文件: nano $DEERFLOW_DIR/.env"
    echo "2. 重启服务: pm2 restart deerflow"
    echo "3. 查看日志: pm2 logs deerflow"
    echo ""
    echo "常用命令:"
    echo "  pm2 status          # 查看服务状态"
    echo "  pm2 logs deerflow   # 查看日志"
    echo "  pm2 restart deerflow # 重启服务"
    echo "  pm2 stop deerflow    # 停止服务"
    echo ""
}

# 主安装流程
main() {
    echo ""
    echo "========================================"
    echo "  DeerFlow 自动安装脚本"
    echo "========================================"
    echo ""
    
    check_root
    install_dependencies
    install_nodejs
    install_pm2
    clone_deerflow
    install_python_deps
    configure_deerflow
    setup_service
    setup_firewall
    verify_installation
    print_info
}

# 运行主函数
main "$@"