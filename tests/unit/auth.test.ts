import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';
import { prisma } from '@workspace/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

describe('tRPC Authentication Router 单元测试', () => {
  let caller: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = require('@workspace/database').prisma;
    caller = createCaller({
      user: null,
      prisma: mockPrisma,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('应该成功登录有效用户', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await caller.auth.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('应该拒绝无效邮箱', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        caller.auth.login({
          email: 'invalid@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('应该拒绝被锁定的账户', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'locked@example.com',
        name: 'Locked User',
        passwordHash: 'hashed-password',
        role: 'USER',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        caller.auth.login({
          email: 'locked@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('ACCOUNT_LOCKED');
    });

    it('应该拒绝错误密码', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(
        caller.auth.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        role: 'USER',
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'refresh-token',
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await caller.auth.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@example.com');
      expect(result.user.name).toBe('New User');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          name: 'New User',
          passwordHash: 'hashed-password',
          role: 'USER',
        },
      });
    });

    it('应该拒绝重复邮箱注册', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'USER',
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        caller.auth.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        })
      ).rejects.toThrow('USER_ALREADY_EXISTS');
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新令牌', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          isActive: true,
        },
      };

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.userSession.update.mockResolvedValue(mockSession);

      const result = await caller.auth.refreshToken({
        refreshToken: 'refresh-token',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('应该拒绝无效的刷新令牌', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      await expect(
        caller.auth.refreshToken({
          refreshToken: 'invalid-token',
        })
      ).rejects.toThrow('TOKEN_INVALID');
    });

    it('应该拒绝过期的刷新令牌', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // 过期
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          isActive: true,
        },
      };

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession);

      await expect(
        caller.auth.refreshToken({
          refreshToken: 'expired-token',
        })
      ).rejects.toThrow('TOKEN_EXPIRED');
    });
  });

  describe('me', () => {
    it('应该返回当前用户信息', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        emailVerified: true,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authCaller.auth.me();

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('应该拒绝未认证用户的请求', async () => {
      await expect(caller.auth.me()).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('updateProfile', () => {
    it('应该成功更新用户信息', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'USER',
        emailVerified: true,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      mockPrisma.user.findUnique.mockResolvedValue(null); // 检查邮箱是否已被使用
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await authCaller.auth.updateProfile({
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('应该拒绝邮箱已被其他用户使用', async () => {
      const existingUser = {
        id: 'user-2',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'USER',
        emailVerified: true,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        authCaller.auth.updateProfile({
          email: 'existing@example.com',
        })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      const mockUser = {
        passwordHash: 'old-hashed-password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await authCaller.auth.changePassword({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(result.success).toBe(true);
    });

    it('应该拒绝错误的当前密码', async () => {
      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      const mockUser = {
        passwordHash: 'old-hashed-password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(
        authCaller.auth.changePassword({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('logout', () => {
    it('应该成功登出并撤销所有会话', async () => {
      const authCaller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: mockPrisma,
      });

      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      const result = await authCaller.auth.logout();

      expect(result.success).toBe(true);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isActive: false },
      });
    });
  });

  describe('admin operations', () => {
    let adminCaller: any;

    beforeEach(() => {
      adminCaller = createCaller({
        user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
        prisma: mockPrisma,
      });
    });

    describe('createUser', () => {
      it('管理员应该成功创建用户', async () => {
        const mockUser = {
          id: 'new-user-1',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'USER',
          emailVerified: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue(mockUser);

        const result = await adminCaller.auth.createUser({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'USER',
          password: 'password123',
        });

        expect(result.email).toBe('newuser@example.com');
        expect(result.role).toBe('USER');
      });

      it('非管理员应该被拒绝创建用户', async () => {
        await expect(
          caller.auth.createUser({
            email: 'newuser@example.com',
            name: 'New User',
            role: 'USER',
          })
        ).rejects.toThrow('UNAUTHORIZED');
      });
    });

    describe('listUsers', () => {
      it('管理员应该获取用户列表', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User 1',
            role: 'USER',
            emailVerified: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            name: 'User 2',
            role: 'ADMIN',
            emailVerified: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockPrisma.user.findMany.mockResolvedValue(mockUsers);
        mockPrisma.user.count.mockResolvedValue(2);

        const result = await adminCaller.auth.listUsers({
          limit: 10,
          search: 'user',
        });

        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('非管理员应该被拒绝获取用户列表', async () => {
        await expect(
          caller.auth.listUsers({ limit: 10 })
        ).rejects.toThrow('UNAUTHORIZED');
      });
    });
  });
});