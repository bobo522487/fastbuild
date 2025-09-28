'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState, useEffect } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@workspace/api';
import { ErrorHandler, getUserFriendlyMessage, useErrorHandler } from './error-handling';
import { monitoring, useMonitoring } from '@/lib/monitoring';

/**
 * 创建 tRPC React 客户端
 */
export const trpc = createTRPCReact<AppRouter>();

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
        gcTime: 10 * 60 * 1000, // 10 分钟
        retry: (failureCount, error: any) => {
          // 根据错误类型决定是否重试
          if (error?.data?.code === 'UNAUTHORIZED') {
            return false; // 认证错误不重试
          }
          if (error?.data?.code === 'FORBIDDEN') {
            return false; // 权限错误不重试
          }
          if (error?.data?.code === 'VALIDATION_ERROR') {
            return false; // 验证错误不重试
          }
          if (error?.data?.code === 'NOT_FOUND') {
            return false; // 404 错误不重试
          }
          return failureCount < 3; // 其他错误最多重试 3 次
        },
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.data?.code === 'UNAUTHORIZED') {
            return false;
          }
          if (error?.data?.code === 'FORBIDDEN') {
            return false;
          }
          if (error?.data?.code === 'VALIDATION_ERROR') {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  }));

  const [trpcClient] = useState(() => {
    return trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: getBaseUrl() + '/api/trpc',
          headers: () => {
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
        }),
      ],
    });
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

  const loginMutation = trpc.auth.login.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const refreshTokenMutation = trpc.auth.refreshToken.useMutation();

  const login = async (credentials: { email: string; password: string }) => {
    const result = await loginMutation.mutateAsync(credentials);
    if (result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      await utils.auth.me.invalidate();
    }
    return result;
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    await utils.auth.me.invalidate();
  };

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    const result = await refreshTokenMutation.mutateAsync({ refreshToken: refreshTokenValue });
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

  const createFormMutation = trpc.form.create.useMutation();
  const updateFormMutation = trpc.form.update.useMutation();
  const deleteFormMutation = trpc.form.delete.useMutation();

  const createForm = async (data: any) => {
    const result = await createFormMutation.mutateAsync(data);
    await utils.form.list.invalidate();
    return result;
  };

  const updateForm = async (id: string, data: any) => {
    const result = await updateFormMutation.mutateAsync({ id, ...data });
    await utils.form.list.invalidate();
    await utils.form.getById.invalidate({ id });
    return result;
  };

  const deleteForm = async (id: string) => {
    const result = await deleteFormMutation.mutateAsync({ id });
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
  const submitMutation = trpc.submission.create.useMutation();

  const submitForm = async (data: any) => {
    const result = await submitMutation.mutateAsync({
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