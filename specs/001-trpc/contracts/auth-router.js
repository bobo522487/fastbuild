"use strict";
// Auth Router API 契约
// 用户认证和权限管理的 tRPC 路由定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouterTestCases = exports.authRouterContracts = void 0;
const zod_1 = require("zod");
// ============================================
// 类型定义
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
const UserSessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    token: zod_1.z.string(),
    expiresAt: zod_1.z.date(),
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.date(),
    lastUsedAt: zod_1.z.date(),
});
// ============================================
// 认证相关 Schema
// ============================================
// 登录输入
const LoginInputSchema = zod_1.z.object({
    email: zod_1.z.string().email('请输入有效的邮箱地址'),
    password: zod_1.z.string().min(6, '密码至少6位'),
    rememberMe: zod_1.z.boolean().default(false),
});
// 注册输入
const RegisterInputSchema = zod_1.z.object({
    email: zod_1.z.string().email('请输入有效的邮箱地址'),
    password: zod_1.z.string().min(6, '密码至少6位').max(100, '密码不能超过100位'),
    name: zod_1.z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50位'),
});
// 刷新令牌
const RefreshTokenInputSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
// 修改密码
const ChangePasswordInputSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, '当前密码不能为空'),
    newPassword: zod_1.z.string().min(6, '新密码至少6位').max(100, '新密码不能超过100位'),
});
// 重置密码请求
const ForgotPasswordInputSchema = zod_1.z.object({
    email: zod_1.z.string().email('请输入有效的邮箱地址'),
});
// 重置密码确认
const ResetPasswordInputSchema = zod_1.z.object({
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(6, '新密码至少6位').max(100, '新密码不能超过100位'),
});
// ============================================
// 用户管理 Schema
// ============================================
// 创建用户 (管理员)
const CreateUserInputSchema = zod_1.z.object({
    email: zod_1.z.string().email('请输入有效的邮箱地址'),
    name: zod_1.z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50位'),
    role: UserRoleSchema.default('USER'),
    password: zod_1.z.string().min(6, '密码至少6位').optional(),
});
// 更新用户信息
const UpdateUserInputSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    name: zod_1.z.string().min(1).max(50).optional(),
    role: UserRoleSchema.optional(),
    isActive: zod_1.z.boolean().optional(),
});
// 获取用户列表
const ListUsersInputSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(100).default(20),
    cursor: zod_1.z.string().nullish(),
    search: zod_1.z.string().optional(),
    role: UserRoleSchema.optional(),
    isActive: zod_1.z.boolean().optional(),
});
// ============================================
// 输出 Schema (响应格式)
// ============================================
// 认证响应
const AuthResponseSchema = zod_1.z.object({
    user: UserSchema,
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresAt: zod_1.z.date(),
});
// 用户信息响应
const UserResponseSchema = UserSchema;
// 用户列表响应
const UsersListResponseSchema = zod_1.z.object({
    items: zod_1.z.array(UserSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
    hasNext: zod_1.z.boolean(),
});
// 令牌响应
const TokenResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresAt: zod_1.z.date(),
});
// 通用响应
const SuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
});
// ============================================
// 错误 Schema
// ============================================
const AuthErrorCodeSchema = zod_1.z.enum([
    'INVALID_CREDENTIALS',
    'USER_NOT_FOUND',
    'USER_ALREADY_EXISTS',
    'TOKEN_EXPIRED',
    'TOKEN_INVALID',
    'PASSWORD_TOO_WEAK',
    'RATE_LIMITED',
    'ACCOUNT_LOCKED',
    'EMAIL_NOT_VERIFIED',
    'UNAUTHORIZED',
    'FORBIDDEN',
]);
const AuthErrorResponseSchema = zod_1.z.object({
    code: AuthErrorCodeSchema,
    message: zod_1.z.string(),
    details: zod_1.z.any().optional(),
});
// ============================================
// 路由定义
// ============================================
exports.authRouterContracts = {
    // 用户登录
    login: {
        input: LoginInputSchema,
        output: AuthResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 用户注册
    register: {
        input: RegisterInputSchema,
        output: AuthResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 刷新令牌
    refreshToken: {
        input: RefreshTokenInputSchema,
        output: TokenResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 修改密码
    changePassword: {
        input: ChangePasswordInputSchema,
        output: SuccessResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 忘记密码
    forgotPassword: {
        input: ForgotPasswordInputSchema,
        output: SuccessResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 重置密码
    resetPassword: {
        input: ResetPasswordInputSchema,
        output: AuthResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 获取当前用户信息
    me: {
        input: zod_1.z.undefined(), // 不需要输入，从上下文获取
        output: UserResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 更新用户信息
    updateProfile: {
        input: zod_1.z.object({
            name: zod_1.z.string().min(1).max(50).optional(),
            email: zod_1.z.string().email().optional(),
        }),
        output: UserResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 登出
    logout: {
        input: zod_1.z.undefined(),
        output: SuccessResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 管理员：创建用户
    createUser: {
        input: CreateUserInputSchema,
        output: UserResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 管理员：获取用户列表
    listUsers: {
        input: ListUsersInputSchema,
        output: UsersListResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 管理员：更新用户
    updateUser: {
        input: UpdateUserInputSchema,
        output: UserResponseSchema,
        error: AuthErrorResponseSchema,
    },
    // 管理员：删除用户
    deleteUser: {
        input: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        output: SuccessResponseSchema,
        error: AuthErrorResponseSchema,
    },
};
// ============================================
// 测试用例
// ============================================
exports.authRouterTestCases = {
    // 登录测试
    login: {
        validInput: {
            email: 'user@example.com',
            password: 'password123',
            rememberMe: true,
        },
        invalidInput: {
            email: 'invalid-email', // 无效邮箱格式
            password: '123', // 密码太短
        },
    },
    // 注册测试
    register: {
        validInput: {
            email: 'newuser@example.com',
            password: 'password123',
            name: '新用户',
        },
        invalidInput: {
            email: 'existing@example.com', // 已存在的邮箱
            password: '123', // 密码太短
            name: '', // 姓名为空
        },
    },
    // 创建用户测试 (管理员)
    createUser: {
        validInput: {
            email: 'admin@example.com',
            name: '管理员用户',
            role: 'ADMIN',
        },
        invalidInput: {
            email: 'invalid-email', // 无效邮箱
            role: 'INVALID_ROLE', // 无效角色
        },
    },
};
exports.default = exports.authRouterContracts;
