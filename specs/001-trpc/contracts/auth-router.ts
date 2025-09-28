// Auth Router API 契约
// 用户认证和权限管理的 tRPC 路由定义

import { z } from 'zod';

// ============================================
// 类型定义
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

const UserSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastUsedAt: z.date(),
});

// ============================================
// 认证相关 Schema
// ============================================

// 登录输入
const LoginInputSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位'),
  rememberMe: z.boolean().default(false),
});

// 注册输入
const RegisterInputSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位').max(100, '密码不能超过100位'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50位'),
});

// 刷新令牌
const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
});

// 修改密码
const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位').max(100, '新密码不能超过100位'),
});

// 重置密码请求
const ForgotPasswordInputSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

// 重置密码确认
const ResetPasswordInputSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(6, '新密码至少6位').max(100, '新密码不能超过100位'),
});

// ============================================
// 用户管理 Schema
// ============================================

// 创建用户 (管理员)
const CreateUserInputSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50位'),
  role: UserRoleSchema.default('USER'),
  password: z.string().min(6, '密码至少6位').optional(),
});

// 更新用户信息
const UpdateUserInputSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(50).optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// 获取用户列表
const ListUsersInputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().nullish(),
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// 输出 Schema (响应格式)
// ============================================

// 认证响应
const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
});

// 用户信息响应
const UserResponseSchema = UserSchema;

// 用户列表响应
const UsersListResponseSchema = z.object({
  items: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasNext: z.boolean(),
});

// 令牌响应
const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
});

// 通用响应
const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// 错误 Schema
// ============================================

const AuthErrorCodeSchema = z.enum([
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

const AuthErrorResponseSchema = z.object({
  code: AuthErrorCodeSchema,
  message: z.string(),
  details: z.any().optional(),
});

// ============================================
// 路由定义
// ============================================

export const authRouterContracts = {
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
    input: z.undefined(), // 不需要输入，从上下文获取
    output: UserResponseSchema,
    error: AuthErrorResponseSchema,
  },

  // 更新用户信息
  updateProfile: {
    input: z.object({
      name: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
    }),
    output: UserResponseSchema,
    error: AuthErrorResponseSchema,
  },

  // 登出
  logout: {
    input: z.undefined(),
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
    input: z.object({
      id: z.string(),
    }),
    output: SuccessResponseSchema,
    error: AuthErrorResponseSchema,
  },
};

// ============================================
// 测试用例
// ============================================

export const authRouterTestCases = {
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
      role: 'ADMIN' as const,
    },
    invalidInput: {
      email: 'invalid-email', // 无效邮箱
      role: 'INVALID_ROLE' as any, // 无效角色
    },
  },
};

// ============================================
// 导出类型
// ============================================

export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export default authRouterContracts;