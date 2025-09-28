import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';

// 模拟数据库模块
vi.mock('@workspace/database', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Health Router 单元测试', () => {
  let caller: any;
  let mockPrisma: any;

  beforeEach(() => {
    // 重置模拟调用计数，但不改变实现
    vi.clearAllMocks();

    // 获取模拟的 Prisma 实例
    const { prisma } = require('@workspace/database');
    mockPrisma = prisma;

    caller = createCaller({
      user: null,
      prisma: mockPrisma,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('check', () => {
    it('应该返回健康状态当数据库连接正常', async () => {
      const result = await caller.health.check();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('应该返回不健康状态当数据库连接失败', async () => {
      // 使用 vi.spyOn 来临时修改 mock 行为
      const originalMock = mockPrisma.$queryRaw;
      mockPrisma.$queryRaw = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database connection failed');
      expect(result.timestamp).toBeDefined();

      // 恢复原始 mock
      mockPrisma.$queryRaw = originalMock;
    });
  });

  describe('database', () => {
    it('应该返回连接状态当数据库连接正常', async () => {
      const result = await caller.health.database();

      expect(result.status).toBe('connected');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('应该返回断开状态当数据库连接失败', async () => {
      // 使用 vi.spyOn 来临时修改 mock 行为
      const originalMock = mockPrisma.$queryRaw;
      mockPrisma.$queryRaw = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await caller.health.database();

      expect(result.status).toBe('disconnected');
      expect(result.error).toBe('Connection failed');
      expect(result.timestamp).toBeDefined();

      // 恢复原始 mock
      mockPrisma.$queryRaw = originalMock;
    });
  });

  describe('info', () => {
    it('应该返回系统信息', async () => {
      const result = await caller.health.info();

      expect(result.service).toBe('FastBuild API');
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.architecture).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });
});