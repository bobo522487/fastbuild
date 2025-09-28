'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/trpc/provider';

/**
 * 认证保护高阶组件
 * 确保用户已登录才能访问受保护的页面
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAdmin?: boolean;
    redirectTo?: string;
  } = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const { requireAdmin = false, redirectTo = '/login' } = options;

    useEffect(() => {
      if (isLoading) return;

      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requireAdmin && user?.role !== 'ADMIN') {
        router.push('/unauthorized');
        return;
      }
    }, [isLoading, isAuthenticated, user, requireAdmin, router, redirectTo]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // 会重定向
    }

    if (requireAdmin && user?.role !== 'ADMIN') {
      return null; // 会重定向
    }

    return <Component {...props} />;
  };
}

/**
 * 权限检查 Hook
 */
export function usePermission(permission: string) {
  const { user } = useAuth();

  return {
    hasPermission: user?.role === 'ADMIN' || false, // 简化版本，可根据需要扩展
    isAdmin: user?.role === 'ADMIN',
    isUser: user?.role === 'USER',
  };
}

/**
 * 路由守卫组件
 */
export function AuthGuard({
  children,
  requireAdmin = false,
  fallback,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">需要登录</h1>
          <p className="text-gray-600">请先登录以访问此页面</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">权限不足</h1>
          <p className="text-gray-600">您没有访问此页面的权限</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 认证状态监听 Hook
 */
export function useAuthListener() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 监听存储变化，例如在其他标签页中登出
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'accessToken' && !event.newValue) {
          // Access token 被删除，可能是登出
          window.location.reload();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Token 自动刷新 Hook
 */
export function useTokenRefresh() {
  const { refreshToken } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('accessToken');
      const expiresAt = localStorage.getItem('accessTokenExpiresAt');

      if (token && expiresAt) {
        const expiryTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        // 如果 token 将在 5 分钟内过期，提前刷新
        if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
          refreshToken().catch(console.error);
        }
      }
    };

    // 每分钟检查一次
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);
}