import { router, publicProcedure, healthProcedure } from '../trpc';
import { prisma } from '@workspace/database';
import { z } from 'zod';

/**
 * Health Router - 健康检查路由
 * 提供系统健康状态检查和监控功能
 */

export const healthRouter = router({
  // 系统健康检查
  check: healthProcedure
    .query(async ({ ctx }) => {
      // 检查数据库连接
      try {
        await ctx.prisma.$queryRaw`SELECT 1`;
        const health = {
          status: 'healthy' as const,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
        };
        return health;
      } catch (error) {
        const health = {
          status: 'unhealthy' as const,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          error: 'Database connection failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
        return health;
      }
    }),

  // 数据库连接测试
  database: healthProcedure
    .query(async ({ ctx }) => {
      const startTime = Date.now();

      try {
        // 执行简单查询测试数据库连接
        await ctx.prisma.$queryRaw`SELECT 1`;
        const responseTime = Date.now() - startTime;

        return {
          status: 'connected',
          responseTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  // 获取系统信息
  info: healthProcedure
    .query(() => {
      return {
        service: 'FastBuild API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    }),
});