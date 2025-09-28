# tRPC 基础设施快速开始指南

## 概述

本指南将帮助您快速设置和开始使用 FastBuild 的 tRPC 基础设施。tRPC 提供了端到端的类型安全 API 层，与现有的 Zod Schema 驱动架构完美集成。

## 前置条件

确保您的开发环境已满足以下要求：

```bash
# 检查 Node.js 版本
node --version  # 需要 >= 20

# 检查 pnpm 是否已安装
pnpm --version

# 检查 Docker 是否运行
docker --version
docker compose --version
```

## 快速设置

### 1. 环境初始化

```bash
# 进入项目根目录
cd /home/bobo/project/fastbuild

# 安装依赖
pnpm install

# 启动 PostgreSQL 数据库
docker compose up -d

# 等待数据库启动完成
sleep 5

# 推送数据库 schema
pnpm db:push

# 生成 Prisma 客户端
pnpm db:generate
```

### 2. tRPC 基础设施设置

```bash
# 创建 tRPC 路由目录结构
mkdir -p packages/api/src/routers
mkdir -p packages/api/src/procedures
mkdir -p packages/api/src/context

# 创建 tRPC 配置文件
touch packages/api/src/trpc.ts
touch packages/api/src/context.ts
```

### 3. 基础配置文件

**packages/api/src/trpc.ts**
```typescript
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export const t = initTRPC.create({
  transformer: superjson,
  errorFormatter: ({ shape }) => ({
    ...shape,
    data: {
      ...shape.data,
      code: shape.data?.code || 'INTERNAL_SERVER_ERROR',
    },
  }),
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ next, ctx }) => {
  // 这里将添加认证中间件
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // 从上下文获取用户信息
    },
  });
});
```

**packages/api/src/context.ts**
```typescript
import { prisma } from '@workspace/database';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  return {
    req,
    res,
    prisma,
    // 这里将添加用户认证逻辑
    user: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### 4. 实现第一个路由器

创建 `/specs/001-trpc/contracts/` 中定义的表单路由器：

**packages/api/src/routers/form-router.ts**
```typescript
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { formRouterContracts } from '@workspace/contracts';

export const formRouter = router({
  // 获取表单列表
  list: publicProcedure
    .input(formRouterContracts.list.input)
    .output(formRouterContracts.list.output)
    .query(async ({ input, ctx }) => {
      const { limit, cursor, search, createdBy } = input;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }),
        ...(createdBy && { createdBy }),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.form.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.form.count({ where }),
      ]);

      const hasNext = items.length > limit;
      if (hasNext) items.pop();

      return {
        items,
        total,
        page: Math.floor((cursor ? parseInt(cursor) : 0) / limit) + 1,
        pageSize: limit,
        hasNext,
      };
    }),

  // 获取表单详情
  getById: publicProcedure
    .input(formRouterContracts.getById.input)
    .output(formRouterContracts.getById.output)
    .query(async ({ input, ctx }) => {
      const form = await ctx.prisma.form.findUnique({
        where: { id: input.id },
        include: {
          creator: true,
        },
      });

      if (!form) {
        throw new Error('Form not found');
      }

      return form;
    }),

  // 创建表单
  create: protectedProcedure
    .input(formRouterContracts.create.input)
    .output(formRouterContracts.create.output)
    .mutation(async ({ input, ctx }) => {
      const { name, description, metadata } = input;

      const form = await ctx.prisma.form.create({
        data: {
          name,
          description,
          metadata,
          createdBy: ctx.user.id,
        },
        include: {
          creator: true,
        },
      });

      return form;
    }),

  // 更新表单
  update: protectedProcedure
    .input(formRouterContracts.update.input)
    .output(formRouterContracts.update.output)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const form = await ctx.prisma.form.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          creator: true,
        },
      });

      return form;
    }),

  // 删除表单
  delete: protectedProcedure
    .input(formRouterContracts.delete.input)
    .output(formRouterContracts.delete.output)
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.form.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: 'Form deleted successfully',
      };
    }),
});
```

### 5. 集成到 Next.js 应用

**apps/web/app/api/trpc/[trpc]/route.ts**
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@workspace/api/src/router';

export const runtime = 'edge';

const handler = fetchRequestHandler({
  router: appRouter,
  endpoint: '/api/trpc',
  createContext,
});

export { handler as GET, handler as POST };
```

### 6. 前端集成

**apps/web/components/providers/trpc-provider.tsx**
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

import type { AppRouter } from '@workspace/api/src/router';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## 验证设置

### 1. 运行测试

```bash
# 运行 tRPC 合约测试
pnpm test:contracts

# 运行集成测试
pnpm test:integration
```

### 2. 开发服务器测试

```bash
# 启动开发服务器
pnpm dev

# 测试 tRPC 端点
curl -X GET http://localhost:3000/api/trpc/form.list
```

## 故障排除

### 常见问题

**1. 数据库连接失败**
```bash
# 检查 PostgreSQL 容器状态
docker compose ps

# 查看数据库日志
docker compose logs -f postgres

# 重启数据库
docker compose restart postgres
```

**2. 类型错误**
```bash
# 重新生成类型
pnpm db:generate
pnpm build

# 检查 TypeScript 错误
pnpm typecheck
```

**3. tRPC 路由错误**
```bash
# 检查路由器导出
pnpm build --filter @workspace/api

# 验证 API schema
pnpm test:contracts
```

## 下一步

1. **实现认证路由器**：基于 `auth-router.ts` 合约实现完整的认证系统
2. **添加表单提交路由器**：实现 `submission-router.ts` 中定义的提交管理功能
3. **集成表单设计器**：将 tRPC API 与拖拽式表单设计器集成
4. **性能优化**：实现缓存策略和查询优化
5. **部署准备**：配置生产环境和监控

## 相关资源

- [tRPC 官方文档](https://trpc.io/)
- [Zod Schema 验证](https://zod.dev/)
- [Prisma ORM 文档](https://www.prisma.io/docs/)
- [FastBuild 架构文档](/docs/architecture.md)

---

*本指南涵盖了 tRPC 基础设施的核心设置。如需更详细的实现信息，请参考相应的合约文件和数据模型文档。*