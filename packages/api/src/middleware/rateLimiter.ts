import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

/**
 * 速率限制存储接口
 */
interface RateLimitStore {
  get(key: string): Promise<number>;
  set(key: string, value: number, ttl: number): Promise<void>;
  increment(key: string): Promise<number>;
}

/**
 * 内存存储实现（生产环境建议使用 Redis）
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; expires: number }>();

  async get(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || item.expires < Date.now()) {
      this.store.delete(key);
      return 0;
    }
    return item.count;
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      count: value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async increment(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || item.expires < Date.now()) {
      this.store.set(key, { count: 1, expires: Date.now() + 60 * 1000 });
      return 1;
    }
    item.count++;
    return item.count;
  }

  /**
   * 清理过期条目
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expires < now) {
        this.store.delete(key);
      }
    }
  }
}

// 全局存储实例
const store = new MemoryStore();

// 定期清理过期条目
if (typeof setInterval !== 'undefined') {
  setInterval(() => store.cleanup(), 5 * 60 * 1000); // 每 5 分钟清理一次
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  max: number; // 最大请求数
  keyGenerator?: (ctx: Context) => string; // 自定义键生成器
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean; // 是否跳过失败请求
  message?: string; // 自定义错误消息
}

/**
 * 默认配置
 */
const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 分钟
  max: 100, // 最多 100 次请求
  message: '请求过于频繁，请稍后再试',
};

/**
 * 创建速率限制中间件
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const options = { ...defaultConfig, ...config };

  return async function rateLimitMiddleware({
    ctx,
    path,
    type,
    next,
  }: {
    ctx: Context;
    path: string;
    type: 'query' | 'mutation';
    next: () => Promise<any>;
  }) {
    // 生成限制键
    const key = options.keyGenerator
      ? options.keyGenerator(ctx)
      : generateDefaultKey(ctx, path);

    // 获取当前计数
    const currentCount = await store.get(key);

    // 检查是否超过限制
    if (currentCount >= options.max) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: options.message,
      });
    }

    // 执行请求
    const result = await next();

    // 根据结果决定是否计数
    const shouldIncrement =
      (!options.skipSuccessfulRequests && !result.error) ||
      (!options.skipFailedRequests && result.error);

    if (shouldIncrement) {
      const newCount = await store.increment(key);

      // 设置过期时间（如果这是第一次请求）
      if (newCount === 1) {
        await store.set(key, newCount, options.windowMs / 1000);
      }
    }

    return result;
  };
}

/**
 * 生成默认键
 */
function generateDefaultKey(ctx: Context, path: string): string {
  const userId = ctx.user?.id;
  const ip = ctx.req?.socket.remoteAddress || 'unknown';

  // 如果用户已登录，使用用户 ID；否则使用 IP
  const identifier = userId || ip;

  return `rate_limit:${identifier}:${path}`;
}

/**
 * 预定义的速率限制器
 */
export const rateLimiters = {
  // 认证端点 - 更严格的限制
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 最多 5 次尝试
    message: '登录尝试过于频繁，请稍后再试',
  }),

  // API 端点 - 一般限制
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    max: 100, // 最多 100 次请求
  }),

  // 表单提交 - 中等限制
  form: createRateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    max: 20, // 最多 20 次提交
  }),

  // 健康检查 - 宽松限制
  health: createRateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    max: 1000, // 最多 1000 次检查
  }),

  // 创建自定义限制器
  create: createRateLimiter,
};

/**
 * IP 白名单检查
 */
export function isAllowedIP(ip: string): boolean {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
  return allowedIPs.length === 0 || allowedIPs.includes(ip);
}

/**
 * 用户白名单检查
 */
export function isAllowedUser(userId: string): boolean {
  const allowedUsers = process.env.ALLOWED_USERS?.split(',') || [];
  return allowedUsers.length === 0 || allowedUsers.includes(userId);
}