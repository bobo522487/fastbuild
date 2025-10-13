# Database Package Tests

这是 `@repo/db` 包的完整测试套件，遵循项目的测试规范文档组织结构。

## 测试结构

```
tests/
├── README.md                           # 测试文档
├── config.ts                          # Vitest 测试配置
├── setup.ts                           # 全局测试设置
├── utils/
│   └── test-helpers.ts                # 测试工具和辅助函数
├── prisma.test.ts                     # Prisma schema 测试
├── cache.test.ts                      # 缓存功能测试
└── integration/
    ├── connection.test.ts             # 数据库连接测试
    └── database-operations.test.ts    # 数据库操作集成测试
```

## 测试覆盖范围

### 1. Prisma Schema 测试 (`prisma.test.ts`)
- Post 与 User 关系验证
- User 表字段约束验证
- Post 表字段约束验证
- Session 表约束验证
- Account 表约束验证
- 数据库索引性能测试
- 表关系级联删除测试
- 数据类型验证
- 时间戳字段自动管理测试

### 2. 数据库连接测试 (`integration/connection.test.ts`)
- 基本连接验证
- 连接字符串验证
- 连接超时处理
- 连接池管理
- 并发连接处理
- 连接复用效率
- 健康检查
- 错误恢复
- 事务隔离
- 连接生命周期管理

### 3. 数据库操作测试 (`integration/database-operations.test.ts`)
- CRUD 操作测试
- 关系查询测试
- 批量操作测试
- 复杂查询测试
- 事务操作测试
- 错误处理测试
- 性能测试
- 并发操作测试

### 4. 缓存功能测试 (`cache.test.ts`)
- 缓存键生成
- 缓存 TTL 管理
- 缓存失效策略
- 缓存性能测试
- 错误处理
- 缓存一致性
- 并发缓存操作

## 运行测试

### 开发环境运行

```bash
# 在项目根目录
pnpm test:db

# 或直接在 db 包目录运行
cd packages/db
pnpm test
```

### 监听模式运行

```bash
pnpm test:db --watch
```

### 运行特定测试文件

```bash
# 只运行 Prisma schema 测试
pnpm test:db prisma.test.ts

# 只运行集成测试
pnpm test:db integration/
```

### 生成覆盖率报告

```bash
pnpm test:db --coverage
```

### 运行特定测试模式

```bash
# 运行与缓存相关的测试
pnpm test:db -t "cache"

# 运行与性能相关的测试
pnpm test:db -t "performance"
```

## 测试工具

### TestDataFactory
生成测试数据的工厂类：
```typescript
const userData = TestDataFactory.createUser();
const postData = TestDataFactory.createPost(userId);
```

### DatabaseCleaner
数据库清理工具：
```typescript
await DatabaseCleaner.cleanAll();
await DatabaseCleaner.cleanUserData(userId);
```

### TestDatabase
测试数据库管理：
```typescript
const testDb = new TestDatabase();
await testDb.connect();
await testDb.seed(); // 创建测试数据
await testDb.reset(); // 重置数据库
```

### PerformanceTester
性能测试工具：
```typescript
const { result, duration } = await PerformanceTester.measureQuery(
  () => prisma.user.findMany(),
  "User Query"
);
```

### CacheMock
缓存模拟器：
```typescript
const cache = new CacheMock();
await cache.set("key", "value", 3600);
const value = await cache.get("key");
const stats = cache.getStats();
```

### DataValidator
数据验证工具：
```typescript
const isValid = DataValidator.isValidEmail("test@example.com");
const structure = DataValidator.validateRecordStructure(record, ['id', 'email']);
```

### ErrorHandler
错误处理工具：
```typescript
const errorInfo = ErrorHandler.handleDatabaseError(error);
const result = await ErrorHandler.retry(() => riskyOperation(), 3);
```

## 环境要求

### 测试数据库
- PostgreSQL 数据库连接
- 测试专用的数据库模式
- 环境变量：`TEST_DATABASE_URL` 或 `DATABASE_URL`

### Node.js 版本
- Node.js 18+
- TypeScript 5+

### 依赖包
- `@prisma/client`
- `vitest`
- `@types/node`

## 配置说明

### 测试配置 (`config.ts`)
- 测试超时：30秒
- 并发执行：最多4个线程
- 覆盖率阈值：80%
- 测试环境：Node.js

### 全局设置 (`setup.ts`)
- 自动连接数据库
- 测试前自动清理数据
- 测试后验证清理结果

## 最佳实践

1. **测试隔离**：每个测试都从干净状态开始
2. **数据工厂**：使用 `TestDataFactory` 生成一致的测试数据
3. **异步测试**：正确处理异步操作和清理
4. **错误处理**：测试正常流程和错误情况
5. **性能考虑**：监控测试执行时间
6. **并发安全**：确保测试在并发环境下稳定运行

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 环境变量
   - 确保数据库服务正在运行
   - 验证数据库权限

2. **测试超时**
   - 增加测试超时时间
   - 检查数据库性能
   - 优化查询性能

3. **清理失败**
   - 检查外键约束
   - 确保事务正确提交/回滚
   - 手动清理残留数据

4. **内存泄漏**
   - 确保所有数据库连接正确关闭
   - 清理缓存和定时器
   - 监控进程内存使用

### 调试技巧

```bash
# 启用详细输出
DEBUG=true pnpm test:db

# 单线程运行（避免并发问题）
pnpm test:db --no-threads

# 只运行失败的测试
pnpm test:db --reporter=verbose
```

## 持续集成

这些测试已配置在 CI/CD 流水线中：
- 自动运行所有测试
- 生成覆盖率报告
- 上传测试结果
- 在测试失败时阻止部署

## 贡献指南

添加新测试时请：
1. 遵循现有的目录结构和命名规范
2. 使用提供的测试工具和辅助函数
3. 确保测试覆盖正常流程和异常情况
4. 保持测试的独立性和可重复性
5. 更新相关文档