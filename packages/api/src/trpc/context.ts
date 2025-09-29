import { prisma } from '@workspace/database';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { IncomingMessage, ServerResponse } from 'http';
import jwt from 'jsonwebtoken';

/**
 * 扩展的用户信息类型
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  emailVerified?: boolean;
}

/**
 * 上下文类型定义
 * 包含请求、响应和数据库连接
 */
export interface Context {
  req?: IncomingMessage;
  res?: ServerResponse;
  prisma: typeof prisma;
  user?: AuthUser;
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

  try {
    // 简化实现，仅使用 JWT 认证
    const headers = req?.headers ?? {};
    const authorization = typeof headers?.authorization === 'string' ? headers.authorization : undefined;

    if (authorization?.startsWith('Bearer ')) {
      const token = authorization.slice('Bearer '.length);

      if (token.length > 0) {
        const secret = process.env.JWT_SECRET ?? 'default-secret';

        try {
          const decoded = jwt.verify(token, secret) as { userId?: string; email?: string } | undefined;

          if (decoded?.userId) {
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                emailVerified: true,
              },
            });

            if (user && user.isActive) {
              context.user = {
                id: user.id,
                email: user.email,
                name: user.name || undefined,
                role: user.role,
                isActive: user.isActive,
                emailVerified: user.emailVerified !== null,
              };
            }
          }
        } catch (error) {
          console.warn('Invalid JWT token:', error);
        }
      }
    }
  } catch (error) {
    // 认证失败，继续无用户状态
    console.warn('Authentication failed:', error);
  }

  return context;
}

/**
 * 创建内部上下文（用于服务器端操作）
 * 当不需要 HTTP 请求/响应时使用
 */
export function createInnerContext(user?: AuthUser): Context {
  return {
    prisma,
    user,
  };
}

export type ContextType = Awaited<ReturnType<typeof createContext>>;