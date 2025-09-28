// Submission Router API 契约
// 表单提交管理的 tRPC 路由定义

import { z } from 'zod';

// ============================================
// 类型定义 (复用 form-router.ts 的类型)
// ============================================

const UserRoleSchema = z.enum(['ADMIN', 'USER']);

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const FormSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const SubmissionSchema = z.object({
  id: z.string(),
  formId: z.string(),
  data: z.record(z.any()),
  submittedBy: z.string().optional(),
  submittedAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  submitter: UserSchema.optional(), // 关联查询时包含
  form: FormSchema.optional(), // 关联查询时包含
});

// ============================================
// 输入 Schema (请求验证)
// ============================================

// 提交表单数据
const CreateSubmissionInputSchema = z.object({
  formId: z.string(),
  data: z.record(z.any()),
  // 可选字段，系统会自动填充
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

// 获取提交详情
const GetSubmissionInputSchema = z.object({
  id: z.string(),
});

// 获取表单的所有提交
const GetFormSubmissionsInputSchema = z.object({
  formId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().nullish(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// 删除提交
const DeleteSubmissionInputSchema = z.object({
  id: z.string(),
});

// 更新提交状态 (管理员操作)
const UpdateSubmissionInputSchema = z.object({
  id: z.string(),
  data: z.record(z.any()).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});

// ============================================
// 输出 Schema (响应格式)
// ============================================

const SubmissionResponseSchema = SubmissionSchema;

const SubmissionsListResponseSchema = z.object({
  items: z.array(SubmissionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasNext: z.boolean(),
});

const CreateSubmissionResponseSchema = z.object({
  submissionId: z.string(),
  message: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

const DeleteSubmissionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// 提交统计信息
const SubmissionStatsResponseSchema = z.object({
  totalSubmissions: z.number(),
  recentSubmissions: z.number(), // 最近7天
  averageProcessingTime: z.number(), // 平均处理时间(秒)
  statusDistribution: z.record(z.number()), // 状态分布
});

// ============================================
// 错误 Schema
// ============================================

const ErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'FORM_NOT_FOUND',
  'SUBMISSION_EXPIRED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);

const ErrorResponseSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.any().optional(),
});

// ============================================
// 路由定义
// ============================================

export const submissionRouterContracts = {
  // 提交表单数据
  create: {
    input: CreateSubmissionInputSchema,
    output: CreateSubmissionResponseSchema,
    error: ErrorResponseSchema,
  },

  // 获取提交详情
  getById: {
    input: GetSubmissionInputSchema,
    output: SubmissionResponseSchema,
    error: ErrorResponseSchema,
  },

  // 获取表单的所有提交
  getByFormId: {
    input: GetFormSubmissionsInputSchema,
    output: SubmissionsListResponseSchema,
    error: ErrorResponseSchema,
  },

  // 更新提交 (管理员)
  update: {
    input: UpdateSubmissionInputSchema,
    output: SubmissionResponseSchema,
    error: ErrorResponseSchema,
  },

  // 删除提交
  delete: {
    input: DeleteSubmissionInputSchema,
    output: DeleteSubmissionResponseSchema,
    error: ErrorResponseSchema,
  },

  // 获取提交统计信息
  getStats: {
    input: z.object({
      formId: z.string().optional(), // 可选，不提供则返回全局统计
      days: z.number().min(1).max(365).default(30), // 统计天数
    }),
    output: SubmissionStatsResponseSchema,
    error: ErrorResponseSchema,
  },

  // 批量删除提交
  bulkDelete: {
    input: z.object({
      submissionIds: z.array(z.string()).min(1).max(100),
      reason: z.string().max(200).optional(),
    }),
    output: z.object({
      success: z.boolean(),
      deletedCount: z.number(),
      failedIds: z.array(z.string()),
    }),
    error: ErrorResponseSchema,
  },
};

// ============================================
// 测试用例
// ============================================

export const submissionRouterTestCases = {
  // 创建提交测试
  createSubmission: {
    validInput: {
      formId: 'form_123',
      data: {
        name: '张三',
        email: 'zhangsan@example.com',
        age: 25,
      },
      userAgent: 'Mozilla/5.0...',
    },
    invalidInput: {
      formId: '', // 无效：空表单ID
      data: {}, // 无效：空数据
    },
  },

  // 表单提交列表测试
  getFormSubmissions: {
    validInput: {
      formId: 'form_123',
      limit: 10,
      startDate: new Date('2025-01-01'),
    },
    invalidInput: {
      formId: 'invalid_form_id', // 无效：不存在的表单
      limit: 0, // 无效：小于1
    },
  },
};

// ============================================
// 导出类型
// ============================================

export type Submission = z.infer<typeof SubmissionSchema>;
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionInputSchema>;
export type GetFormSubmissionsInput = z.infer<typeof GetFormSubmissionsInputSchema>;
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionInputSchema>;

export default submissionRouterContracts;