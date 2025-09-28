/**
 * 监控系统单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';

// Mock prisma 在 setup.ts 中已经配置

describe('监控系统测试', () => {
  let caller: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { prisma } = require('@workspace/database');
    caller = createCaller({
      user: { id: 'user-1', role: 'USER' },
      prisma,
    });
  });

  describe('submitEvents', () => {
    it('应该成功提交监控事件', async () => {
      const mockEvents = [
        {
          type: 'error',
          timestamp: new Date(),
          sessionId: 'session-1',
          data: { message: 'Test error', severity: 'error' },
          metadata: { userAgent: 'test', url: 'http://test.com' },
        },
      ];

      vi.mocked(prisma.monitoringEvent.createMany).mockResolvedValue({
        count: 1,
      });

      const result = await caller.monitoring.submitEvents({
        events: mockEvents,
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(prisma.monitoringEvent.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            sessionId: 'session-1',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('应该处理严重错误并创建错误日志', async () => {
      const mockEvents = [
        {
          type: 'error',
          timestamp: new Date(),
          sessionId: 'session-1',
          data: { message: 'Critical error', severity: 'critical' },
          metadata: { userAgent: 'test', url: 'http://test.com' },
        },
      ];

      vi.mocked(prisma.monitoringEvent.createMany).mockResolvedValue({
        count: 1,
      });

      vi.mocked(prisma.errorLog.create).mockResolvedValue({
        id: 'error-1',
        eventId: 'session-1',
        level: 'error',
        message: 'Critical error',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.monitoring.submitEvents({
        events: mockEvents,
      });

      expect(result.criticalEvents).toBe(1);
      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'session-1',
          level: 'error',
          message: 'Critical error',
          resolved: false,
        }),
      });
    });

    it('应该验证事件数据格式', async () => {
      const invalidEvents = [
        {
          type: 'invalid_type', // 无效类型
          timestamp: 'invalid_date', // 无效日期
          sessionId: '', // 空会话ID
          data: null, // 无效数据
        },
      ];

      await expect(caller.monitoring.submitEvents({
        events: invalidEvents,
      })).rejects.toThrow();
    });
  });

  describe('getEvents', () => {
    it('应该成功获取监控事件列表', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'error',
          timestamp: new Date(),
          sessionId: 'session-1',
          data: { message: 'Test error' },
          metadata: { url: 'http://test.com' },
        },
      ];

      vi.mocked(prisma.monitoringEvent.findMany).mockResolvedValue(mockEvents);
      vi.mocked(prisma.monitoringEvent.count).mockResolvedValue(1);
      vi.mocked(prisma.monitoringEvent.groupBy).mockResolvedValue([
        { type: 'error', _count: { type: 1 } },
      ]);

      const result = await caller.monitoring.getEvents({
        limit: 10,
        offset: 0,
      });

      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(1);
      expect(result.stats).toEqual({ error: 1 });
      expect(result.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 1,
        page: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('应该根据过滤条件查询事件', async () => {
      vi.mocked(prisma.monitoringEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.monitoringEvent.count).mockResolvedValue(0);
      vi.mocked(prisma.monitoringEvent.groupBy).mockResolvedValue([]);

      await caller.monitoring.getEvents({
        sessionId: 'session-1',
        type: 'error',
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-12-31'),
        limit: 10,
        offset: 0,
      });

      expect(prisma.monitoringEvent.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          sessionId: 'session-1',
          type: 'error',
          timestamp: expect.objectContaining({
            gte: new Date('2023-01-01'),
            lte: new Date('2023-12-31'),
          }),
        }),
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('getStats', () => {
    it('应该成功获取统计信息', async () => {
      const mockStats = [
        { type: 'error', _count: { type: 5 } },
        { type: 'performance', _count: { type: 10 } },
      ];

      vi.mocked(prisma.monitoringEvent.groupBy).mockResolvedValue(mockStats);
      vi.mocked(prisma.monitoringEvent.count).mockResolvedValue(15);

      const result = await caller.monitoring.getStats({
        groupBy: 'type',
      });

      expect(result.stats).toEqual(mockStats);
      expect(result.totalCount).toBe(15);
      expect(result.groupBy).toBe('type');
    });
  });

  describe('getCriticalErrors', () => {
    it('应该拒绝非管理员用户的访问', async () => {
      const userCaller = createCaller({
        user: { id: 'user-1', role: 'USER' },
        prisma,
      });

      await expect(userCaller.monitoring.getCriticalErrors({
        limit: 10,
      })).rejects.toThrow('FORBIDDEN');
    });

    it('应该允许管理员获取严重错误', async () => {
      const adminCaller = createCaller({
        user: { id: 'admin-1', role: 'ADMIN' },
        prisma,
      });

      const mockErrors = [
        {
          id: 'error-1',
          level: 'error',
          message: 'Critical error',
          resolved: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockErrors);
      vi.mocked(prisma.errorLog.count).mockResolvedValue(1);

      const result = await adminCaller.monitoring.getCriticalErrors({
        limit: 10,
      });

      expect(result.errors).toEqual(mockErrors);
      expect(result.total).toBe(1);
    });
  });

  describe('resolveError', () => {
    it('应该拒绝非管理员用户的访问', async () => {
      const userCaller = createCaller({
        user: { id: 'user-1', role: 'USER' },
        prisma,
      });

      await expect(userCaller.monitoring.resolveError({
        errorId: 'error-1',
      })).rejects.toThrow('FORBIDDEN');
    });

    it('应该允许管理员解决错误', async () => {
      const adminCaller = createCaller({
        user: { id: 'admin-1', role: 'ADMIN' },
        prisma,
      });

      const mockResolvedError = {
        id: 'error-1',
        level: 'error',
        message: 'Critical error',
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'admin-1',
      };

      vi.mocked(prisma.errorLog.update).mockResolvedValue(mockResolvedError);

      const result = await adminCaller.monitoring.resolveError({
        errorId: 'error-1',
        resolutionNote: 'Test resolution',
      });

      expect(result.success).toBe(true);
      expect(result.error).toEqual(mockResolvedError);
      expect(prisma.errorLog.update).toHaveBeenCalledWith({
        where: { id: 'error-1' },
        data: expect.objectContaining({
          resolved: true,
          resolvedBy: 'admin-1',
        }),
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('应该成功获取性能指标', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          name: 'render_time',
          value: 100,
          unit: 'ms',
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.performanceMetric.findMany).mockResolvedValue(mockMetrics);
      vi.mocked(prisma.performanceMetric.count).mockResolvedValue(1);

      const result = await caller.monitoring.getPerformanceMetrics({
        limit: 10,
      });

      expect(result.metrics).toEqual([
        {
          name: 'render_time',
          avg: 100,
          min: 100,
          max: 100,
          count: 1,
        },
      ]);
      expect(result.total).toBe(1);
    });
  });
});