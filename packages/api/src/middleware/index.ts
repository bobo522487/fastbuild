import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from '../trpc/context';
import { ErrorHandler, ErrorCode, logRequest, logResponse } from './errorHandler';
import { rateLimiters } from './rateLimiter';

/**
 * 速率限制器导出
 */
export { rateLimiters };

/**
 * tRPC 实例配置
 */
export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, type, path, input, ctx }) {
    // 记录错误日志
    ErrorHandler.log(error, ctx);

    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
        httpStatus: getHttpStatus(error.code),
        path,
        type,
        timestamp: new Date().toISOString(),
        userId: ctx?.user?.id || 'anonymous',
      },
    };
  },
});

/**
 * 获取 HTTP 状态码
 */
function getHttpStatus(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'BAD_REQUEST':
      return 400;
    case 'TOO_MANY_REQUESTS':
      return 429;
    case 'INTERNAL_SERVER_ERROR':
      return 500;
    default:
      return 500;
  }
}

/**
 * 公共路由（无需认证）
 */
export const publicProcedure = t.procedure.use(
  async function publicMiddleware({ path, type, input, ctx, next }) {
    const startTime = Date.now();

    // 记录请求日志
    logRequest(ctx, path, type, input);

    try {
      // 执行下一个中间件或过程
      const result = await next();

      // 记录响应日志
      logResponse(ctx, path, Date.now() - startTime, result);

      return result;
    } catch (error) {
      // 转换错误
      const trpcError = ErrorHandler.handle(error, ctx);

      // 记录错误日志（已在 errorFormatter 中记录）

      throw trpcError;
    }
  }
);

/**
 * 受保护路由（需要认证）
 */
export const protectedProcedure = t.procedure.use(
  async function authMiddleware({ ctx, next }) {
    // 检查用户是否已认证
    if (!ctx.user) {
      throw ErrorHandler.handle(ErrorCode.UNAUTHORIZED, ctx);
    }

    return next();
  }
);

/**
 * 管理员路由（需要管理员权限）
 */
export const adminProcedure = t.procedure.use(
  async function adminMiddleware({ ctx, next }) {
    // 检查用户是否已认证
    if (!ctx.user) {
      throw ErrorHandler.handle(ErrorCode.UNAUTHORIZED, ctx);
    }

    // 检查是否为管理员
    if (ctx.user.role !== 'ADMIN') {
      throw ErrorHandler.handle(ErrorCode.FORBIDDEN, ctx);
    }

    return next();
  }
);

/**
 * 速率限制中间件
 */
export function withRateLimit(limiter: any) {
  return t.procedure.use(limiter);
}

/**
 * 创建自定义速率限制过程
 */
export function createRateLimitedProcedure(config?: any) {
  const limiter = rateLimiters.create(config);
  return t.procedure.use(limiter);
}

/**
 * 路由器创建辅助函数
 */
export const router = t.router;

/**
 * 中间件导出
 */
export const middleware = t.middleware;

/**
 * 合并路由器
 */
export const mergeRouters = t.mergeRouters;

/**
 * 认证路由（严格速率限制）
 */
export const authProcedure = publicProcedure.use(rateLimiters.auth);

/**
 * 表单路由（中等速率限制）
 */
export const formProcedure = publicProcedure.use(rateLimiters.form);

/**
 * 健康检查路由（宽松速率限制）
 */
export const healthProcedure = publicProcedure.use(rateLimiters.health);