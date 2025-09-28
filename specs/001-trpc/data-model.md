# tRPC 基础设施数据模型

## 实体关系图

```
User (用户)
├── id: String (主键)
├── email: String (唯一)
├── name: String
├── role: Enum (ADMIN, USER)
└── createdAt: DateTime
    ↓ 1:N
Form (表单)
├── id: String (主键)
├── name: String
├── description: String?
├── version: String
├── metadata: Json (FormMetadata)
├── createdBy: String (外键 -> User.id)
├── createdAt: DateTime
├── updatedAt: DateTime
    ↓ 1:N
Submission (提交)
├── id: String (主键)
├── formId: String (外键 -> Form.id)
├── data: Json (提交数据)
├── submittedBy: String? (外键 -> User.id)
├── submittedAt: DateTime
├── ipAddress: String?
└── userAgent: String?
```

## 实体详细定义

### User (用户表)
**用途**: 存储系统用户信息，支持认证和权限管理

**字段**:
- `id`: 唯一标识符，CUID 格式
- `email`: 用户邮箱，唯一索引，用于登录
- `name`: 用户显示名称
- `role`: 用户角色 (ADMIN, USER)
- `createdAt`: 创建时间
- `updatedAt**: 最后更新时间

**验证规则**:
- Email 必须符合标准格式
- Name 长度 1-100 字符
- Role 必须为预定义枚举值

**状态转换**:
```
创建 → 活跃 → 禁用
       ↓
      删除
```

### Form (表单表)
**用途**: 存储表单定义和元数据，是系统的核心实体

**字段**:
- `id`: 唯一标识符，CUID 格式
- `name`: 表单名称，1-200 字符
- `description`: 表单描述，可选，最多 1000 字符
- `version`: 表单版本，遵循语义化版本
- `metadata`: JSON 格式的表单元数据 (FormMetadata)
- `createdBy`: 创建者用户 ID
- `createdAt`: 创建时间
- `updatedAt`: 最后更新时间

**验证规则**:
- Name 必须非空且唯一
- Version 遵循 SemVer 格式
- Metadata 必须符合 FormMetadata Schema
- CreatedBy 必须引用有效用户

**状态转换**:
```
草稿 → 发布 → 归档
  ↓
 删除
```

### Submission (提交表)
**用途**: 存储用户提交的表单数据

**字段**:
- `id`: 唯一标识符，CUID 格式
- `formId`: 关联的表单 ID
- `data`: JSON 格式的提交数据
- `submittedBy`: 提交用户 ID (可选，支持匿名提交)
- `submittedAt`: 提交时间
- `ipAddress`: 提交者 IP 地址 (可选)
- `userAgent`: 用户代理信息 (可选)

**验证规则**:
- FormId 必须引用有效表单
- Data 必须符合对应表单的 Schema
- SubmittedAt 不能晚于当前时间
- IP Address 和 UserAgent 格式验证

**状态转换**:
```
创建 → 处理中 → 完成
       ↓
      失败
```

## 类型定义

### FormMetadata 类型
```typescript
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

interface FormMetadata {
  version: string;
  fields: FormField[];
}
```

### API 响应类型
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}
```

## 关系和约束

### 外键约束
- `Form.createdBy` → `User.id` (CASCADE DELETE)
- `Submission.formId` → `Form.id` (CASCADE DELETE)
- `Submission.submittedBy` → `User.id` (SET NULL)

### 唯一约束
- `User.email` 必须唯一
- `Form.name` + `Form.version` 必须唯一

### 索引策略
- `User.email`: 唯一索引
- `Form.createdBy`: 普通索引
- `Form.createdAt`: 普通索引
- `Submission.formId`: 普通索引
- `Submission.submittedAt`: 普通索引

## 数据完整性

### 事务保证
- 表单创建和更新必须保持元数据一致性
- 提交创建时验证表单存在性
- 批量操作支持事务回滚

### 并发控制
- 乐观锁处理表单更新冲突
- 提交操作支持高并发
- 用户认证状态缓存

## 审计和追踪

### 操作日志
- 表单创建、更新、删除操作记录
- 用户认证和权限变更记录
- 敏感操作审计日志

### 数据版本
- 表单版本历史记录
- 重要数据变更追踪
- 回滚和恢复机制

## 性能考虑

### 查询优化
- 表单列表查询支持分页和过滤
- 提交数据查询支持索引优化
- 关联查询使用 Prisma include 优化

### 缓存策略
- 表单定义缓存
- 用户权限缓存
- API 响应缓存

这个数据模型为 tRPC 基础设施提供了坚实的基础，支持类型安全的数据库操作和 API 契约。