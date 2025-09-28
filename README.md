# FastBuild - 低代码表单平台

**FastBuild** 是一个基于现代技术栈构建的类型驱动、高性能、可扩展的低代码表单平台。

## 🎯 核心特性

- **类型驱动**: 以 Zod Schema 为单一事实来源，实现端到端类型安全
- **tRPC 统一**: 弃用 REST API，统一使用类型安全的 tRPC 架构
- **安全第一**: 内置速率限制、输入验证、错误处理等安全机制
- **高性能**: 优化的数据库查询、缓存策略和前端状态管理
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

## 📚 文档

- 📖 [快速开始指南](docs/QUICKSTART.md)
- 🔧 [开发指南](docs/DEVELOPMENT.md)
- 📡 [API 规范文档](docs/API-specs.md)
- 📋 [更新日志](docs/CHANGELOG.md)

## 📦 项目结构

```
fastbuild/
├── apps/web/                 # Next.js 主应用
│   ├── app/                  # App Router 页面
│   ├── trpc/                 # tRPC 客户端
│   ├── components/          # 应用组件
│   └── lib/                 # 工具库
├── packages/
│   ├── api/                 # tRPC 服务端
│   ├── ui/                  # 共享 shadcn/ui 组件库
│   ├── database/            # Prisma 数据库客户端
│   ├── schema-compiler/     # 核心 Schema 转换引擎
│   ├── typescript-config/   # 共享 TypeScript 配置
│   └── eslint-config/       # 共享 ESLint 配置
├── prisma/                  # 数据库模式定义
├── tests/                   # 测试文件
├── docs/                    # 项目文档
└── docker-compose.yml       # PostgreSQL 容器配置
```

## 🛠️ 开发命令

### 根目录命令
```bash
pnpm dev              # 启动所有开发服务器
pnpm build            # 构建所有包和应用
pnpm lint             # 代码检查
pnpm format           # 代码格式化
pnpm test             # 运行测试

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
pnpm lint:fix         # 修复 ESLint 问题
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
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  forms     Form[]
  sessions  Session[]
}

model Form {
  id          String   @id @default(cuid())
  name        String
  metadata    Json
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  submissions Submission[]
}

model Submission {
  id        String   @id @default(cuid())
  formId    String
  data      Json
  createdAt DateTime @default(now())
  form      Form     @relation(fields: [formId], references: [id])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}
```

## 🔧 技术栈

### 前端技术
- **Next.js 15**: 全栈框架，支持 App Router
- **React 19**: UI 框架
- **TypeScript**: 全栈类型安全
- **shadcn/ui**: 可自定义的组件库
- **Tailwind CSS v4**: 现代化样式框架
- **React Hook Form**: 高性能表单状态管理
- **Zod**: 数据验证和类型定义
- **@tanstack/react-query**: 服务器状态管理

### 后端技术
- **tRPC v10**: 类型安全的 RPC 框架
- **PostgreSQL**: 主数据库
- **Prisma**: 类型安全的 ORM
- **JWT**: 认证令牌
- **Docker**: 容器化开发环境

### 开发工具
- **Vitest**: 单元测试框架
- **Playwright**: E2E 测试
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Turbo**: 构建系统

## 🔒 安全特性

### API 安全
- **tRPC 类型安全**: 端到端类型安全
- **速率限制**: 防止 API 滥用
- **输入验证**: Zod 模式验证
- **JWT 认证**: 安全的令牌认证
- **权限控制**: 基于角色的访问控制

### 数据安全
- **SQL 注入防护**: Prisma ORM
- **XSS 防护**: 输入清理和转义
- **CSRF 防护**: 同源策略和令牌验证
- **密码安全**: bcrypt 哈希加密

## 📋 当前实现状态

✅ **已完成**:
- Monorepo 结构和 pnpm workspace 配置
- tRPC 统一 API 架构
- 完整的认证和授权系统
- shadcn/ui 组件库集成
- Prisma + PostgreSQL 数据库配置
- 核心 Schema 编译器
- 速率限制和输入验证
- React Error Boundary
- 错误监控和日志记录
- Docker 容器化
- 完整的测试基础设施

✅ **API 端点**:
- 认证路由 (`auth`): 登录、注册、用户信息、令牌刷新
- 表单路由 (`form`): CRUD 操作、列表查询
- 表单提交路由 (`submission`): 提交和查询
- 健康检查路由 (`health`): 系统状态监控

✅ **前端组件**:
- 动态表单渲染器
- 表单提交处理器
- 认证状态管理
- 错误边界组件
- 响应式 UI 设计

🔄 **进行中**:
- 高级表单字段类型
- 复杂的表单验证规则
- 表单模板系统
- 工作流自动化

📋 **下一步计划**:
- 高级分析和报表
- 移动端优化
- 集成第三方服务
- 企业级功能

## 🎯 核心功能

### 1. 认证系统
- 用户注册和登录
- JWT 令牌认证
- 令牌自动刷新
- 权限管理 (USER/ADMIN)
- 会话管理

### 2. 表单管理
- 动态表单创建和编辑
- 多种字段类型支持
- 表单验证和条件逻辑
- 表单模板和复用
- 版本控制

### 3. 数据收集
- 表单提交和验证
- 提交历史记录
- 数据导出功能
- 实时数据统计
- 数据可视化

### 4. 安全机制
- 速率限制保护
- 输入验证和清理
- SQL 注入防护
- XSS 和 CSRF 防护
- 安全的密码存储

## 📊 性能优化

### 数据库优化
- 索引优化
- 查询缓存
- 连接池管理
- 分页查询

### 前端优化
- 组件懒加载
- 图片优化
- 缓存策略
- 虚拟滚动

### API 优化
- 批量请求
- 数据预取
- 响应缓存
- 错误重试

## 🧪 测试

### 测试覆盖
- 单元测试 (Vitest)
- 集成测试 (tRPC)
- E2E 测试 (Playwright)
- 性能测试
- 安全测试

### 测试命令
```bash
# 运行所有测试
pnpm test

# 运行特定测试类型
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:performance
```

## 📄 许可证

私有许可证 - 详见项目配置文件。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。请参阅 [开发指南](docs/DEVELOPMENT.md) 了解详细信息。

## 📞 支持

如有问题或建议，请：
1. 查看 [文档](docs/)
2. 搜索现有的 Issue
3. 提交新的 Issue
4. 联系开发团队

---

**开始构建您的表单应用吧！** 🚀
