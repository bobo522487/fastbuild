import { NextRequest, NextResponse } from 'next/server';
import { DatabaseTestHelpers } from './database-helpers';
import { TestDataFactory } from './factory';

/**
 * 创建模拟的NextRequest对象
 */
export function createMockRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

/**
 * 创建模拟的用户会话
 */
export function createMockSession(user: any) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
  };
}

/**
 * 验证API响应格式
 */
export function validateApiResponse(response: NextResponse): {
  success: boolean;
  data?: any;
  error?: any;
  status: number;
} {
  const responseData = response.json ? response.json() : null;

  return {
    success: response.ok,
    data: responseData,
    status: response.status,
    error: response.ok ? null : { status: response.status, message: responseData?.message },
  };
}

/**
 * 创建测试用的API上下文
 */
export function createTestContext(user?: any) {
  return {
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
    } : null,
    params: {},
    searchParams: new URLSearchParams(),
  };
}

/**
 * 比较对象，忽略时间戳字段
 */
export function deepEqualIgnoreTimestamps(obj1: any, obj2: any): boolean {
  const ignoreKeys = ['createdAt', 'updatedAt', 'expires', 'emailVerified'];

  const cleanObj = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!ignoreKeys.includes(key)) {
        cleaned[key] = cleanObj(value);
      }
    }
    return cleaned;
  };

  return JSON.stringify(cleanObj(obj1)) === JSON.stringify(cleanObj(obj2));
}

/**
 * 等待指定的毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试失败的异步操作
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay * attempt);
      }
    }
  }

  throw lastError!;
}

/**
 * 生成唯一的测试ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证错误消息格式
 */
export function validateErrorFormat(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  );
}

/**
 * 创建测试用的认证头
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 测试数据清理助手
 */
export class TestCleanupHelper {
  private cleanupFunctions: Array<() => Promise<void>> = [];

  /**
   * 添加清理函数
   */
  addCleanup(fn: () => Promise<void>): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * 执行所有清理操作
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = this.cleanupFunctions.map(async (fn) => {
      try {
        await fn();
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    });

    await Promise.all(cleanupPromises);
    this.cleanupFunctions = [];
  }

  /**
   * 创建自动清理的用户
   */
  async createAutoCleanupUser(overrides: Partial<any> = {}): Promise<any> {
    const user = await DatabaseTestHelpers.createTestUser(overrides);
    this.addCleanup(async () => {
      await DatabaseTestHelpers.getInstance().user.delete({
        where: { id: user.id },
      });
    });
    return user;
  }

  /**
   * 创建自动清理的项目
   */
  async createAutoCleanupProject(ownerId: string, overrides: Partial<any> = {}): Promise<any> {
    const project = await DatabaseTestHelpers.createTestProject(ownerId, overrides);
    this.addCleanup(async () => {
      await DatabaseTestHelpers.getInstance().project.delete({
        where: { id: project.id },
      });
    });
    return project;
  }
}