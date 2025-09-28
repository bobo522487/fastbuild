// 单元测试设置
import { vi } from 'vitest';

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fastbuild_test';
process.env.JWT_SECRET = 'test-jwt-secret';

// 模拟 console 方法
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();

// Mock Prisma
vi.mock('@workspace/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    form: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => 'hashed-password'),
  compare: vi.fn(() => Promise.resolve(true)),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-token'),
  verify: vi.fn(() => ({ userId: 'test-user-id', email: 'test@example.com', role: 'USER' })),
}));

// 全局测试变量
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;