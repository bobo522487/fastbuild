import { prisma } from '@workspace/database';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { IncomingMessage, ServerResponse } from 'http';
import jwt from 'jsonwebtoken';

// 注释掉NextAuth auth函数导入，避免循环依赖
// 在实际使用中，认证应该由API包自身处理，而不是依赖web应用

/**
 * 上下文类型定义
 * 包含请求、响应和数据库连接
 */
export interface Context {
  req?: IncomingMessage;
  res?: ServerResponse;
  prisma: typeof prisma;
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
    isActive: boolean;
  };
}

/**
 * 创建 tRPC 上下文
 * 为每个请求提供数据库连接和用户信息
 * 支持两种认证方式：Auth.js Session和传统JWT
 */
export async function createContext({
  req,
  res,
}: CreateNextContextOptions): Promise<Context> {
  // 基础上下文，包含数据库连接
  const context: Context = {
    req,
    res,
    prisma,
  };

  const headers = req?.headers ?? {};
  const authorization = typeof headers?.authorization === 'string' ? headers.authorization : undefined;

  if (!context.user && authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length);

    if (token.length === 0) {
      return context;
    }

    const secret = process.env.JWT_SECRET ?? 'default-secret';

    try {
      const decoded = jwt.verify(token, secret) as { userId?: string; email?: string } | undefined;

      if (!decoded?.userId) {
        return context;
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

        if (user && user.isActive) {
          context.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          };
        }
      } catch (error) {
        console.warn('Failed to load user for token:', error);
      }
    } catch (error) {
      console.warn('Invalid auth token:', error);
    }
  }

  return context;
}

/**
 * 创建内部上下文（用于服务器端操作）
 * 当不需要 HTTP 请求/响应时使用
 */
export function createInnerContext(user?: Context['user']): Context {
  return {
    prisma,
    user,
  };
}

export type ContextType = Awaited<ReturnType<typeof createContext>>;
