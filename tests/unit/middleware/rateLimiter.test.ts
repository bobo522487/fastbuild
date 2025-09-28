import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { createRateLimiter, rateLimiters, isAllowedIP, isAllowedUser, MemoryStore } from '@workspace/api/middleware/rateLimiter';
import type { Context } from '@workspace/api/trpc/context';

describe('速率限制中间件单元测试', () => {
  let mockContext: Context;
  let mockNext: any;
  let store: MemoryStore;

  beforeEach(() => {
    mockContext = {
      user: { id: 'user-1', email: 'test@example.com', role: 'USER', isActive: true },
      req: {
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '192.168.1.1' }
      } as any,
      res: {} as any,
      prisma: {} as any,
    };

    mockNext = vi.fn().mockResolvedValue({ success: true });
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('MemoryStore', () => {
    it('应该正确存储和获取值', async () => {
      store = new MemoryStore();

      await store.set('test-key', 5, 60);
      const value = await store.get('test-key');

      expect(value).toBe(5);
    });

    it('应该正确递增计数', async () => {
      store = new MemoryStore();

      const first = await store.increment('test-key');
      const second = await store.increment('test-key');

      expect(first).toBe(1);
      expect(second).toBe(2);
    });

    it('应该处理过期键', async () => {
      store = new MemoryStore();

      await store.set('test-key', 5, 1); // 1秒过期
      vi.advanceTimersByTime(1500); // 快进1.5秒

      const value = await store.get('test-key');
      expect(value).toBe(0);
    });

    it('应该重置过期键的计数', async () => {
      store = new MemoryStore();

      await store.set('test-key', 5, 1);
      vi.advanceTimersByTime(1500);

      const newValue = await store.increment('test-key');
      expect(newValue).toBe(1);
    });

    it('应该清理过期条目', () => {
      store = new MemoryStore();

      // 添加一些测试数据
      store['store'].set('expired-key', { count: 1, expires: Date.now() - 1000 });
      store['store'].set('valid-key', { count: 1, expires: Date.now() + 1000 });

      expect(store['store'].size).toBe(2);

      store.cleanup();

      expect(store['store'].size).toBe(1);
      expect(store['store'].has('valid-key')).toBe(true);
    });
  });

  describe('createRateLimiter', () => {
    it('应该允许在限制内的请求', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1分钟
        max: 5, // 最多5次
      });

      const result = await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(result).toEqual({ success: true });
      expect(mockNext).toHaveBeenCalled();
    });

    it('应该拒绝超过限制的请求', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1, // 只允许1次
      });

      // 第一次请求应该成功
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      // 第二次请求应该被拒绝
      await expect(
        rateLimiter({
          ctx: mockContext,
          path: 'test.path',
          type: 'query',
          next: mockNext,
        })
      ).rejects.toThrow(TRPCError);

      try {
        await rateLimiter({
          ctx: mockContext,
          path: 'test.path',
          type: 'query',
          next: mockNext,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).toBe('TOO_MANY_REQUESTS');
          expect(error.message).toBe('请求过于频繁，请稍后再试');
        }
      }
    });

    it('应该使用自定义键生成器', async () => {
      const customKeyGenerator = vi.fn().mockReturnValue('custom-key');
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        keyGenerator: customKeyGenerator,
      });

      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(customKeyGenerator).toHaveBeenCalledWith(mockContext);
    });

    it('应该跳过成功请求的计数', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skipSuccessfulRequests: true,
      });

      // 第一次请求（成功）
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      // 第二次请求也应该成功，因为成功请求被跳过
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该跳过失败请求的计数', async () => {
      const failingNext = vi.fn().mockResolvedValue({ error: 'Some error' });
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        skipFailedRequests: true,
      });

      // 第一次请求（失败）
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: failingNext,
      });

      // 第二次请求也应该成功，因为失败请求被跳过
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(failingNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('应该使用自定义错误消息', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        message: '自定义限流消息',
      });

      // 第一次请求
      await rateLimiter({
        ctx: mockContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      // 第二次请求应该被拒绝
      await expect(
        rateLimiter({
          ctx: mockContext,
          path: 'test.path',
          type: 'query',
          next: mockNext,
        })
      ).rejects.toThrow('自定义限流消息');
    });

    it('应该为不同路径使用不同的键', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      });

      // 对路径1的请求
      await rateLimiter({
        ctx: mockContext,
        path: 'path1',
        type: 'query',
        next: mockNext,
      });

      // 对路径2的请求应该不受影响
      await rateLimiter({
        ctx: mockContext,
        path: 'path2',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该为不同用户使用不同的键', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      });

      const user1Context = { ...mockContext, user: { ...mockContext.user, id: 'user-1' } };
      const user2Context = { ...mockContext, user: { ...mockContext.user, id: 'user-2' } };

      // 用户1的请求
      await rateLimiter({
        ctx: user1Context,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      // 用户2的请求应该不受影响
      await rateLimiter({
        ctx: user2Context,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('应该为匿名用户使用IP地址作为键', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      });

      const anonymousContext = {
        ...mockContext,
        user: undefined,
        req: { ...mockContext.req, socket: { remoteAddress: '192.168.1.100' } }
      };

      // 匿名用户的请求
      await rateLimiter({
        ctx: anonymousContext,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('预定义速率限制器', () => {
    it('应该提供auth限制器', async () => {
      const authRateLimiter = rateLimiters.auth;

      // 第一次请求应该成功
      await authRateLimiter({
        ctx: mockContext,
        path: 'auth.login',
        type: 'mutation',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该提供api限制器', async () => {
      const apiRateLimiter = rateLimiters.api;

      await apiRateLimiter({
        ctx: mockContext,
        path: 'api.endpoint',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该提供form限制器', async () => {
      const formRateLimiter = rateLimiters.form;

      await formRateLimiter({
        ctx: mockContext,
        path: 'form.submit',
        type: 'mutation',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该提供health限制器', async () => {
      const healthRateLimiter = rateLimiters.health;

      await healthRateLimiter({
        ctx: mockContext,
        path: 'health.check',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该允许创建自定义限制器', () => {
      const customLimiter = rateLimiters.create({
        windowMs: 30000,
        max: 10,
        message: '自定义限制消息',
      });

      expect(customLimiter).toBeInstanceOf(Function);
    });
  });

  describe('白名单功能', () => {
    beforeEach(() => {
      // 清理环境变量
      delete process.env.ALLOWED_IPS;
      delete process.env.ALLOWED_USERS;
    });

    afterEach(() => {
      // 恢复环境变量
      delete process.env.ALLOWED_IPS;
      delete process.env.ALLOWED_USERS;
    });

    it('应该在空白名单时允许所有IP', () => {
      const result = isAllowedIP('192.168.1.1');
      expect(result).toBe(true);
    });

    it('应该允许白名单中的IP', () => {
      process.env.ALLOWED_IPS = '192.168.1.1,192.168.1.2';

      expect(isAllowedIP('192.168.1.1')).toBe(true);
      expect(isAllowedIP('192.168.1.2')).toBe(true);
    });

    it('应该拒绝非白名单中的IP', () => {
      process.env.ALLOWED_IPS = '192.168.1.1,192.168.1.2';

      expect(isAllowedIP('192.168.1.3')).toBe(false);
    });

    it('应该在空白名单时允许所有用户', () => {
      const result = isAllowedUser('user-1');
      expect(result).toBe(true);
    });

    it('应该允许白名单中的用户', () => {
      process.env.ALLOWED_USERS = 'user-1,user-2';

      expect(isAllowedUser('user-1')).toBe(true);
      expect(isAllowedUser('user-2')).toBe(true);
    });

    it('应该拒绝非白名单中的用户', () => {
      process.env.ALLOWED_USERS = 'user-1,user-2';

      expect(isAllowedUser('user-3')).toBe(false);
    });

    it('应该处理包含空格的白名单', () => {
      process.env.ALLOWED_IPS = ' 192.168.1.1 , 192.168.1.2 ';

      expect(isAllowedIP('192.168.1.1')).toBe(true);
      expect(isAllowedIP('192.168.1.2')).toBe(true);
      expect(isAllowedIP('192.168.1.3')).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理没有socket信息的请求', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      });

      const contextWithoutSocket = {
        ...mockContext,
        req: { ...mockContext.req, socket: undefined }
      };

      await rateLimiter({
        ctx: contextWithoutSocket,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该处理没有remoteAddress的请求', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      });

      const contextWithoutIP = {
        ...mockContext,
        req: { ...mockContext.req, socket: { remoteAddress: undefined } }
      };

      await rateLimiter({
        ctx: contextWithoutIP,
        path: 'test.path',
        type: 'query',
        next: mockNext,
      });

      expect(mockNext).toHaveBeenCalled();
    });
  });
});