/**
 * tRPC 核心功能测试
 * 测试路由健康检查和基本功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('@workspace/database', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
    },
    form: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@workspace/api/trpc/routers', () => ({
  createCaller: vi.fn(() => ({
    health: {
      check: vi.fn(),
    },
    auth: {
      register: vi.fn(),
      login: vi.fn(),
    },
    form: {
      create: vi.fn(),
      list: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      getByFormId: vi.fn(),
    },
  })),
}));

describe('tRPC 核心功能测试', () => {
  let caller: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { createCaller } = require('@workspace/api/trpc/routers');
    caller = createCaller({
      user: null,
      prisma: require('@workspace/database').prisma,
    });
  });

  describe('健康检查', () => {
    it('应该返回健康的系统状态', async () => {
      const { prisma } = require('@workspace/database');
      const mockResult = [{ 1: 1 }];
      prisma.$queryRaw.mockResolvedValue(mockResult);

      const result = await caller.health.check();

      expect(result.status).toBe('healthy');
      expect(result.database).toBe('connected');
    });

    it('应该检测数据库连接问题', async () => {
      const { prisma } = require('@workspace/database');
      prisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('认证流程', () => {
    it('应该成功注册新用户', async () => {
      const { prisma } = require('@workspace/database');
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      };

      prisma.user.create.mockResolvedValue(mockUser);

      const result = await caller.auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user).toEqual(mockUser);
    });

    it('应该拒绝重复邮箱注册', async () => {
      const { prisma } = require('@workspace/database');
      prisma.user.create.mockRejectedValue(new Error('Email already exists'));

      await expect(
        caller.auth.register({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('应该成功登录有效用户', async () => {
      const { prisma } = require('@workspace/database');
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        role: 'USER',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await caller.auth.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      });
      expect(result.token).toBeDefined();
    });

    it('应该拒绝无效凭据', async () => {
      const { prisma } = require('@workspace/database');
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        caller.auth.login({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('表单管理', () => {
    it('应该创建新表单', async () => {
      const { prisma } = require('@workspace/database');
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        description: 'Test form description',
        metadata: { fields: [] },
      };

      prisma.form.create.mockResolvedValue(mockForm);

      const result = await caller.form.create({
        name: 'Test Form',
        description: 'Test form description',
        metadata: { fields: [] },
      });

      expect(result).toEqual(mockForm);
    });

    it('应该获取表单列表', async () => {
      const { prisma } = require('@workspace/database');
      const mockForms = [
        { id: 'form-1', name: 'Form 1' },
        { id: 'form-2', name: 'Form 2' },
      ];

      prisma.form.findMany.mockResolvedValue(mockForms);

      const result = await caller.form.list();

      expect(result).toEqual(mockForms);
    });
  });

  describe('表单提交', () => {
    it('应该创建新提交', async () => {
      const { prisma } = require('@workspace/database');
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'Test', email: 'test@example.com' },
      };

      prisma.submission.create.mockResolvedValue(mockSubmission);

      const result = await caller.submission.create({
        formId: 'form-1',
        data: { name: 'Test', email: 'test@example.com' },
      });

      expect(result).toEqual(mockSubmission);
    });

    it('应该获取表单的提交列表', async () => {
      const { prisma } = require('@workspace/database');
      const mockSubmissions = [
        { id: 'submission-1', data: { name: 'User 1' } },
        { id: 'submission-2', data: { name: 'User 2' } },
      ];

      prisma.submission.findMany.mockResolvedValue(mockSubmissions);

      const result = await caller.submission.getByFormId({
        formId: 'form-1',
      });

      expect(result).toEqual(mockSubmissions);
    });
  });
});