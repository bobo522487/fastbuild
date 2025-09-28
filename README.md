# FastBuild - 低代码表单平台

**FastBuild** 是一个基于现代技术栈构建的类型驱动、高性能、可扩展的低代码表单平台。

## 🎯 核心特性

- **类型驱动**: 以 Zod Schema 为单一事实来源，实现端到端类型安全
- **拖拽设计**: 可视化表单设计器，支持字段拖拽和属性配置
- **动态渲染**: 运行时自动渲染表单 UI，支持条件显示和验证
- **全栈安全**: TypeScript + Zod + Prisma 提供完整的类型安全保障
- **现代架构**: Next.js 15 + shadcn/ui + Tailwind CSS v4

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm 包管理器
- Docker 和 Docker Compose

### 安装和设置

```bash
# 克隆项目
git clone <repository-url>
cd fastbuild

# 安装依赖
pnpm install

# 启动数据库
docker compose up -d

# 运行数据库迁移
pnpm db:push

# 生成 Prisma 客户端
pnpm db:generate

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 查看应用。

## 📦 项目结构

```
fastbuild/
├── apps/web/                 # Next.js 主应用
│   ├── app/                  # App Router 页面
│   ├── app/api/             # API 路由
│   └── components/          # 应用特定组件
├── packages/
│   ├── ui/                  # 共享 shadcn/ui 组件库
│   ├── database/            # Prisma 数据库客户端
│   ├── schema-compiler/     # 核心 Schema 转换引擎
│   ├── typescript-config/   # 共享 TypeScript 配置
│   └── eslint-config/       # 共享 ESLint 配置
├── prisma/                  # 数据库模式定义
└── docker-compose.yml       # PostgreSQL 容器配置
```

## 🛠️ 开发命令

### 根目录命令
```bash
pnpm dev              # 启动所有开发服务器
pnpm build            # 构建所有包和应用
pnpm lint             # 代码检查
pnpm format           # 代码格式化

# 数据库操作
pnpm db:generate      # 生成 Prisma 客户端
pnpm db:push          # 推送模式更改到数据库
pnpm db:migrate       # 创建数据库迁移
pnpm db:studio        # 打开 Prisma Studio

# Docker 操作
docker compose up -d  # 启动 PostgreSQL 数据库
docker compose down    # 停止数据库
```

### 应用特定命令 (apps/web)
```bash
cd apps/web
pnpm dev              # 启动 Next.js 开发服务器
pnpm build            # 构建应用
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查
```

## 🎨 UI 组件管理

项目使用 shadcn/ui 作为组件库：

```bash
# 添加新组件到 UI 库
pnpm dlx shadcn@latest add button -c apps/web

# 组件存储在 packages/ui/src/components/
# 从 @workspace/ui/components/button 导入
```

## 🗄️ 数据库配置

- PostgreSQL 数据库运行在 Docker 容器中
- 使用 Prisma 作为 ORM，提供类型安全的数据库访问
- 数据库连接配置在 `.env` 文件中
- 支持自动迁移和模式同步

### 数据库模式
```prisma
model Form {
  id        String   @id @default(cuid())
  name      String
  metadata  Json     // 表单定义元数据
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  submissions Submission[]
}

model Submission {
  id        String   @id @default(cuid())
  formId    String
  data      Json     // 提交的表单数据
  createdAt DateTime @default(now())
  form      Form     @relation(fields: [formId], references: [id])
}
```

## 🔧 技术栈

### 前端技术
- **Next.js 15**: 全栈框架，支持 App Router
- **TypeScript**: 全栈类型安全
- **shadcn/ui**: 可自定义的组件库
- **Tailwind CSS v4**: 现代化样式框架
- **React Hook Form**: 高性能表单状态管理
- **Zod**: 数据验证和类型定义
- **dnd-kit**: 拖拽功能库

### 后端技术
- **Next.js API Routes**: 后端 API
- **PostgreSQL**: 主数据库
- **Prisma**: 类型安全的 ORM
- **Docker**: 容器化开发环境

### 状态管理
- **@tanstack/react-query**: 服务器状态管理
- **Zustand**: 轻量级全局状态管理

## 📋 当前实现状态

✅ **已完成**:
- Monorepo 结构和 pnpm workspace 配置
- shadcn/ui 组件库集成
- Prisma + PostgreSQL 数据库配置
- 核心 Schema 编译器
- 基础 REST API 路由
- Docker 容器化

🔄 **进行中**:
- 表单设计器 UI 实现
- 动态表单渲染器
- 高级字段类型和验证
- 条件字段逻辑

📋 **下一步计划**:
- 完善拖拽表单设计器
- 实现完整的动态表单渲染系统
- 添加综合验证规则
- 实现表单版本控制

## 📄 许可证

私有许可证 - 详见项目配置文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。
