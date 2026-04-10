# WalletConnect Requester

> **Zero Custody. User Always in Control.**
> **零托管，用户始终掌控一切。**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/AntalphaAI/walletconnect-requester)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![WalletConnect](https://img.shields.io/badge/WalletConnect-v2-orange.svg)](https://walletconnect.com)

---

## English

### What is This?

**WalletConnect Requester** is an AI agent skill that lets agents connect to user wallets via WalletConnect v2 — **without ever touching private keys**. The agent can request transactions and signatures, but the user reviews and approves every action in their own wallet app.

This is the safest way for AI agents to interact with Web3.

```
┌─────────────────┐                    ┌─────────────────┐
│   AI Agent      │                    │   User Wallet   │
│   (Requester)   │ ◄── WalletConnect ──► │   (Signer)      │
└─────────────────┘        Session     └─────────────────┘
         │                                    │
         │  1. Request transaction            │
         │ ─────────────────────────────────► │
         │                                    │
         │  2. User reviews & approves        │
         │    (in wallet UI)                  │
         │                                    │
         │  3. Signed transaction returned    │
         │ ◄───────────────────────────────── │
         │                                    │
    NO PRIVATE KEYS                      PRIVATE KEYS
    NO AUTO-SIGN                         USER APPROVES
```

---

### Why Not walletconnect-agent?

| | walletconnect-agent | walletconnect-requester (this skill) |
|---|---|---|
| **Private Keys** | ⚠️ Stored in agent | ✅ Never touches agent |
| **Signing** | ⚠️ Auto-signs everything | ✅ User approves each tx |
| **Security Model** | Custodial | **Non-custodial** |
| **If Agent Compromised** | ⚠️ Funds can be stolen | ✅ Funds are safe |

**When in doubt, use this skill.** It's always safer.

---

### Installation

#### Step 1: Install via GitHub

```bash
openclaw skill install https://github.com/AntalphaAI/walletconnect-requester
```

#### Install via ClawHub

```bash
clawhub install walletconnect-requester
```

#### Step 2: Install Node.js Dependencies

> ⚠️ Node.js 18+ is required. Check with `node --version`.

```bash
npm install @walletconnect/sign-client@2.23.9 @walletconnect/core@2.23.9 qrcode@1.5.4
```

#### Step 3: Get WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy your **Project ID**

#### Step 4: Set Environment Variables

```bash
export WC_PROJECT_ID="your_project_id_here"

# Optional customization
export WC_METADATA_NAME="My DApp"
export WC_METADATA_URL="https://myapp.com"
export WC_METADATA_ICONS="https://myapp.com/icon.png"
```

---

### Quick Start

#### 1. Connect to a Wallet

```bash
node scripts/wc-requester.js connect
```

Output:
```
WalletConnect URI: wc:abc123...@2?relay-protocol=irn&symKey=xyz

Scan this QR code with your wallet:
[QR CODE]

Waiting for wallet to connect...
```

#### 2. Request a Transaction

```bash
node scripts/wc-requester.js request-tx \
  --to 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --data 0xa9059cbb... \
  --value 0 \
  --chain 8453
```

The user sees in their wallet:
```
Send 10 USDC to 0x1F3A...?
[Approve] [Reject]
```

#### 3. Request a Signature

```bash
node scripts/wc-requester.js request-sign \
  --message "Sign to verify wallet ownership" \
  --chain 8453
```

---

### Full Command Reference

#### `connect` — Create a WalletConnect Session

```bash
node scripts/wc-requester.js connect [options]

Options:
  --chains <ids>     Comma-separated chain IDs (default: 8453,1)
  --methods <list>   Allowed methods (default: eth_sendTransaction,personal_sign)
  --qr <path>        Save QR code to file
  --json             Output session info as JSON
```

#### `request-tx` — Request a Transaction

```bash
node scripts/wc-requester.js request-tx \
  --to <address> \
  --data <hex> \
  --value <wei> \
  --chain <chainId>
```

#### `request-sign` — Request a Signature

```bash
# Plain message
node scripts/wc-requester.js request-sign \
  --message "Your message" \
  --chain 8453

# EIP-712 typed data
node scripts/wc-requester.js request-sign \
  --typed-data '{"domain":...}' \
  --chain 8453
```

#### `sessions` — List Active Sessions

```bash
node scripts/wc-requester.js sessions
```

#### `disconnect` — End a Session

```bash
node scripts/wc-requester.js disconnect --topic <topic>
```

---

### Configuration

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WC_PROJECT_ID` | ✅ Yes | WalletConnect Cloud Project ID |
| `WC_METADATA_NAME` | No | DApp name shown in wallet |
| `WC_METADATA_URL` | No | DApp URL |
| `WC_METADATA_ICONS` | No | DApp icon URL (comma-separated for multiple) |

#### Default Namespace Permissions

```json
{
  "eip155": {
    "chains": ["eip155:8453", "eip155:1"],
    "methods": ["eth_sendTransaction", "personal_sign"],
    "events": ["accountsChanged", "chainChanged"]
  }
}
```

---

### Security Model

#### What the Agent CAN Do
- ✅ Request transactions (user must approve in wallet)
- ✅ Request message signatures (user must approve)
- ✅ Request EIP-712 typed data signatures
- ✅ View connected wallet address
- ✅ List and manage active sessions

#### What the Agent CANNOT Do
- ❌ Hold or access private keys
- ❌ Auto-sign anything
- ❌ Execute transactions without user approval
- ❌ Access funds directly

#### If the Agent is Compromised
- ✅ Attacker cannot steal funds (no keys stored)
- ✅ Attacker cannot auto-sign transactions
- ✅ User can reject any suspicious request
- ✅ User can disconnect sessions anytime

#### Local Data Persistence

Files are stored at `~/.walletconnect-requester/`:

| File | Purpose | Sensitivity |
|------|---------|-------------|
| `sessions.json` | Active WalletConnect sessions | ⚠️ Contains session topics |
| `audit.log` | Transaction audit log (masked) | ⚠️ Contains masked tx hashes |

**Recommendations:**
```bash
chmod 600 ~/.walletconnect-requester/*   # Restrict file permissions
```

---

### Supported Wallets

Any wallet supporting WalletConnect v2, including:
- MetaMask Mobile
- Rainbow
- Trust Wallet
- Coinbase Wallet
- Ledger Live
- 500+ more via WalletConnect

### Supported Chains

Base · Ethereum · Arbitrum · Optimism · Polygon · Any EVM-compatible chain

---

### Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `No active session` | Session not created | Run `connect` first |
| `User rejected request` | User declined in wallet | Ask user to retry |
| `Session expired` | Sessions last 7 days | Reconnect to create new session |
| `Unsupported chain` | Wallet doesn't support chain | Ask user to switch networks |

---

### Changelog

#### [1.0.0] — 2026-03-09 · Initial Release

**Added:**
- Non-custodial WalletConnect v2 client for AI agents
- Session management: connect, list, disconnect
- Transaction request flow (user approval required)
- Signature request: plain message + EIP-712 typed data
- QR code generation for easy wallet scanning
- Audit logging with masked sensitive data
- Multi-chain support: Base, Ethereum, Arbitrum, Optimism, Polygon

**Security Hardening:**
- Zero private key exposure — keys never leave user wallet
- User approval required for every transaction
- `eth_sign` blocked by default to prevent phishing attacks
- Full audit trail with masked addresses and tx hashes

---

### License

MIT — Built with security as the #1 priority.

**Maintainer:** Antalpha AI Team | [AntalphaAI/walletconnect-requester](https://github.com/AntalphaAI/walletconnect-requester)

---
---

## 中文

### 这是什么？

**WalletConnect Requester** 是一个 AI Agent 技能，让 Agent 可以通过 WalletConnect v2 连接用户钱包 —— **完全不接触私钥**。Agent 可以发起交易和签名请求，但用户需在自己的钱包 App 中审核并逐笔确认，一切由用户掌控。

这是 AI Agent 与 Web3 交互最安全的方式。

```
┌─────────────────┐                    ┌─────────────────┐
│   AI Agent      │                    │   用户钱包       │
│  （请求方）      │ ◄── WalletConnect ──► │  （签名方）      │
└─────────────────┘        Session     └─────────────────┘
         │                                    │
         │  1. 发起交易请求                    │
         │ ─────────────────────────────────► │
         │                                    │
         │  2. 用户在钱包 UI 中审核并确认       │
         │                                    │
         │  3. 返回已签名的交易                │
         │ ◄───────────────────────────────── │
         │                                    │
    无私钥                               持有私钥
    无自动签名                            用户审批一切
```

---

### 为什么不用 walletconnect-agent？

| | walletconnect-agent | walletconnect-requester（本技能）|
|---|---|---|
| **私钥** | ⚠️ 存储在 Agent 中 | ✅ 永不接触 Agent |
| **签名方式** | ⚠️ 自动签名一切 | ✅ 用户逐笔确认 |
| **安全模型** | 托管模式 | **非托管模式** |
| **Agent 被攻破时** | ⚠️ 资金可能被盗 | ✅ 资金安全，无密钥可窃 |

**有疑虑时请选择本技能，它始终更安全。**

---

### 安装方式

#### 第一步：从 GitHub 安装

```bash
openclaw skill install https://github.com/AntalphaAI/walletconnect-requester
```

#### 第二步：安装 Node.js 依赖

> ⚠️ 需要 Node.js 18+，运行 `node --version` 确认版本。

```bash
npm install @walletconnect/sign-client@2.23.9 @walletconnect/core@2.23.9 qrcode@1.5.4
```

#### 第三步：获取 WalletConnect Project ID

1. 前往 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 创建一个新项目
3. 复制你的 **Project ID**

#### 第四步：配置环境变量

```bash
export WC_PROJECT_ID="你的_project_id"

# 可选自定义
export WC_METADATA_NAME="我的 DApp"
export WC_METADATA_URL="https://myapp.com"
export WC_METADATA_ICONS="https://myapp.com/icon.png"
```

---

### 快速开始

#### 1. 连接钱包

```bash
node scripts/wc-requester.js connect
```

输出示例：
```
WalletConnect URI: wc:abc123...@2?relay-protocol=irn&symKey=xyz

使用钱包扫描二维码：
[二维码]

等待钱包连接...
```

#### 2. 发起交易请求

```bash
node scripts/wc-requester.js request-tx \
  --to 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --data 0xa9059cbb... \
  --value 0 \
  --chain 8453
```

用户钱包中显示：
```
发送 10 USDC 到 0x1F3A...？
[确认] [拒绝]
```

#### 3. 发起签名请求

```bash
node scripts/wc-requester.js request-sign \
  --message "签名以验证钱包所有权" \
  --chain 8453
```

---

### 完整命令参考

#### `connect` — 创建 WalletConnect 会话

```bash
node scripts/wc-requester.js connect [options]

参数：
  --chains <ids>     链 ID，逗号分隔（默认：8453,1）
  --methods <list>   允许的方法（默认：eth_sendTransaction,personal_sign）
  --qr <path>        二维码保存路径
  --json             以 JSON 格式输出会话信息
```

#### `request-tx` — 发起交易请求

```bash
node scripts/wc-requester.js request-tx \
  --to <地址> \
  --data <十六进制数据> \
  --value <wei 金额> \
  --chain <链ID>
```

#### `request-sign` — 发起签名请求

```bash
# 普通消息签名
node scripts/wc-requester.js request-sign \
  --message "消息内容" \
  --chain 8453

# EIP-712 结构化数据签名
node scripts/wc-requester.js request-sign \
  --typed-data '{"domain":...}' \
  --chain 8453
```

#### `sessions` — 查看所有活跃会话

```bash
node scripts/wc-requester.js sessions
```

#### `disconnect` — 断开指定会话

```bash
node scripts/wc-requester.js disconnect --topic <topic>
```

---

### 配置说明

#### 环境变量

| 变量名 | 必须 | 说明 |
|--------|------|------|
| `WC_PROJECT_ID` | ✅ 必填 | WalletConnect Cloud Project ID |
| `WC_METADATA_NAME` | 可选 | 显示在钱包中的 DApp 名称 |
| `WC_METADATA_URL` | 可选 | DApp 网址 |
| `WC_METADATA_ICONS` | 可选 | DApp 图标地址（多个用逗号分隔）|

#### 默认命名空间权限

```json
{
  "eip155": {
    "chains": ["eip155:8453", "eip155:1"],
    "methods": ["eth_sendTransaction", "personal_sign"],
    "events": ["accountsChanged", "chainChanged"]
  }
}
```

---

### 安全模型

#### Agent 能做什么
- ✅ 发起交易请求（需用户在钱包中确认）
- ✅ 发起消息签名请求（需用户确认）
- ✅ 发起 EIP-712 结构化数据签名请求
- ✅ 查看已连接的钱包地址
- ✅ 列出和管理活跃会话

#### Agent 不能做什么
- ❌ 持有或访问私钥
- ❌ 自动签名任何内容
- ❌ 无需用户批准直接执行交易
- ❌ 直接访问用户资金

#### Agent 被攻破时
- ✅ 攻击者无法窃取资金（没有私钥）
- ✅ 攻击者无法自动签名交易
- ✅ 用户可以拒绝任何可疑请求
- ✅ 用户可随时断开会话

#### 本地数据存储

文件存储于 `~/.walletconnect-requester/`：

| 文件 | 用途 | 敏感级别 |
|------|------|----------|
| `sessions.json` | 活跃会话信息 | ⚠️ 含会话 topic |
| `audit.log` | 交易审计日志（已脱敏）| ⚠️ 含脱敏 tx hash |

**安全建议：**
```bash
chmod 600 ~/.walletconnect-requester/*   # 限制文件权限
```

---

### 支持的钱包

所有支持 WalletConnect v2 的钱包，包括：
- MetaMask 移动端
- Rainbow
- Trust Wallet
- Coinbase Wallet
- Ledger Live
- 500+ 其他钱包

### 支持的链

Base · Ethereum · Arbitrum · Optimism · Polygon · 任何 EVM 兼容链

---

### 常见问题排查

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| `No active session` | 未创建会话 | 先执行 `connect` |
| `User rejected request` | 用户在钱包中拒绝 | 询问用户是否重试 |
| `Session expired` | 会话默认有效期 7 天 | 重新连接创建新会话 |
| `Unsupported chain` | 钱包不支持该链 | 请用户在钱包中切换网络 |

---

### 版本更新说明

#### [1.0.0] — 2026-03-09 · 首次发布

**新增功能：**
- 面向 AI Agent 的非托管 WalletConnect v2 客户端
- 会话管理：连接、查看、断开
- 交易请求流程（需用户逐笔批准）
- 签名请求：普通消息 + EIP-712 结构化数据
- 二维码生成，方便钱包扫码连接
- 审计日志（敏感数据脱敏处理）
- 多链支持：Base、Ethereum、Arbitrum、Optimism、Polygon

**安全加固：**
- 零私钥暴露 —— 私钥永不离开用户钱包
- 每笔交易均需用户批准，无例外
- 默认屏蔽 `eth_sign` 方法，防止钓鱼攻击
- 完整审计链路，地址和 tx hash 均作脱敏记录

---

### 开源协议

MIT — 安全优先原则构建。

**维护团队：** Antalpha AI Team | [AntalphaAI/walletconnect-requester](https://github.com/AntalphaAI/walletconnect-requester)
