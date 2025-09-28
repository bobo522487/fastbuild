# FastBuild API 规范文档

## 概述

FastBuild 采用统一的 tRPC 架构，提供类型安全的 API 调用和一致的错误处理。所有功能都通过 tRPC 端点提供，已完全弃用 REST API。

### 核心特性

- **类型安全**: 端到端的类型保障，从数据库到前端组件的完整类型链
- **错误处理**: 统一的错误处理机制，智能重试和用户友好消息
- **性能优化**: 智能缓存、批量请求和连接复用
- **安全性**: 速率限制、输入验证和 JWT 认证集成

## 基础架构

### 端点结构
```
POST /api/trpc/{procedure}
```

### 数据格式
- **请求**: JSON 格式，使用 superjson 序列化
- **响应**: JSON 格式，使用 superjson 序列化
- **错误**: 统一的错误格式，包含错误代码和消息

### 认证方式
使用 Bearer Token 认证：
```
Authorization: Bearer <access-token>
```

## 架构组件

### 服务端 (packages/api)

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
- **认证中间件**: JWT token 验证
- **速率限制中间件**: 防止 API 滥用
- **日志中间件**: 请求和响应日志记录

#### 程序类型
- `publicProcedure`: 公开访问，无认证
- `authProcedure`: 需要认证，默认速率限制
- `formProcedure`: 表单操作，严格速率限制
- `healthProcedure`: 健康检查，宽松速率限制

### 客户端 (apps/web)

#### tRPC Provider
- **自动配置**: QueryClient 和 tRPC 客户端集成
- **错误处理**: 全局错误监听和处理
- **缓存管理**: 智能缓存策略

#### 客户端类
- **ApiClient**: 类型安全的 API 调用封装
- **ApiErrorWrapper**: 统一的错误处理
- **safeApiCall**: 安全的 API 调用包装器

## API 端点

### 认证路由 (`auth`)

#### 登录
**端点**: `auth.login`
**方法**: `POST`
**认证**: 不需要

**请求**:
```typescript
{
  "email": string,        // 邮箱地址
  "password": string,     // 密码（至少6位）
  "rememberMe": boolean   // 是否记住我（可选，默认 false）
}
```

**响应**:
```typescript
{
  "success": true,
  "accessToken": string,
  "refreshToken": string,
  "user": {
    "id": string,
    "email": string,
    "name": string,
    "role": "USER" | "ADMIN"
  }
}
```

#### 注册
**端点**: `auth.register`
**方法**: `POST`
**认证**: 不需要

**请求**:
```typescript
{
  "email": string,        // 邮箱地址
  "password": string,     // 密码（至少6位）
  "name": string          // 用户名
}
```

**响应**:
```typescript
{
  "success": true,
  "accessToken": string,
  "refreshToken": string,
  "user": {
    "id": string,
    "email": string,
    "name": string,
    "role": "USER"
  }
}
```

#### 获取当前用户信息
**端点**: `auth.me`
**方法**: `POST`
**认证**: 需要

**请求**: `{}`

**响应**:
```typescript
{
  "id": string,
  "email": string,
  "name": string,
  "role": "USER" | "ADMIN",
  "isActive": boolean,
  "createdAt": string,
  "updatedAt": string
}
```

#### 刷新令牌
**端点**: `auth.refreshToken`
**方法**: `POST`
**认证**: 不需要

**请求**:
```typescript
{
  "refreshToken": string   // 刷新令牌
}
```

**响应**:
```typescript
{
  "accessToken": string,
  "refreshToken": string
}
```

#### 登出
**端点**: `auth.logout`
**方法**: `POST`
**认证**: 需要

**请求**: `{}`

**响应**:
```typescript
{
  "success": true
}
```

### 表单路由 (`form`)

#### 获取表单列表
**端点**: `form.list`
**方法**: `POST`
**认证**: 可选

**请求**:
```typescript
{
  "search": string,       // 搜索关键词（可选）
  "cursor": string,       // 分页游标（可选）
  "createdBy": string,    // 创建者 ID（可选）
  "limit": number         // 限制数量（可选，默认 10）
}
```

**响应**:
```typescript
{
  "items": Form[],
  "nextCursor": string | null,
  "total": number
}
```

#### 获取表单详情
**端点**: `form.getById`
**方法**: `POST`
**认证**: 可选

**请求**:
```typescript
{
  "id": string    // 表单 ID
}
```

**响应**:
```typescript
{
  "id": string,
  "name": string,
  "metadata": FormMetadata,
  "createdById": string,
  "createdBy": User,
  "createdAt": string,
  "updatedAt": string
}
```

#### 创建表单
**端点**: `form.create`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "name": string,           // 表单名称
  "metadata": FormMetadata // 表单元数据
}
```

**响应**:
```typescript
{
  "id": string,
  "name": string,
  "metadata": FormMetadata,
  "createdById": string,
  "createdAt": string,
  "updatedAt": string
}
```

#### 更新表单
**端点**: `form.update`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "id": string,            // 表单 ID
  "name": string,          // 表单名称（可选）
  "metadata": FormMetadata // 表单元数据（可选）
}
```

**响应**:
```typescript
{
  "id": string,
  "name": string,
  "metadata": FormMetadata,
  "createdById": string,
  "createdAt": string,
  "updatedAt": string
}
```

#### 删除表单
**端点**: `form.delete`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "id": string    // 表单 ID
}
```

**响应**:
```typescript
{
  "success": true
}
```

### 表单提交路由 (`submission`)

#### 获取表单提交列表
**端点**: `submission.getByFormId`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "formId": string,      // 表单 ID
  "cursor": string,      // 分页游标（可选）
  "limit": number,       // 限制数量（可选，默认 10）
  "startDate": string,   // 开始日期（可选）
  "endDate": string      // 结束日期（可选）
}
```

**响应**:
```typescript
{
  "items": Submission[],
  "nextCursor": string | null,
  "total": number
}
```

#### 创建表单提交
**端点**: `submission.create`
**方法**: `POST`
**认证**: 不需要

**请求**:
```typescript
{
  "formId": string,        // 表单 ID
  "data": Record<string, any> // 表单数据
}
```

**响应**:
```typescript
{
  "id": string,
  "formId": string,
  "data": Record<string, any>,
  "createdAt": string
}
```

### 健康检查路由 (`health`)

#### 系统健康检查
**端点**: `health.check`
**方法**: `POST`
**认证**: 不需要

**请求**: `{}`

**响应**:
```typescript
{
  "status": "healthy" | "unhealthy",
  "timestamp": string,
  "version": string,
  "database": {
    "status": "healthy" | "unhealthy",
    "latency": number
  }
}
```

### Schema 编译路由 (`schema`)

#### 编译表单 Schema
**端点**: `schema.compile`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "metadata": FormMetadata // 表单元数据
}
```

**响应**:
```typescript
{
  "success": true,
  "schema": string // 编译后的 Zod schema
}
```

#### 验证表单数据
**端点**: `schema.validate`
**方法**: `POST`
**认证**: 需要

**请求**:
```typescript
{
  "metadata": FormMetadata,    // 表单元数据
  "data": Record<string, any> // 待验证数据
}
```

**响应**:
```typescript
{
  "valid": boolean,
  "errors": ValidationError[] // 验证错误列表
}
```

## 数据类型

### FormMetadata
```typescript
interface FormMetadata {
  version: string;
  fields: FormField[];
}

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  condition?: {
    fieldId: string;
    operator: 'equals' | 'not_equals';
    value: any;
  };
  defaultValue?: any;
}
```

### Form
```typescript
interface Form {
  id: string;
  name: string;
  metadata: FormMetadata;
  createdById: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}
```

### Submission
```typescript
interface Submission {
  id: string;
  formId: string;
  data: Record<string, any>;
  createdAt: string;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## 错误处理

### 错误格式
```typescript
{
  "code": string,           // 错误代码
  "message": string,       // 错误消息
  "data": {                // 错误详情
    "code": string,         // HTTP 状态码
    "path": string,         // 错误路径
    "stack": string         // 堆栈跟踪（开发环境）
  }
}
```

### 错误代码
- `UNAUTHORIZED`: 未授权
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 数据验证失败
- `INTERNAL_SERVER_ERROR`: 服务器内部错误
- `BAD_REQUEST`: 请求格式错误
- `CONFLICT`: 资源冲突
- `RATE_LIMITED`: 速率限制
- `NETWORK_ERROR`: 网络错误
- `TIMEOUT_ERROR`: 超时错误

### 错误处理策略

1. **认证错误**: 立即失败，引导用户登录
2. **权限错误**: 立即失败，显示权限不足消息
3. **验证错误**: 立即失败，显示输入错误详情
4. **网络错误**: 自动重试，最多3次
5. **服务器错误**: 自动重试，最多3次
6. **速率限制**: 延迟重试，指数退避

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

## 使用示例

### Hook 使用方式
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

### ApiClient 使用方式
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

### 自定义 Hook 使用方式
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

## 性能优化

### 缓存策略
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

### 批量请求
tRPC 自动将多个请求合并为单个 HTTP 请求，减少网络开销。

### 预取数据
```typescript
// 预取相关数据
const utils = trpc.useUtils();

// 在创建表单后预取表单列表
await utils.form.list.invalidate();
```

## 速率限制

### 认证端点
- **登录**: 5 次/分钟
- **注册**: 3 次/分钟
- **令牌刷新**: 10 次/分钟

### 表单端点
- **创建**: 20 次/分钟
- **更新**: 50 次/分钟
- **删除**: 30 次/分钟

### 表单提交端点
- **提交**: 100 次/分钟

### 健康检查
- **检查**: 60 次/分钟

## 部署和配置

### 环境变量
```bash
# 数据库配置
DATABASE_URL="postgresql://..."

# JWT 配置
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# WebSocket 配置
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

### 速率限制配置
```typescript
// 认证端点：每分钟5次
authProcedure: 5 requests/minute

// 表单端点：每分钟10次
formProcedure: 10 requests/minute

// 健康检查：每分钟60次
healthProcedure: 60 requests/minute
```

## 开发指南

### 添加新的 API 端点
1. 在对应的路由器文件中添加新的 procedure
2. 确保使用适当的中间件（authProcedure, formProcedure 等）
3. 添加输入和输出的 Zod schema 验证
4. 更新客户端 ApiClient 类
5. 编写相应的测试

### 错误处理最佳实践
- 使用适当的 procedure 类型
- 为所有可能的错误情况提供明确的错误消息
- 在前端使用 safeApiCall 进行错误处理
- 实现适当的重试策略

### 类型安全最佳实践
- 始终使用 Zod schema 进行输入验证
- 利用 TypeScript 的类型推断
- 避免使用 `any` 类型
- 为复杂的 API 响应定义明确的类型

## 监控和日志

### 请求日志
所有 tRPC 请求都会自动记录日志，包括：
- 请求路径和参数
- 响应状态和时间
- 错误信息和堆栈

### 性能监控
- 请求响应时间
- 缓存命中率
- 错误率统计
- 并发连接数

### 错误监控
- 错误类型分布
- 错误频率统计
- 用户影响分析
- 自动错误报告

## 最佳实践

### 认证管理
- 使用 HTTPS 传输敏感信息
- 定期刷新访问令牌
- 妥善存储刷新令牌
- 登出时清除本地令牌

### 数据验证
- 前端进行基本验证
- 依赖后端进行完整验证
- 处理验证错误并提供友好提示

### 错误处理
- 捕获所有 API 错误
- 提供用户友好的错误消息
- 记录错误以便调试
- 区分网络错误和业务错误

### 安全考虑
- 不要在前端暴露敏感信息
- 使用适当的 HTTP 头
- 实现跨站请求伪造保护
- 定期更新依赖项

## 总结

FastBuild 的 tRPC 架构提供了：
- **类型安全**: 端到端的类型保障
- **错误处理**: 统一的错误处理机制
- **性能优化**: 智能缓存和批量请求
- **开发体验**: 简洁的 API 和自动完成
- **可维护性**: 清晰的代码结构和文档

这个架构为构建高性能、类型安全的 Web 应用提供了坚实的基础。