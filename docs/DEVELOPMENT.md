# FastBuild 开发指南

## 项目概述

FastBuild 是一个类型驱动的低代码表单平台，采用 **Schema-as-Truth** 设计理念。基于 Next.js 15 和纯 tRPC 架构，提供端到端的类型安全和完整的性能监控体系。

## 技术栈

### 核心框架
- **Next.js 15**: 全栈框架，使用 App Router
- **TypeScript 5.7**: 严格类型检查
- **pnpm 10.4**: 包管理器，支持 monorepo
- **Turbo 2.5**: 高性能构建系统

### 数据层
- **PostgreSQL**: 主数据库
- **Prisma 6.16**: 类型安全的 ORM（最新版本，内置 metrics）
- **Docker**: 容器化数据库
- **Auth.js PostgreSQL Adapter**: 会话和用户数据存储

### API 层
- **tRPC 11.0**: 类型安全的 RPC 框架（统一 API 架构）
- **Zod 4.1**: 数据验证和模式定义
- **SuperJSON 2.2**: 优化的 JSON 序列化

### 前端层
- **React 18**: UI 框架
- **Tailwind CSS v4**: 现代样式框架
- **shadcn/ui 3.3**: 高质量组件库
- **@tanstack/react-query**: 服务器状态管理
- **React Hook Form**: 表单状态管理
- **@hookform/resolvers**: 表单验证集成
- **Auth.js 5.0**: 认证系统（NextAuth.js 最新版本）

### 监控系统
- **完整监控体系**: 性能、错误、用户行为追踪
- **tRPC 监控路由**: 统一的数据收集和查询接口
- **实时分析**: 支持分页、过滤、聚合统计

### 工具链
- **Vitest 3.2**: 现代测试框架（最新版本）
- **Playwright 1.55**: E2E 测试
- **React Testing Library**: React 组件测试
- **ESLint 9.32**: 代码质量检查
- **Prettier 3.6**: 代码格式化

## 架构设计

### 核心设计理念

**Schema-as-Truth**：所有表单数据基于 Zod Schema 定义，实现端到端类型安全。

**统一 tRPC 架构**：所有 API 端点通过 tRPC 路由实现，确保类型安全的一致性。

### 数据流架构

```
FormMetadata → SchemaCompiler → Zod Schema → DynamicFormRenderer → FormSubmission
```

1. **设计时**：表单设计器生成 FormMetadata
2. **编译时**：Schema 编译器转换为可执行的 Zod Schema
3. **运行时**：动态表单渲染器使用 Schema + React Hook Form
4. **持久化**：表单存储在 `Form` 表，提交存储在 `Submission` 表

### API 架构

基于 `specs/002-schema-driven-runtime-mvp/contracts/api-types.ts` 的类型定义：

- **FormRouter**: 表单 CRUD 操作，验证和编译
- **SubmissionRouter**: 表单提交管理，批量处理
- **SchemaRouter**: Schema 编译、验证和统计
- **MonitoringRouter**: 性能监控、错误追踪
- **AuthRouter**: 用户认证和授权
- **HealthRouter**: 系统健康检查

### 监控系统架构

完整的监控体系，涵盖：

- **性能监控**: React 组件性能、API 响应时间
- **错误追踪**: 前端错误、后端异常、严重错误处理
- **用户行为**: 会话追踪、操作记录、路径分析
- **统计分析**: 分页查询、聚合分析、实时报表

## 项目结构

```
fastbuild/
├── apps/web/                    # Next.js 应用
│   ├── app/                     # App Router 页面
│   │   ├── api/trpc/[trpc]/     # tRPC API 入口
│   │   ├── admin/monitoring/    # 监控管理界面
│   │   ├── demo*/               # 演示页面
│   │   └── page.tsx             # 首页
│   ├── components/              # 应用组件
│   │   ├── performance/         # 性能优化组件
│   │   ├── accessibility/       # 可访问性组件
│   │   ├── forms/              # 表单相关组件
│   │   └── providers.tsx       # 全局提供者
│   ├── lib/                    # 工具库
│   │   ├── monitoring-service.ts # 监控服务
│   │   └── monitoring.ts       # 监控工具
│   ├── trpc/                   # tRPC 客户端
│   │   └── provider.tsx        # tRPC Provider
│   └── package.json
├── packages/
│   ├── api/                    # tRPC 服务端
│   │   ├── src/trpc/           # tRPC 路由
│   │   │   ├── routers/        # 路由定义
│   │   │   │   ├── monitoring.ts # 监控系统（495行）
│   │   │   │   ├── form.ts      # 表单管理
│   │   │   │   ├── submission.ts # 提交管理
│   │   │   │   ├── schema.ts    # Schema 编译
│   │   │   │   ├── auth.ts      # 认证授权（Auth.js 集成）
│   │   │   │   └── health.ts    # 健康检查
│   │   │   ├── context.ts       # tRPC 上下文（支持 Auth.js 和 JWT）
│   │   │   ├── middleware/      # 中间件（速率限制等）
│   │   │   └── trpc.ts          # tRPC 配置
│   │   └── package.json
│   ├── database/               # 数据库包（Prisma 6.16）
│   ├── schema-compiler/        # 模式编译器
│   ├── ui/                     # shadcn/ui 组件库
│   ├── typescript-config/      # TypeScript 配置
│   └── eslint-config/          # ESLint 配置
├── prisma/                     # 数据库模式（支持 Auth.js）
├── tests/                      # 全面的测试体系
│   ├── e2e/                    # E2E 测试（Playwright）
│   ├── integration/            # 集成测试
│   ├── unit/                   # 单元测试
│   ├── performance/            # 性能测试
│   ├── accessibility/          # 无障碍测试
│   ├── setup.ts                # 测试配置
│   └── README.md               # 测试策略文档
├── specs/                      # 规格文档
└── package.json
```

## 开发流程

### 环境设置

**前置要求**：
- Node.js >= 20
- pnpm 包管理器
- Docker 和 Docker Compose

**安装步骤**：
```bash
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

### 开发工作流

1. **创建分支**：`git checkout -b feature/your-feature`
2. **开发**：`pnpm dev` + `pnpm typecheck`
3. **测试**：`pnpm test` 或运行特定测试类型
4. **提交**：`git commit -m "feat: add new feature"`

### 测试策略

**全面测试体系**：
- **单元测试** (`pnpm test:unit`)：核心业务逻辑，覆盖率目标 80%+
- **集成测试** (`pnpm test:integration`)：tRPC 路由和数据库集成测试
- **性能测试** (`pnpm test:performance`)：表单渲染和API性能基准测试
- **合约测试** (`pnpm test:contracts`)：API 类型验证
- **React 组件测试** (`pnpm test:react`)：React 组件和无障碍测试
- **E2E 测试** (`pnpm test:e2e`)：端到端用户流程测试，支持 UI 模式

**测试工具**：
- **Vitest 3.2**: 现代化测试框架，支持快照、覆盖率、UI 模式
- **React Testing Library**: React 组件测试最佳实践
- **Playwright 1.55**: 跨浏览器 E2E 测试，支持可视化调试
- **测试覆盖率**: @vitest/coverage-v8 替代弃用的 @vitest/coverage-c8

### 数据库操作

```bash
pnpm db:push          # 推送模式变更
pnpm db:generate      # 生成客户端
pnpm db:studio        # 打开 Prisma Studio
```

## 核心特性

### 监控系统

完整的监控体系（`packages/api/src/trpc/routers/monitoring.ts` - 495行实现）：

**核心功能**：
- **事件追踪**: 性能、错误、用户行为、API调用事件
- **批量处理**: 高效的监控数据收集和处理机制
- **实时查询**: 支持分页、过滤、排序的监控数据查询
- **统计分析**: 按类型、时间、用户维度的聚合分析
- **Prisma集成**: 利用Prisma 6.16的内置metrics功能

**关键接口**：
- `submitEvents`: 批量提交监控事件（使用Prisma 6.16优化）
- `getEvents`: 查询监控事件（支持分页、过滤）
- `getStats`: 获取监控统计信息
- `getPerformanceMetrics`: 获取性能指标
- `getCriticalErrors`: 获取严重错误（管理员）
- `resolveError`: 标记错误为已解决

**Prisma 6.16性能优化**：
- **Metrics收集**: 内置查询性能指标收集
- **批量操作优化**: 优化的监控数据批量插入
- **复合索引**: 针对监控查询的复合索引
- **Native Distinct**: 数据库层面的去重操作优化

### 性能优化组件

专门的性能优化组件体系：

**核心组件**：
- **PerformanceMonitor**: React 组件性能监控
- **OptimizedFormRenderer**: 优化的表单渲染器
- **LazyFieldComponents**: 懒加载字段组件系统
- **PerformanceDashboard**: 性能监控仪表板

**优化策略**：
- **懒加载**: 按需加载表单字段组件
- **虚拟化**: 大列表虚拟滚动
- **缓存策略**: 智能缓存和去重
- **批量处理**: 监控数据批量提交

### Schema-as-Truth 设计

基于 `specs/002-schema-driven-runtime-mvp/contracts/api-types.ts` 的类型定义：

**数据流**：
1. **FormMetadata** → **SchemaCompiler** → **Zod Schema**
2. **Zod Schema** → **DynamicFormRenderer** → **FormSubmission**
3. **SchemaCompiler**: 安全的元数据到可执行schema转换

**类型安全**：
- 端到端的 TypeScript 类型安全
- Zod Schema 验证
- tRPC 路由类型推断
- API 合约测试

### 认证和授权系统

**Auth.js 集成**：
- **NextAuth.js v5.0**: 最新版本的认证系统
- **多种认证方式**: 用户名密码、OAuth（Google、GitHub）
- **会话管理**: JWT + PostgreSQL 会话存储
- **类型安全**: 完整的 TypeScript 类型定义
- **向后兼容**: 支持现有业务逻辑和用户数据模型

**认证特性**：
- **双认证模式**: Auth.js Session + 传统 JWT
- **角色管理**: ADMIN/USER 角色权限控制
- **会话安全**: 安全的会话管理和令牌刷新
- **OAuth 集成**: Google、GitHub 第三方登录
- **密码管理**: 安全的密码哈希和重置流程

### 错误处理机制

**统一的错误处理**：
- tRPC 内置错误处理
- React Error Boundary
- 监控系统集成
- 严重错误自动上报和处理

**错误追踪**：
- 自动错误捕获和分类
- 错误解决工作流
- 实时错误通知
- 错误统计分析

## 开发规范

### 代码风格
- 使用 ESLint + Prettier
- 严格的 TypeScript 配置
- 避免使用 `any` 类型
- 函数组件模式

### 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更改
style: 代码格式化
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 测试要求
- 核心业务逻辑覆盖率 > 90%
- tRPC 路由覆盖率 > 80%
- 关键组件覆盖率 > 70%
- React 组件覆盖率 > 80%
- 性能基准测试（表单渲染 < 100ms，API 响应 < 500ms）
- E2E 测试覆盖关键用户流程 100%
- 无障碍测试符合 WCAG 2.1 AA 标准

## 部署指南

### 构建流程
```bash
pnpm build           # 构建所有包
pnpm test           # 运行测试
pnpm typecheck      # 类型检查
```

### 部署步骤
1. 代码审查和测试
2. 构建和优化
3. 数据库迁移
4. 部署到生产环境
5. 监控验证

### 环境配置
- 数据库连接配置
- 认证和加密密钥
- 监控和日志配置
- 性能和安全设置