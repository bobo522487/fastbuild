'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWSClient, wsLink } from '@trpc/client';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState, useEffect } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@workspace/api';

/**
 * 创建 tRPC React 客户端
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * 创建 WebSocket 客户端（用于实时功能）
 */
function getWsClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  return createWSClient({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
  });
}

/**
 * 获取 HTTP 链接配置
 */
function getHttpLink() {
  return {
    url: getBaseUrl() + '/api/trpc',
    transformer: superjson,
    headers() {
      const headers: Record<string, string> = {};

      // 添加认证头
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          headers.authorization = `Bearer ${token}`;
        }
      }

      return headers;
    },
  };
}

/**
 * 获取基础 URL
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    return '';
  }

  if (process.env.VERCEL_URL) {
    // Vercel 部署
    return `https://${process.env.VERCEL_URL}`;
  }

  // 开发环境
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * tRPC Provider 组件
 * 提供 tRPC 和 React Query 的上下文
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 分钟
        retry: (failureCount, error: any) => {
          // 根据错误类型决定是否重试
          if (error?.data?.code === 'UNAUTHORIZED') {
            return false; // 认证错误不重试
          }
          return failureCount < 3; // 其他错误最多重试 3 次
        },
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.data?.code === 'UNAUTHORIZED') {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  }));

  const [trpcClient] = useState(() => {
    const wsClient = getWsClient();

    if (wsClient) {
      // 如果支持 WebSocket，使用 HTTP + WebSocket 混合链接
      return trpc.createClient({
        links: [
          wsLink({
            client: wsClient,
            transformer: superjson,
          }),
        ],
      });
    } else {
      // 否则使用纯 HTTP 链接
      return trpc.createClient({
        links: [
          httpBatchLink(getHttpLink()),
        ],
      });
    }
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * 认证状态 Hook
 */
export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const login = async (credentials: { email: string; password: string }) => {
    const result = await trpc.auth.login.mutate(credentials);
    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      await utils.auth.me.invalidate();
    }
    return result;
  };

  const logout = async () => {
    await trpc.auth.logout.mutate();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    await utils.auth.me.invalidate();
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const result = await trpc.auth.refreshToken.mutate({ refreshToken });
    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
    }
    return result;
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
  };
}

/**
 * 表单管理 Hook
 */
export function useFormManagement() {
  const utils = trpc.useUtils();

  const createForm = async (data: any) => {
    const result = await trpc.form.create.mutate(data);
    await utils.form.list.invalidate();
    return result;
  };

  const updateForm = async (id: string, data: any) => {
    const result = await trpc.form.update.mutate({ id, ...data });
    await utils.form.list.invalidate();
    await utils.form.getById.invalidate({ id });
    return result;
  };

  const deleteForm = async (id: string) => {
    const result = await trpc.form.delete.mutate({ id });
    await utils.form.list.invalidate();
    return result;
  };

  return {
    createForm,
    updateForm,
    deleteForm,
  };
}

/**
 * 表单提交 Hook
 */
export function useFormSubmission(formId: string) {
  const utils = trpc.useUtils();

  const submitForm = async (data: any) => {
    const result = await trpc.submission.create.mutate({
      formId,
      data,
    });
    await utils.submission.getByFormId.invalidate({ formId });
    return result;
  };

  const getSubmissions = (options?: { limit?: number }) => {
    return trpc.submission.getByFormId.useQuery(
      { formId, limit: options?.limit },
      {
        enabled: !!formId,
      }
    );
  };

  return {
    submitForm,
    getSubmissions,
  };
}