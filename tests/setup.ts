// Test setup for tRPC infrastructure tests
import { beforeEach, afterEach } from 'vitest';
import { prisma } from '@workspace/database';
import bcrypt from 'bcryptjs';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild';

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

// 测试前设置
beforeEach(async () => {
  // 清空数据库（测试模式）
  if (process.env.NODE_ENV === 'test') {
    await prisma.user.deleteMany();
    await prisma.form.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.userSession.deleteMany();
  }
});

// 测试后清理
afterEach(async () => {
  // 清理测试数据
  if (process.env.NODE_ENV === 'test') {
    await prisma.user.deleteMany();
    await prisma.form.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.userSession.deleteMany();
  }
});

// 测试辅助函数
global.createTestUser = async (overrides = {}) => {
  const password = await bcrypt.hash('testpassword123', 10);

  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: password,
      emailVerified: true,
      isActive: true,
      role: 'USER',
      ...overrides,
    },
  });
};

global.createTestForm = async (userId: string, overrides = {}) => {
  return prisma.form.create({
    data: {
      name: 'Test Form',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
            required: true,
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
        ...data,
      },
      ...(userId && { createdById: userId }),
    },
  });
};