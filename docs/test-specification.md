## 14. 测试策略

本章节描述如何在当前的 T3 Turbo 单体仓库中组织与实施测试。重点围绕 Next.js App Router、tRPC v11、Better Auth 以及 Prisma/PostgreSQL 的组合栈展开，所有示例均针对本仓库现有的 `Post` 功能与共享包。

### 14.1 测试金字塔与基本原则

```
       / \
     / E2E \      保护关键用户旅程（少量但高价值）
    /-------\
   / Integration \  验证 tRPC、Prisma、Better Auth 等跨层协作
  /---------------\
 / Unit Tests \     快速、易定位的逻辑与组件测试
/-------------------\
```

- **快速反馈**：单元测试 < 1 s，集成测试 < 5 s；重视缓存与选择性运行。
- **贴近真实**：集成与 E2E 覆盖真实数据流，避免过度 Mock。
- **最小维护成本**：只测试对业务与稳定性真正重要的路径。

### 14.2 Monorepo 中的测试布局

```
apps/
  nextjs/
    src/
      app/
        _components/
          posts.tsx          # 源码
          posts.test.tsx     # 就近组件单元测试
      trpc/
        server.test.ts       # RSC 数据流测试（可选）
    tests/
      e2e/                   # Playwright / Cypress 端到端测试

packages/
  api/
    src/
      router/
        post.test.ts         # tRPC 路由单元/集成测试
    tests/
      integration/
        post-router.test.ts  # 通过 createCaller 的集成测试

  db/
    tests/
      prisma.test.ts         # Prisma 迁移/约束测试

tooling/
  vitest.config.ts           # 共享 Vitest 配置（建议新增）
```

- **就近测试**：UI、hooks、工具函数等与源码放在一起，重构时容易同步。
- **集中测试**：跨包的集成/E2E 放在 `tests/` 下，便于复用测试工具与数据工厂。
- **Turbo 任务**：每个 Workspace 定义统一的 `test`、`test:unit`、`test:integration` 脚本，最终通过 `pnpm turbo run test` 汇总。

### 14.3 工具链与运行命令

1. **Vitest**：推荐作为单元/集成测试框架，支持 React Testing Library、Node 端测试以及 Prisma 工具链。
2. **Playwright**（或 Cypress）：用于 `apps/nextjs` 的端到端验证，可与 Next.js App Router 和 Better Auth Social Flow 结合。
3. **pnpm + Turborepo**：通过 `turbo.json` 中的 `test` 任务实现只跑变化的测试。

**环境准备**

```bash
cp .env.test.example .env.test          # 初始化测试环境变量
pnpm db:generate                        # 生成 Prisma Client
pnpm db:push:test                       # 使用测试数据库重置 schema
```

建议的根级命令（需在各包补充对应脚本）：

```bash
# 全量运行：turbo 会按依赖拓扑执行
pnpm turbo run test

# 仅运行 UI 包或 API 包的单测
pnpm turbo run test --filter @fastbuild/nextjs
pnpm turbo run test --filter @fastbuild/api

# 只跑 API 集成测试（自动加载 .env.test）
pnpm test:integration
```

> CI 提醒：流水线中复用 `pnpm db:push:test` 初始化数据库，确保服务提供 `prisma/prisma` 账号即可与本地一致。

> 提醒：在添加 Vitest 配置之前，先于各包的 `package.json` 定义 `test` 脚本，例如 `vitest run` 或 `vitest --config ../../tooling/vitest.config.ts`。

### 14.4 针对当前栈的测试示例

#### 14.4.1 React 客户端组件（CreatePostForm）

```typescript
// apps/nextjs/src/app/_components/posts.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreatePostForm } from "./posts";

const queryClient = new QueryClient();

describe("CreatePostForm", () => {
  it("提交后触发 createPost mutation", async () => {
    const mutate = vi.fn();
    const trpc = {
      post: {
        create: {
          mutationOptions: vi.fn(() => ({ onSuccess: vi.fn(), onError: vi.fn() })),
          mutate,
        },
      },
      pathFilter: () => ({}),
    };

    render(
      <QueryClientProvider client={queryClient}>
        {/* 将 useTRPC 改写为从 props 注入或使用 provider mock */}
        <CreatePostForm __testOverrides={{ trpc }} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("Title"), {
      target: { value: "New Post" },
    });
    fireEvent.change(screen.getByPlaceholderText("Content"), {
      target: { value: "Hello world" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(mutate).toHaveBeenCalled());
  });
});
```

> 为便于测试，建议在组件中暴露一个 `__testOverrides` prop 或者抽象出 `useCreatePost` hook，以便注入 mock 版的 tRPC client。

#### 14.4.2 tRPC Router 调用（Post Router）

```typescript
// packages/api/src/router/post.test.ts
import { describe, it, expect, vi } from "vitest";
import { appRouter, createTRPCContext } from "@fastbuild/api";
import { prisma } from "@fastbuild/db";

describe("postRouter", () => {
  it("已登录用户可以创建帖子", async () => {
    vi.spyOn(prisma.post, "create").mockResolvedValue({
      id: "post-1",
      title: "Hello",
      content: "world",
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller({
      ...(await createTRPCContext({
        headers: new Headers(),
        auth: {
          api: {
            getSession: vi.fn().mockResolvedValue({
              user: { id: "user-1", name: "Ada" },
            }),
          },
        },
      })),
      user: { id: "user-1" },
    } as never);

    const post = await caller.post.create({
      title: "Hello",
      content: "world",
    });

    expect(post.userId).toBe("user-1");
    expect(prisma.post.create).toHaveBeenCalled();
  });
});
```

> 要点：通过 `createCaller` 可以跳过 HTTP 层，直接对路由进行输入/输出断言。Better Auth session 可通过 spy/mock 注入。

#### 14.4.3 React Server Components / RSC 数据抓取

```typescript
// apps/nextjs/src/trpc/server.test.ts
import { describe, it, expect, vi } from "vitest";
import * as queryClientModule from "./query-client";
import { prefetch, trpc } from "./server";

describe("RSC prefetch helper", () => {
  it("prefetch 会调用 QueryClient 进行预取", async () => {
    const queryClient = {
      prefetchQuery: vi.fn(),
      prefetchInfiniteQuery: vi.fn(),
    };

    vi.spyOn(queryClientModule, "createQueryClient").mockReturnValue(queryClient as never);

    await prefetch(trpc.post.all.queryOptions());

    expect(queryClient.prefetchQuery).toHaveBeenCalled();
  });
});
```

> 更完整的方案可以结合 `react` `cache` 模块与 `HydrationBoundary`，验证 dehydration/rehydration 数据是否一致。

#### 14.4.4 Prisma 集成测试

```typescript
// packages/db/tests/prisma.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@fastbuild/db";

describe("Prisma schema", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "post" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "user" RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Post 与 User 关系正常工作", async () => {
    const user = await prisma.user.create({
      data: { email: "test@example.com", name: "Test User" },
    });

    const post = await prisma.post.create({
      data: { title: "Hello", content: "World", userId: user.id },
      include: { user: true },
    });

    expect(post.user.id).toBe(user.id);
  });
});
```

> 建议在测试环境使用独立的 `TEST_DATABASE_URL`，并在每次测试后清理数据。

### 14.5 测试数据与 Mock 策略

#### 14.5.1 Faker 工厂

```typescript
// tests/utils/factory.ts
import { prisma } from "@fastbuild/db";
import { faker } from "@faker-js/faker";

export async function createUser(overrides: Partial<{ email: string; name: string }> = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? faker.internet.email(),
      name: overrides.name ?? faker.person.fullName(),
    },
  });
}

export async function createPost(userId: string, overrides: Partial<{ title: string; content: string }> = {}) {
  return prisma.post.create({
    data: {
      title: overrides.title ?? faker.lorem.sentence(),
      content: overrides.content ?? faker.lorem.paragraph(),
      userId,
    },
  });
}

export async function resetDatabase() {
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}
```

#### 14.5.2 Better Auth Mock

```typescript
// tests/__mocks__/@fastbuild/auth.ts
import { vi } from "vitest";

export const auth = {
  api: {
    getSession: vi.fn(),
    signInSocial: vi.fn(),
    signOut: vi.fn(),
  },
};

export const getSession = () => auth.api.getSession();
```

- 使用 `vi.mock("@fastbuild/auth", ...)` 覆盖真实实现。
- 对于 server actions，可结合 `next/headers` 的 mock (`vi.mock("next/headers", ...)`) 返回自定义 header。

### 14.6 CI/CD 流水线建议

保持与仓库 `package.json` 的 `engines` 对齐，并充分利用 Turbo 缓存。

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22.20.0"
          cache: "pnpm"
      - uses: pnpm/action-setup@v4
        with:
          version: 10.15.1

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Prepare database
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: |
          pnpm db:push --force-reset
          pnpm db:generate

      - name: Run tests
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: pnpm turbo run test -- --run

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

> `pnpm turbo run test -- --run` 需要各 workspace 的 `test` 脚本转发到 `vitest run --coverage` 等命令。请在实现测试之前补全这些脚本。

### 14.7 关键要点回顾

1. **以真实栈为中心**：所有示例均围绕 tRPC、Better Auth、Prisma 与 Next.js App Router，避免“幻影模块”。
2. **命令可执行**：测试命令依赖 Turborepo 的 `test` 脚本，需与各包 `package.json` 保持同步。
3. **Mock 贴合业务**：通过 Mock Better Auth 和 tRPC Context，确保授权/会话行为真实可控。
4. **数据隔离**：集成测试使用独立数据库与数据工厂，避免污染本地开发数据。
5. **CI 对齐 engines**：Node 与 pnpm 版本遵循仓库要求，确保流水线与本地一致。

只要遵循上述建议，即可在不牺牲开发效率的前提下，为整个 monorepo 建立可靠的测试防线。*** End Patch
***
{"error":"Invalid JSON","code":400} الوحيد? Need use FREEFORM string not JSON due instructions. apply_patch tool expects string format. Let's call again properly. We'll reapply addition by using apply patch with string no JSON. Need to include file content preceded by `*** Begin Patch` etc. let's do properly. 
