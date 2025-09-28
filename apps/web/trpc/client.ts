import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@workspace/api';

/**
 * 创建独立的 tRPC 客户端
 * 用于服务器端操作或需要独立客户端的场景
 */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getBaseUrl() + '/api/trpc',
      transformer: superjson,
      headers: () => {
        const headers: Record<string, string> = {};

        // 在服务器端时，可以添加自定义头
        if (typeof window === 'undefined') {
          // 例如：添加内部服务认证
          // headers['x-internal-secret'] = process.env.INTERNAL_SECRET;
        }

        // 添加认证头（如果在客户端且有 token）
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

/**
 * 获取基础 URL
 * 用于处理不同环境的 URL 配置
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
 * 服务器端 tRPC 客户端工具函数
 * 用于在 getServerSideProps 或 API 路由中使用
 */
export async function createServerSideClient() {
  return trpcClient;
}

/**
 * 类型安全的客户端辅助函数
 */
export const api = {
  form: {
    list: (input: any) => trpcClient.form.list.query(input),
    getById: (input: any) => trpcClient.form.getById.query(input),
    create: (input: any) => trpcClient.form.create.mutate(input),
    update: (input: any) => trpcClient.form.update.mutate(input),
    delete: (input: any) => trpcClient.form.delete.mutate(input),
    getSubmissions: (input: any) => trpcClient.form.getSubmissions.query(input),
  },
  auth: {
    login: (input: any) => trpcClient.auth.login.mutate(input),
    register: (input: any) => trpcClient.auth.register.mutate(input),
    refreshToken: (input: any) => trpcClient.auth.refreshToken.mutate(input),
    me: () => trpcClient.auth.me.query(),
    updateProfile: (input: any) => trpcClient.auth.updateProfile.mutate(input),
    changePassword: (input: any) => trpcClient.auth.changePassword.mutate(input),
    logout: () => trpcClient.auth.logout.mutate(),
    createUser: (input: any) => trpcClient.auth.createUser.mutate(input),
    listUsers: (input: any) => trpcClient.auth.listUsers.query(input),
  },
  submission: {
    create: (input: any) => trpcClient.submission.create.mutate(input),
    getById: (input: any) => trpcClient.submission.getById.query(input),
    getByFormId: (input: any) => trpcClient.submission.getByFormId.query(input),
    update: (input: any) => trpcClient.submission.update.mutate(input),
    delete: (input: any) => trpcClient.submission.delete.mutate(input),
    getStats: (input: any) => trpcClient.submission.getStats.query(input),
    bulkDelete: (input: any) => trpcClient.submission.bulkDelete.mutate(input),
  },
  health: {
    check: () => trpcClient.health.check.query(),
    database: () => trpcClient.health.database.query(),
    info: () => trpcClient.health.info.query(),
  },
};