# Antalpha Prime RWA 项目代码分析

> 项目位置：`/home/admin/.antalpha-rwa/prime-rwa`
> 分析日期：2026-03-29

---

## 项目概览

**Antalpha Prime RWA** 是一个真实世界资产 (Real World Assets) 管理平台。项目采用 pnpm monorepo 架构，包含多个后端服务和前端应用。

### 技术栈

```
后端: NestJS 11 + TypeORM + MySQL + Redis + Nacos
前端: Next.js 16 + React 19 + Tailwind CSS 4 + Jotai
验证: Zod (前后端共享 Schema)
AI:   MCP (Model Context Protocol)
工具: Biome (lint/format) + pnpm (包管理)
```

---

## 目录结构详解

### `apps/` - 5个独立应用

| 应用 | 端口 | 说明 |
|------|------|------|
| `server-admin` | 3800 | 管理端 API 后端，使用 Nacos 配置中心 + MySQL + Redis |
| `mcp-admin` | 3820 | 管理端 MCP 服务，为 AI Agent 提供 ~24 个管理工具（需认证） |
| `mcp-public` | 3810 | 公开 MCP 服务，只读查询产品（无需认证） |
| `mcp-skills` | 3830 | 技能 MCP 服务 |
| `web-admin` | 3100 | 管理端前端，Next.js 16 + React 19 |

#### server-admin

管理端后端 API 服务，核心业务入口：
- 使用 Nacos 作为配置中心，支持动态配置
- 集成 TypeORM + MySQL 数据库
- Redis 缓存支持
- 包含完整的业务模块：产品、订单、账户、权限、安全等
- Swagger API 文档自动生成

#### mcp-admin

管理端 MCP (Model Context Protocol) 服务：
- 为 AI Agent 提供约 24 个管理工具
- 需要 Bearer Token 认证
- 支持的业务域：
  - 产品管理（CRUD）
  - 资金池管理
  - 订单管理
  - 结算管理
  - 利息历史
  - 消息日志
  - 队列请求

#### mcp-public

公开 MCP 服务：
- 无需认证，直接连接
- 仅提供只读查询工具：`list-products`、`get-product`
- 适用于外部 Agent 查询 RWA 产品信息

#### mcp-skills

技能 MCP 服务：
- 包含 AI 技能相关的工具
- 支持 agent、asset、smart-money、web3-trader 等技能

#### web-admin

管理端前端应用：
- Next.js 16 应用
- 使用 @antalpha/common 和 @antalpha/design 包
- React 19 + Tailwind CSS 4
- 支持国际化（i18next）

---

### `packages/` - 前端共享包

#### common (@antalpha/common)

前端通用库，包含：
- `hooks/` - 自定义 React Hooks（包括 `useSchema` 用于表单验证翻译）
- `utils/` - 工具函数
- `config/` - 配置管理
- `components/` - 通用组件
- `state/` - 状态管理（Jotai）
- `events/` - 事件系统
- `formatters/` - 格式化工具
- `types/` - TypeScript 类型定义

依赖：React Query、i18next、Jotai、Zod 等

#### design (@antalpha/design)

UI 组件库，包含：
- 基于 Radix UI 的无头组件
- Tailwind CSS 4 样式
- 组件类型：
  - `ui/` - 基础 UI 组件（Button、Input、Dialog 等）
  - `uix/` - 扩展组件（Form、Table、DatePicker 等）
  - `icons/` - 图标组件
- 支持主题切换（next-themes）
- 集成 react-hook-form 的表单组件

---

### `libs/` - 后端业务模块

| 模块 | 用途 |
|------|------|
| `common` | 通用工具（缓存、配置、DTO、错误处理、i18n、拦截器、验证） |
| `shared` | 共享模块（MCP 相关功能） |
| `types` | 共享 Zod Schema 类型定义（前后端共用，单一数据源） |
| `product` | 产品管理模块 |
| `order` | 订单管理模块 |
| `account` | 账户管理模块 |
| `access` | 权限控制模块 |
| `security` | 安全模块（加密、认证等） |
| `assets` | 资产模块 |
| `message` | 消息模块 |
| `skills/` | AI 技能库 |
| └ `agent` | Agent 技能 |
| └ `asset` | 资产技能 |
| └ `smart-money` | 智能资金分析 |
| └ `web3-trader` | Web3 交易技能 |
| └ `test` | 测试技能 |

#### 数据模型分层

```
libs/types (Zod Schema)
    ↓
libs/*/dto (DTO 类，使用 createI18nZodDto)
    ↓
libs/*/entity (TypeORM Entity，仅面向数据库)
```

---

### 其他目录

| 目录 | 用途 |
|------|------|
| `docker/` | Docker 构建脚本（`build.sh` 支持构建所有服务镜像） |
| `scripts/` | 数据库迁移工具（TypeORM migration CLI 封装） |
| `guide/` | MCP 服务接入文档（mcp-admin.md、mcp-public.md） |
| `locales/` | 国际化文件（en.json、zh-CN.json、zh-TW.json） |
| `openspec/` | OpenSpec 变更管理（已有 10 个变更提案） |
| `.cursor/` | Cursor IDE 配置 |

#### .cursor 配置详解

- `mcp.json` - MCP 服务器配置（连接 mcp-public 和 mcp-admin）
- `skills/` - 4 个自动化技能
  - `openspec-propose` - 创建变更提案
  - `openspec-apply-change` - 实施变更任务
  - `openspec-archive-change` - 归档完成的变更
  - `openspec-explore` - 探索模式（思考伙伴）
- `rules/` - 代码规范
  - `shared-data-model.mdc` - 共享数据模型规范
  - `web-admin-form.mdc` - 前端表单规范
- `commands/` - 自定义命令（/opsx-explore、/opsx-propose 等）

---

## 数据流架构

```
┌─────────────┐     ┌─────────────┐
│  web-admin  │────▶│ server-admin│
│  (Next.js)  │     │  (NestJS)   │──▶ MySQL
└─────────────┘     └─────────────┘        │
                          │                │
                     ┌────┴────┐           │
                     ▼         ▼           │
               ┌─────────┐ ┌─────────┐    │
               │mcp-admin│ │mcp-public│   │
               │(AI工具) │ │(只读查询)│    │
               └─────────┘ └─────────┘    │
                          │                │
                     ┌────┴────┐           │
                     ▼         ▼           │
               ┌─────────┐ ┌─────────┐    │
               │ AI Agent│ │Cursor/  │    │
               │         │ │Claude   │    │
               └─────────┘ └─────────┘
```

---

## 开发工作流

### 启动开发环境

```bash
# 后端服务
pnpm dev:server-admin    # 启动管理端 API
pnpm dev:mcp-public      # 启动公开 MCP 服务
pnpm dev:mcp-admin       # 启动管理端 MCP 服务
pnpm dev:mcp-skills      # 启动技能 MCP 服务

# 前端
pnpm dev:web-admin       # 启动管理端前端
```

### 数据库迁移

```bash
pnpm migration:generate <module> <name>  # 生成迁移
pnpm migration:create <module> <name>    # 创建空迁移
pnpm migration:run                       # 执行迁移
pnpm migration:revert                    # 回滚迁移
pnpm migration:show                      # 显示迁移状态
```

### Docker 构建

```bash
pnpm docker:build:server-admin   # 构建后端镜像
pnpm docker:build:web-admin      # 构建前端镜像
pnpm docker:build:all            # 构建所有镜像
```

### 代码规范

```bash
pnpm lint     # Biome 检查
pnpm format   # Biome 格式化
```

---

## MCP 服务使用

### 公开服务（无需认证）

```json
{
  "mcpServers": {
    "rwa-public": {
      "url": "https://mcp.prime.antalpha.com/mcp"
    }
  }
}
```

### 管理服务（需 API Key）

```json
{
  "mcpServers": {
    "rwa-admin": {
      "url": "https://mcp-admin.prime.antalpha.com/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

---

## 关键设计原则

1. **Schema 单一数据源**：所有 Zod Schema 定义在 `libs/types`，前后端共用
2. **DTO 分离**：使用 `createI18nZodDto` 包装 Schema 为 DTO，支持 i18n
3. **Entity 隔离**：TypeORM Entity 仅用于数据库，不暴露给 API
4. **模块化设计**：每个业务域独立为一个 NestJS 模块
5. **配置外部化**：使用 Nacos 配置中心，支持动态配置
6. **AI 就绪**：通过 MCP 服务暴露业务能力给 AI Agent

---

## 项目特色

- **RWA 领域**：专注于真实世界资产的数字化管理
- **AI 集成**：深度集成 MCP，支持 AI Agent 自动化操作
- **国际化**：完整的 i18n 支持（中/英/繁体）
- **规范驱动**：使用 OpenSpec 进行变更管理
- **类型安全**：Zod Schema + TypeScript 端到端类型安全
