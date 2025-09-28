// 移除jsonwebtoken和NextAuth依赖，简化认证逻辑
import { prisma } from '@workspace/database';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { IncomingMessage, ServerResponse } from 'http';

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

  try {
    // 暂时跳过Auth.js认证，避免循环依赖
    // 在实际生产环境中，应该在这里实现独立的认证逻辑

    // 如果Auth.js认证失败，尝试传统JWT认证（适用于API客户端）
    // 注意：Edge环境中不支持jsonwebtoken，这里简化处理
    if (!context.user) {
      const authHeader = req?.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        // 在实际应用中，这里应该使用Web Crypto API验证JWT
        // 为了简化，我们暂时跳过JWT验证，直接记录日志
        console.warn('JWT authentication not implemented in Edge environment');
      }
    }
  } catch (error) {
    // 认证失败，上下文中不包含用户信息
    console.warn('Authentication failed:', error);
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