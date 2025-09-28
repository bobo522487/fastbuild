# FastBuild API 架构文档

## 概述

FastBuild 采用统一的 tRPC 架构，提供类型安全的 API 调用和一致的错误处理。本架构已完全弃用 REST API，所有功能都通过 tRPC 端点提供。

## 核心特性

### 1. 类型安全
- **端到端类型安全**：从数据库到前端组件的完整类型链
- **自动类型推断**：无需手动维护类型定义
- **编译时错误检查**：减少运行时错误

### 2. 错误处理
- **统一错误格式**：所有 API 错误都遵循标准格式
- **智能重试机制**：根据错误类型自动重试或失败
- **用户友好消息**：自动将技术错误转换为用户友好的消息

### 3. 性能优化
- **批量请求**：自动合并多个请求为单个 HTTP 请求
- **请求缓存**：智能缓存策略减少不必要的请求
- **连接复用**：WebSocket 和 HTTP 连接的智能管理

### 4. 安全性
- **速率限制**：针对不同端点的细粒度速率限制
- **输入验证**：Zod schema 确保数据完整性
- **认证集成**：JWT token 自动管理

## 架构组件

### 1. 服务端 (packages/api)

#### 路由器结构
```typescript
// 主路由器
appRouter = {
  form: formRouter,        // 表单管理
  auth: authRouter,        // 用户认证
  submission: submissionRouter, // 表单提交
  health: healthRouter,    // 健康检查
  schema: schemaRouter,    // Schema 编译
}
```

#### 中间件
- **认证中间件**：JWT token 验证
- **速率限制中间件**：防止 API 滥用
- **日志中间件**：请求和响应日志记录

#### 程序类型
- `publicProcedure`：公开访问，无认证
- `authProcedure`：需要认证，默认速率限制
- `formProcedure`：表单操作，严格速率限制
- `healthProcedure`：健康检查，宽松速率限制

### 2. 客户端 (apps/web)

#### tRPC Provider
- **自动配置**：QueryClient 和 tRPC 客户端集成
- **错误处理**：全局错误监听和处理
- **缓存管理**：智能缓存策略

#### 客户端类
- **ApiClient**：类型安全的 API 调用封装
- **ApiErrorWrapper**：统一的错误处理
- **safeApiCall**：安全的 API 调用包装器

## API 端点

### 表单管理 (form)

#### 查询操作
```typescript
// 获取表单列表
trpc.form.list.query(input?: {
  limit?: number;
  offset?: number;
  search?: string;
})

// 根据ID获取表单
trpc.form.getById.query(input: {
  id: string;
})

// 获取表单提交数据
trpc.form.getSubmissions.query(input: {
  formId: string;
  limit?: number;
  offset?: number;
})
```

#### 变更操作
```typescript
// 创建表单
trpc.form.create.mutate(input: {
  name: string;
  metadata: FormMetadata;
})

// 更新表单
trpc.form.update.mutate(input: {
  id: string;
  name?: string;
  metadata?: FormMetadata;
})

// 删除表单
trpc.form.delete.mutate(input: {
  id: string;
})
```

### 用户认证 (auth)

#### 查询操作
```typescript
// 获取当前用户
trpc.auth.me.query()

// 获取用户列表（管理员）
trpc.auth.listUsers.query(input?: {
  limit?: number;
  offset?: number;
  search?: string;
})
```

#### 变更操作
```typescript
// 用户登录
trpc.auth.login.mutate(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
})

// 用户注册
trpc.auth.register.mutate(input: {
  email: string;
  password: string;
  name?: string;
})

// 刷新令牌
trpc.auth.refreshToken.mutate(input: {
  refreshToken: string;
})

// 用户登出
trpc.auth.logout.mutate()
```

### 表单提交 (submission)

#### 查询操作
```typescript
// 获取提交详情
trpc.submission.getById.query(input: {
  id: string;
})

// 根据表单ID获取提交列表
trpc.submission.getByFormId.query(input: {
  formId: string;
  limit?: number;
  offset?: number;
})

// 获取提交统计
trpc.submission.getStats.query(input: {
  formId: string;
})
```

#### 变更操作
```typescript
// 提交表单
trpc.submission.create.mutate(input: {
  formId: string;
  data: Record<string, any>;
})

// 更新提交
trpc.submission.update.mutate(input: {
  id: string;
  data?: Record<string, any>;
})

// 删除提交
trpc.submission.delete.mutate(input: {
  id: string;
})

// 批量删除提交
trpc.submission.bulkDelete.mutate(input: {
  ids: string[];
})
```

### 健康检查 (health)

```typescript
// 基础健康检查
trpc.health.check.query()

// 数据库健康检查
trpc.health.database.query()

// 系统信息
trpc.health.info.query()
```

### Schema 编译 (schema)

#### 查询操作
```typescript
// 获取字段类型定义
trpc.schema.getFieldTypes.query()
```

#### 变更操作
```typescript
// 编译表单 Schema
trpc.schema.compile.mutate(input: {
  metadata: FormMetadata;
})

// 验证表单数据
trpc.schema.validate.mutate(input: {
  metadata: FormMetadata;
  data: Record<string, any>;
})
```

## 使用示例

### 1. 组件中使用 Hook

```typescript
import { trpc } from '@/trpc/provider';

function FormList() {
  const { data: forms, isLoading, error } = trpc.form.list.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {forms?.map(form => (
        <li key={form.id}>{form.name}</li>
      ))}
    </ul>
  );
}
```

### 2. 使用 ApiClient

```typescript
import { ApiClient, safeApiCall } from '@/lib/api-client';

async function handleFormSubmit(formData: any) {
  const result = await safeApiCall(() =>
    ApiClient.submission.create({
      formId: 'form-id',
      data: formData,
    })
  );

  if (result.success) {
    console.log('提交成功:', result.data);
  } else {
    console.error('提交失败:', result.error.userMessage);
    if (result.error.isAuthError()) {
      // 处理认证错误
    }
  }
}
```

### 3. 使用自定义 Hook

```typescript
import { useFormSubmission } from '@/trpc/provider';

function FormComponent({ formId }: { formId: string }) {
  const { submitForm, getSubmissions } = useFormSubmission(formId);
  const { data: submissions } = getSubmissions();

  const handleSubmit = async (data: any) => {
    try {
      await submitForm(data);
      alert('提交成功！');
    } catch (error) {
      alert('提交失败：' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
    </form>
  );
}
```

## 错误处理

### 错误类型

```typescript
// 错误代码枚举
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};
```

### 错误处理策略

1. **认证错误**：立即失败，引导用户登录
2. **权限错误**：立即失败，显示权限不足消息
3. **验证错误**：立即失败，显示输入错误详情
4. **网络错误**：自动重试，最多3次
5. **服务器错误**：自动重试，最多3次
6. **速率限制**：延迟重试，指数退避

### 全局错误监听

```typescript
import { ErrorHandler } from '@/trpc/error-handling';

// 添加全局错误监听器
const errorHandler = ErrorHandler.getInstance();

const unsubscribe = errorHandler.onError((error) => {
  console.log('Global error:', error);
  if (error.code === 'UNAUTHORIZED') {
    // 跳转到登录页面
    window.location.href = '/login';
  }
});

// 清理监听器
// unsubscribe();
```

## 性能优化

### 1. 请求缓存

```typescript
// 配置缓存策略
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000,   // 10分钟
    },
  },
});
```

### 2. 批量请求

tRPC 自动将多个请求合并为单个 HTTP 请求，减少网络开销。

### 3. 预取数据

```typescript
// 预取相关数据
const utils = trpc.useUtils();

// 在创建表单后预取表单列表
await utils.form.list.invalidate();
```

## 部署和配置

### 1. 环境变量

```bash
# 数据库配置
DATABASE_URL="postgresql://..."

# JWT 配置
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# WebSocket 配置
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

### 2. 速率限制配置

```typescript
// 认证端点：每分钟5次
authProcedure: 5 requests/minute

// 表单端点：每分钟10次
formProcedure: 10 requests/minute

// 健康检查：每分钟60次
healthProcedure: 60 requests/minute
```

## 开发指南

### 1. 添加新的 API 端点

1. 在对应的路由器文件中添加新的 procedure
2. 确保使用适当的中间件（authProcedure, formProcedure 等）
3. 添加输入和输出的 Zod schema 验证
4. 更新客户端 ApiClient 类
5. 编写相应的测试

### 2. 错误处理最佳实践

- 使用适当的 procedure 类型
- 为所有可能的错误情况提供明确的错误消息
- 在前端使用 safeApiCall 进行错误处理
- 实现适当的重试策略

### 3. 类型安全最佳实践

- 始终使用 Zod schema 进行输入验证
- 利用 TypeScript 的类型推断
- 避免使用 `any` 类型
- 为复杂的 API 响应定义明确的类型

## 监控和日志

### 1. 请求日志

所有 tRPC 请求都会自动记录日志，包括：
- 请求路径和参数
- 响应状态和时间
- 错误信息和堆栈

### 2. 性能监控

- 请求响应时间
- 缓存命中率
- 错误率统计
- 并发连接数

### 3. 错误监控

- 错误类型分布
- 错误频率统计
- 用户影响分析
- 自动错误报告

## 总结

FastBuild 的 tRPC 架构提供了：
- **类型安全**：端到端的类型保障
- **错误处理**：统一的错误处理机制
- **性能优化**：智能缓存和批量请求
- **开发体验**：简洁的 API 和自动完成
- **可维护性**：清晰的代码结构和文档

这个架构为构建高性能、类型安全的 Web 应用提供了坚实的基础。