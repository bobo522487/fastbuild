import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@workspace/api';
import { createContext } from '@workspace/api';

/**
 * tRPC Next.js API 路由处理器
 * 将所有 tRPC 请求路由到相应的处理程序
 */

const handler = createNextApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error, type, path, input, ctx, req }) => {
    // 开发环境下输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error(`tRPC Error on ${path}:`, error);
    }

    // 可以在这里添加错误监控（如 Sentry）
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error);
    // }
  },
  responseMeta: ({ ctx, paths, type, errors }) => {
    // 在响应头中添加缓存控制信息
    const allPublic = paths?.every(path =>
      path === 'health' ||
      path.startsWith('form.list') ||
      path.startsWith('submission.getById')
    );

    if (allPublic && !errors.length) {
      return {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      };
    }

    // 认证相关的请求不缓存
    if (paths?.some(path => path.startsWith('auth.'))) {
      return {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      };
    }

    return {};
  },
});

export { handler as GET, handler as POST };