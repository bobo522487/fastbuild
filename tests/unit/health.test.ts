import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc/routers/index';
import { prisma } from '@workspace/database';

describe('tRPC Health Router 单元测试', () => {
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

  describe('check', () => {
    it('应该返回健康的系统状态', async () => {
      // Mock database connection test
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.services).toBeDefined();
      expect(result.services.database).toBe('connected');
      expect(result.metrics).toBeDefined();
    });

    it('应该检测数据库连接问题', async () => {
      // Mock database connection failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Database connection failed');
      expect(result.services.database).toBe('disconnected');
    });

    it('应该包含正确的环境信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.environment).toHaveProperty('nodeVersion');
      expect(result.environment).toHaveProperty('platform');
      expect(result.environment).toHaveProperty('architecture');
      expect(result.environment).toHaveProperty('uptime');
    });

    it('应该包含性能指标', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.metrics).toHaveProperty('memoryUsage');
      expect(result.metrics).toHaveProperty('cpuUsage');
      expect(result.metrics).toHaveProperty('eventLoopDelay');
      expect(result.metrics.memoryUsage).toHaveProperty('heapUsed');
      expect(result.metrics.memoryUsage).toHaveProperty('heapTotal');
      expect(result.metrics.memoryUsage).toHaveProperty('external');
      expect(result.metrics.memoryUsage).toHaveProperty('rss');
    });

    it('应该包含服务状态信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('redis', 'not_configured');
      expect(result.services).toHaveProperty('storage', 'not_configured');
    });

    it('应该处理数据库查询超时', async () => {
      // Mock database timeout
      mockPrisma.$queryRaw.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 100)
        )
      );

      // Set a shorter timeout for the test
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 50)
      );

      await expect(
        Promise.race([caller.health.check(), timeoutPromise])
      ).rejects.toThrow('Health check timeout');
    });

    it('应该处理数据库返回意外结果', async () => {
      // Mock database returning unexpected data
      mockPrisma.$queryRaw.mockResolvedValue([{}]); // Missing the 1:1 result

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('unexpected result');
    });

    it('应该包含系统信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.system).toBeDefined();
      expect(result.system).toHaveProperty('hostname');
      expect(result.system).toHaveProperty('platform');
      expect(result.system).toHaveProperty('release');
    });

    it('应该处理内存统计错误', async () => {
      // Mock memory usage error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockImplementation(() => {
        throw new Error('Memory stats not available');
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('degraded');
      expect(result.metrics.memoryUsage).toEqual({});
      expect(result.warnings).toContain('Memory stats not available');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('应该处理CPU使用率计算错误', async () => {
      // Mock CPU usage error
      const originalCpuUsage = process.cpuUsage;
      process.cpuUsage = vi.fn().mockImplementation(() => {
        throw new Error('CPU stats not available');
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('degraded');
      expect(result.metrics.cpuUsage).toEqual({});
      expect(result.warnings).toContain('CPU stats not available');

      // Restore original function
      process.cpuUsage = originalCpuUsage;
    });

    it('应该包含时间戳和版本信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.timestamp).toBeInstanceOf(Number);
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.version).toBeDefined();
      expect(result.version).toHaveProperty('api');
      expect(result.version).toHaveProperty('node');
    });

    it('应该检测高内存使用情况', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
        external: 100 * 1024 * 1024, // 100MB
        rss: 1200 * 1024 * 1024, // 1.2GB
        arrayBuffers: 50 * 1024 * 1024, // 50MB
      });

      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('degraded');
      expect(result.warnings).toContain('High memory usage detected');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('应该检测高事件循环延迟', async () => {
      // Mock high event loop delay
      const start = process.hrtime.bigint();
      const end = start + BigInt(100 * 1000 * 1000); // 100ms delay

      const originalHrtime = process.hrtime;
      process.hrtime = {
        bigint: vi.fn()
          .mockReturnValueOnce(start)
          .mockReturnValueOnce(end)
      } as any;

      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.status).toBe('degraded');
      expect(result.warnings).toContain('High event loop delay detected');

      // Restore original function
      process.hrtime = originalHrtime;
    });

    it('应该包含完整的元数据', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('pid');
      expect(result.metadata).toHaveProperty('cwd');
      expect(result.metadata).toHaveProperty('execPath');
      expect(result.metadata).toHaveProperty('title');
    });

    it('应该处理未知错误', async () => {
      // Mock unexpected error
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Unknown error occurred'));

      const result = await caller.health.check();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Unknown error occurred');
      expect(result.errorDetails).toBeDefined();
    });

    it('应该支持调试模式', async () => {
      // Set environment variable for debugging
      process.env.DEBUG = 'true';

      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.check();

      expect(result.debug).toBe(true);
      expect(result.diagnostics).toBeDefined();

      // Clean up
      delete process.env.DEBUG;
    });
  });

  describe('detailed', () => {
    it('应该返回详细的系统信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.detailed();

      expect(result.status).toBe('healthy');
      expect(result.details).toBeDefined();
      expect(result.details).toHaveProperty('database');
      expect(result.details).toHaveProperty('system');
      expect(result.details).toHaveProperty('performance');
      expect(result.details).toHaveProperty('services');
    });

    it('应该包含数据库详细信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.detailed();

      expect(result.details.database).toHaveProperty('connection');
      expect(result.details.database).toHaveProperty('version');
      expect(result.details.database).toHaveProperty('maxConnections');
      expect(result.details.database).toHaveProperty('currentConnections');
    });

    it('应该包含系统资源详细信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.detailed();

      expect(result.details.system).toHaveProperty('os');
      expect(result.details.system).toHaveProperty('cpu');
      expect(result.details.system).toHaveProperty('memory');
      expect(result.details.system).toHaveProperty('disk');
    });

    it('应该包含性能指标详细信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.detailed();

      expect(result.details.performance).toHaveProperty('responseTime');
      expect(result.details.performance).toHaveProperty('throughput');
      expect(result.details.performance).toHaveProperty('errorRate');
      expect(result.details.performance).toHaveProperty('latency');
    });

    it('应该包含服务配置信息', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.detailed();

      expect(result.details.services).toHaveProperty('database');
      expect(result.details.services).toHaveProperty('cache');
      expect(result.details.services).toHaveProperty('storage');
      expect(result.details.services).toHaveProperty('external');
    });

    it('应该处理数据库详细信息获取失败', async () => {
      // Mock database query failure for detailed info
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ 1: 1 }]) // Basic health check passes
        .mockRejectedValue(new Error('Failed to get detailed info')); // Detailed info fails

      const result = await caller.health.detailed();

      expect(result.status).toBe('degraded');
      expect(result.details.database.error).toBe('Failed to get detailed info');
    });
  });

  describe('metrics', () => {
    it('应该返回系统指标', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.metrics();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('memory');
      expect(result.metrics).toHaveProperty('cpu');
      expect(result.metrics).toHaveProperty('network');
      expect(result.metrics).toHaveProperty('disk');
    });

    it('应该包含时间序列数据', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.metrics();

      expect(result.metrics).toHaveProperty('timeSeries');
      expect(Array.isArray(result.metrics.timeSeries)).toBe(true);
    });

    it('应该支持指标聚合', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await caller.health.metrics();

      expect(result.metrics).toHaveProperty('aggregations');
      expect(result.metrics.aggregations).toHaveProperty('avg');
      expect(result.metrics.aggregations).toHaveProperty('max');
      expect(result.metrics.aggregations).toHaveProperty('min');
      expect(result.metrics.aggregations).toHaveProperty('sum');
    });

    it('应该处理指标获取错误', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Metrics collection failed'));

      const result = await caller.health.metrics();

      expect(result.error).toBe('Metrics collection failed');
      expect(result.metrics).toEqual({});
    });
  });
});