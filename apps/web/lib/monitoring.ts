/**
 * 应用监控服务
 * 提供错误监控、性能监控和用户行为分析
 */

interface MonitoringEvent {
  type: 'error' | 'performance' | 'user_action' | 'api_call';
  timestamp: string;
  userId?: string;
  sessionId: string;
  data: any;
  metadata?: {
    userAgent: string;
    url: string;
    referrer?: string;
    screenSize?: string;
  };
}

interface ErrorEvent extends MonitoringEvent {
  type: 'error';
  data: {
    message: string;
    stack?: string;
    componentStack?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'runtime' | 'network' | 'ui' | 'api';
  };
}

interface PerformanceEvent extends MonitoringEvent {
  type: 'performance';
  data: {
    metric: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  };
}

interface UserActionEvent extends MonitoringEvent {
  type: 'user_action';
  data: {
    action: string;
    element?: string;
    timestamp: number;
    metadata?: Record<string, any>;
  };
}

interface ApiCallEvent extends MonitoringEvent {
  type: 'api_call';
  data: {
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    success: boolean;
    errorMessage?: string;
  };
}

/**
 * 监控服务类
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private sessionId: string;
  private eventQueue: MonitoringEvent[] = [];
  private isOnline = true;
  private retryCount = 0;
  private maxRetries = 3;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeNetworkMonitoring();
    this.initializePerformanceMonitoring();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取通用元数据
   */
  private getCommonMetadata() {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      screenSize: `${window.screen.width}x${window.screen.height}`,
    };
  }

  /**
   * 初始化网络监控
   */
  private initializeNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.trackEvent({
        type: 'user_action',
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        data: {
          action: 'network_online',
          timestamp: Date.now(),
        },
        metadata: this.getCommonMetadata(),
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.trackEvent({
        type: 'user_action',
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        data: {
          action: 'network_offline',
          timestamp: Date.now(),
        },
        metadata: this.getCommonMetadata(),
      });
    });
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring() {
    // 监控页面加载性能
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.trackPerformanceEvent({
              metric: 'page_load_time',
              value: navigation.loadEventEnd - navigation.startTime,
              unit: 'ms',
              tags: { page: window.location.pathname },
            });
          }

          // 监控资源加载时间
          const resources = performance.getEntriesByType('resource');
          resources.forEach(resource => {
            if (resource.duration > 1000) { // 只记录超过1秒的资源
              this.trackPerformanceEvent({
                metric: 'resource_load_time',
                value: resource.duration,
                unit: 'ms',
                tags: {
                  resource_type: resource.initiatorType,
                  resource_name: resource.name,
                },
              });
            }
          });
        }, 1000);
      });
    }

    // 监控内存使用
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.trackPerformanceEvent({
            metric: 'memory_usage',
            value: memory.usedJSHeapSize,
            unit: 'bytes',
            tags: { type: 'used' },
          });

          this.trackPerformanceEvent({
            metric: 'memory_limit',
            value: memory.totalJSHeapSize,
            unit: 'bytes',
            tags: { type: 'total' },
          });
        }
      }, 30000); // 每30秒记录一次
    }
  }

  /**
   * 跟踪错误事件
   */
  trackError(error: Error, options: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: 'runtime' | 'network' | 'ui' | 'api';
    componentStack?: string;
    userId?: string;
  } = {}) {
    const event: ErrorEvent = {
      type: 'error',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: options.userId,
      data: {
        message: error.message,
        stack: error.stack,
        componentStack: options.componentStack,
        severity: options.severity || 'medium',
        category: options.category || 'runtime',
      },
      metadata: this.getCommonMetadata(),
    };

    this.trackEvent(event);

    // 对于严重错误，立即发送
    if (options.severity === 'critical' || options.severity === 'high') {
      this.flushEvents();
    }
  }

  /**
   * 跟踪性能事件
   */
  trackPerformanceEvent(data: {
    metric: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }) {
    const event: PerformanceEvent = {
      type: 'performance',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data,
      metadata: this.getCommonMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * 跟踪用户行为
   */
  trackUserAction(action: string, options: {
    element?: string;
    metadata?: Record<string, any>;
    userId?: string;
  } = {}) {
    const event: UserActionEvent = {
      type: 'user_action',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: options.userId,
      data: {
        action,
        element: options.element,
        timestamp: Date.now(),
        metadata: options.metadata,
      },
      metadata: this.getCommonMetadata(),
    };

    this.trackEvent(event);
  }

  /**
   * 跟踪 API 调用
   */
  trackApiCall(endpoint: string, method: string, status: number, duration: number, options: {
    errorMessage?: string;
    userId?: string;
  } = {}) {
    const event: ApiCallEvent = {
      type: 'api_call',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: options.userId,
      data: {
        endpoint,
        method,
        status,
        duration,
        success: status >= 200 && status < 300,
        errorMessage: options.errorMessage,
      },
      metadata: this.getCommonMetadata(),
    };

    this.trackEvent(event);

    // 对于失败的 API 调用，立即发送
    if (!event.data.success) {
      this.flushEvents();
    }
  }

  /**
   * 通用事件跟踪
   */
  private trackEvent(event: MonitoringEvent) {
    this.eventQueue.push(event);

    // 如果队列达到一定大小或包含严重错误，立即发送
    if (this.eventQueue.length >= 10 || this.shouldFlushImmediately(event)) {
      this.flushEvents();
    } else {
      // 否则延迟发送
      setTimeout(() => this.flushEvents(), 5000);
    }
  }

  /**
   * 判断是否应该立即刷新事件
   */
  private shouldFlushImmediately(event: MonitoringEvent): boolean {
    if (event.type === 'error') {
      const errorEvent = event as ErrorEvent;
      return errorEvent.data.severity === 'critical' || errorEvent.data.severity === 'high';
    }
    if (event.type === 'api_call') {
      const apiEvent = event as ApiCallEvent;
      return !apiEvent.data.success;
    }
    return false;
  }

  /**
   * 发送事件队列到服务器
   */
  private async flushEvents() {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch('/api/monitoring/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.status}`);
      }

      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to send monitoring events:', error);

      // 重新加入队列
      this.eventQueue.unshift(...eventsToSend);

      // 指数退避重试
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000;
        setTimeout(() => this.flushEvents(), delay);
      }
    }
  }

  /**
   * 获取当前会话统计
   */
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      eventCount: this.eventQueue.length,
      isOnline: this.isOnline,
      retryCount: this.retryCount,
    };
  }

  /**
   * 手动刷新所有事件
   */
  flush() {
    this.flushEvents();
  }

  /**
   * 清理资源
   */
  destroy() {
    this.flushEvents();
    this.eventQueue = [];
  }
}

/**
 * React Hook 用于监控
 */
export function useMonitoring() {
  const monitoring = MonitoringService.getInstance();

  const trackError = React.useCallback((error: Error, options?: Parameters<typeof monitoring.trackError>[1]) => {
    monitoring.trackError(error, options);
  }, [monitoring]);

  const trackUserAction = React.useCallback((action: string, options?: Parameters<typeof monitoring.trackUserAction>[1]) => {
    monitoring.trackUserAction(action, options);
  }, [monitoring]);

  const trackApiCall = React.useCallback((endpoint: string, method: string, status: number, duration: number, options?: Parameters<typeof monitoring.trackApiCall>[3]) => {
    monitoring.trackApiCall(endpoint, method, status, duration, options);
  }, [monitoring]);

  return {
    trackError,
    trackUserAction,
    trackApiCall,
    getSessionStats: monitoring.getSessionStats.bind(monitoring),
    flush: monitoring.flush.bind(monitoring),
  };
}

/**
 * API 调用监控包装器
 */
export function withApiMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  method: string = 'GET'
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let status = 200;
    let errorMessage: string | undefined;

    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      status = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      MonitoringService.getInstance().trackApiCall(endpoint, method, status, duration, { errorMessage });
    }
  }) as T;
}

/**
 * 自动监控组件的 Hook
 */
export function useComponentMonitoring(componentName: string) {
  const monitoring = MonitoringService.getInstance();
  const mountTime = React.useRef(Date.now());

  React.useEffect(() => {
    monitoring.trackUserAction('component_mount', {
      element: componentName,
      metadata: { mount_time: mountTime.current },
    });

    return () => {
      const duration = Date.now() - mountTime.current;
      monitoring.trackUserAction('component_unmount', {
        element: componentName,
        metadata: { duration },
      });
    };
  }, [componentName, monitoring]);

  return monitoring;
}

// 导出单例实例
export const monitoring = MonitoringService.getInstance();