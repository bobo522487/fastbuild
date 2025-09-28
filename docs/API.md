# FastBuild API 文档

## 概述

FastBuild 使用 tRPC v10 作为主要的 API 架构，提供类型安全的端到端通信。所有 API 端点都通过 `/api/trpc` 路径暴露。

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

## 认证路由 (`auth`)

### 登录
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

### 注册
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

### 获取当前用户信息
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

### 刷新令牌
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

### 登出
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

## 表单路由 (`form`)

### 获取表单列表
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

### 获取表单详情
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

### 创建表单
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

### 更新表单
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

### 删除表单
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

## 表单提交路由 (`submission`)

### 获取表单提交列表
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

### 创建表单提交
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

## 健康检查路由 (`health`)

### 系统健康检查
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

### 常见错误代码
- `UNAUTHORIZED`: 未授权
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 数据验证失败
- `INTERNAL_SERVER_ERROR`: 服务器内部错误
- `BAD_REQUEST`: 请求格式错误
- `CONFLICT`: 资源冲突

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

## 前端集成

### 基本使用
```typescript
import { trpc } from '@/trpc/provider';

// 获取用户信息
const { data: user } = trpc.auth.me.useQuery();

// 登录
const loginMutation = trpc.auth.login.useMutation();
const handleLogin = async (credentials) => {
  const result = await loginMutation.mutateAsync(credentials);
  // 处理登录结果
};

// 获取表单列表
const { data: forms } = trpc.form.list.useQuery({
  search: 'my-form',
  limit: 10
});

// 创建表单提交
const submitMutation = trpc.submission.create.useMutation();
const handleSubmit = async (formData) => {
  const result = await submitMutation.mutateAsync({
    formId: 'form-id',
    data: formData
  });
  // 处理提交结果
};
```

### 错误处理
```typescript
import { useErrorHandler } from '@/trpc/error-handling';

const { handleError } = useErrorHandler();

try {
  const result = await trpc.auth.login.mutate(credentials);
} catch (error) {
  handleError(error);
  // 显示用户友好的错误消息
}
```

## 最佳实践

### 1. 认证管理
- 使用 HTTPS 传输敏感信息
- 定期刷新访问令牌
- 妥善存储刷新令牌
- 登出时清除本地令牌

### 2. 数据验证
- 前端进行基本验证
- 依赖后端进行完整验证
- 处理验证错误并提供友好提示

### 3. 错误处理
- 捕获所有 API 错误
- 提供用户友好的错误消息
- 记录错误以便调试
- 区分网络错误和业务错误

### 4. 性能优化
- 使用查询缓存
- 实现数据预取
- 避免重复请求
- 处理离线状态

### 5. 安全考虑
- 不要在前端暴露敏感信息
- 使用适当的 HTTP 头
- 实现跨站请求伪造保护
- 定期更新依赖项

## 开发指南

### 本地开发
1. 启动开发服务器：
```bash
pnpm dev
```

2. API 将在 `http://localhost:3000/api/trpc` 上可用

### 测试
```bash
# 运行测试
pnpm test

# 运行特定测试
pnpm test auth
```

### 部署
1. 构建应用：
```bash
pnpm build
```

2. 部署到生产环境

## 版本历史

### v1.0.0
- 初始版本
- 基本的认证功能
- 表单管理和提交
- 健康检查端点
- 速率限制支持

## 支持

如有问题或建议，请：
1. 查看文档
2. 检查常见问题
3. 提交 Issue
4. 联系开发团队