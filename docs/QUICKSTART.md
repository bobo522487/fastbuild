# FastBuild 快速开始指南

## 概述

FastBuild 是一个现代化的低代码表单平台，基于 Next.js 15 和 tRPC 构建。本指南将帮助您快速上手并开始使用 FastBuild。

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

### 创建表单

1. 访问 `http://localhost:3000/demo-simple`
2. 填写表单字段
3. 点击提交按钮
4. 查看提交结果

### 管理表单

1. 访问 `http://localhost:3000/demo/[formId]`
2. 创建、编辑或删除表单
3. 查看表单提交记录

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
```

### 表单管理

```typescript
// 创建表单
const form = await trpc.form.create.mutate({
  name: 'Contact Form',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'name',
        name: 'name',
        type: 'text',
        label: 'Name',
        required: true,
      },
    ],
  },
});

// 获取表单列表
const { data: forms } = trpc.form.list.useQuery({
  limit: 10,
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
  },
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
pnpm typecheck        # TypeScript 类型检查
pnpm lint             # 代码质量检查
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

## 下一步

- 阅读 [完整 API 规范文档](./API-specs.md)
- 查看 [开发指南](./DEVELOPMENT.md)
- 探索演示页面
- 尝试创建自定义表单
- 贡献代码到项目

---

祝您使用愉快！🚀