"use strict";
// Submission Router API 契约
// 表单提交管理的 tRPC 路由定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.submissionRouterTestCases = exports.submissionRouterContracts = void 0;
const zod_1 = require("zod");
// ============================================
// 类型定义 (复用 form-router.ts 的类型)
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
const FormSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
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
    form: FormSchema.optional(), // 关联查询时包含
});
// ============================================
// 输入 Schema (请求验证)
// ============================================
// 提交表单数据
const CreateSubmissionInputSchema = zod_1.z.object({
    formId: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()),
    // 可选字段，系统会自动填充
    ipAddress: zod_1.z.string().ip().optional(),
    userAgent: zod_1.z.string().max(500).optional(),
});
// 获取提交详情
const GetSubmissionInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
});
// 获取表单的所有提交
const GetFormSubmissionsInputSchema = zod_1.z.object({
    formId: zod_1.z.string(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    cursor: zod_1.z.string().nullish(),
    startDate: zod_1.z.date().optional(),
    endDate: zod_1.z.date().optional(),
});
// 删除提交
const DeleteSubmissionInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
});
// 更新提交状态 (管理员操作)
const UpdateSubmissionInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    status: zod_1.z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});
// ============================================
// 输出 Schema (响应格式)
// ============================================
const SubmissionResponseSchema = SubmissionSchema;
const SubmissionsListResponseSchema = zod_1.z.object({
    items: zod_1.z.array(SubmissionSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
    hasNext: zod_1.z.boolean(),
});
const CreateSubmissionResponseSchema = zod_1.z.object({
    submissionId: zod_1.z.string(),
    message: zod_1.z.string(),
    validationErrors: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        message: zod_1.z.string(),
    })).optional(),
});
const DeleteSubmissionResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
// 提交统计信息
const SubmissionStatsResponseSchema = zod_1.z.object({
    totalSubmissions: zod_1.z.number(),
    recentSubmissions: zod_1.z.number(), // 最近7天
    averageProcessingTime: zod_1.z.number(), // 平均处理时间(秒)
    statusDistribution: zod_1.z.record(zod_1.z.number()), // 状态分布
});
// ============================================
// 错误 Schema
// ============================================
const ErrorCodeSchema = zod_1.z.enum([
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'FORM_NOT_FOUND',
    'SUBMISSION_EXPIRED',
    'RATE_LIMITED',
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
exports.submissionRouterContracts = {
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
        input: zod_1.z.object({
            formId: zod_1.z.string().optional(), // 可选，不提供则返回全局统计
            days: zod_1.z.number().min(1).max(365).default(30), // 统计天数
        }),
        output: SubmissionStatsResponseSchema,
        error: ErrorResponseSchema,
    },
    // 批量删除提交
    bulkDelete: {
        input: zod_1.z.object({
            submissionIds: zod_1.z.array(zod_1.z.string()).min(1).max(100),
            reason: zod_1.z.string().max(200).optional(),
        }),
        output: zod_1.z.object({
            success: zod_1.z.boolean(),
            deletedCount: zod_1.z.number(),
            failedIds: zod_1.z.array(zod_1.z.string()),
        }),
        error: ErrorResponseSchema,
    },
};
// ============================================
// 测试用例
// ============================================
exports.submissionRouterTestCases = {
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
exports.default = exports.submissionRouterContracts;
