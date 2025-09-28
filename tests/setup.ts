/**
 * Enhanced Test Setup for FastBuild Project
 * Supports Auth.js, Prisma 6.16, and comprehensive testing
 */

import { beforeEach, afterEach, vi, describe, it, test, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createPrismaMock } from './mocks/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

// 创建测试用的 Prisma 客户端实例
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Mock console methods in tests to reduce noise
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();

// Setup global test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// Test database cleanup utilities
const cleanupDatabase = async () => {
  // 按照外键依赖关系清理数据
  await prisma.monitoringEvent.deleteMany();
  await prisma.performanceMetric.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.userActivity.deleteMany();

  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();

  await prisma.submission.deleteMany();
  await prisma.form.deleteMany();
  await prisma.user.deleteMany();
};

// 测试前设置
beforeEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    await cleanupDatabase();
  }
});

// 测试后清理
afterEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    await cleanupDatabase();
  }
});

// Enhanced test helper functions
global.createTestUser = async (overrides = {}) => {
  const password = await bcrypt.hash('testpassword123', 12);

  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`, // 使用时间戳确保邮箱唯一性
      name: 'Test User',
      passwordHash: password,
      emailVerified: new Date(),
      isActive: true,
      role: 'USER',
      ...overrides,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

global.createTestAdmin = async (overrides = {}) => {
  const password = await bcrypt.hash('adminpassword123', 12);

  return prisma.user.create({
    data: {
      email: `admin-${Date.now()}@example.com`,
      name: 'Admin User',
      passwordHash: password,
      emailVerified: new Date(),
      isActive: true,
      role: 'ADMIN',
      ...overrides,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

global.createTestOAuthUser = async (overrides = {}) => {
  // 创建OAuth用户（无密码）
  const user = await prisma.user.create({
    data: {
      email: `oauth-${Date.now()}@example.com`,
      name: 'OAuth User',
      emailVerified: new Date(),
      isActive: true,
      role: 'USER',
      ...overrides,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 添加OAuth账户信息
  await prisma.account.create({
    data: {
      userId: user.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: `google-${user.id}`,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
    },
  });

  return user;
};

global.createTestForm = async (userId: string, overrides = {}) => {
  return prisma.form.create({
    data: {
      name: 'Test Form',
      description: 'Test form description',
      version: '1.0.0',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
            required: true,
            placeholder: '请输入姓名',
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: '邮箱',
            required: true,
            placeholder: '请输入邮箱',
          },
        ],
      },
      createdById: userId,
      ...overrides,
    },
  });
};

global.createTestSubmission = async (formId: string, userId?: string, data = {}) => {
  return prisma.submission.create({
    data: {
      formId,
      data: {
        name: 'Test Submission',
        email: 'test@example.com',
        ...data,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent/1.0',
      status: 'COMPLETED',
      ...(userId && { createdById: userId }),
    },
  });
};

global.createTestSession = async (userId: string) => {
  return prisma.session.create({
    data: {
      userId,
      sessionToken: `test-session-${Date.now()}`,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
    },
  });
};

global.generateTestJWT = (userId: string, email: string, role: string) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
};

global.createTestContext = async (user?: { id: string; email: string; role: string; isActive: boolean }) => {
  // 创建一个简单的模拟上下文，避免导入依赖问题
  return {
    prisma,
    user,
  };
};

// 简单的工厂函数，直接定义在 setup.ts 中
global.UserFactory = {
  create: async (overrides = {}) => {
    return await global.createTestUser(overrides);
  },
  createAdmin: async (overrides = {}) => {
    return await global.createTestAdmin(overrides);
  }
};

global.FormFactory = {
  create: async (userId, overrides = {}) => {
    return await global.createTestForm(userId, overrides);
  }
};

global.SubmissionFactory = {
  create: async (formId, userId, data = {}) => {
    return await global.createTestSubmission(formId, userId, data);
  }
};

// 导出 prisma 实例供测试使用
export { prisma, UserFactory, FormFactory, SubmissionFactory };
// Provide mocked Prisma client for unit tests that rely on vi mock APIs
vi.mock('@workspace/database', () => ({
  prisma: createPrismaMock(),
}));

// Mock jsonwebtoken to simplify JWT handling in unit tests
vi.mock('jsonwebtoken', () => {
  const verify = vi.fn();
  return {
    default: { verify },
    verify,
  };
});
