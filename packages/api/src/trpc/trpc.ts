/**
 * tRPC 实例配置和路由导出
 * 核心配置文件，包含所有 tRPC 相关的导出
 */

// 导出核心 tRPC 实例和中间件
export { t, router, publicProcedure, protectedProcedure, adminProcedure, authProcedure, formProcedure, healthProcedure, middleware, mergeRouters } from '../middleware/index';

// 导出上下文类型
export type { Context } from './context';

// 导出错误处理相关的类型和工具
export { ErrorHandler, ErrorCode } from '../middleware/errorHandler';
export { rateLimiters } from '../middleware/rateLimiter';