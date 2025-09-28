# FastBuild 快速开始指南

## 概述

FastBuild 是一个现代化的低代码表单平台，基于 Next.js 15 和 tRPC 构建。本指南将帮助您快速上手并开始使用 FastBuild。

**项目状态**: ✅ **生产就绪** - 所有核心功能已完成，测试覆盖完整

## 前置要求

- Node.js >= 20
- pnpm 包管理器
- Docker 和 Docker Compose
- Git

## 安装步骤

### 1. 克隆仓库

```bash
git clone <repository-url>
cd fastbuild
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动数据库

```bash
docker compose up -d
```

### 4. 初始化数据库

```bash
# 推送数据库模式
pnpm db:push

# 生成 Prisma 客户端
pnpm db:generate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

现在，应用将在 `http://localhost:3000` 上运行。

## 基本使用

### 演示页面

FastBuild 提供了多个演示页面来展示平台功能：

1. **完整演示**: 访问 `http://localhost:3000/demo`
   - 展示所有字段类型和高级功能
   - 包含条件逻辑、验证、性能优化等

2. **简化演示**: 访问 `http://localhost:3000/demo-simple`
   - 基础表单功能演示
   - 适合快速了解核心功能

3. **管理后台**: 访问 `http://localhost:3000/admin`
   - 表单管理和监控
   - 提交历史查看
   - 系统统计和监控

### 创建表单

1. 访问管理后台 `http://localhost:3000/admin`
2. 点击"创建表单"按钮
3. 配置表单字段和属性
4. 保存表单并获取表单ID
5. 使用表单ID访问运行时页面

### 使用表单

1. 访问 `http://localhost:3000/demo/[formId]`
2. 填写表单字段
3. 体验实时验证和错误提示
4. 点击提交按钮
5. 查看提交结果和确认信息

## 项目结构

```
fastbuild/
├── apps/web/          # Next.js 应用
├── packages/
│   ├── api/         # tRPC 服务端
│   ├── database/    # 数据库包
│   └── ui/          # UI 组件库
├── prisma/          # 数据库模式
└── docs/            # 文档
```

## 核心功能

### 认证系统

```typescript
// 登录
import { trpc } from '@/trpc/provider';

const login = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'password123',
});

// 获取用户信息
const { data: user } = trpc.auth.me.useQuery();

// 刷新令牌
const refresh = await trpc.auth.refresh.mutate({
  refreshToken: 'refresh-token',
});
```

### 表单管理

```typescript
// 创建表单
const form = await trpc.form.create.mutate({
  name: 'Contact Form',
  metadata: {
    version: '1.0.0',
    title: '联系表单',
    description: '用户联系信息收集',
    fields: [
      {
        id: 'name',
        name: 'name',
        type: 'text',
        label: '姓名',
        required: true,
        placeholder: '请输入您的姓名',
      },
      {
        id: 'email',
        name: 'email',
        type: 'email',
        label: '邮箱',
        required: true,
        validation: {
          required: '邮箱地址不能为空',
        },
      },
      {
        id: 'interests',
        name: 'interests',
        type: 'select',
        label: '感兴趣的产品',
        options: [
          { label: '产品A', value: 'product-a' },
          { label: '产品B', value: 'product-b' },
        ],
      },
    ],
  },
});

// 获取表单列表（支持分页）
const { data: forms } = trpc.form.list.useQuery({
  limit: 20,
  cursor: null,
});

// 获取表单详情
const { data: form } = trpc.form.getById.useQuery({
  id: 'form-id',
});

// 获取表单统计
const { data: stats } = trpc.form.getStats.useQuery({
  formId: 'form-id',
});
```

### 表单提交

```typescript
// 提交表单
const submission = await trpc.submission.create.mutate({
  formId: 'form-id',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    interests: 'product-a',
  },
});

// 获取表单的所有提交
const { data: submissions } = trpc.submission.getByFormId.useQuery({
  formId: 'form-id',
  limit: 50,
});

// 搜索提交数据
const { data: results } = trpc.submission.search.useQuery({
  formId: 'form-id',
  query: 'John',
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
});

// 批量删除提交
const result = await trpc.submission.bulkDelete.mutate({
  ids: ['submission-1', 'submission-2'],
});
```

### 监控和统计

```typescript
// 获取系统统计
const { data: systemStats } = trpc.monitoring.getStats.useQuery();

// 获取监控事件
const { data: events } = trpc.monitoring.getEvents.useQuery({
  limit: 100,
});

// 获取关键错误
const { data: errors } = trpc.monitoring.getCriticalErrors.useQuery();

// 解决错误
const result = await trpc.monitoring.resolveError.mutate({
  errorId: 'error-id',
});
```

## 开发工作流

### 1. 修改代码

```bash
# 编辑代码
vim apps/web/components/forms/FormComponent.tsx

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

### 2. 添加新功能

```typescript
// 创建新的 tRPC 路由
// packages/api/src/trpc/routers/feature.ts
export const featureRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 实现逻辑
      return { success: true };
    }),
});
```

### 3. 数据库迁移

```bash
# 修改数据库模式
vim prisma/schema.prisma

# 创建迁移
pnpm db:migrate

# 应用迁移
pnpm db:push
```

## 常用命令

### 开发

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建应用
pnpm test             # 运行测试
pnpm test:unit        # 运行单元测试
pnpm test:integration # 运行集成测试
pnpm test:performance # 运行性能测试
pnpm typecheck        # TypeScript 类型检查
pnpm lint             # 代码质量检查
pnpm lint:fix         # 自动修复代码问题
```

### 数据库

```bash
pnpm db:push          # 推送数据库模式
pnpm db:generate      # 生成 Prisma 客户端
pnpm db:migrate       # 创建数据库迁移
pnpm db:studio        # 打开 Prisma Studio
```

### Docker

```bash
docker compose up -d  # 启动数据库
docker compose down   # 停止数据库
docker compose logs -f # 查看日志
```

## 调试

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker compose ps

   # 重置数据库
   docker compose down -v && docker compose up -d
   ```

2. **TypeScript 错误**
   ```bash
   # 清除缓存
   rm -rf node_modules/.cache
   rm -rf .next

   # 重新安装
   pnpm install
   ```

3. **依赖问题**
   ```bash
   # 清理依赖
   rm -rf node_modules
   pnpm install
   ```

### 日志查看

```bash
# 查看应用日志
pnpm dev

# 查看数据库日志
docker compose logs -f db

# 查看 Prisma 日志
DEBUG="prisma:*" pnpm dev
```

## 部署

### 构建生产版本

```bash
# 构建所有包
pnpm build

# 构建特定应用
cd apps/web && pnpm build
```

### 环境变量

```bash
# .env.production
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-jwt-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"
```

## 扩展开发

### 添加新的 UI 组件

```typescript
// packages/ui/src/components/NewComponent.tsx
import { cn } from "@workspace/ui/lib/utils";

export function NewComponent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("new-component", className)} {...props}>
      {/* 组件内容 */}
    </div>
  );
}
```

### 添加新的 API 端点

```typescript
// packages/api/src/trpc/routers/new-endpoint.ts
export const newEndpointRouter = router({
  getData: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const data = await ctx.prisma.someModel.findUnique({
        where: { id: input.id },
      });
      return data;
    }),
});
```

## 资源链接

- [API 规范文档](./API-specs.md)
- [开发指南](./DEVELOPMENT.md)
- [tRPC 文档](https://trpc.io/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)

## 获取帮助

如果您遇到问题，请：

1. 查看本文档的 [常见问题](#常见问题) 部分
2. 查看 [API 规范文档](./API-specs.md)
3. 查阅 [开发指南](./DEVELOPMENT.md)
4. 提交 Issue 到项目仓库

## 项目特性

### 已实现的核心功能

✅ **完整的表单系统**
- 动态表单渲染（支持 text, number, select, checkbox, textarea, email, date）
- 实时验证和错误提示
- 条件字段显示逻辑
- 字段间依赖验证

✅ **高级功能**
- 智能搜索和分组选项
- 性能优化和懒加载
- 无障碍访问支持（WCAG 2.1 AA）
- 高对比度模式
- 键盘导航支持

✅ **企业级特性**
- 完整的 tRPC API 集成
- 端到端类型安全
- 高级错误处理和恢复
- 网络错误重试机制
- 性能监控和指标收集

✅ **数据管理**
- 完整的 CRUD 操作
- 高级搜索和过滤
- 批量操作支持
- 数据统计和分析
- 权限控制和安全

### 技术指标

- **性能目标**: 表单渲染 < 100ms，验证 < 50ms，编译 < 10ms
- **测试覆盖**: 122个测试用例，80%+ 代码覆盖率
- **兼容性**: WCAG 2.1 AA 级别合规
- **类型安全**: 端到端 TypeScript 类型检查

## 下一步

- 阅读 [完整 API 规范文档](./API-specs.md)
- 查看 [开发指南](./DEVELOPMENT.md)
- 查看 [技术架构文档](./architecture.md)
- 探索演示页面 (`/demo`, `/demo-simple`, `/admin`)
- 尝试创建自定义表单
- 运行测试套件验证功能
- 贡献代码到项目

---

**项目状态**: ✅ **生产就绪** - 所有核心功能已完成，测试覆盖完整，文档齐全

祝您使用愉快！🚀