import type { ZodObject } from 'zod';

/**
 * 表单字段类型定义
 */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';

/**
 * 条件运算符
 */
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'starts_with' | 'ends_with' | 'not_empty' | 'in';

/**
 * 表单字段条件配置
 */
export interface FieldCondition {
  /** 依赖字段的 ID */
  fieldId: string;
  /** 判断操作符 */
  operator: ConditionOperator;
  /** 触发条件的值 */
  value: any;
}

/**
 * 选择器选项
 */
export interface SelectOption {
  label: string;
  value: string;
  group?: string;
}

/**
 * 表单字段定义
 */
export interface FormField {
  /** 字段的唯一ID，用于拖拽和 key */
  id: string;
  /** 字段的提交键名，也是 Zod Schema 的 key */
  name: string;
  /** 字段类型 */
  type: FieldType;
  /** 字段标签 */
  label: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 选择器选项（select 类型专用） */
  options?: SelectOption[];
  /** 条件显示逻辑 */
  condition?: FieldCondition;
  /** 验证规则 */
  validation?: {
    min?: string;
    max?: string;
    pattern?: string;
    custom?: any;
  };
  /** 默认值 */
  defaultValue?: any;
}

/**
 * 表单元数据定义
 */
export interface FormMetadata {
  /** 版本号，建议使用语义化版本 */
  version: string;
  /** 字段列表 */
  fields: FormField[];
}

/**
 * Schema 编译结果
 */
export interface CompilationResult {
  /** 编译是否成功 */
  success: boolean;
  /** 编译后的 Zod Schema */
  schema?: ZodObject<any>;
  /** 错误信息列表 */
  errors: CompilationError[];
}

/**
 * 编译错误信息
 */
export interface CompilationError {
  /** 错误字段 */
  field?: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: 'VALIDATION' | 'CIRCULAR_REFERENCE' | 'MISSING_OPTION' | 'UNKNOWN';
}

/**
 * 表单数据验证结果
 */
export interface ValidationResult {
  /** 验证是否成功 */
  success: boolean;
  /** 验证后的数据 */
  data?: Record<string, any>;
  /** 错误信息列表 */
  errors: ValidationError[];
}

/**
 * 验证错误信息
 */
export interface ValidationError {
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * Zod Schema 验证错误
 */
export interface ZodValidationError {
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 期望值 */
  expected?: string;
  /** 接收值 */
  received?: string;
}

/**
 * 表单可见性映射
 */
export interface VisibilityMap {
  [fieldId: string]: boolean;
}

/**
 * 表单配置选项
 */
export interface SchemaCompilerOptions {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存最大条目数 */
  cacheMaxSize?: number;
  /** 是否验证循环引用 */
  validateCircularReference?: boolean;
  /** 是否启用详细错误报告 */
  detailedErrors?: boolean;
}

// ========================================
// 数据库模型类型
// ========================================

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

/**
 * 提交状态枚举
 */
export enum SubmissionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * 用户模型
 */
export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  passwordHash?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 表单模型
 */
export interface Form {
  id: string;
  name: string;
  description?: string;
  version: string;
  metadata: FormMetadata;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  createdBy?: User;
  submissions: Submission[];
}

/**
 * 提交模型
 */
export interface Submission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  status: SubmissionStatus;
  submittedById?: string;
  submittedBy?: User;
  form: Form;
}

/**
 * 监控事件模型
 */
export interface MonitoringEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 错误日志模型
 */
export interface ErrorLog {
  id: string;
  eventId?: string;
  level: string;
  message: string;
  stack?: string;
  component?: string;
  path: string;
  userId?: string;
  sessionId: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 性能指标模型
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, any>;
  path: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  createdAt: Date;
}

/**
 * 用户活动模型
 */
export interface UserActivity {
  id: string;
  userId?: string;
  sessionId: string;
  action: string;
  element?: string;
  path: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

// ========================================
// API 类型
// ========================================

/**
 * 分页查询参数
 */
export interface PaginationParams {
  limit: number;
  cursor?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/**
 * API 响应基础类型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 表单创建输入
 */
export interface CreateFormInput {
  name: string;
  metadata: FormMetadata;
}

/**
 * 表单更新输入
 */
export interface UpdateFormInput {
  id: string;
  name?: string;
  metadata?: FormMetadata;
}

/**
 * 表单查询输入
 */
export interface GetFormsInput extends PaginationParams {
  search?: string;
  createdBy?: string;
}

/**
 * 提交创建输入
 */
export interface CreateSubmissionInput {
  formId: string;
  data: Record<string, any>;
}

/**
 * 提交查询输入
 */
export interface GetSubmissionsInput extends PaginationParams {
  formId: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 提交更新输入
 */
export interface UpdateSubmissionInput {
  id: string;
  data?: Record<string, any>;
  status?: SubmissionStatus;
}

/**
 * 提交统计输入
 */
export interface GetSubmissionStatsInput {
  formId?: string;
  days: number;
}

/**
 * 提交统计响应
 */
export interface SubmissionStats {
  totalSubmissions: number;
  recentSubmissions: number;
  averageProcessingTime: number;
  statusDistribution: {
    total: number;
    recent: number;
  };
}

// ========================================
// 组件 Props 类型
// ========================================

/**
 * 表单字段组件 Props
 */
export interface FormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 表单渲染器 Props
 */
export interface FormRendererProps {
  metadata: FormMetadata;
  initialValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onFieldChange?: (fieldId: string, value: any) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * 表单设计器 Props
 */
export interface FormDesignerProps {
  initialMetadata?: FormMetadata;
  onSave: (metadata: FormMetadata) => void;
  previewMode?: boolean;
  className?: string;
}

// ========================================
// 监控和性能类型
// ========================================

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  compilationTime: number;
  validationTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  errorCount: number;
}

/**
 * 监控事件类型
 */
export type MonitoringEventType = 'error' | 'performance' | 'user_action' | 'api_call';

/**
 * 错误级别
 */
export type ErrorLogLevel = 'error' | 'warn' | 'info';

// ========================================
// 认证和权限类型
// ========================================

/**
 * JWT 载荷
 */
export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * 上下文用户信息
 */
export interface ContextUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

/**
 * API 上下文
 */
export interface ApiContext {
  user?: ContextUser;
  prisma: any;
  sessionId: string;
}

// ========================================
// 类型定义完成
// ========================================
