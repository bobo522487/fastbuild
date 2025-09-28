import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';
import { createTestUser, createTestForm } from '../setup';

// 模拟依赖
vi.mock('@workspace/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    form: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-token'),
  verify: vi.fn(() => ({ userId: 'test-user-id' })),
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => 'hashed-password'),
  compare: vi.fn(() => Promise.resolve(true)),
}));

describe('tRPC 核心功能测试', () => {
  let caller: any;

  beforeEach(() => {
    // 创建模拟的调用者
    caller = createCaller({
      user: null,
      prisma: require('@workspace/database').prisma,
    });
  });

  describe('健康检查', () => {
    it('应该返回健康的系统状态', async () => {
      const { prisma } = await import('@workspace/database');
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.environment).toBeDefined();
    });

    it('应该检测数据库连接问题', async () => {
      const { prisma } = await import('@workspace/database');
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('认证流程', () => {
    it('应该成功注册新用户', async () => {
      const { prisma } = await import('@workspace/database');
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('应该拒绝重复邮箱注册', async () => {
      const { prisma } = await import('@workspace/database');
      vi.mocked(prisma.user.create).mockRejectedValueOnce(new Error('Email already exists'));

      await expect(
        caller.auth.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        })
      ).rejects.toThrow();
    });

    it('应该成功登录有效用户', async () => {
      const { prisma } = await import('@workspace/database');
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

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(prisma.userSession.create).mockResolvedValueOnce({
        id: 'session-1',
        userId: 'user-1',
        token: 'refresh-token',
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await caller.auth.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('应该拒绝无效凭据', async () => {
      const { prisma } = await import('@workspace/database');
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        caller.auth.login({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('表单管理', () => {
    it('应该创建新表单', async () => {
      const { prisma } = await import('@workspace/database');
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.form.create).mockResolvedValueOnce(mockForm);

      // 设置认证用户
      caller = createCaller({
        user: { id: 'user-1', email: 'test@example.com', role: 'USER' },
        prisma: require('@workspace/database').prisma,
      });

      const result = await caller.form.create({
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
      });

      expect(result.name).toBe('Test Form');
      expect(prisma.form.create).toHaveBeenCalled();
    });

    it('应该获取表单列表', async () => {
      const { prisma } = await import('@workspace/database');
      const mockForms = [
        {
          id: 'form-1',
          name: 'Form 1',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.form.findMany).mockResolvedValueOnce(mockForms);

      const result = await caller.form.list();

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items[0].name).toBe('Form 1');
    });
  });

  describe('表单提交', () => {
    it('应该创建新提交', async () => {
      const { prisma } = await import('@workspace/database');
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'Test Submission' },
        createdById: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(prisma.submission.create).mockResolvedValueOnce(mockSubmission);

      const result = await caller.submission.create({
        formId: 'form-1',
        data: { name: 'Test Submission' },
      });

      expect(result.formId).toBe('form-1');
      expect(result.data.name).toBe('Test Submission');
      expect(prisma.submission.create).toHaveBeenCalled();
    });

    it('应该获取表单的提交列表', async () => {
      const { prisma } = await import('@workspace/database');
      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'Submission 1' },
          createdById: 'user-1',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.submission.findMany).mockResolvedValueOnce(mockSubmissions);

      const result = await caller.submission.getByFormId({
        formId: 'form-1',
      });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items[0].formId).toBe('form-1');
    });
  });
});