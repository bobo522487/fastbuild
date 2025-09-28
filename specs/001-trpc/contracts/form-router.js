"use strict";
// Form Router API 契约
// 表单管理的 tRPC 路由定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.formRouterTestCases = exports.formRouterContracts = void 0;
const zod_1 = require("zod");
// ============================================
// 类型定义 (基于 data-model.md)
// ============================================
const UserRoleSchema = zod_1.z.enum(['ADMIN', 'USER']);
const UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: UserRoleSchema,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
const FormFieldSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
    label: zod_1.z.string(),
    placeholder: zod_1.z.string().optional(),
    required: zod_1.z.boolean().default(false),
    options: zod_1.z.array(zod_1.z.object({
        label: zod_1.z.string(),
        value: zod_1.z.string(),
    })).optional(),
    condition: zod_1.z.object({
        fieldId: zod_1.z.string(),
        operator: zod_1.z.enum(['equals', 'not_equals']),
        value: zod_1.z.any(),
    }).optional(),
    defaultValue: zod_1.z.any().optional(),
});
const FormMetadataSchema = zod_1.z.object({
    version: zod_1.z.string(),
    fields: zod_1.z.array(FormFieldSchema),
});
const FormSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional(),
    version: zod_1.z.string(),
    metadata: FormMetadataSchema,
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    creator: UserSchema.optional(), // 关联查询时包含
});
const SubmissionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    formId: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()),
    submittedBy: zod_1.z.string().optional(),
    submittedAt: zod_1.z.date(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    submitter: UserSchema.optional(), // 关联查询时包含
});
// ============================================
// 输入 Schema (请求验证)
// ============================================
// 创建表单
const CreateFormInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '表单名称不能为空').max(200, '表单名称不能超过200字符'),
    description: zod_1.z.string().max(1000, '描述不能超过1000字符').optional(),
    metadata: FormMetadataSchema,
});
// 更新表单
const UpdateFormInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional(),
    metadata: FormMetadataSchema.optional(),
});
// 获取表单详情
const GetFormInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
});
// 删除表单
const DeleteFormInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
});
// 表单列表查询
const ListFormsInputSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(100).default(20),
    cursor: zod_1.z.string().nullish(),
    search: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().optional(),
});
// ============================================
// 输出 Schema (响应格式)
// ============================================
const FormResponseSchema = FormSchema;
const FormsListResponseSchema = zod_1.z.object({
    items: zod_1.z.array(FormSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
    hasNext: zod_1.z.boolean(),
});
const DeleteFormResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
// ============================================
// 错误 Schema
// ============================================
const ErrorCodeSchema = zod_1.z.enum([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'CONFLICT',
    'INTERNAL_ERROR',
]);
const ErrorResponseSchema = zod_1.z.object({
    code: ErrorCodeSchema,
    message: zod_1.z.string(),
    details: zod_1.z.any().optional(),
});
// ============================================
// 路由定义
// ============================================
exports.formRouterContracts = {
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
        input: zod_1.z.object({
            formId: zod_1.z.string(),
            limit: zod_1.z.number().min(1).max(100).default(50),
        }),
        output: zod_1.z.object({
            items: zod_1.z.array(SubmissionSchema),
            total: zod_1.z.number(),
        }),
        error: ErrorResponseSchema,
    },
};
// ============================================
// 测试用例
// ============================================
exports.formRouterTestCases = {
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
exports.default = exports.formRouterContracts;
