/**
 * FastBuild 应用错误常量
 * 统一管理所有错误代码和消息
 */

export const AppErrors = Object.freeze({
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
});

export type AppError = keyof typeof AppErrors;

/**
 * 错误消息映射
 */
export const ErrorMessages: Record<AppError, string> = {
  [AppErrors.UNAUTHORIZED]: 'Unauthorized access',
  [AppErrors.INVALID_TOKEN]: 'Invalid token',
  [AppErrors.TOKEN_EXPIRED]: 'Token expired',
  [AppErrors.FORBIDDEN]: 'Access forbidden',
  [AppErrors.USER_NOT_FOUND]: 'User not found',
  [AppErrors.USER_ALREADY_EXISTS]: 'User already exists',
  [AppErrors.USER_INACTIVE]: 'User inactive',
  [AppErrors.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AppErrors.FORM_NOT_FOUND]: 'Form not found',
  [AppErrors.FORM_ALREADY_EXISTS]: 'Form already exists',
  [AppErrors.FORM_INACTIVE]: 'Form inactive',
  [AppErrors.INVALID_FORM_DATA]: 'Invalid form data',
  [AppErrors.SUBMISSION_NOT_FOUND]: 'Submission not found',
  [AppErrors.SUBMISSION_INVALID]: 'Invalid submission data',
  [AppErrors.FORM_CLOSED]: 'Form closed',
  [AppErrors.VALIDATION_ERROR]: 'Data validation failed',
  [AppErrors.REQUIRED_FIELD_MISSING]: 'Required field missing',
  [AppErrors.INVALID_EMAIL]: 'Invalid email address',
  [AppErrors.INVALID_PASSWORD]: 'Invalid password',
  [AppErrors.INTERNAL_ERROR]: 'Internal server error',
  [AppErrors.DATABASE_ERROR]: 'Database error',
  [AppErrors.NETWORK_ERROR]: 'Network error',
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