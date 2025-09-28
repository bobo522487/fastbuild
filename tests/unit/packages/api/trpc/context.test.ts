import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createContext, createInnerContext, type Context } from '@workspace/api/trpc/context';
import { prisma } from '@workspace/database';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { IncomingMessage, ServerResponse } from 'http';

describe('tRPC 上下文单元测试', () => {
  let mockReq: IncomingMessage;
  let mockRes: ServerResponse;
  let mockOptions: CreateNextContextOptions;
  let consoleWarnSpy: any;

  beforeEach(() => {
    mockReq = {
      headers: {},
      socket: { remoteAddress: '192.168.1.1' }
    } as any as IncomingMessage;

    mockRes = {} as ServerResponse;

    mockOptions = {
      req: mockReq,
      res: mockRes,
    };

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createContext', () => {
    it('应该创建基础上下文，包含数据库连接', async () => {
      const context = await createContext(mockOptions);

      expect(context).toMatchObject({
        req: mockReq,
        res: mockRes,
        prisma: prisma,
      });
      expect(context.user).toBeUndefined();
    });

    it('应该处理没有请求头的情况', async () => {
      const context = await createContext({
        req: undefined,
        res: mockRes,
      });

      expect(context.prisma).toBe(prisma);
      expect(context.user).toBeUndefined();
    });

    describe('JWT 令牌处理', () => {
      it('应该解析有效的 Bearer 令牌', async () => {
        const validToken = 'valid-jwt-token';
        const decodedToken = {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'USER',
        };

        mockReq.headers.authorization = `Bearer ${validToken}`;

        (jwt.verify as any).mockReturnValue(decodedToken as any);

        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'USER',
          isActive: true,
        };

        (prisma.user.findUnique as any).mockResolvedValue(mockUser as any);

        const context = await createContext(mockOptions);

        expect(jwt.verify).toHaveBeenCalledWith(validToken, process.env.JWT_SECRET || 'default-secret');
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

        expect(context.user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          role: 'USER',
          isActive: true,
        });
      });

      it('应该处理无效的 JWT 令牌', async () => {
        mockReq.headers.authorization = 'Bearer invalid-token';

        (jwt.verify as any).mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid auth token:',
          expect.any(Error)
        );
      });

      it('应该处理没有 Bearer 前缀的认证头', async () => {
        mockReq.headers.authorization = 'Invalid-auth-header';

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      it('应该处理不完整的认证头', async () => {
        mockReq.headers.authorization = 'Bearer';

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      it('应该处理空认证头', async () => {
        mockReq.headers.authorization = '';

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(jwt.verify).not.toHaveBeenCalled();
      });

      it('应该使用默认的 JWT 密钥', async () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'user-123' } as any);

        await createContext(mockOptions);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'default-secret');

        if (originalSecret) {
          process.env.JWT_SECRET = originalSecret;
        }
      });

      it('应该使用环境变量中的 JWT 密钥', async () => {
        process.env.JWT_SECRET = 'custom-secret';

        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'user-123' } as any);

        await createContext(mockOptions);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'custom-secret');

        delete process.env.JWT_SECRET;
      });
    });

    describe('用户查找和处理', () => {
      it('应该处理用户不存在的情况', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'nonexistent-user' } as any);
        (prisma.user.findUnique as any).mockResolvedValue(null);

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
      });

      it('应该处理非活跃用户', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'inactive-user' } as any);

        const inactiveUser = {
          id: 'inactive-user',
          email: 'inactive@example.com',
          role: 'USER',
          isActive: false,
        };

        (prisma.user.findUnique as any).mockResolvedValue(inactiveUser as any);

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
      });

      it('应该处理缺少 userId 的令牌', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ email: 'test@example.com' } as any); // 缺少 userId

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });

      it('应该处理数据库查询错误', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'user-123' } as any);
        (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

        const context = await createContext(mockOptions);

        expect(context.user).toBeUndefined();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Invalid auth token:',
          expect.any(Error)
        );
      });

      it('应该正确映射用户角色', async () => {
        mockReq.headers.authorization = 'Bearer valid-token';
        (jwt.verify as any).mockReturnValue({ userId: 'admin-user' } as any);

        const adminUser = {
          id: 'admin-user',
          email: 'admin@example.com',
          role: 'ADMIN',
          isActive: true,
        };

        (prisma.user.findUnique as any).mockResolvedValue(adminUser as any);

        const context = await createContext(mockOptions);

        expect(context.user).toEqual({
          id: 'admin-user',
          email: 'admin@example.com',
          role: 'ADMIN',
          isActive: true,
        });
      });
    });

    describe('边界情况', () => {
      it('应该处理 undefined 的 req 和 res', async () => {
        const context = await createContext({});

        expect(context.prisma).toBe(prisma);
        expect(context.req).toBeUndefined();
        expect(context.res).toBeUndefined();
        expect(context.user).toBeUndefined();
      });

      it('应该处理 null 的 headers', async () => {
        const reqWithNullHeaders = { ...mockReq, headers: null } as any;

        const context = await createContext({
          req: reqWithNullHeaders,
          res: mockRes,
        });

        expect(context.user).toBeUndefined();
      });
    });
  });

  describe('createInnerContext', () => {
    it('应该创建内部上下文，包含数据库连接', () => {
      const context = createInnerContext();

      expect(context).toMatchObject({
        prisma: prisma,
      });
      expect(context.user).toBeUndefined();
    });

    it('应该创建带用户信息的内部上下文', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      };

      const context = createInnerContext(user);

      expect(context).toMatchObject({
        prisma: prisma,
        user: user,
      });
    });

    it('应该创建带部分用户信息的内部上下文', () => {
      const partialUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      };

      const context = createInnerContext(partialUser);

      expect(context.user).toEqual(partialUser);
    });
  });

  describe('Context 类型', () => {
    it('应该正确推断上下文类型', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'USER' as const,
        isActive: true,
      };

      const context: Context = {
        prisma: prisma,
        user: user,
        req: {} as IncomingMessage,
        res: {} as ServerResponse,
      };

      expect(typeof context.prisma).toBe('object');
      expect(context.user).toEqual(user);
    });

    it('应该处理可选的 req 和 res', () => {
      const context: Context = {
        prisma: prisma,
      };

      expect(context.req).toBeUndefined();
      expect(context.res).toBeUndefined();
      expect(context.user).toBeUndefined();
    });
  });

  describe('性能和安全', () => {
    it('应该快速创建无认证的上下文', async () => {
      const startTime = Date.now();
      await createContext({});
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // 应该在10ms内完成
    });

    it('应该处理大量的无效令牌尝试', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        mockReq.headers.authorization = `Bearer invalid-token-${i}`;
        promises.push(createContext(mockOptions));
      }

      const results = await Promise.all(promises);

      // 所有上下文都应该成功创建，但没有用户信息
      results.forEach(context => {
        expect(context.user).toBeUndefined();
      });
    });

    it('应该防止令牌解析时的信息泄露', async () => {
      mockReq.headers.authorization = 'Bearer malicious-token';

      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Malformed token');
      });

      const context = await createContext(mockOptions);

      // 即使令牌格式错误，也不应该暴露敏感信息
      expect(context.user).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});