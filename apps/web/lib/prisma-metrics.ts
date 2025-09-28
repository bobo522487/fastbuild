/**
 * Prisma Metrics 集成服务
 * 集成 Prisma 6.16 的内置 metrics 功能到现有监控系统
 */

import { prisma } from '@workspace/database';

export interface PrismaMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueryCount: number;
  errorCount: number;
  connectionCount: number;
  poolUsage: number;
}

export class PrismaMetricsService {
  private static instance: PrismaMetricsService;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // 私有构造函数
  }

  static getInstance(): PrismaMetricsService {
    if (!PrismaMetricsService.instance) {
      PrismaMetricsService.instance = new PrismaMetricsService();
    }
    return PrismaMetricsService.instance;
  }

  /**
   * 启动 Prisma metrics 收集
   */
  async startMetricsCollection(intervalMs: number = 30000) {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async () => {
      await this.collectAndStoreMetrics();
    }, intervalMs);

    // 立即收集一次
    await this.collectAndStoreMetrics();
  }

  /**
   * 停止 metrics 收集
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * 收集 Prisma metrics 并存储到监控系统
   */
  private async collectAndStoreMetrics() {
    try {
      // 这里可以使用 Prisma 6.16 的 metrics API
      // 目前通过查询性能指标表来模拟
      const metrics = await this.calculateMetrics();

      // 存储到性能指标表
      await prisma.performanceMetric.create({
        data: {
          name: 'prisma_overall_metrics',
          value: metrics.averageQueryTime,
          unit: 'ms',
          tags: {
            queryCount: metrics.queryCount,
            slowQueryCount: metrics.slowQueryCount,
            errorCount: metrics.errorCount,
            connectionCount: metrics.connectionCount,
            poolUsage: metrics.poolUsage
          },
          timestamp: new Date(),
          sessionId: 'system'
        }
      });
    } catch (error) {
      console.error('Failed to collect Prisma metrics:', error);
    }
  }

  /**
   * 计算 Prisma metrics
   */
  private async calculateMetrics(): Promise<PrismaMetrics> {
    // 查询最近5分钟的性能指标
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [queryMetrics, errorMetrics] = await Promise.all([
      prisma.performanceMetric.findMany({
        where: {
          name: { startsWith: 'prisma_query_' },
          timestamp: { gte: fiveMinutesAgo }
        }
      }),
      prisma.performanceMetric.findMany({
        where: {
          name: 'prisma_query_',
          tags: { path: ['success'], equals: false },
          timestamp: { gte: fiveMinutesAgo }
        }
      })
    ]);

    const totalQueries = queryMetrics.length;
    const totalTime = queryMetrics.reduce((sum, metric) => sum + metric.value, 0);
    const averageQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;
    const slowQueryCount = queryMetrics.filter(metric => metric.value > 100).length;
    const errorCount = errorMetrics.length;

    return {
      queryCount: totalQueries,
      averageQueryTime,
      slowQueryCount,
      errorCount,
      connectionCount: 0, // 需要从 Prisma metrics API 获取
      poolUsage: 0 // 需要从 Prisma metrics API 获取
    };
  }

  /**
   * 获取实时的 Prisma metrics
   */
  async getRealtimeMetrics(): Promise<PrismaMetrics> {
    return await this.calculateMetrics();
  }

  /**
   * 获取 Prisma 性能趋势
   */
  async getPerformanceTrends(hours: number = 24) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        name: 'prisma_overall_metrics',
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'asc' }
    });

    return {
      trends: metrics.map(metric => ({
        timestamp: metric.timestamp,
        averageQueryTime: metric.value,
        queryCount: (metric.tags as any)?.queryCount || 0,
        errorCount: (metric.tags as any)?.errorCount || 0
      })),
      summary: {
        totalQueries: metrics.reduce((sum, m) => sum + ((m.tags as any)?.queryCount || 0), 0),
        averageResponseTime: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length || 0,
        totalErrors: metrics.reduce((sum, m) => sum + ((m.tags as any)?.errorCount || 0), 0)
      }
    };
  }

  /**
   * 检测异常性能模式
   */
  async detectPerformanceAnomalies() {
    const recentMetrics = await this.getRealtimeMetrics();

    const anomalies = [];

    // 检测慢查询增加
    if (recentMetrics.slowQueryCount > 10) {
      anomalies.push({
        type: 'high_slow_queries',
        message: `High number of slow queries detected: ${recentMetrics.slowQueryCount}`,
        severity: 'warning'
      });
    }

    // 检测错误率增加
    const errorRate = recentMetrics.queryCount > 0
      ? (recentMetrics.errorCount / recentMetrics.queryCount) * 100
      : 0;

    if (errorRate > 5) {
      anomalies.push({
        type: 'high_error_rate',
        message: `High error rate detected: ${errorRate.toFixed(2)}%`,
        severity: 'error'
      });
    }

    // 检测响应时间增加
    if (recentMetrics.averageQueryTime > 50) {
      anomalies.push({
        type: 'high_response_time',
        message: `High average response time: ${recentMetrics.averageQueryTime.toFixed(2)}ms`,
        severity: 'warning'
      });
    }

    return anomalies;
  }
}

// 导出单例实例
export const prismaMetricsService = PrismaMetricsService.getInstance();