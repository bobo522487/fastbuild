import { TRPCClientError } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';

/**
 * API 错误类型
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  isRetryable: boolean;
}

/**
 * 错误代码映射
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

/**
 * 检查错误是否可重试
 */
export function isRetryableError(error: TRPCClientError<AnyRouter>): boolean {
  if (!(error instanceof TRPCClientError)) {
    return false;
  }

  const { code } = error.data || {};

  // 不可重试的错误类型
  const nonRetryableCodes = [
    ERROR_CODES.UNAUTHORIZED,
    ERROR_CODES.FORBIDDEN,
    ERROR_CODES.VALIDATION_ERROR,
    ERROR_CODES.NOT_FOUND,
  ];

  return !nonRetryableCodes.includes(code);
}

/**
 * 格式化 tRPC 错误为标准 API 错误
 */
export function formatTRPCError(error: TRPCClientError<AnyRouter>): ApiError {
  if (!(error instanceof TRPCClientError)) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network error occurred',
      isRetryable: true,
    };
  }

  const { code, message } = error.data || {};

  return {
    code: code || ERROR_CODES.INTERNAL_ERROR,
    message: message || error.message,
    details: error.data,
    isRetryable: isRetryableError(error),
  };
}

/**
 * 错误重试策略
 */
export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition: (error: TRPCClientError<AnyRouter>) => boolean;
}

/**
 * 默认重试策略
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryCondition: isRetryableError,
};

/**
 * 带重试的 API 调用
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy = DEFAULT_RETRY_STRATEGY
): Promise<T> {
  let lastError: TRPCClientError<AnyRouter>;

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as TRPCClientError<AnyRouter>;

      // 如果不满足重试条件，直接抛出错误
      if (!strategy.retryCondition(lastError)) {
        throw error;
      }

      // 最后一次尝试，不再延迟
      if (attempt === strategy.maxAttempts) {
        throw error;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        strategy.baseDelay * Math.pow(2, attempt - 1),
        strategy.maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.code) {
    case ERROR_CODES.UNAUTHORIZED:
      return 'Please log in to continue';
    case ERROR_CODES.FORBIDDEN:
      return 'You do not have permission to perform this action';
    case ERROR_CODES.NOT_FOUND:
      return 'The requested resource was not found';
    case ERROR_CODES.VALIDATION_ERROR:
      return 'Please check your input and try again';
    case ERROR_CODES.RATE_LIMITED:
      return 'Too many requests. Please wait a moment and try again';
    case ERROR_CODES.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection';
    case ERROR_CODES.TIMEOUT_ERROR:
      return 'Request timed out. Please try again';
    case 'USER_NOT_FOUND':
      return 'User not found';
    case 'USER_ALREADY_EXISTS':
      return 'User already exists';
    case 'INVALID_CREDENTIALS':
      return 'Invalid email or password';
    case 'FORM_NOT_FOUND':
      return 'Form not found';
    case 'FORM_DATA_VALIDATION_FAILED':
      return 'Form data validation failed';
    default:
      return 'An unexpected error occurred. Please try again';
  }
}

/**
 * 全局错误处理器
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Set<(error: ApiError) => void> = new Set();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 注册错误监听器
   */
  onError(listener: (error: ApiError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * 处理错误
   */
  handleError(error: TRPCClientError<AnyRouter>): void {
    const apiError = formatTRPCError(error);
    this.errorListeners.forEach(listener => {
      try {
        listener(apiError);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * 清除所有监听器
   */
  clearListeners(): void {
    this.errorListeners.clear();
  }
}

/**
 * 便捷的错误处理 Hook
 */
export function useErrorHandler() {
  const handleError = (error: TRPCClientError<AnyRouter>) => {
    ErrorHandler.getInstance().handleError(error);
  };

  return { handleError };
}