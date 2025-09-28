# FastBuild 开发指南

## 项目概述

FastBuild 是一个基于 Next.js 15 和 tRPC 的低代码表单平台，采用 Schema-as-Truth 的设计理念。

## 技术栈

### 核心框架
- **Next.js 15**: 全栈框架，使用 App Router
- **TypeScript**: 类型安全的 JavaScript
- **pnpm**: 包管理器，支持 monorepo
- **Turbo**: 构建系统

### 数据层
- **PostgreSQL**: 主数据库
- **Prisma**: 类型安全的 ORM
- **Docker**: 容器化数据库

### API 层
- **tRPC v10**: 类型安全的 RPC 框架
- **Zod**: 数据验证和模式定义
- **JWT**: 认证令牌

### 前端层
- **React 19**: UI 框架
- **Tailwind CSS v4**: 样式框架
- **shadcn/ui**: 组件库
- **@tanstack/react-query**: 服务器状态管理

### 工具链
- **Vitest**: 单元测试框架
- **Playwright**: E2E 测试
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化

## 项目结构

```
fastbuild/
├── apps/web/                 # Next.js 应用
│   ├── app/                  # App Router 页面
│   │   ├── api/             # API 路由（仅 tRPC）
│   │   ├── demo/            # 演示页面
│   │   ├── test/            # 测试页面
│   │   ├── layout.tsx       # 根布局
│   │   └── page.tsx         # 首页
│   ├── components/          # 应用组件
│   │   ├── forms/          # 表单相关组件
│   │   ├── ui/             # UI 组件
│   │   └── providers.tsx   # 全局提供者
│   ├── lib/                 # 工具库
│   │   ├── auth.tsx        # 认证工具
│   │   ├── api-client.ts   # API 客户端
│   │   └── monitoring.ts   # 监控工具
│   ├── trpc/               # tRPC 客户端
│   │   ├── provider.tsx    # tRPC Provider
│   │   ├── error-handling.tsx # 错误处理
│   │   └── client.ts       # tRPC 客户端
│   └── package.json
├── packages/
│   ├── api/                # tRPC 服务端
│   │   ├── src/
│   │   │   ├── trpc/       # tRPC 路由
│   │   │   │   ├── routers/ # 路由定义
│   │   │   │   ├── context.ts # tRPC 上下文
│   │   │   │   └── index.ts # 路由聚合
│   │   │   ├── middleware/ # 中间件
│   │   │   └── utils/      # 工具函数
│   │   └── package.json
│   ├── database/           # 数据库包
│   │   ├── src/
│   │   │   └── index.ts    # Prisma 客户端
│   │   ├── prisma/         # Prisma 模式
│   │   └── package.json
│   ├── schema-compiler/    # 模式编译器
│   │   ├── src/
│   │   │   └── index.ts    # 模式编译逻辑
│   │   └── package.json
│   ├── ui/                 # UI 组件库
│   │   ├── src/
│   │   │   ├── components/ # 组件定义
│   │   │   └── lib/        # 工具函数
│   │   └── package.json
│   ├── typescript-config/  # TypeScript 配置
│   └── eslint-config/      # ESLint 配置
├── prisma/                 # 数据库模式
│   ├── schema.prisma       # Prisma 模式文件
│   └── migrations/         # 数据库迁移
├── tests/                  # 测试文件
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   ├── e2e/               # E2E 测试
│   └── performance/       # 性能测试
├── docs/                  # 文档
├── docker-compose.yml     # Docker 配置
└── package.json
```

## 开发流程

### 1. 环境设置

#### 前置要求
- Node.js >= 20
- pnpm 包管理器
- Docker 和 Docker Compose
- Git

#### 安装步骤
```bash
# 克隆仓库
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

### 2. 开发工作流

#### 创建新功能
1. 创建功能分支：
```bash
git checkout -b feature/your-feature-name
```

2. 开发功能：
```bash
# 启动开发服务器
pnpm dev

# 在另一个终端运行类型检查
pnpm typecheck

# 运行测试
pnpm test
```

3. 提交更改：
```bash
# 添加更改
git add .

# 提交更改
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/your-feature-name
```

### 3. 代码规范

#### TypeScript 规范
- 使用严格的 TypeScript 配置
- 为所有函数和变量添加类型注解
- 使用接口定义复杂对象
- 避免使用 `any` 类型

#### 命名规范
- 文件名：kebab-case
- 组件名：PascalCase
- 变量名：camelCase
- 常量名：SCREAMING_SNAKE_CASE
- 类型名：PascalCase

#### 代码风格
- 使用 ESLint 和 Prettier
- 遵循函数组件模式
- 使用 React Hooks 规范
- 保持函数简短和专注

### 4. 测试策略

#### 单元测试
```typescript
// tests/unit/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockContext } from '../setup';

describe('Authentication', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('should authenticate user with valid credentials', async () => {
    // 测试逻辑
  });
});
```

#### 集成测试
```typescript
// tests/integration/auth.test.ts
import { describe, it, expect } from 'vitest';
import { createTestServer } from '../setup';

describe('Authentication Integration', () => {
  it('should handle login flow', async () => {
    // 集成测试逻辑
  });
});
```

#### E2E 测试
```typescript
// tests/e2e/auth.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 5. 数据库操作

#### 创建迁移
```bash
# 创建新迁移
pnpm db:migrate

# 应用迁移
pnpm db:push

# 查看数据库
pnpm db:studio
```

#### 模式设计原则
- 使用 Prisma 模式定义数据模型
- 遵循规范化原则
- 添加适当的索引
- 定义清晰的关系

### 6. API 开发

#### 创建新路由
```typescript
// packages/api/src/trpc/routers/new-feature.ts
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const newFeatureRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 实现逻辑
      return result;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // 实现逻辑
      return result;
    }),
});
```

#### 添加新路由到主路由器
```typescript
// packages/api/src/trpc/routers/index.ts
import { authRouter } from './auth';
import { formRouter } from './form';
import { newFeatureRouter } from './new-feature';

export const appRouter = router({
  auth: authRouter,
  form: formRouter,
  newFeature: newFeatureRouter,
  // 其他路由...
});

export type AppRouter = typeof appRouter;
```

### 7. 前端组件开发

#### 创建新组件
```typescript
// components/forms/NewForm.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function NewForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} placeholder="Form Name" />
      <Input {...form.register('description')} placeholder="Description" />
      <Button type="submit">Create Form</Button>
    </form>
  );
}
```

#### 使用 tRPC 钩子
```typescript
import { trpc } from '@/trpc/provider';

export function FormList() {
  const { data: forms, isLoading } = trpc.form.list.useQuery();
  const createForm = trpc.form.create.useMutation();

  const handleCreateForm = async (formData: any) => {
    const result = await createForm.mutateAsync(formData);
    // 处理结果
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {forms?.items.map((form) => (
        <div key={form.id}>{form.name}</div>
      ))}
    </div>
  );
}
```

### 8. 错误处理

#### 后端错误处理
```typescript
// packages/api/src/trpc/routers/auth.ts
export const authRouter = router({
  login: authProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await ctx.prisma.user.findUnique({
          where: { email: input.email },
        });

        if (!user) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // 生成令牌
        const token = generateJWT(user);

        return {
          success: true,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          user,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`AUTH_ERROR: ${error.message}`);
        }
        throw new Error('INTERNAL_ERROR');
      }
    }),
});
```

#### 前端错误处理
```typescript
// trpc/error-handling.tsx
export function useErrorHandler() {
  const handleError = (error: any) => {
    console.error('API Error:', error);

    // 根据错误类型显示不同的消息
    if (error?.data?.code === 'UNAUTHORIZED') {
      // 处理未授权错误
      router.push('/login');
    } else if (error?.data?.code === 'VALIDATION_ERROR') {
      // 处理验证错误
      toast.error('请检查输入数据');
    } else {
      // 处理其他错误
      toast.error('发生错误，请稍后重试');
    }
  };

  return { handleError };
}
```

### 9. 性能优化

#### 数据库优化
- 使用适当的索引
- 实现分页查询
- 优化复杂查询
- 使用连接池

#### 前端优化
- 实现虚拟滚动
- 使用代码分割
- 优化图片加载
- 实现缓存策略

#### API 优化
- 实现速率限制
- 使用批量请求
- 优化数据库查询
- 实现缓存机制

### 10. 部署流程

#### 构建应用
```bash
# 构建所有包
pnpm build

# 构建特定应用
cd apps/web && pnpm build
```

#### 部署步骤
1. 构建应用
2. 推送到仓库
3. 部署到生产环境
4. 运行数据库迁移
5. 重启应用

#### 环境变量
```bash
# .env.production
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-jwt-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"
```

## 最佳实践

### 1. 安全性
- 使用 HTTPS
- 实现输入验证
- 使用准备语句防止 SQL 注入
- 定期更新依赖项
- 实现适当的认证和授权

### 2. 性能
- 监控应用性能
- 实现缓存策略
- 优化数据库查询
- 使用懒加载
- 实现代码分割

### 3. 可维护性
- 编写清晰的代码
- 添加适当的注释
- 使用一致的代码风格
- 实现适当的测试
- 保持文档更新

### 4. 可扩展性
- 设计模块化架构
- 使用适当的设计模式
- 实现松耦合
- 考虑水平扩展
- 使用适当的数据结构

## 调试和故障排除

### 常见问题

#### 数据库连接问题
```bash
# 检查数据库状态
docker compose ps

# 查看数据库日志
docker compose logs -f db

# 重置数据库
docker compose down -v && docker compose up -d
```

#### TypeScript 错误
```bash
# 清除 TypeScript 缓存
rm -rf node_modules/.cache
rm -rf .next

# 重新安装依赖
pnpm install

# 重新生成类型
pnpm db:generate
```

#### tRPC 错误
```bash
# 检查路由定义
# 确保所有路由都有正确的类型定义
# 验证输入输出模式

# 检查客户端配置
# 确保链接配置正确
# 验证认证头设置
```

### 调试工具

#### 开发者工具
- React Developer Tools
- Redux DevTools（如果使用 Redux）
- Prisma Studio
- tRPC Playground

#### 日志记录
```typescript
// 添加日志
console.log('Debug info:', { data });

// 使用调试库
import debug from 'debug';
const log = debug('fastbuild:auth');
log('User authenticated:', user.id);
```

## 贡献指南

### 提交规范
```bash
# feat: 新功能
# fix: 修复 bug
# docs: 文档更改
# style: 代码格式化
# refactor: 代码重构
# test: 测试相关
# chore: 构建过程或辅助工具的变动
```

### Pull Request 流程
1. Fork 仓库
2. 创建功能分支
3. 开发功能
4. 编写测试
5. 提交更改
6. 创建 PR
7. 代码审查
8. 合并更改

### 代码审查
- 确保代码符合项目规范
- 检查测试覆盖率
- 验证功能完整性
- 确保文档更新

## 资源链接

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [tRPC 文档](https://trpc.io/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [React 文档](https://react.dev)

### 工具和库
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod](https://zod.dev)
- [Vitest](https://vitest.dev)

### 社区
- [GitHub Discussions](https://github.com/organization/repo/discussions)
- [Stack Overflow](https://stackoverflow.com)
- [Discord 服务器](https://discord.gg/your-server)

## 版本历史

### v1.0.0 (Current)
- 初始版本发布
- 基本的表单功能
- 用户认证系统
- tRPC API 架构
- 响应式 UI 设计

### 未来计划
- [ ] 高级表单字段类型
- [ ] 表单模板系统
- [ ] 工作流自动化
- [ ] 高级分析功能
- [ ] 移动端优化