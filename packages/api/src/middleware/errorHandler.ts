import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

/**
 * 错误类型枚举
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * 错误处理工具类
 */
export class ErrorHandler {
  /**
   * 处理已知的错误类型
   */
  static handle(error: unknown, context?: Context): TRPCError {
    console.error(`[tRPC Error] ${new Date().toISOString()}:`, error);

    // 处理 Prisma 错误
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;

      switch (prismaError.code) {
        case 'P2002':
          return new TRPCError({
            code: 'CONFLICT',
            message: 'Record already exists',
          });
        case 'P2003':
        case 'P2004':
          return new TRPCError({
            code: 'FORBIDDEN',
            message: 'Foreign key constraint error',
          });
        case 'P2025':
          return new TRPCError({
            code: 'NOT_FOUND',
            message: 'Record not found',
          });
        default:
          return new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database operation failed',
          });
      }
    }

    // 处理自定义错误
    if (error instanceof Error) {
      switch (error.message) {
        case ErrorCode.UNAUTHORIZED:
          return new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Unauthorized access',
          });
        case ErrorCode.FORBIDDEN:
          return new TRPCError({
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          });
        case ErrorCode.NOT_FOUND:
          return new TRPCError({
            code: 'NOT_FOUND',
            message: 'Resource not found',
          });
        case ErrorCode.VALIDATION_ERROR:
          return new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data validation failed',
          });
        case 'FORM_NOT_FOUND':
          return new TRPCError({
            code: 'NOT_FOUND',
            message: 'Form not found',
          });
        case 'USER_NOT_FOUND':
          return new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        case 'INVALID_CREDENTIALS':
          return new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password',
          });
        case 'USER_ALREADY_EXISTS':
          return new TRPCError({
            code: 'CONFLICT',
            message: 'User already exists',
          });
        case 'ACCOUNT_LOCKED':
          return new TRPCError({
            code: 'FORBIDDEN',
            message: 'Account is locked',
          });
        case 'TOKEN_INVALID':
        case 'TOKEN_EXPIRED':
          return new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Token is invalid or expired',
          });
        default:
          return new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          });
      }
    }

    // 默认内部服务器错误
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  }

  /**
   * 记录错误日志
   */
  static log(error: unknown, context?: Context): void {
    const timestamp = new Date().toISOString();
    const userId = context?.user?.id || 'anonymous';
    const errorInfo = {
      timestamp,
      userId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    console.error('[tRPC Error Log]:', JSON.stringify(errorInfo, null, 2));

    // 这里可以集成 Sentry 等错误监控服务
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error);
    // }
  }

  /**
   * 创建标准化的错误响应
   */
  static createErrorResponse(code: ErrorCode, message: string, details?: any) {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * 请求日志中间件
 */
export function logRequest(context: Context, path: string, type: string, input: any) {
  const timestamp = new Date().toISOString();
  const userId = context.user?.id || 'anonymous';

  console.info(`[tRPC Request] ${timestamp}:`, {
    path,
    type,
    userId,
    userAgent: context.req?.headers['user-agent'],
    ip: context.req?.socket.remoteAddress,
  });
}

/**
 * 响应日志中间件
 */
export function logResponse(context: Context, path: string, duration: number, data?: any) {
  const timestamp = new Date().toISOString();
  const userId = context.user?.id || 'anonymous';

  console.info(`[tRPC Response] ${timestamp}:`, {
    path,
    duration: `${duration}ms`,
    userId,
    success: true,
  });
}