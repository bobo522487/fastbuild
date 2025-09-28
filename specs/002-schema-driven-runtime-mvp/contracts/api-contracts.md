# API合同规范：Schema驱动运行时MVP

**版本**: 1.0.0
**创建日期**: 2025-09-28
**分支**: 002-schema-driven-runtime-mvp

## 📋 概述

本文档定义了Schema驱动表单系统的API合同，包括前端组件API、后端服务API和内部接口规范。所有API都遵循类型安全原则，使用TypeScript和Zod进行严格验证。

## 🎯 设计原则

### 1. 类型安全优先
- 所有API都提供完整的TypeScript类型定义
- 使用Zod Schema进行运行时验证
- 确保编译时和运行时类型一致性

### 2. 错误处理标准化
- 统一的错误格式和状态码
- 详细的错误信息和恢复建议
- 支持错误追踪和调试

### 3. 性能优化
- 支持批量操作和缓存
- 异步处理和流式响应
- 合理的超时和重试机制

## 🖥️ 前端组件API

### 1. DynamicFormRenderer组件

#### Props接口

```typescript
interface DynamicFormRendererProps {
  /** 表单元数据 */
  metadata: FormMetadata;
  /** 提交处理函数 */
  onSubmit: (data: Record<string, any>) => Promise<void>;
  /** 加载状态 */
  isLoading?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 字段可见性覆盖 */
  fieldVisibility?: Record<string, boolean>;
  /** 初始值 */
  initialValues?: Record<string, any>;
  /** 验证模式 */
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  /** 提交模式 */
  submitMode?: 'immediate' | 'manual';
}
```

#### Events回调

```typescript
interface DynamicFormRendererEvents {
  /** 字段值变化 */
  onFieldChange?: (fieldId: string, value: any, context: FieldChangeContext) => void;
  /** 字段验证状态变化 */
  onValidationChange?: (fieldId: string, isValid: boolean, errors: string[]) => void;
  /** 表单重置 */
  onReset?: () => void;
  /** 提交开始 */
  onSubmitStart?: () => void;
  /** 提交完成 */
  onSubmitComplete?: (result: SubmitResult) => void;
  /** 提交错误 */
  onSubmitError?: (error: SubmitError) => void;
}

interface FieldChangeContext {
  metadata: FormMetadata;
  values: Record<string, any>;
  timestamp: Date;
}
```

### 2. FormProvider Context

#### Context接口

```typescript
interface FormContext {
  /** 当前表单元数据 */
  metadata: FormMetadata | null;
  /** 表单值 */
  values: Record<string, any>;
  /** 验证状态 */
  validation: FormValidationState;
  /** 提交状态 */
  submission: FormSubmissionState;
  /** 加载表单元数据 */
  loadMetadata: (metadata: FormMetadata) => void;
  /** 更新字段值 */
  updateFieldValue: (fieldId: string, value: any) => void;
  /** 提交表单 */
  submitForm: (data?: Record<string, any>) => Promise<SubmitResult>;
  /** 重置表单 */
  resetForm: () => void;
  /** 验证表单 */
  validateForm: () => Promise<FormValidationResult>;
}

interface FormValidationState {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string[]>;
  touchedFields: Set<string>;
}

interface FormSubmissionState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  lastSubmitTime?: Date;
  lastSubmitResult?: SubmitResult;
}
```

### 3. SchemaCompiler API

#### 编译接口

```typescript
interface SchemaCompiler {
  /** 编译FormMetadata为Zod Schema */
  compile(metadata: FormMetadata): z.ZodSchema<any>;
  /** 编译单个字段 */
  compileField(field: FormField): z.ZodTypeAny;
  /** 验证数据 */
  validate(schema: z.ZodSchema<any>, data: any): ValidationResult;
  /** 获取字段默认值 */
  getDefaults(metadata: FormMetadata): Record<string, any>;
  /** 清理缓存 */
  clearCache(): void;
}

interface ValidationResult {
  success: boolean;
  data?: any;
  error?: z.ZodError;
  issues?: z.ZodIssue[];
}
```

## 🔌 后端服务API

### 1. FormRouter (tRPC)

#### Query接口

```typescript
interface FormRouter {
  /** 获取表单列表 */
  list: {
    input: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'updatedAt' | 'name';
      sortOrder?: 'asc' | 'desc';
    };
    output: {
      forms: FormListItem[];
      total: number;
      hasMore: boolean;
    };
  };

  /** 获取表单详情 */
  getById: {
    input: { id: string };
    output: FormDetail;
  };

  /** 获取表单提交记录 */
  getSubmissions: {
    input: {
      formId: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    };
    output: {
      submissions: SubmissionListItem[];
      total: number;
    };
  };
}

interface FormListItem {
  id: string;
  name: string;
  version: string;
  description?: string;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
  submissionCount: number;
}

interface FormDetail {
  id: string;
  name: string;
  version: string;
  description?: string;
  metadata: FormMetadata;
  createdAt: Date;
  updatedAt: Date;
  submissions: SubmissionListItem[];
}
```

#### Mutation接口

```typescript
interface FormRouter {
  /** 创建表单 */
  create: {
    input: {
      name: string;
      description?: string;
      metadata: FormMetadata;
    };
    output: FormDetail;
  };

  /** 更新表单 */
  update: {
    input: {
      id: string;
      name?: string;
      description?: string;
      metadata?: FormMetadata;
    };
    output: FormDetail;
  };

  /** 删除表单 */
  delete: {
    input: { id: string };
    output: { success: boolean };
  };

  /** 验证表单配置 */
  validate: {
    input: { metadata: FormMetadata };
    output: ValidationResult;
  };
}
```

### 2. SubmissionRouter (tRPC)

#### Mutation接口

```typescript
interface SubmissionRouter {
  /** 提交表单数据 */
  create: {
    input: {
      formId: string;
      data: Record<string, any>;
      metadata?: {
        userAgent?: string;
        ipAddress?: string;
        referrer?: string;
      };
    };
    output: SubmissionDetail;
  };

  /** 批量提交 */
  createBatch: {
    input: {
      submissions: Array<{
        formId: string;
        data: Record<string, any>;
      }>;
    };
    output: SubmissionBatchResult;
  };

  /** 更新提交记录 */
  update: {
    input: {
      id: string;
      data?: Record<string, any>;
      status?: SubmissionStatus;
    };
    output: SubmissionDetail;
  };

  /** 删除提交记录 */
  delete: {
    input: { id: string };
    output: { success: boolean };
  };
}

interface SubmissionDetail {
  id: string;
  formId: string;
  data: Record<string, any>;
  status: SubmissionStatus;
  metadata?: SubmissionMetadata;
  createdAt: Date;
  updatedAt: Date;
  validation?: ValidationResult;
}

interface SubmissionBatchResult {
  successful: SubmissionDetail[];
  failed: Array<{
    submission: any;
    error: string;
  }>;
  total: number;
}
```

### 3. SchemaRouter (tRPC)

#### Query接口

```typescript
interface SchemaRouter {
  /** 编译Schema */
  compile: {
    input: { metadata: FormMetadata };
    output: {
      schema: string; // JSON格式的Zod Schema
      validationRules: ValidationRule[];
    };
  };

  /** 验证数据 */
  validate: {
    input: {
      metadata: FormMetadata;
      data: Record<string, any>;
    };
    output: ValidationResult;
  };

  /** 获取Schema统计信息 */
  getStats: {
    input: { metadata: FormMetadata };
    output: SchemaStats;
  };
}

interface ValidationRule {
  fieldId: string;
  type: string;
  params: Record<string, any>;
  message: string;
}

interface SchemaStats {
  fieldCount: number;
  validationRuleCount: number;
  conditionalFieldCount: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
}
```

## 📊 数据结构规范

### 1. 标准响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string; // 仅开发环境
}
```

### 2. 错误代码规范

```typescript
enum ApiErrorCode {
  // 表单相关错误
  FORM_NOT_FOUND = 'FORM_NOT_FOUND',
  FORM_VALIDATION_ERROR = 'FORM_VALIDATION_ERROR',
  FORM_VERSION_CONFLICT = 'FORM_VERSION_CONFLICT',

  // 提交相关错误
  SUBMISSION_INVALID = 'SUBMISSION_INVALID',
  SUBMISSION_DUPLICATE = 'SUBMISSION_DUPLICATE',
  SUBMISSION_PROCESSING_ERROR = 'SUBMISSION_PROCESSING_ERROR',

  // Schema相关错误
  SCHEMA_COMPILATION_ERROR = 'SCHEMA_COMPILATION_ERROR',
  SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR',
  SCHEMA_TOO_COMPLEX = 'SCHEMA_TOO_COMPLEX',

  // 通用错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### 3. 分页响应格式

```typescript
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}
```

## 🔐 安全规范

### 1. 输入验证

```typescript
interface SecurityValidation {
  /** SQL注入检测 */
  sqlInjection: (value: string) => boolean;
  /** XSS攻击检测 */
  xss: (value: string) => boolean;
  /** 文件类型验证 */
  fileType: (file: File, allowedTypes: string[]) => boolean;
  /** 文件大小验证 */
  fileSize: (file: File, maxSize: number) => boolean;
}
```

### 2. 认证和授权

```typescript
interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  expiresAt: Date;
}

interface AccessControl {
  canReadForm: (formId: string, context: AuthContext) => boolean;
  canWriteForm: (formId: string, context: AuthContext) => boolean;
  canDeleteForm: (formId: string, context: AuthContext) => boolean;
  canSubmitForm: (formId: string, context: AuthContext) => boolean;
}
```

## 🔄 事件规范

### 1. 表单事件

```typescript
interface FormEvent {
  type: 'created' | 'updated' | 'deleted' | 'submitted';
  formId: string;
  timestamp: Date;
  userId?: string;
  data?: any;
}

interface FormEventHandler {
  handle(event: FormEvent): Promise<void>;
}
```

### 2. 监控事件

```typescript
interface MonitoringEvent {
  type: 'performance' | 'error' | 'usage';
  metric: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}
```

## 📝 版本控制

### 1. API版本策略

- **主版本**: 破坏性变更（如删除字段、改变数据结构）
- **次版本**: 新增功能、非破坏性改进
- **补丁版本**: 错误修复、文档更新

### 2. 兼容性保证

- 同一主版本内保持向后兼容
- 废弃功能提供至少一个次要版本的迁移期
- 提供版本迁移工具和文档

---

**文档状态**: 设计完成
**审核状态**: 待审核
**下一步**: 创建快速开始指南