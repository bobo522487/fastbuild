import { vi } from 'vitest';

// 统一的 Prisma 模拟配置
export const createPrismaMock = () => ({
  user: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  form: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  submission: {
    create: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  userSession: {
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    findUnique: vi.fn().mockResolvedValue(null),
  },
  monitoringEvent: {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  errorLog: {
    create: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue(null),
  },
  performanceMetric: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  userActivity: {
    create: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  $disconnect: vi.fn().mockResolvedValue(undefined),
});

// 统一的数据库模拟工厂函数
export const setupDatabaseMocks = () => {
  vi.mock('@workspace/database', () => ({
    prisma: createPrismaMock(),
  }));
};

// 辅助函数：重置所有 Prisma mock
export const resetPrismaMocks = () => {
  const { prisma } = require('@workspace/database');

  // 重置所有模型的 mock
  Object.keys(prisma).forEach(key => {
    if (typeof prisma[key] === 'object' && prisma[key] !== null) {
      Object.keys(prisma[key]).forEach(method => {
        if (typeof prisma[key][method] === 'function') {
          prisma[key][method].mockClear();
        }
      });
    } else if (typeof prisma[key] === 'function') {
      prisma[key].mockClear();
    }
  });
};