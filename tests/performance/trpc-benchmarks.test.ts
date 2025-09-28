import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';
import { prisma } from '@workspace/database';

// Mock dependencies for benchmark testing
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

vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => 'hashed-password'),
  compare: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-token'),
  verify: vi.fn(() => ({ userId: 'test-user-id', email: 'test@example.com', role: 'USER' })),
}));

describe('tRPC 端点基准测试', () => {
  let caller: any;
  let mockPrisma: any;
  let performanceResults: Record<string, number[]>;

  beforeEach(() => {
    mockPrisma = require('@workspace/database').prisma;
    caller = createCaller({
      user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
      prisma: mockPrisma,
    });
    performanceResults = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (Object.keys(performanceResults).length > 0) {
      console.log('\n=== 基准测试结果 ===');
      Object.entries(performanceResults).forEach(([operation, times]) => {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        console.log(`${operation}:`);
        console.log(`  平均: ${avg.toFixed(2)}ms`);
        console.log(`  最小: ${min.toFixed(2)}ms`);
        console.log(`  最大: ${max.toFixed(2)}ms`);
        console.log(`  样本数: ${times.length}`);
      });
      console.log('==================\n');
    }
  });

  describe('健康检查基准测试', () => {
    it('应该在多次运行中保持稳定的健康检查性能', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.health.check();
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      performanceResults['健康检查'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const stdDev = Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / times.length);

      expect(avg).toBeLessThan(50); // 平均响应时间应该小于50ms
      expect(stdDev).toBeLessThan(20); // 标准差应该小于20ms，表示性能稳定

      console.log(`健康检查基准测试: 平均${avg.toFixed(2)}ms, 标准差${stdDev.toFixed(2)}ms`);
    });
  });

  describe('认证端点基准测试', () => {
    it('应该在多次登录中保持稳定的性能', async () => {
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
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      });

      const iterations = 30;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.auth.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      performanceResults['用户登录'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(100); // 平均登录时间应该小于100ms

      console.log(`用户登录基准测试: 平均${avg.toFixed(2)}ms`);
    });

    it('应该在多次注册中保持稳定的性能', async () => {
      const mockUser = {
        id: `user-${Date.now()}`,
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
        userId: mockUser.id,
        token: 'refresh-token',
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      });

      const iterations = 20;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.auth.register({
          email: `new-${i}@example.com`,
          password: 'password123',
          name: `New User ${i}`,
        });
        const endTime = performance.now();
        times.push(endTime - startTime);

        // 为下次测试重置mock
        mockPrisma.user.findUnique.mockResolvedValue(null);
      }

      performanceResults['用户注册'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(150); // 平均注册时间应该小于150ms

      console.log(`用户注册基准测试: 平均${avg.toFixed(2)}ms`);
    });
  });

  describe('表单操作基准测试', () => {
    it('应该在多次表单创建中保持稳定的性能', async () => {
      const mockForm = {
        id: `form-${Date.now()}`,
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
      };

      mockPrisma.form.create.mockResolvedValue(mockForm);

      const iterations = 25;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.form.create({
          name: `Test Form ${i}`,
          metadata: { version: '1.0.0', fields: [] },
        });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      performanceResults['表单创建'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(100); // 平均创建时间应该小于100ms

      console.log(`表单创建基准测试: 平均${avg.toFixed(2)}ms`);
    });

    it('应该在多次表单查询中保持稳定的性能', async () => {
      const mockForms = Array.from({ length: 50 }, (_, i) => ({
        id: `form-${i}`,
        name: `Form ${i}`,
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
      }));

      mockPrisma.form.findMany.mockResolvedValue(mockForms);
      mockPrisma.form.count.mockResolvedValue(100);

      const iterations = 30;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.form.list({ limit: 20 });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      performanceResults['表单列表'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(150); // 平均查询时间应该小于150ms

      console.log(`表单列表基准测试: 平均${avg.toFixed(2)}ms`);
    });
  });

  describe('表单提交基准测试', () => {
    it('应该在多次表单提交中保持稳定的性能', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubmission = {
        id: `submission-${Date.now()}`,
        formId: 'form-1',
        data: { name: 'John Doe', email: 'john@example.com' },
        submittedById: 'user-1',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.create.mockResolvedValue(mockSubmission);

      const iterations = 40;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await caller.submission.create({
          formId: 'form-1',
          data: { name: `User ${i}`, email: `user${i}@example.com` },
        });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      performanceResults['表单提交'] = times;

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(100); // 平均提交时间应该小于100ms

      console.log(`表单提交基准测试: 平均${avg.toFixed(2)}ms`);
    });
  });

  describe('负载测试基准', () => {
    it('应该能够处理突发负载', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const burstSize = 100;
      const times: number[] = [];

      console.log(`开始突发负载测试 (${burstSize}个并发请求)`);

      const startTime = performance.now();
      const promises = Array.from({ length: burstSize }, () =>
        caller.health.check()
      );
      await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / burstSize;

      performanceResults['突发负载'] = [avgTime];

      expect(totalTime).toBeLessThan(2000); // 100个并发请求应该在2秒内完成
      expect(avgTime).toBeLessThan(100); // 平均响应时间应该小于100ms

      console.log(`突发负载测试: 总时间${totalTime.toFixed(2)}ms, 平均${avgTime.toFixed(2)}ms`);
    });

    it('应该能够处理持续负载', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const duration = 5000; // 5秒
      const requestInterval = 100; // 每100ms一个请求
      const times: number[] = [];

      console.log(`开始持续负载测试 (${duration}ms)`);

      const startTime = performance.now();
      let requestCount = 0;

      const interval = setInterval(async () => {
        const requestStart = performance.now();
        await caller.health.check();
        const requestEnd = performance.now();
        times.push(requestEnd - requestStart);
        requestCount++;

        if (performance.now() - startTime >= duration) {
          clearInterval(interval);
        }
      }, requestInterval);

      // 等待测试完成
      await new Promise(resolve => setTimeout(resolve, duration + 100));

      const totalTime = performance.now() - startTime;
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const qps = requestCount / (totalTime / 1000);

      performanceResults['持续负载'] = times;

      expect(avgTime).toBeLessThan(50); // 平均响应时间应该小于50ms
      expect(qps).toBeGreaterThan(5); // QPS应该大于5

      console.log(`持续负载测试: QPS=${qps.toFixed(2)}, 平均响应时间=${avgTime.toFixed(2)}ms`);
    });
  });

  describe('内存使用基准测试', () => {
    it('应该在多次操作后保持稳定的内存使用', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const iterations = 100;
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < iterations; i++) {
        await caller.health.check();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(5); // 内存增长应该小于5MB

      console.log(`内存使用基准测试: 100次操作后内存增长${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });
});