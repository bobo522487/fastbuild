// Form Router API 契约
// 表单管理的 tRPC 路由定义

import { z } from 'zod';

// ============================================
// 类型定义 (基于 data-model.md)
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

const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  condition: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals']),
    value: z.any(),
  }).optional(),
  defaultValue: z.any().optional(),
});

const FormMetadataSchema = z.object({
  version: z.string(),
  fields: z.array(FormFieldSchema),
});

const FormSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  version: z.string(),
  metadata: FormMetadataSchema,
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  creator: UserSchema.optional(), // 关联查询时包含
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
});

// ============================================
// 输入 Schema (请求验证)
// ============================================

// 创建表单
const CreateFormInputSchema = z.object({
  name: z.string().min(1, '表单名称不能为空').max(200, '表单名称不能超过200字符'),
  description: z.string().max(1000, '描述不能超过1000字符').optional(),
  metadata: FormMetadataSchema,
});

// 更新表单
const UpdateFormInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  metadata: FormMetadataSchema.optional(),
});

// 获取表单详情
const GetFormInputSchema = z.object({
  id: z.string(),
});

// 删除表单
const DeleteFormInputSchema = z.object({
  id: z.string(),
});

// 表单列表查询
const ListFormsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().nullish(),
  search: z.string().optional(),
  createdBy: z.string().optional(),
});

// ============================================
// 输出 Schema (响应格式)
// ============================================

const FormResponseSchema = FormSchema;

const FormsListResponseSchema = z.object({
  items: z.array(FormSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasNext: z.boolean(),
});

const DeleteFormResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// 错误 Schema
// ============================================

const ErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
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

export const formRouterContracts = {
  // 获取表单列表
  list: {
    input: ListFormsInputSchema,
    output: FormsListResponseSchema,
    error: ErrorResponseSchema,
  },

  // 获取表单详情
  getById: {
    input: GetFormInputSchema,
    output: FormResponseSchema,
    error: ErrorResponseSchema,
  },

  // 创建表单
  create: {
    input: CreateFormInputSchema,
    output: FormResponseSchema,
    error: ErrorResponseSchema,
  },

  // 更新表单
  update: {
    input: UpdateFormInputSchema,
    output: FormResponseSchema,
    error: ErrorResponseSchema,
  },

  // 删除表单
  delete: {
    input: DeleteFormInputSchema,
    output: DeleteFormResponseSchema,
    error: ErrorResponseSchema,
  },

  // 获取表单的所有提交 (通过关联查询)
  getSubmissions: {
    input: z.object({
      formId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }),
    output: z.object({
      items: z.array(SubmissionSchema),
      total: z.number(),
    }),
    error: ErrorResponseSchema,
  },
};

// ============================================
// 测试用例
// ============================================

export const formRouterTestCases = {
  // 创建表单测试
  createForm: {
    validInput: {
      name: '用户注册表单',
      description: '新用户注册信息收集',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: '邮箱',
            required: true,
          },
        ],
      },
    },
    invalidInput: {
      name: '', // 无效：空名称
      metadata: {
        version: '1.0.0',
        fields: [],
      },
    },
  },

  // 表单列表查询测试
  listForms: {
    validInput: {
      limit: 10,
      search: '用户',
    },
    invalidInput: {
      limit: 200, // 无效：超过最大限制
    },
  },
};

// ============================================
// 导出类型
// ============================================

export type Form = z.infer<typeof FormSchema>;
export type FormMetadata = z.infer<typeof FormMetadataSchema>;
export type CreateFormInput = z.infer<typeof CreateFormInputSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormInputSchema>;
export type ListFormsInput = z.infer<typeof ListFormsInputSchema>;

export default formRouterContracts;