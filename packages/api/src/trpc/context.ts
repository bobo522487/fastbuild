import jwt from 'jsonwebtoken';
import { prisma } from '@workspace/database';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { IncomingMessage, ServerResponse } from 'http';

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

  // 从请求头中提取认证信息
  const authHeader = req?.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      // 验证 JWT 令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as {
        userId: string;
        email: string;
        role: string;
      };

      if (decoded && decoded.userId) {
        // 查找用户信息
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
            role: user.role as 'ADMIN' | 'USER',
            isActive: user.isActive,
          };
        }
      }
    } catch (error) {
      // 无效令牌，上下文中不包含用户信息
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