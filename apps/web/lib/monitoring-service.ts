/**
 * 监控服务 - 使用 tRPC 发送监控数据
 */

import { trpc } from '@/trpc/provider';

export interface MonitoringEvent {
  type: 'error' | 'performance' | 'user_action' | 'api_call';
  timestamp: Date;
  userId?: string;
  sessionId: string;
  data: Record<string, any>;
  metadata?: {
    userAgent: string;
    url: string;
    referrer?: string;
    screenSize?: string;
    viewport?: string;
    connection?: string;
  };
}

export interface MonitoringStats {
  type?: string;
  sessionId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'type' | 'hour' | 'day';
}

export class MonitoringService {
  private static instance: MonitoringService;
  private eventQueue: MonitoringEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private flushInterval = 5000; // 5秒刷新一次
  private batchSize = 100; // 每批最多100个事件

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 记录错误事件
   */
  trackError(error: Error, context?: Record<string, any>) {
    const event: MonitoringEvent = {
      type: 'error',
      timestamp: new Date(),
      sessionId: this.sessionId,
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        severity: context?.severity || 'error',
        component: context?.component,
        ...context,
      },
      metadata: this.getMetadata(),
    };

    this.addEvent(event);
  }

  /**
   * 记录性能事件
   */
  trackPerformance(name: string, value: number, unit: string = 'ms', context?: Record<string, any>) {
    const event: MonitoringEvent = {
      type: 'performance',
      timestamp: new Date(),
      sessionId: this.sessionId,
      data: {
        name,
        value,
        unit,
        ...context,
      },
      metadata: this.getMetadata(),
    };

    this.addEvent(event);
  }

  /**
   * 记录用户行为事件
   */
  trackUserAction(action: string, element?: string, context?: Record<string, any>) {
    const event: MonitoringEvent = {
      type: 'user_action',
      timestamp: new Date(),
      sessionId: this.sessionId,
      data: {
        action,
        element,
        ...context,
      },
      metadata: this.getMetadata(),
    };

    this.addEvent(event);
  }

  /**
   * 记录API调用事件
   */
  trackApiCall(method: string, endpoint: string, duration: number, status: number, context?: Record<string, any>) {
    const event: MonitoringEvent = {
      type: 'api_call',
      timestamp: new Date(),
      sessionId: this.sessionId,
      data: {
        method,
        endpoint,
        duration,
        status,
        ...context,
      },
      metadata: this.getMetadata(),
    };

    this.addEvent(event);
  }

  /**
   * 获取监控统计信息
   */
  async getStats(params: MonitoringStats = {}) {
    try {
      return await trpc.monitoring.getStats.query(params);
    } catch (error) {
      console.error('Failed to fetch monitoring stats:', error);
      return null;
    }
  }

  /**
   * 获取监控事件列表
   */
  async getEvents(params: {
    sessionId?: string;
    type?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}) {
    try {
      return await trpc.monitoring.getEvents.query(params);
    } catch (error) {
      console.error('Failed to fetch monitoring events:', error);
      return null;
    }
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(params: {
    sessionId?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    metrics?: string[];
  } = {}) {
    try {
      return await trpc.monitoring.getPerformanceMetrics.query(params);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      return null;
    }
  }

  /**
   * 获取严重错误（管理员功能）
   */
  async getCriticalErrors(params: {
    limit?: number;
    resolved?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}) {
    try {
      return await trpc.monitoring.getCriticalErrors.query(params);
    } catch (error) {
      console.error('Failed to fetch critical errors:', error);
      return null;
    }
  }

  /**
   * 标记错误为已解决（管理员功能）
   */
  async resolveError(errorId: string, resolutionNote?: string) {
    try {
      return await trpc.monitoring.resolveError.mutate({
        errorId,
        resolutionNote,
      });
    } catch (error) {
      console.error('Failed to resolve error:', error);
      return null;
    }
  }

  /**
   * 立即刷新所有事件
   */
  async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await trpc.monitoring.submitEvents.mutate({
        events: eventsToFlush,
      });
    } catch (error) {
      console.error('Failed to flush monitoring events:', error);
      // 重新加入队列
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * 获取当前会话ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 添加事件到队列
   */
  private addEvent(event: MonitoringEvent) {
    this.eventQueue.push(event);

    // 如果队列满了，立即刷新
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * 开始定时刷新
   */
  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取元数据
   */
  private getMetadata() {
    if (typeof window === 'undefined') return undefined;

    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      screenSize: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

// 导出单例实例
export const monitoringService = MonitoringService.getInstance();

// 导出便捷的监控函数
export const trackError = (error: Error, context?: Record<string, any>) => {
  monitoringService.trackError(error, context);
};

export const trackPerformance = (name: string, value: number, unit: string = 'ms', context?: Record<string, any>) => {
  monitoringService.trackPerformance(name, value, unit, context);
};

export const trackUserAction = (action: string, element?: string, context?: Record<string, any>) => {
  monitoringService.trackUserAction(action, element, context);
};

export const trackApiCall = (method: string, endpoint: string, duration: number, status: number, context?: Record<string, any>) => {
  monitoringService.trackApiCall(method, endpoint, duration, status, context);
};

// 页面卸载时刷新所有事件
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    monitoringService.flush();
  });
}