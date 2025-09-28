/**
 * Prisma 6.16 性能测试
 * 测试升级后的性能改进
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { prisma, optimizedPrisma } from '@workspace/database';
import { prismaMetricsService } from '../../../apps/web/lib/prisma-metrics';

describe('Prisma 6.16 Performance Tests', () => {
  beforeAll(async () => {
    // 清理测试数据
    await prisma.monitoringEvent.deleteMany();
    await prisma.performanceMetric.deleteMany();
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.monitoringEvent.deleteMany();
    await prisma.performanceMetric.deleteMany();
  });

  describe('Batch Insert Performance', () => {
    test('should handle large batch inserts efficiently', async () => {
      const batchSize = 1000;
      const events = Array.from({ length: batchSize }, (_, i) => ({
        type: 'performance' as const,
        timestamp: new Date(),
        sessionId: `test-session-${i % 10}`,
        data: { metric: 'test', value: i },
        metadata: { userAgent: 'test-browser' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const startTime = performance.now();

      await optimizedPrisma.monitoringEvent.createMany({
        data: events,
        skipDuplicates: true,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Batch insert of ${batchSize} events took ${duration}ms`);

      // 验证插入的数据
      const count = await prisma.monitoringEvent.count();
      expect(count).toBe(batchSize);

      // 性能断言：1000条记录应该在合理时间内完成
      expect(duration).toBeLessThan(5000); // 5秒内完成
    });

    test('should be faster than regular prisma client for batch operations', async () => {
      const batchSize = 100;
      const events = Array.from({ length: batchSize }, (_, i) => ({
        type: 'performance' as const,
        timestamp: new Date(),
        sessionId: `test-session-${i}`,
        data: { metric: 'comparison', value: i },
        metadata: { userAgent: 'test-browser' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // 测试标准Prisma客户端
      const regularStart = performance.now();
      await prisma.monitoringEvent.createMany({
        data: events,
        skipDuplicates: true,
      });
      const regularEnd = performance.now();
      const regularDuration = regularEnd - regularStart;

      // 清理数据
      await prisma.monitoringEvent.deleteMany({
        where: { sessionId: { contains: 'test-session-' } }
      });

      // 测试优化后的Prisma客户端
      const optimizedStart = performance.now();
      await optimizedPrisma.monitoringEvent.createMany({
        data: events,
        skipDuplicates: true,
      });
      const optimizedEnd = performance.now();
      const optimizedDuration = optimizedEnd - optimizedStart;

      console.log(`Regular client: ${regularDuration}ms`);
      console.log(`Optimized client: ${optimizedDuration}ms`);

      // 优化版本应该更快或者至少不慢
      expect(optimizedDuration).toBeLessThanOrEqual(regularDuration * 1.1);
    });
  });

  describe('Query Performance with Indexes', () => {
    beforeAll(async () => {
      // 准备测试数据
      const testData = Array.from({ length: 500 }, (_, i) => ({
        type: ['error', 'performance', 'user_action'][i % 3] as const,
        timestamp: new Date(Date.now() - i * 60000), // 分布在过去的时间
        sessionId: `session-${i % 20}`,
        userId: `user-${i % 10}`,
        data: { test: true, index: i },
        metadata: { userAgent: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await prisma.monitoringEvent.createMany({
        data: testData,
        skipDuplicates: true,
      });
    });

    test('should use composite indexes efficiently', async () => {
      const queryStart = performance.now();

      const results = await prisma.monitoringEvent.findMany({
        where: {
          type: 'performance',
          timestamp: { gte: new Date(Date.now() - 3600000) } // 过去1小时
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const queryEnd = performance.now();
      const queryDuration = queryEnd - queryStart;

      console.log(`Indexed query took ${queryDuration}ms, returned ${results.length} results`);

      // 查询应该在合理时间内完成
      expect(queryDuration).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should benefit from sessionId index', async () => {
      const sessionId = 'session-1';
      const queryStart = performance.now();

      const results = await prisma.monitoringEvent.findMany({
        where: {
          sessionId,
          timestamp: { gte: new Date(Date.now() - 86400000) } // 过去24小时
        },
        orderBy: { timestamp: 'desc' },
      });

      const queryEnd = performance.now();
      const queryDuration = queryEnd - queryStart;

      console.log(`Session-based query took ${queryDuration}ms, returned ${results.length} results`);

      expect(queryDuration).toBeLessThan(50);
    });
  });

  describe('Metrics Collection', () => {
    test('should collect Prisma metrics automatically', async () => {
      // 执行一些查询来生成metrics
      await prisma.monitoringEvent.findMany({ take: 10 });
      await prisma.performanceMetric.findMany({ take: 10 });

      // 获取实时metrics
      const metrics = await prismaMetricsService.getRealtimeMetrics();

      expect(metrics).toHaveProperty('queryCount');
      expect(metrics).toHaveProperty('averageQueryTime');
      expect(metrics).toHaveProperty('errorCount');
      expect(typeof metrics.queryCount).toBe('number');
      expect(typeof metrics.averageQueryTime).toBe('number');
    });

    test('should detect performance anomalies', async () => {
      const anomalies = await prismaMetricsService.detectPerformanceAnomalies();

      expect(Array.isArray(anomalies)).toBe(true);

      // 每个异常应该有类型、消息和严重性
      anomalies.forEach(anomaly => {
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('message');
        expect(anomaly).toHaveProperty('severity');
      });
    });

    test('should provide performance trends', async () => {
      const trends = await prismaMetricsService.getPerformanceTrends(1); // 1小时

      expect(trends).toHaveProperty('trends');
      expect(trends).toHaveProperty('summary');
      expect(Array.isArray(trends.trends)).toBe(true);
      expect(typeof trends.summary).toBe('object');
    });
  });

  describe('Native Features', () => {
    test('should support native distinct operations', async () => {
      // 插入一些重复数据测试distinct
      const distinctData = Array.from({ length: 50 }, (_, i) => ({
        type: 'test_distinct' as const,
        timestamp: new Date(),
        sessionId: `session-${i % 5}`, // 创建重复的sessionId
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await prisma.monitoringEvent.createMany({
        data: distinctData,
        skipDuplicates: true,
      });

      // 测试distinct查询（使用native distinct特性）
      const distinctStart = performance.now();
      const distinctSessions = await prisma.monitoringEvent.findMany({
        where: { type: 'test_distinct' },
        distinct: ['sessionId'],
      });
      const distinctEnd = performance.now();

      console.log(`Distinct query took ${distinctEnd - distinctStart}ms`);
      console.log(`Found ${distinctSessions.length} distinct sessions`);

      expect(distinctSessions.length).toBeLessThanOrEqual(5); // 应该有5个或更少的distinct sessionId
    });
  });

  describe('Memory and Connection Management', () => {
    test('should handle concurrent connections efficiently', async () => {
      const concurrentOperations = 20;
      const promises = Array.from({ length: concurrentOperations }, (_, i) =>
        prisma.monitoringEvent.create({
          data: {
            type: 'concurrent_test' as const,
            timestamp: new Date(),
            sessionId: `concurrent-${i}`,
            data: { operation: i },
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })
      );

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      console.log(`Concurrent operations took ${endTime - startTime}ms`);

      // 并发操作应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});