# FastBuild 测试策略

## 测试架构概览

FastBuild 采用分离式测试架构，确保测试文件与生产代码一一对应。项目基于 tRPC + Zod 提供端到端类型安全，无需额外的合约测试：

```
tests/
├── e2e/                    # 端到端测试 (Playwright)
│   ├── auth.spec.ts
│   ├── form-demo.spec.ts
│   └── admin.spec.ts
├── integration/            # 集成测试 (Vitest)
│   ├── auth.test.ts
│   ├── form.test.ts
│   └── submission.test.ts
├── unit/                   # 单元测试 (Vitest)
│   ├── packages/           # 按包分离的单元测试
│   │   ├── api/           # API包测试
│   │   │   ├── trpc/
│   │   │   │   ├── context.test.ts
│   │   │   │   └── routers/
│   │   │   │       ├── auth.test.ts
│   │   │   │       ├── form.test.ts
│   │   │   │       ├── health.test.ts
│   │   │   │       ├── monitoring.test.ts
│   │   │   │       └── submission.test.ts
│   │   │   └── middleware/
│   │   │       ├── errorHandler.test.ts
│   │   │       ├── index.test.ts
│   │   │       └── rateLimiter.test.ts
│   │   ├── database/      # 数据库包测试
│   │   │   └── database.test.ts
│   │   ├── errors/        # 错误处理包测试
│   │   │   └── errors.test.ts
│   │   ├── schema-compiler/ # schema编译器测试
│   │   ├── ui/            # UI组件库测试
│   │   └── types/         # 类型定义测试
│   ├── hooks/             # React Hooks测试
│   ├── performance/       # 性能相关测试
│   ├── accessibility/     # 无障碍测试
│   └── responsive/        # 响应式设计测试
├── performance/            # 性能基准测试
│   ├── api-performance.test.ts
│   ├── trpc-performance.test.ts
│   └── trpc-benchmarks.test.ts
├── accessibility/          # 无障碍集成测试
├── factories/             # 测试数据工厂
│   ├── userFactory.ts
│   ├── formFactory.ts
│   ├── submissionFactory.ts
│   └── index.ts
├── mocks/                 # Mock对象
├── helpers/               # 测试辅助工具
├── setup.ts               # 测试配置
└── react.setup.ts         # React测试配置
```

## 测试类型和覆盖率目标

### 1. 单元测试 (Unit Tests)
- **目标覆盖率**: 80%+
- **工具**: Vitest
- **测试内容**:
  - 纯函数和工具函数
  - tRPC路由和中间件
  - 数据库操作逻辑
  - 错误处理机制
  - 类型验证

### 2. 集成测试 (Integration Tests)
- **目标覆盖率**: 70%+
- **工具**: Vitest
- **测试内容**:
  - API集成
  - 数据库操作集成
  - 认证流程
  - 表单提交流程

### 3. 端到端测试 (E2E Tests)
- **目标覆盖率**: 关键用户流程 100%
- **工具**: Playwright
- **测试内容**:
  - 完整用户注册/登录流程
  - 表单创建和提交流程
  - 管理员功能
  - 响应式设计验证

### 4. 性能测试 (Performance Tests)
- **工具**: Vitest
- **测试内容**:
  - API响应时间基准
  - 数据库查询性能
  - tRPC路由性能
  - 内存使用监控

### 5. 无障碍测试 (Accessibility Tests)
- **工具**: Vitest + React Testing Library
- **测试内容**:
  - 键盘导航功能
  - 高对比度模式
  - 无障碍表单组件
  - ARIA属性验证

## 类型安全保障

### tRPC + Zod 端到端类型安全

FastBuild 使用 tRPC + Zod 提供编译时和运行时的端到端类型安全，无需额外的合约测试：

```typescript
// 1. tRPC 路由定义使用 Zod Schema
export const formRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      metadata: FormMetadataSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      // 类型安全的实现
    }),
});

// 2. 前端获得完全类型安全
const { data } = trpc.form.create.useMutation({
  // input 参数类型自动推导
  // 返回类型完全类型安全
});
```

### 类型安全优势

- **编译时检查**: TypeScript 编译器确保 API 调用符合 Schema
- **运行时验证**: Zod 自动验证所有输入和输出
- **自动推导**: 前端无需手动定义类型，完全从 Schema 推导
- **零重复**: Schema 即合约，避免重复定义
- **即时反馈**: 类型错误在开发时就能发现

### 合约定义位置

正式的 API 合约定义位于 `specs/002-schema-driven-runtime-mvp/contracts/api-types.ts`，作为设计文档参考，而非测试重复。

## 测试数据工厂

### 用户数据工厂
```typescript
import { UserFactory } from '../factories';

// 创建基础用户
const user = await UserFactory.create();

// 创建管理员用户
const admin = await UserFactory.createAdmin();

// 创建自定义用户
const customUser = await UserFactory.create({
  email: 'custom@example.com',
  role: 'ADMIN',
  isActive: true
});

// 批量创建用户
const users = await UserFactory.createMany(10);
```

### 表单数据工厂
```typescript
import { FormFactory } from '../factories';

// 创建基础表单
const form = await FormFactory.createBasic();

// 创建高级表单
const advancedForm = await FormFactory.createAdvanced();

// 创建自定义表单
const customForm = await FormFactory.create({
  name: '自定义表单',
  description: '表单描述',
  metadata: customMetadata
});
```

### 提交数据工厂
```typescript
import { SubmissionFactory } from '../factories';

// 为指定表单创建提交
const submission = await SubmissionFactory.createForForm(formId);

// 批量创建提交
const submissions = await SubmissionFactory.createManyForForm(formId, 50);
```

## 测试配置文件

### Vitest 配置
- `vitest.base.config.mts` - 基础配置
- `vitest.unit.config.mts` - 单元测试配置
- `vitest.integration.config.mts` - 集成测试配置
- `vitest.performance.config.mts` - 性能测试配置
- `vitest.react.config.mts` - React组件测试配置

### 配置特性
- **全局测试工具**: 通过 `globals: true` 启用
- **测试数据工厂**: 自动导入并全局可用
- **数据库清理**: 每个测试前后自动清理
- **覆盖率报告**: 按包分类生成报告

## 运行测试

### 运行所有测试
```bash
# 运行所有测试
pnpm test

# 运行特定类型的测试
pnpm test:unit
pnpm test:integration
pnpm test:performance
pnpm test:e2e
```

### 运行特定测试文件
```bash
# 运行特定测试文件
pnpm test:unit auth.test.ts

# 运行特定包的测试
pnpm test:unit packages/api/
```

### 监视模式
```bash
# 监视模式运行测试
pnpm test:unit --watch

# UI 模式
pnpm test:unit --ui
```

### 覆盖率测试
```bash
# 生成覆盖率报告
pnpm test:unit --coverage

# 查看覆盖率报告
open coverage/index.html
```

## 测试最佳实践

### 1. 测试文件组织
```
tests/unit/packages/
├── api/           # API相关测试
│   ├── trpc/      # tRPC路由测试
│   └── middleware/ # 中间件测试
├── database/      # 数据库测试
├── errors/        # 错误处理测试
└── schema-compiler/ # schema编译器测试
```

### 2. 测试命名约定
```
# 文件命名
- 组件测试: ComponentName.test.tsx
- 路由测试: router-name.test.ts
- 中间件测试: middleware-name.test.ts
- 工具函数测试: util-name.test.ts

# 测试用例命名
describe('FeatureName', () => {
  it('should do something', () => {
    // 测试逻辑
  });
});
```

### 3. 测试结构模式
```typescript
describe('FeatureName', () => {
  beforeEach(() => {
    // 使用工厂创建测试数据
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试数据
  });

  it('should work correctly', async () => {
    // Arrange: 使用工厂准备测试数据
    const user = await UserFactory.create();

    // Act: 执行测试操作
    const result = await someFunction(user);

    // Assert: 验证结果
    expect(result).toBeDefined();
  });
});
```

### 4. Mock 和数据工厂
```typescript
// 优先使用数据工厂而不是硬编码数据
const user = await UserFactory.create({ role: 'ADMIN' });
const form = await FormFactory.createAdvanced();

// Mock 外部依赖
vi.mock('external-dependency', () => ({
  functionName: vi.fn(),
}));

// 使用工厂创建Mock数据
vi.mocked(prisma.user.create).mockResolvedValue(
  await UserFactory.create()
);
```

### 5. 异步测试
```typescript
it('should handle async operations', async () => {
  // 使用 async/await
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

## 测试环境配置

### 环境变量
测试环境会自动设置以下环境变量：
```typescript
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild';
process.env.JWT_SECRET = 'test-jwt-secret';
```

### 数据库配置
- 使用独立的测试数据库
- 每个测试前后自动清理数据
- 支持事务隔离确保测试独立

### 全局测试工具
```typescript
// 全局可用的测试工具
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// 全局可用的数据工厂
global.UserFactory = UserFactory;
global.FormFactory = FormFactory;
global.SubmissionFactory = SubmissionFactory;
```

## 性能测试基准

### API 响应时间
- 简单查询: < 100ms
- 复杂查询: < 500ms
- tRPC路由: < 200ms

### 数据库性能
- 用户查询: < 50ms
- 表单查询: < 100ms
- 批量操作: < 1000ms

### 测试执行时间
- 单元测试套件: < 30s
- 集成测试套件: < 60s
- E2E测试套件: < 300s

## CI/CD 集成

### GitHub Actions
- 自动运行所有测试
- 生成测试覆盖率报告
- 在 PR 中显示测试结果
- 性能回归检测

### 测试报告
- 覆盖率报告: `coverage/`
- E2E 测试报告: `playwright-report/`
- 性能报告: `performance-report/`

## 故障排除

### 常见问题
1. **测试数据库连接失败**
   - 检查 Docker 容器状态: `docker compose ps`
   - 验证数据库连接字符串
   - 确保数据库服务运行: `docker compose up -d`

2. **模块导入错误**
   - 检查包是否已安装: `pnpm install`
   - 验证导入路径是否正确
   - 确认包已正确导出

3. **Mock配置问题**
   - 使用 `vi.fn()` 而不是 `vi.mocked()`
   - 确保Mock函数正确配置
   - 检查依赖注入是否正确

### 调试技巧
```bash
# 使用调试模式运行测试
pnpm test:unit --inspect

# 生成详细日志
pnpm test:unit --reporter=verbose

# 只运行失败的测试
pnpm test:unit --reporter=dot

# 运行特定测试并显示详细信息
pnpm test:unit --run testName
```

## 贡献指南

### 添加新测试
1. **确定测试类型和位置**: 根据被测代码选择正确的目录
2. **遵循命名约定**: 使用 `.test.ts` 或 `.test.tsx` 后缀
3. **使用数据工厂**: 优先使用工厂函数创建测试数据
4. **保持测试独立**: 每个测试应该独立运行
5. **验证覆盖率**: 确保新增代码有对应测试

### 维护测试
- 定期更新测试数据和工厂
- 清理过时的测试文件
- 优化测试性能
- 更新依赖版本
- 修复失败的测试

## 参考资料

- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/)
- [测试最佳实践](https://testingjavascript.com/)
- [数据工厂模式](https://martinfowler.com/bliki/ObjectMother.html)