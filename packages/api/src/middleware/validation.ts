import { z } from 'zod'
import { TRPCError } from '@trpc/server'

/**
 * 通用验证器
 */
export const commonValidators = {
  // 基础类型
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少需要8位字符'),
  passwordStrong: z.string().regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    '密码必须包含大小写字母、数字和特殊字符'
  ),
  id: z.string().cuid('无效的ID格式'),
  cuid: z.string().cuid('无效的CUID格式'),
  uuid: z.string().uuid('无效的UUID格式'),
  url: z.string().url('请输入有效的URL'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),

  // 数字验证
  positiveNumber: z.number().positive('必须是正数'),
  nonNegativeNumber: z.number().nonnegative('必须是非负数'),
  integer: z.number().int('必须是整数'),

  // 日期验证
  futureDate: z.date().refine(date => date > new Date(), '必须是未来日期'),
  pastDate: z.date().refine(date => date < new Date(), '必须是过去日期'),

  // 字符串验证
  nonEmptyString: z.string().min(1, '不能为空'),
  trimmedString: z.string().transform(val => val.trim()),

  // 枚举验证
  userRole: z.enum(['ADMIN', 'USER']),
  formFieldType: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
}

/**
 * 创建分页验证器
 */
export const createPaginationSchema = <T extends z.ZodTypeAny>(itemSchema: T) => {
  return z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    filter: z.record(z.string(), z.unknown()).optional(),
    data: z.array(itemSchema).optional(),
  })
}

/**
 * 创建排序验证器
 */
export const createSortSchema = (fields: string[]) => {
  return z.object({
    sortBy: z.enum(fields as any),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
}

/**
 * 搜索验证器
 */
export const searchSchema = z.object({
  query: z.string().min(1, '搜索关键词不能为空').max(100, '搜索关键词过长'),
  type: z.enum(['forms', 'submissions', 'users']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

/**
 * 表单元数据验证器
 */
export const formFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '字段名不能为空').regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '字段名只能包含字母、数字和下划线'),
  type: commonValidators.formFieldType,
  label: z.string().min(1, '标签不能为空'),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string().min(1, '选项标签不能为空'),
    value: z.string().min(1, '选项值不能为空'),
  })).optional(),
  condition: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains']),
    value: z.unknown(),
  }).optional(),
  defaultValue: z.unknown().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional(),
  }).optional(),
})

export const formMetadataSchema = z.object({
  version: z.string().default('1.0.0'),
  fields: z.array(formFieldSchema).min(1, '至少需要一个字段'),
})

/**
 * 创建验证中间件
 */
export const createValidationMiddleware = <T extends z.ZodTypeAny>(schema: T) => {
  return async ({ input, next }: any) => {
    try {
      const validatedInput = schema.parse(input)
      return next({ input: validatedInput })
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '输入验证失败',
          cause: error.issues,
        })
      }
      throw error
    }
  }
}

/**
 * 批量验证中间件
 */
export const createBulkValidationMiddleware = <T extends z.ZodTypeAny>(schema: T) => {
  return async ({ input, next }: any) => {
    try {
      const items = Array.isArray(input) ? input : [input]
      const validatedItems = items.map(item => schema.parse(item))
      return next({ input: validatedItems })
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '批量验证失败',
          cause: error.issues,
        })
      }
      throw error
    }
  }
}

/**
 * 条件验证器
 */
export const createConditionalValidator = <T extends z.ZodTypeAny>(
  condition: (data: any) => boolean,
  schema: T,
  message: string = '条件验证失败'
) => {
  return z.unknown().refine(
    (data) => !condition(data) || schema.safeParse(data).success,
    { message }
  )
}

/**
 * 文件上传验证器
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File).refine(
    file => file.size <= 10 * 1024 * 1024, // 10MB
    '文件大小不能超过10MB'
  ).refine(
    file => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
    '只支持 JPEG, PNG, GIF, WebP 格式'
  ),
  type: z.enum(['avatar', 'form_attachment']).optional(),
})

/**
 * API 密钥验证器
 */
export const apiKeySchema = z.object({
  key: z.string().min(32, 'API密钥至少需要32位字符'),
  name: z.string().min(1, '密钥名称不能为空'),
  permissions: z.array(z.enum(['read', 'write', 'delete', 'admin'])),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
})

/**
 * Webhook 验证器
 */
export const webhookSchema = z.object({
  url: commonValidators.url,
  events: z.array(z.string()).min(1, '至少需要监听一个事件'),
  secret: z.string().min(16, 'Webhook密钥至少需要16位字符'),
  isActive: z.boolean().default(true),
})

/**
 * 用户注册验证器
 */
export const userRegistrationSchema = z.object({
  email: commonValidators.email,
  password: commonValidators.passwordStrong,
  name: z.string().min(2, '姓名至少需要2位字符').max(50, '姓名不能超过50位字符'),
  agreeToTerms: z.boolean().refine(val => val === true, '必须同意服务条款'),
})

/**
 * 用户登录验证器
 */
export const userLoginSchema = z.object({
  email: commonValidators.email,
  password: z.string().min(1, '密码不能为空'),
  rememberMe: z.boolean().default(false),
})

/**
 * 密码重置验证器
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  newPassword: commonValidators.passwordStrong,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

/**
 * 导出所有验证器
 */
export const validators = {
  common: commonValidators,
  pagination: createPaginationSchema,
  sort: createSortSchema,
  search: searchSchema,
  form: formMetadataSchema,
  formField: formFieldSchema,
  fileUpload: fileUploadSchema,
  apiKey: apiKeySchema,
  webhook: webhookSchema,
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  passwordReset: passwordResetSchema,
}

/**
 * 导出中间件创建器
 */
export const middleware = {
  validation: createValidationMiddleware,
  bulkValidation: createBulkValidationMiddleware,
  conditional: createConditionalValidator,
}