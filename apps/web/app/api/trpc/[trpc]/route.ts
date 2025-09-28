import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@workspace/api/src/trpc/routers';
import { createContext } from '@workspace/api/src/trpc/context';

/**
 * tRPC Next.js API 路由处理器
 * 处理所有 tRPC 请求
 */

export async function GET(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createContext,
  });
}

export async function POST(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createContext,
  });
}