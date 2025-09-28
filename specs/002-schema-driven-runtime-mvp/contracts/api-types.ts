// API类型定义合同：Schema驱动运行时MVP
// 版本: 1.0.0
// 分支: 002-schema-driven-runtime-mvp

import { z } from 'zod';

// API响应基础结构
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.any().optional(),
  metadata: z.object({
    timestamp: z.date(),
    requestId: z.string(),
    version: z.string().default('1.0.0')
  }).optional()
});

export type ApiResponse<T = any> = Omit<z.infer<typeof ApiResponseSchema>, 'data'> & {
  data?: T;
};

// API错误结构
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  stack: z.string().optional(),
  timestamp: z.date()
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// API错误代码枚举
export const ApiErrorCodeSchema = z.enum([
  // 表单相关错误
  'FORM_NOT_FOUND',
  'FORM_VALIDATION_ERROR',
  'FORM_VERSION_CONFLICT',
  'FORM_SCHEMA_ERROR',

  // 提交相关错误
  'SUBMISSION_INVALID',
  'SUBMISSION_DUPLICATE',
  'SUBMISSION_PROCESSING_ERROR',
  'SUBMISSION_NOT_FOUND',

  // Schema相关错误
  'SCHEMA_COMPILATION_ERROR',
  'SCHEMA_VALIDATION_ERROR',
  'SCHEMA_TOO_COMPLEX',
  'SCHEMA_NOT_SUPPORTED',

  // 验证相关错误
  'VALIDATION_ERROR',
  'VALIDATION_FAILED',
  'VALIDATION_TIMEOUT',

  // 认证相关错误
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',

  // 限流相关错误
  'RATE_LIMITED',
  'QUOTA_EXCEEDED',

  // 通用错误
  'INTERNAL_ERROR',
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'SERVICE_UNAVAILABLE'
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

// 分页参数
export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// 分页响应
export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  data: z.object({
    items: z.array(z.any()),
    pagination: PaginationMetaSchema,
    filters: z.record(z.any()).optional(),
    sort: z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc'])
    }).optional()
  })
});

export type PaginatedResponse<T = any> = Omit<z.infer<typeof PaginatedResponseSchema>, 'data'> & {
  data: {
    items: T[];
    pagination: PaginationMeta;
    filters?: Record<string, any>;
    sort?: { field: string; order: 'asc' | 'desc' };
  };
};

// 表单相关类型
export const FormListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  fieldCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  submissionCount: z.number().default(0),
  status: z.enum(['active', 'inactive', 'draft']).default('active')
});

export type FormListItem = z.infer<typeof FormListItemSchema>;

export const FormDetailSchema = FormListItemSchema.extend({
  metadata: z.any(), // FormMetadata
  config: z.any().optional(), // FormUIConfig
  schema: z.string().optional(), // JSON string of compiled schema
  permissions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

export type FormDetail = z.infer<typeof FormDetailSchema>;

// 表单创建参数
export const CreateFormParamsSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metadata: z.any(), // FormMetadata
  config: z.any().optional(), // FormUIConfig
  tags: z.array(z.string()).optional()
});

export type CreateFormParams = z.infer<typeof CreateFormParamsSchema>;

// 表单更新参数
export const UpdateFormParamsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  metadata: z.any().optional(), // FormMetadata
  config: z.any().optional(), // FormUIConfig
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional()
});

export type UpdateFormParams = z.infer<typeof UpdateFormParamsSchema>;

// 表单查询参数
export const FormQueryParamsSchema = PaginationParamsSchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'submissionCount']).default('createdAt')
});

export type FormQueryParams = z.infer<typeof FormQueryParamsSchema>;

// 提交相关类型
export const SubmissionStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
]);

export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionMetadataSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  referrer: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  device: z.object({
    type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    os: z.string().optional(),
    browser: z.string().optional()
  }).optional()
});

export type SubmissionMetadata = z.infer<typeof SubmissionMetadataSchema>;

export const SubmissionDetailSchema = z.object({
  id: z.string(),
  formId: z.string(),
  data: z.record(z.any()),
  status: SubmissionStatusSchema.default('pending'),
  metadata: SubmissionMetadataSchema.optional(),
  validation: z.any().optional(), // ValidationResult
  processedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  form: FormDetailSchema.optional()
});

export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

export const SubmissionListItemSchema = SubmissionDetailSchema.omit({ form: true });

export type SubmissionListItem = z.infer<typeof SubmissionListItemSchema>;

// 提交创建参数
export const CreateSubmissionParamsSchema = z.object({
  formId: z.string(),
  data: z.record(z.any()),
  metadata: SubmissionMetadataSchema.optional()
});

export type CreateSubmissionParams = z.infer<typeof CreateSubmissionParamsSchema>;

// 提交更新参数
export const UpdateSubmissionParamsSchema = z.object({
  data: z.record(z.any>).optional(),
  status: SubmissionStatusSchema.optional(),
  metadata: SubmissionMetadataSchema.optional()
});

export type UpdateSubmissionParams = z.infer<typeof UpdateSubmissionParamsSchema>;

// 提交查询参数
export const SubmissionQueryParamsSchema = PaginationParamsSchema.extend({
  formId: z.string().optional(),
  status: SubmissionStatusSchema.optional(),
  userId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt')
});

export type SubmissionQueryParams = z.infer<typeof SubmissionQueryParamsSchema>;

// 批量提交参数
export const BatchSubmissionParamsSchema = z.object({
  submissions: z.array(CreateSubmissionParamsSchema)
});

export type BatchSubmissionParams = z.infer<typeof BatchSubmissionParamsSchema>;

export const BatchSubmissionResultSchema = z.object({
  successful: z.array(SubmissionDetailSchema),
  failed: z.array(z.object({
    submission: CreateSubmissionParamsSchema,
    error: z.string()
  })),
  total: z.number(),
  processed: z.number()
});

export type BatchSubmissionResult = z.infer<typeof BatchSubmissionResultSchema>;

// Schema相关类型
export const SchemaCompileParamsSchema = z.object({
  metadata: z.any() // FormMetadata
});

export type SchemaCompileParams = z.infer<typeof SchemaCompileParamsSchema>;

export const SchemaCompileResultSchema = z.object({
  schema: z.string(), // JSON string of compiled schema
  validationRules: z.array(z.any()), // ValidationRule[]
  hash: z.string(),
  compiledAt: z.date()
});

export type SchemaCompileResult = z.infer<typeof SchemaCompileResultSchema>;

export const SchemaValidateParamsSchema = z.object({
  metadata: z.any(), // FormMetadata
  data: z.record(z.any())
});

export type SchemaValidateParams = z.infer<typeof SchemaValidateParamsSchema>;

export const SchemaStatsSchema = z.object({
  fieldCount: z.number(),
  validationRuleCount: z.number(),
  conditionalFieldCount: z.number(),
  estimatedComplexity: z.enum(['low', 'medium', 'high']),
  estimatedCompileTime: z.number(),
  lastCompiled: z.date().optional()
});

export type SchemaStats = z.infer<typeof SchemaStatsSchema>;

// 认证上下文
export const AuthContextSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  sessionId: z.string(),
  expiresAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// API路由器接口
export interface FormRouter {
  // Query operations
  list: (params: FormQueryParams) => Promise<PaginatedResponse<FormListItem>>;
  getById: (id: string) => Promise<ApiResponse<FormDetail>>;
  getSubmissions: (formId: string, params: SubmissionQueryParams) => Promise<PaginatedResponse<SubmissionListItem>>;

  // Mutation operations
  create: (params: CreateFormParams) => Promise<ApiResponse<FormDetail>>;
  update: (id: string, params: UpdateFormParams) => Promise<ApiResponse<FormDetail>>;
  delete: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
  validate: (params: { metadata: any }) => Promise<ApiResponse<any>>; // ValidationResult
}

export interface SubmissionRouter {
  // Query operations
  getById: (id: string) => Promise<ApiResponse<SubmissionDetail>>;
  list: (params: SubmissionQueryParams) => Promise<PaginatedResponse<SubmissionListItem>>;

  // Mutation operations
  create: (params: CreateSubmissionParams) => Promise<ApiResponse<SubmissionDetail>>;
  createBatch: (params: BatchSubmissionParams) => Promise<ApiResponse<BatchSubmissionResult>>;
  update: (id: string, params: UpdateSubmissionParams) => Promise<ApiResponse<SubmissionDetail>>;
  delete: (id: string) => Promise<ApiResponse<{ success: boolean }>>;
  process: (id: string) => Promise<ApiResponse<SubmissionDetail>>;
}

export interface SchemaRouter {
  // Query operations
  compile: (params: SchemaCompileParams) => Promise<ApiResponse<SchemaCompileResult>>;
  validate: (params: SchemaValidateParams) => Promise<ApiResponse<any>>; // ValidationResult
  getStats: (params: { metadata: any }) => Promise<ApiResponse<SchemaStats>>;
}

// API客户端接口
export interface ApiClient {
  forms: FormRouter;
  submissions: SubmissionRouter;
  schemas: SchemaRouter;

  // Utility methods
  setAuthContext: (context: AuthContext) => void;
  setBaseUrl: (url: string) => void;
  setHeaders: (headers: Record<string, string>) => void;
  request: <T = any>(config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }) => Promise<ApiResponse<T>>;
}

// API中间件
export interface ApiMiddleware {
  onRequest: (config: any) => Promise<any>;
  onResponse: (response: any) => Promise<any>;
  onError: (error: any) => Promise<any>;
}

// API配置
export const ApiConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  headers: z.record(z.string()).default({}),
  middleware: z.array(z.any()).default([])
});

export type ApiConfig = z.infer<typeof ApiConfigSchema>;