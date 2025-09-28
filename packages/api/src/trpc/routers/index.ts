import { router, t } from '../trpc';
import type { Context } from '../context';
import { formRouter } from './form';
import { authRouter } from './auth';
import { submissionRouter } from './submission';
import { healthRouter } from './health';
import { schemaRouter } from './schema';
import { monitoringRouter } from './monitoring';

/**
 * 主路由聚合器
 * 将所有子路由器组合成一个完整的 tRPC 路由器
 */

/**
 * 应用程序路由器
 * 包含所有可用的 tRPC 端点
 */
export const appRouter = router({
  // 表单管理路由
  form: formRouter,

  // 用户认证路由
  auth: authRouter,

  // 表单提交路由
  submission: submissionRouter,

  // 健康检查路由
  health: healthRouter,

  // Schema 编译和验证路由
  schema: schemaRouter,

  // 监控系统路由
  monitoring: monitoringRouter,
});

/**
 * 路由器类型导出
 * 用于客户端类型安全
 */
export type AppRouter = typeof appRouter;

/**
 * 创建测试用的 tRPC 调用者
 * 主要用于单元测试和集成测试
 */
export function createCaller(opts: {
  user: Context['user'];
  prisma: Context['prisma'];
}) {
  const context: Context = {
    user: opts.user,
    prisma: opts.prisma,
    req: undefined as any,
    res: undefined as any,
  };
  return (appRouter as any).createCaller(context);
}