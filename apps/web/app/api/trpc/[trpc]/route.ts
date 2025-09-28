import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@workspace/api/trpc/routers';
import { prisma } from '@workspace/database';
import type { AppRouter } from '@workspace/api/trpc/routers';

/**
 * tRPC Next.js API 路由处理器
 * 处理所有 tRPC 请求
 */

// 创建 fetch 适配器的上下文
async function createFetchContext() {
  return {
    prisma,
    req: undefined,
    res: undefined,
  };
}

export async function GET(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter as any,
    createContext: createFetchContext,
  });
}

export async function POST(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter as any,
    createContext: createFetchContext,
  });
}