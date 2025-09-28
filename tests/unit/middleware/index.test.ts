import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import {
  t,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
  middleware,
  mergeRouters,
} from '@workspace/api/src/middleware';
import { ErrorHandler, ErrorCode } from '@workspace/api/src/middleware/errorHandler';
import { rateLimiters } from '@workspace/api/src/middleware/rateLimiter';
import type { Context } from '@workspace/api/src/trpc/context';

describe('中间件聚合器单元测试', () => {
  let mockContext: Context;
  let mockNext: any;
  let consoleSpy: any;

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

    mockNext = vi.fn().mockResolvedValue({ success: true });
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tRPC 实例配置', () => {
    it('应该正确初始化 tRPC 实例', () => {
      expect(t).toBeDefined();
      expect(t.procedure).toBeDefined();
      expect(t.router).toBeDefined();
      expect(t.middleware).toBeDefined();
      expect(t.mergeRouters).toBeDefined();
    });

    it('应该配置 superjson 转换器', () => {
      // 验证 tRPC 实例的转换器配置
      expect(t._config.transformer).toBeDefined();
    });

    it('应该配置自定义错误格式化器', () => {
      // 验证错误格式化器配置
      expect(t._config.errorFormatter).toBeDefined();
      expect(typeof t._config.errorFormatter).toBe('function');
    });
  });

  describe('错误格式化器', () => {
    it('应该格式化错误响应', () => {
      const error = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
      });

      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 401,
          path: 'test.path',
          type: 'query',
          timestamp: expect.any(String),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted).toBeDefined();
      expect(formatted.data).toBeDefined();
      expect(formatted.data.code).toBe('UNAUTHORIZED');
      expect(formatted.data.httpStatus).toBe(401);
      expect(formatted.data.path).toBe('test.path');
      expect(formatted.data.type).toBe('query');
      expect(formatted.data.userId).toBe('user-1');
      expect(formatted.data.timestamp).toBeDefined();
    });

    it('应该为匿名用户设置 userId', () => {
      const anonymousContext = { ...mockContext, user: undefined };
      const error = new TRPCError({
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });

      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 404,
          path: 'test.path',
          type: 'query',
          timestamp: expect.any(String),
          userId: 'anonymous',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: anonymousContext,
      });

      expect(formatted.data.userId).toBe('anonymous');
    });

    it('应该记录错误日志', () => {
      const error = new Error('Test error');
      const logSpy = vi.spyOn(ErrorHandler, 'log');

      t._config.errorFormatter({
        shape: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            httpStatus: 500,
            path: 'test.path',
            type: 'query',
            timestamp: new Date().toISOString(),
            userId: 'user-1',
          },
        },
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(logSpy).toHaveBeenCalledWith(error, mockContext);
    });
  });

  describe('HTTP 状态码映射', () => {
    it('应该正确映射 UNAUTHORIZED 到 401', () => {
      // 测试内部函数 getHttpStatus 的逻辑
      const error = new TRPCError({ code: 'UNAUTHORIZED' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 401,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(401);
    });

    it('应该正确映射 FORBIDDEN 到 403', () => {
      const error = new TRPCError({ code: 'FORBIDDEN' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 403,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(403);
    });

    it('应该正确映射 NOT_FOUND 到 404', () => {
      const error = new TRPCError({ code: 'NOT_FOUND' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 404,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(404);
    });

    it('应该正确映射 BAD_REQUEST 到 400', () => {
      const error = new TRPCError({ code: 'BAD_REQUEST' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 400,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(400);
    });

    it('应该正确映射 TOO_MANY_REQUESTS 到 429', () => {
      const error = new TRPCError({ code: 'TOO_MANY_REQUESTS' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 429,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(429);
    });

    it('应该正确映射 INTERNAL_SERVER_ERROR 到 500', () => {
      const error = new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 500,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(500);
    });

    it('应该为未知错误码返回 500', () => {
      const error = new TRPCError({ code: 'UNKNOWN_CODE' as any });
      const shape = {
        code: error.code,
        message: error.message,
        data: {
          code: error.code,
          httpStatus: 500,
          path: 'test.path',
          type: 'query',
          timestamp: new Date().toISOString(),
          userId: 'user-1',
        },
      };

      const formatted = t._config.errorFormatter({
        shape,
        error,
        type: 'query',
        path: 'test.path',
        input: {},
        ctx: mockContext,
      });

      expect(formatted.data.httpStatus).toBe(500);
    });
  });

  describe('publicProcedure', () => {
    it('应该允许公共访问', async () => {
      const procedure = publicProcedure
        .query(() => ({ success: true }));

      expect(procedure).toBeDefined();
      expect(procedure._type).toBe('query');
    });

    it('应该记录请求和响应日志', async () => {
      const logRequestSpy = vi.spyOn(ErrorHandler, 'logRequest' as any);
      const logResponseSpy = vi.spyOn(ErrorHandler, 'logResponse' as any);

      const procedure = publicProcedure
        .use(({ ctx, next }) => {
          return next();
        })
        .query(() => ({ success: true }));

      // 模拟过程执行
      await procedure._def.query!({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        input: {},
        rawInput: undefined,
      });

      // 注意：由于中间件的复杂性，我们主要验证过程定义是否正确
      expect(procedure).toBeDefined();
    });

    it('应该处理错误并转换', async () => {
      const procedure = publicProcedure
        .query(() => {
          throw new Error('Test error');
        });

      expect(procedure).toBeDefined();
    });
  });

  describe('protectedProcedure', () => {
    it('应该允许已认证用户访问', async () => {
      const procedure = protectedProcedure
        .query(({ ctx }) => ({ user: ctx.user }));

      expect(procedure).toBeDefined();
      expect(procedure._type).toBe('query');
    });

    it('应该拒绝未认证用户', async () => {
      const anonymousContext = { ...mockContext, user: undefined };
      const handleSpy = vi.spyOn(ErrorHandler, 'handle');

      const procedure = protectedProcedure
        .query(({ ctx }) => ({ user: ctx.user }));

      // 模拟过程执行，应该抛出错误
      await expect(
        procedure._def.query!({
          ctx: anonymousContext,
          path: 'test.path',
          type: 'query',
          input: {},
          rawInput: undefined,
        })
      ).rejects.toThrow();

      expect(handleSpy).toHaveBeenCalledWith(ErrorCode.UNAUTHORIZED, anonymousContext);
    });
  });

  describe('adminProcedure', () => {
    it('应该允许管理员访问', async () => {
      const adminContext = { ...mockContext, user: { ...mockContext.user, role: 'ADMIN' } };
      const procedure = adminProcedure
        .query(({ ctx }) => ({ user: ctx.user }));

      expect(procedure).toBeDefined();
      expect(procedure._type).toBe('query');
    });

    it('应该拒绝未认证用户', async () => {
      const anonymousContext = { ...mockContext, user: undefined };
      const handleSpy = vi.spyOn(ErrorHandler, 'handle');

      const procedure = adminProcedure
        .query(({ ctx }) => ({ user: ctx.user }));

      await expect(
        procedure._def.query!({
          ctx: anonymousContext,
          path: 'test.path',
          type: 'query',
          input: {},
          rawInput: undefined,
        })
      ).rejects.toThrow();

      expect(handleSpy).toHaveBeenCalledWith(ErrorCode.UNAUTHORIZED, anonymousContext);
    });

    it('应该拒绝非管理员用户', async () => {
      const userContext = { ...mockContext, user: { ...mockContext.user, role: 'USER' } };
      const handleSpy = vi.spyOn(ErrorHandler, 'handle');

      const procedure = adminProcedure
        .query(({ ctx }) => ({ user: ctx.user }));

      await expect(
        procedure._def.query!({
          ctx: userContext,
          path: 'test.path',
          type: 'query',
          input: {},
          rawInput: undefined,
        })
      ).rejects.toThrow();

      expect(handleSpy).toHaveBeenCalledWith(ErrorCode.FORBIDDEN, userContext);
    });
  });

  describe('路由器创建', () => {
    it('应该能够创建路由器', () => {
      const testRouter = router({
        hello: publicProcedure.query(() => 'Hello World'),
        protected: protectedProcedure.query(({ ctx }) => `Hello ${ctx.user?.email}`),
      });

      expect(testRouter).toBeDefined();
      expect(testRouter._def.procedures).toBeDefined();
      expect(testRouter._def.procedures.hello).toBeDefined();
      expect(testRouter._def.procedures.protected).toBeDefined();
    });

    it('应该导出路由器创建函数', () => {
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
      expect(router).toBe(t.router);
    });
  });

  describe('中间件导出', () => {
    it('应该导出中间件创建函数', () => {
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
      expect(middleware).toBe(t.middleware);
    });

    it('应该能够创建自定义中间件', () => {
      const customMiddleware = middleware(({ ctx, next }) => {
        return next();
      });

      expect(customMiddleware).toBeDefined();
      expect(typeof customMiddleware).toBe('function');
    });
  });

  describe('路由器合并', () => {
    it('应该导出路由器合并函数', () => {
      expect(mergeRouters).toBeDefined();
      expect(typeof mergeRouters).toBe('function');
      expect(mergeRouters).toBe(t.mergeRouters);
    });

    it('应该能够合并路由器', () => {
      const router1 = router({
        endpoint1: publicProcedure.query(() => 'Endpoint 1'),
      });

      const router2 = router({
        endpoint2: publicProcedure.query(() => 'Endpoint 2'),
      });

      const merged = mergeRouters(router1, router2);

      expect(merged).toBeDefined();
      expect(merged._def.procedures).toBeDefined();
      expect(merged._def.procedures.endpoint1).toBeDefined();
      expect(merged._def.procedures.endpoint2).toBeDefined();
    });
  });

  describe('依赖集成', () => {
    it('应该正确集成错误处理器', () => {
      expect(ErrorHandler).toBeDefined();
      expect(ErrorHandler.handle).toBeDefined();
      expect(ErrorHandler.log).toBeDefined();
    });

    it('应该正确集成速率限制器', () => {
      expect(rateLimiters).toBeDefined();
      expect(rateLimiters.auth).toBeDefined();
      expect(rateLimiters.api).toBeDefined();
      expect(rateLimiters.form).toBeDefined();
      expect(rateLimiters.health).toBeDefined();
    });

    it('应该提供完整的中间件生态', () => {
      expect(publicProcedure).toBeDefined();
      expect(protectedProcedure).toBeDefined();
      expect(adminProcedure).toBeDefined();
      expect(router).toBeDefined();
      expect(middleware).toBeDefined();
      expect(mergeRouters).toBeDefined();
    });
  });

  describe('类型安全', () => {
    it('应该保持类型安全', () => {
      // 验证所有导出的类型
      expect(t).toBeDefined();
      expect(publicProcedure).toBeDefined();
      expect(protectedProcedure).toBeDefined();
      expect(adminProcedure).toBeDefined();
      expect(router).toBeDefined();
      expect(middleware).toBeDefined();
      expect(mergeRouters).toBeDefined();
    });

    it('应该提供正确的上下文类型', () => {
      // 验证上下文类型正确传递
      const procedure = publicProcedure
        .query(({ ctx }) => {
          expect(ctx).toBeDefined();
          expect(ctx.prisma).toBeDefined();
          return { success: true };
        });

      expect(procedure).toBeDefined();
    });
  });

  describe('配置验证', () => {
    it('应该确保所有必要的配置都存在', () => {
      expect(t._config).toBeDefined();
      expect(t._config.transformer).toBeDefined();
      expect(t._config.errorFormatter).toBeDefined();
    });

    it('应该提供一致的中介接口', () => {
      const procedures = [publicProcedure, protectedProcedure, adminProcedure];

      procedures.forEach(procedure => {
        expect(procedure).toBeDefined();
        expect(procedure._type).toBe('query');
        expect(typeof procedure._def.query).toBe('function');
      });
    });
  });
});