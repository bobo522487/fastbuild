/**
 * FastBuild 应用错误常量
 * 统一管理所有错误代码和消息
 */

export const AppErrors = {
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',

  // 用户错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 表单错误
  FORM_NOT_FOUND: 'FORM_NOT_FOUND',
  FORM_ALREADY_EXISTS: 'FORM_ALREADY_EXISTS',
  FORM_INACTIVE: 'FORM_INACTIVE',
  INVALID_FORM_DATA: 'INVALID_FORM_DATA',

  // 提交错误
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  SUBMISSION_INVALID: 'SUBMISSION_INVALID',
  FORM_CLOSED: 'FORM_CLOSED',

  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',

  // 服务器错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type AppError = keyof typeof AppErrors;

/**
 * 错误消息映射
 */
export const ErrorMessages: Record<AppError, string> = {
  [AppErrors.UNAUTHORIZED]: '未授权访问',
  [AppErrors.INVALID_TOKEN]: '无效的令牌',
  [AppErrors.TOKEN_EXPIRED]: '令牌已过期',
  [AppErrors.FORBIDDEN]: '访问被禁止',
  [AppErrors.USER_NOT_FOUND]: '用户不存在',
  [AppErrors.USER_ALREADY_EXISTS]: '用户已存在',
  [AppErrors.USER_INACTIVE]: '用户已停用',
  [AppErrors.INVALID_CREDENTIALS]: '无效的凭据',
  [AppErrors.FORM_NOT_FOUND]: '表单不存在',
  [AppErrors.FORM_ALREADY_EXISTS]: '表单已存在',
  [AppErrors.FORM_INACTIVE]: '表单已停用',
  [AppErrors.INVALID_FORM_DATA]: '无效的表单数据',
  [AppErrors.SUBMISSION_NOT_FOUND]: '提交记录不存在',
  [AppErrors.SUBMISSION_INVALID]: '无效的提交数据',
  [AppErrors.FORM_CLOSED]: '表单已关闭',
  [AppErrors.VALIDATION_ERROR]: '数据验证失败',
  [AppErrors.REQUIRED_FIELD_MISSING]: '缺少必填字段',
  [AppErrors.INVALID_EMAIL]: '无效的邮箱地址',
  [AppErrors.INVALID_PASSWORD]: '无效的密码',
  [AppErrors.INTERNAL_ERROR]: '内部服务器错误',
  [AppErrors.DATABASE_ERROR]: '数据库错误',
  [AppErrors.NETWORK_ERROR]: '网络错误',
};

/**
 * 创建标准错误响应
 */
export function createErrorResponse(error: AppError, details?: string): {
  success: false;
  error: {
    code: AppError;
    message: string;
    details?: string;
  };
} {
  return {
    success: false,
    error: {
      code: error,
      message: ErrorMessages[error],
      details,
    },
  };
}

/**
 * 自定义错误类
 */
export class AppErrorClass extends Error {
  constructor(
    public readonly code: AppError,
    message?: string,
    public readonly details?: string
  ) {
    super(message || ErrorMessages[code]);
    this.name = 'AppError';
  }
}