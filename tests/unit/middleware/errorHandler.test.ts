import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { ErrorHandler, ErrorCode, logRequest, logResponse } from '@workspace/api/middleware/errorHandler';
import type { Context } from '@workspace/api/trpc/context';

describe('错误处理中间件单元测试', () => {
  let mockContext: Context;
  let consoleErrorSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    mockContext = {
      user: { id: 'user-1', email: 'test@example.com', role: 'USER', isActive: true },
      req: {
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '192.168.1.1' }
      } as any,
      res: {} as any,
      prisma: {} as any,
    };

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorHandler.handle', () => {
    it('应该处理 Prisma P2002 错误（唯一约束冲突）', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      const result = ErrorHandler.handle(prismaError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('CONFLICT');
      expect(result.message).toBe('Record already exists');
    });

    it('应该处理 Prisma P2003/P2004 错误（外键约束）', () => {
      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
      };

      const result = ErrorHandler.handle(prismaError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('外键约束错误');
    });

    it('应该处理 Prisma P2025 错误（记录不存在）', () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };

      const result = ErrorHandler.handle(prismaError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('记录不存在');
    });

    it('应该处理未知的 Prisma 错误', () => {
      const prismaError = {
        code: 'P9999',
        message: 'Unknown Prisma error',
      };

      const result = ErrorHandler.handle(prismaError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('数据库操作失败');
    });

    it('应该处理自定义错误消息', () => {
      const customError = new Error('FORM_NOT_FOUND');

      const result = ErrorHandler.handle(customError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('表单不存在');
    });

    it('应该处理认证相关错误', () => {
      const authError = new Error('INVALID_CREDENTIALS');

      const result = ErrorHandler.handle(authError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('用户名或密码错误');
    });

    it('应该处理用户存在相关错误', () => {
      const userError = new Error('USER_ALREADY_EXISTS');

      const result = ErrorHandler.handle(userError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('CONFLICT');
      expect(result.message).toBe('User already exists');
    });

    it('应该处理账户锁定错误', () => {
      const lockedError = new Error('ACCOUNT_LOCKED');

      const result = ErrorHandler.handle(lockedError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('账户已被锁定');
    });

    it('应该处理令牌相关错误', () => {
      const tokenError = new Error('TOKEN_EXPIRED');

      const result = ErrorHandler.handle(tokenError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('令牌无效或已过期');
    });

    it('应该处理验证错误', () => {
      const validationError = new Error(ErrorCode.VALIDATION_ERROR);

      const result = ErrorHandler.handle(validationError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('BAD_REQUEST');
      expect(result.message).toBe('数据验证失败');
    });

    it('应该处理权限错误', () => {
      const forbiddenError = new Error(ErrorCode.FORBIDDEN);

      const result = ErrorHandler.handle(forbiddenError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('权限不足');
    });

    it('应该处理资源不存在错误', () => {
      const notFoundError = new Error(ErrorCode.NOT_FOUND);

      const result = ErrorHandler.handle(notFoundError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('资源不存在');
    });

    it('应该处理未授权错误', () => {
      const unauthorizedError = new Error(ErrorCode.UNAUTHORIZED);

      const result = ErrorHandler.handle(unauthorizedError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.message).toBe('未授权访问');
    });

    it('应该在开发环境暴露详细错误信息', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const genericError = new Error('Something went wrong');

      const result = ErrorHandler.handle(genericError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Something went wrong');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('应该在生产环境隐藏详细错误信息', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const genericError = new Error('Something went wrong');

      const result = ErrorHandler.handle(genericError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('服务器内部错误');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('应该处理非 Error 对象', () => {
      const nonError = { message: 'Not an error' };

      const result = ErrorHandler.handle(nonError, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('服务器内部错误');
    });

    it('应该处理 null/undefined 错误', () => {
      const result = ErrorHandler.handle(null, mockContext);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('服务器内部错误');
    });
  });

  describe('ErrorHandler.log', () => {
    it('应该正确记录错误日志', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      ErrorHandler.log(error, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[tRPC Error Log]:',
        expect.stringContaining('"name":"Error"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[tRPC Error Log]:',
        expect.stringContaining('"message":"Test error"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[tRPC Error Log]:',
        expect.stringContaining('"userId":"user-1"')
      );
    });

    it('应该记录匿名用户错误', () => {
      const anonymousContext: Context = {
        prisma: {} as any,
      };

      const error = new Error('Anonymous error');

      ErrorHandler.log(error, anonymousContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[tRPC Error Log]:',
        expect.stringContaining('"userId":"anonymous"')
      );
    });

    it('应该记录非 Error 对象', () => {
      const nonError = { custom: 'error object' };

      ErrorHandler.log(nonError, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[tRPC Error Log]:',
        expect.stringContaining('"custom":"error object"')
      );
    });
  });

  describe('ErrorHandler.createErrorResponse', () => {
    it('应该创建标准化的错误响应', () => {
      const response = ErrorHandler.createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input data',
        { field: 'email' }
      );

      expect(response).toEqual({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid input data',
          details: { field: 'email' },
          timestamp: expect.any(String),
        },
      });
    });

    it('应该创建不带详情的错误响应', () => {
      const response = ErrorHandler.createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'Server error'
      );

      expect(response).toEqual({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Server error',
          details: undefined,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('logRequest', () => {
    it('应该正确记录请求日志', () => {
      logRequest(mockContext, 'auth.login', 'mutation', { email: 'test@example.com' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[tRPC Request] expect.any(String):',
        expect.objectContaining({
          path: 'auth.login',
          type: 'mutation',
          userId: 'user-1',
          userAgent: 'test-agent',
          ip: '192.168.1.1',
        })
      );
    });

    it('应该记录匿名用户请求', () => {
      const anonymousContext: Context = {
        prisma: {} as any,
      };

      logRequest(anonymousContext, 'health.check', 'query', {});

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[tRPC Request] expect.any(String):',
        expect.objectContaining({
          path: 'health.check',
          type: 'query',
          userId: 'anonymous',
        })
      );
    });
  });

  describe('logResponse', () => {
    it('应该正确记录响应日志', () => {
      logResponse(mockContext, 'auth.login', 150, { success: true });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[tRPC Response] expect.any(String):',
        expect.objectContaining({
          path: 'auth.login',
          duration: '150ms',
          userId: 'user-1',
          success: true,
        })
      );
    });

    it('应该记录不带数据的响应', () => {
      logResponse(mockContext, 'health.check', 50);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[tRPC Response] expect.any(String):',
        expect.objectContaining({
          path: 'health.check',
          duration: '50ms',
          userId: 'user-1',
          success: true,
        })
      );
    });
  });

  describe('错误码枚举', () => {
    it('应该包含所有必要的错误码', () => {
      expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });
});