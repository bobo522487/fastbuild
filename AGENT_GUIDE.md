# FastBuild 代理开发指南

## 概述

本指南为开发者和 AI 代理提供在 FastBuild 项目中工作的详细指导。FastBuild 是一个基于 Next.js、tRPC 和 Prisma 构建的现代化低代码表单平台，遵循宪法驱动的开发原则。

## 代理身份与原则

### 核心原则

作为 FastBuild 项目的代理，您必须遵循以下核心原则：

1. **Schema-First Architecture（模式优先架构）**
   - Zod Schema 是唯一的真实来源
   - 所有数据验证都通过 Schema 完成
   - 避免任何动态代码执行

2. **Type Safety Non-Negotiable（类型安全不容妥协）**
   - 端到端的 TypeScript 类型安全
   - 所有 API 调用都必须是类型安全的
   - 使用 Zod 进行运行时验证

3. **Monorepo First（单体仓库优先）**
   - 使用 pnpm workspace 管理依赖
   - 代码组织在 packages/ 和 apps/ 目录中
   - 共享配置和工具

4. **Test-Driven Development（测试驱动开发）**
   - 先写测试，再实现功能
   - 测试覆盖率必须 > 80%
   - 包含单元、集成、端到端和性能测试

5. **Performance by Design（性能设计）**
   - 性能基准必须严格执行
   - 响应时间、并发处理、内存使用都有明确指标
   - 实施监控和优化

### Linus 式的开发哲学

**"Good Taste"（好品味）**
- 消除特殊情况，而不是增加条件判断
- 重新设计数据结构来简化代码
- 函数应该短小精悍，只做一件事

**"Never Break Userspace"（永不破坏用户空间）**
- 向后兼容性是神圣不可侵犯的
- 任何导致现有程序崩溃的改动都是 bug
- 优先考虑用户体验

**实用主义**
- 解决实际问题，而不是假想的威胁
- 拒绝过度设计
- 代码为现实服务，不是为论文服务

## 项目结构

### 核心目录结构

```
fastbuild/
├── apps/web/                    # Next.js 应用
│   ├── app/                     # App Router
│   ├── components/              # 应用组件
│   └── trpc/                    # tRPC 客户端配置
├── packages/
│   ├── api/                     # tRPC 服务器
│   │   └── src/trpc/
│   │       ├── trpc.ts          # tRPC 实例配置
│   │       ├── context.ts       # 上下文创建
│   │       ├── routers/         # 路由器
│   │       └── middleware/      # 中间件
│   ├── database/               # Prisma 数据库
│   ├── schema-compiler/        # Schema 编译器
│   └── ui/                      # 共享 UI 组件
├── prisma/                      # 数据库 schema
├── tests/                       # 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   ├── e2e/                     # 端到端测试
│   └── performance/             # 性能测试
└── specs/                       # 规范文档
    └── 001-trpc/                # tRPC 规范
```

### 代码组织原则

1. **按功能组织**：相关功能放在一起
2. **分层架构**：清晰的关注点分离
3. **共享代码**：避免重复，使用 workspace 依赖
4. **类型导出**：所有公共 API 都必须有明确的类型定义

## 开发工作流程

### 1. 需求分析

在开始任何任务前，必须进行以下分析：

**Linus 的三个问题**
1. "这是个真问题还是臆想出来的？" - 拒绝过度设计
2. "有更简单的方法吗？" - 永远寻找最简方案
3. "会破坏什么吗？" - 向后兼容是铁律

**五层思考过程**
1. **数据结构分析**：核心数据是什么？关系如何？
2. **特殊情况识别**：哪些 if/else 是真正必要的？
3. **复杂度审查**：能否减少概念数量？
4. **破坏性分析**：会影响哪些现有功能？
5. **实用性验证**：这个问题在真实环境中存在吗？

### 2. 实现步骤

#### 步骤 1: 理解现有代码

```bash
# 使用搜索工具理解代码库
find . -name "*.ts" -type f | head -10

# 查看现有路由器
ls packages/api/src/trpc/routers/

# 查看数据库 schema
cat prisma/schema.prisma
```

#### 步骤 2: 更新测试

```bash
# 先写测试
cd tests/unit
touch new-feature.test.ts

# 或者更新现有测试
vim existing-test.test.ts
```

#### 步骤 3: 实现功能

```bash
# 在正确的位置添加代码
cd packages/api/src/trpc/routers/
vim new-router.ts

# 或者扩展现有路由器
vim existing-router.ts
```

#### 步骤 4: 运行测试

```bash
# 运行相关测试
pnpm test:unit
pnpm test:integration
pnpm test:performance
```

#### 步骤 5: 验证性能

```bash
# 确保符合性能基准
pnpm test:performance

# 检查类型安全
pnpm typecheck
```

### 3. 代码质量标准

#### 代码风格

1. **函数长度**：不超过 50 行
2. **缩进层次**：不超过 3 层
3. **文件长度**：不超过 500 行
4. **命名规范**：使用清晰的描述性名称

#### 类型安全

1. **无 any 类型**：严格类型定义
2. **Zod 验证**：所有输入输出必须验证
3. **错误处理**：使用 TRPCError 进行错误处理
4. **类型导出**：公共 API 必须导出类型

#### 性能要求

1. **响应时间**：
   - 健康检查: < 50ms
   - 认证操作: < 150ms
   - 表单操作: < 200ms

2. **并发处理**：
   - 支持 100+ 并发请求
   - 内存增长 < 5MB

3. **测试覆盖**：
   - 单元测试 > 80%
   - 集成测试覆盖关键路径
   - 性能测试符合基准

## 技术栈使用指南

### tRPC 开发

#### 创建新路由器

```typescript
// packages/api/src/trpc/routers/new-feature.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const newFeatureRouter = router({
  // 查询操作
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // 实现逻辑
    }),

  // 变更操作
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      // 更多字段
    }))
    .mutation(async ({ input, ctx }) => {
      // 实现逻辑
    }),
});
```

#### 添加到主路由器

```typescript
// packages/api/src/trpc/routers/index.ts
import { newFeatureRouter } from './new-feature';

export const appRouter = router({
  // 现有路由器
  auth: authRouter,
  form: formRouter,

  // 新路由器
  newFeature: newFeatureRouter,

  health: healthRouter,
});
```

### 数据库操作

#### 使用 Prisma

```typescript
// 查询操作
const items = await ctx.prisma.model.findMany({
  where: {
    // 条件
  },
  include: {
    // 关联
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// 创建操作
const item = await ctx.prisma.model.create({
  data: {
    // 数据
  },
  include: {
    // 关联
  },
});

// 更新操作
const item = await ctx.prisma.model.update({
  where: { id: input.id },
  data: {
    // 更新字段
  },
});
```

### 测试编写

#### 单元测试

```typescript
// tests/unit/new-feature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc/routers';
import { prisma } from '@workspace/database';

vi.mock('@workspace/database');

describe('新功能单元测试', () => {
  let caller: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = require('@workspace/database').prisma;
    caller = createCaller({
      user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
      prisma: mockPrisma,
    });
    vi.clearAllMocks();
  });

  it('应该正确处理查询', async () => {
    // 设置 mock
    mockPrisma.model.findUnique.mockResolvedValue({
      id: 'test-id',
      name: 'Test Item',
    });

    // 调用 API
    const result = await caller.newFeature.get({ id: 'test-id' });

    // 验证结果
    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Test Item');
  });
});
```

#### 性能测试

```typescript
// tests/performance/new-feature.test.ts
describe('新功能性能测试', () => {
  it('应该在合理时间内完成', async () => {
    const startTime = performance.now();
    await caller.newFeature.get({ id: 'test-id' });
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(100); // 100ms 内完成
  });
});
```

## 常见任务模式

### 1. 添加新 API 端点

```bash
# 1. 创建或更新路由器
vim packages/api/src/trpc/routers/feature.ts

# 2. 添加到主路由器
vim packages/api/src/trpc/routers/index.ts

# 3. 编写测试
vim tests/unit/feature.test.ts
vim tests/performance/feature.test.ts

# 4. 运行测试
pnpm test:unit
pnpm test:performance

# 5. 类型检查
pnpm typecheck
```

### 2. 添加新数据库字段

```bash
# 1. 更新 schema
vim prisma/schema.prisma

# 2. 推送数据库变更
pnpm db:push

# 3. 生成客户端
pnpm db:generate

# 4. 更新相关代码
vim packages/api/src/trpc/routers/
vim tests/

# 5. 运行测试
pnpm test
```

### 3. 修复 bug

```bash
# 1. 识别问题
pnpm test  # 查看失败的测试

# 2. 分析代码
# 使用搜索工具找到相关代码

# 3. 修复实现
vim 相关文件

# 4. 确保测试通过
pnpm test

# 5. 性能检查
pnpm test:performance
```

## 调试和故障排除

### 常见问题

#### 1. 类型错误

```bash
# 重新生成类型
pnpm db:generate
pnpm build

# 检查类型错误
pnpm typecheck
```

#### 2. 数据库问题

```bash
# 检查数据库状态
docker compose ps

# 重置数据库
docker compose down -v
docker compose up -d

# 重新推送 schema
pnpm db:push
```

#### 3. 测试失败

```bash
# 运行特定测试
pnpm test tests/unit/specific.test.ts

# 查看详细错误
pnpm test --reporter=verbose

# 调试测试
node --inspect-brk node_modules/.bin/vitest run tests/unit/specific.test.ts
```

### 日志和监控

```typescript
// 在 context.ts 中添加请求日志
export async function createContext({ req, res }) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  return { req, res, prisma, user };
}
```

## 性能优化

### 查询优化

```typescript
// 使用 include 代替多次查询
const form = await ctx.prisma.form.findUnique({
  where: { id: input.id },
  include: {
    creator: { select: { id: true, name: true } },
    submissions: { take: 10 },
  },
});

// 使用索引确保查询性能
// 在 prisma/schema.prisma 中添加 @@index
```

### 缓存策略

```typescript
// 使用 React Query 缓存
const { data, isLoading } = trpc.form.list.useQuery(
  { limit: 20 },
  { staleTime: 30 * 1000 } // 30 秒缓存
);
```

## 安全最佳实践

### 输入验证

```typescript
// 使用 Zod 进行严格验证
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// 在 tRPC procedure 中使用
publicProcedure
  .input(schema)
  .mutation(async ({ input }) => {
    // 安全的输入
  });
```

### 认证和授权

```typescript
// 使用中间件保护路由
export const protectedProcedure = t.procedure.use(isAuthenticated);

export const adminProcedure = t.procedure
  .use(isAuthenticated)
  .use(isAdmin);
```

## 贡献指南

### 提交代码

1. **确保测试通过**
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

2. **性能检查**
   ```bash
   pnpm test:performance
   ```

3. **提交信息**
   - 使用清晰的描述
   - 包含问题编号（如果适用）
   - 说明变更的影响

### 代码审查

- 关注代码质量
- 检查性能影响
- 确保向后兼容
- 验证测试覆盖

## 工具和命令

### 开发命令

```bash
# 开发服务器
pnpm dev

# 构建
pnpm build

# 测试
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:performance
pnpm test:e2e

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format
pnpm lint
```

### 数据库命令

```bash
# 数据库操作
pnpm db:push
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## 快速参考

### 重要文件

- `packages/api/src/trpc/routers/` - tRPC 路由器
- `prisma/schema.prisma` - 数据库 schema
- `tests/unit/` - 单元测试
- `tests/performance/` - 性能测试
- `TRPC_GUIDE.md` - tRPC 完整指南

### 关键概念

- **Schema-First**: Zod Schema 是真实来源
- **Type Safety**: 端到端类型安全
- **Performance**: 明确的性能基准
- **Testing**: 全面的测试覆盖
- **Monorepo**: 统一的代码组织

---

**记住**：作为 FastBuild 代理，您的目标不是编写代码，而是解决实际问题。始终保持 Linus 式的好品味，消除复杂性，而不是增加它。