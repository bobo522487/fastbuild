'use client';

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 性能指标接口
interface PerformanceMetrics {
  // 渲染性能
  renderTime: number;
  componentCount: number;
  memoryUsage: number;

  // 验证性能
  validationTime: number;
  schemaCompilationTime: number;
  cacheHitRate: number;

  // 交互性能
  interactionTime: number;
  firstInputDelay: number;
  timeToInteractive: number;

  // 网络性能
  apiResponseTime: number;
  resourceLoadTime: number;

  // 时间戳
  timestamp: number;
}

// 性能监控状态
interface PerformanceState {
  metrics: PerformanceMetrics[];
  isMonitoring: boolean;
  alerts: PerformanceAlert[];
  settings: PerformanceSettings;

  // 动作
  startMonitoring: () => void;
  stopMonitoring: () => void;
  addMetric: (metric: Omit<PerformanceMetrics, 'timestamp'>) => void;
  clearMetrics: () => void;
  updateSettings: (settings: Partial<PerformanceSettings>) => void;
  generateReport: () => PerformanceReport;
}

// 性能设置
interface PerformanceSettings {
  samplingRate: number; // 采样率 (0-1)
  alertThresholds: {
    renderTime: number; // 渲染时间阈值 (ms)
    validationTime: number; // 验证时间阈值 (ms)
    memoryUsage: number; // 内存使用阈值 (MB)
    apiResponseTime: number; // API响应时间阈值 (ms)
  };
  enableRealtimeMonitoring: boolean;
  enableDetailedLogging: boolean;
  maxMetricsHistory: number;
}

// 性能告警
interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
}

// 性能报告
interface PerformanceReport {
  summary: {
    totalMetrics: number;
    averageRenderTime: number;
    averageValidationTime: number;
    averageMemoryUsage: number;
    cacheHitRate: number;
  };
  trends: {
    renderTime: { trend: 'improving' | 'stable' | 'degrading'; change: number };
    validationTime: { trend: 'improving' | 'stable' | 'degrading'; change: number };
    memoryUsage: { trend: 'improving' | 'stable' | 'degrading'; change: number };
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
}

// 默认设置
const defaultSettings: PerformanceSettings = {
  samplingRate: 0.1, // 10% 采样率
  alertThresholds: {
    renderTime: 100, // 100ms
    validationTime: 50, // 50ms
    memoryUsage: 100, // 100MB
    apiResponseTime: 1000, // 1s
  },
  enableRealtimeMonitoring: true,
  enableDetailedLogging: false,
  maxMetricsHistory: 1000,
};

// 性能监控 store
export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      metrics: [],
      isMonitoring: false,
      alerts: [],
      settings: defaultSettings,

      startMonitoring: () => {
        set({ isMonitoring: true });

        // 开始监控性能指标
        if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
          // 监控渲染性能
          const paintObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                // 记录首次内容绘制时间
              }
            });
          });
          paintObserver.observe({ entryTypes: ['paint'] });

          // 监控交互性能
          const interactionObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.entryType === 'first-input') {
                const metric = entry as PerformanceEventTiming;
                get().addMetric({
                  interactionTime: metric.processingStart - metric.startTime,
                  firstInputDelay: metric.processingStart - entry.startTime,
                  timeToInteractive: 0, // 需要计算
                  renderTime: 0,
                  componentCount: 0,
                  memoryUsage: 0,
                  validationTime: 0,
                  schemaCompilationTime: 0,
                  cacheHitRate: 0,
                  apiResponseTime: 0,
                  resourceLoadTime: 0,
                });
              }
            });
          });
          interactionObserver.observe({ entryTypes: ['first-input'] });
        }
      },

      stopMonitoring: () => {
        set({ isMonitoring: false });
      },

      addMetric: (metric) => {
        const state = get();

        // 检查采样率
        if (Math.random() > state.settings.samplingRate) {
          return;
        }

        const newMetric: PerformanceMetrics = {
          ...metric,
          timestamp: Date.now(),
        };

        // 添加指标
        set((prev) => ({
          metrics: [...prev.metrics.slice(-prev.settings.maxMetricsHistory + 1), newMetric],
        }));

        // 检查告警
        checkAlerts(newMetric, state.settings);
      },

      clearMetrics: () => {
        set({ metrics: [], alerts: [] });
      },

      updateSettings: (newSettings) => {
        set((prev) => ({
          settings: { ...prev.settings, ...newSettings },
        }));
      },

      generateReport: () => {
        const { metrics, alerts } = get();

        if (metrics.length === 0) {
          return {
            summary: {
              totalMetrics: 0,
              averageRenderTime: 0,
              averageValidationTime: 0,
              averageMemoryUsage: 0,
              cacheHitRate: 0,
            },
            trends: {
              renderTime: { trend: 'stable', change: 0 },
              validationTime: { trend: 'stable', change: 0 },
              memoryUsage: { trend: 'stable', change: 0 },
            },
            alerts: [],
            recommendations: ['没有足够的数据生成报告'],
          };
        }

        // 计算汇总统计
        const summary = {
          totalMetrics: metrics.length,
          averageRenderTime: metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length,
          averageValidationTime: metrics.reduce((sum, m) => sum + m.validationTime, 0) / metrics.length,
          averageMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
          cacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
        };

        // 计算趋势
        const trends = {
          renderTime: calculateTrend(metrics.map(m => m.renderTime)),
          validationTime: calculateTrend(metrics.map(m => m.validationTime)),
          memoryUsage: calculateTrend(metrics.map(m => m.memoryUsage)),
        };

        // 生成建议
        const recommendations = generateRecommendations(summary, trends);

        return {
          summary,
          trends,
          alerts: alerts.filter(a => !a.resolved),
          recommendations,
        };
      },
    }),
    {
      name: 'performance-monitor-storage',
      partialize: (state) => ({
        settings: state.settings,
        alerts: state.alerts,
      }),
    }
  )
);

// 计算趋势
function calculateTrend(values: number[]): { trend: 'improving' | 'stable' | 'degrading'; change: number } {
  if (values.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const recent = values.slice(-10);
  const earlier = values.slice(-20, -10);

  if (earlier.length === 0) {
    return { trend: 'stable', change: 0 };
  }

  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

  if (Math.abs(change) < 5) {
    return { trend: 'stable', change };
  } else if (change < 0) {
    return { trend: 'improving', change };
  } else {
    return { trend: 'degrading', change };
  }
}

// 检查告警
function checkAlerts(metric: PerformanceMetrics, settings: PerformanceSettings) {
  const alerts: PerformanceAlert[] = [];
  const timestamp = Date.now();

  // 检查渲染时间
  if (metric.renderTime > settings.alertThresholds.renderTime) {
    alerts.push({
      id: `render-${timestamp}`,
      type: 'warning',
      metric: 'renderTime',
      value: metric.renderTime,
      threshold: settings.alertThresholds.renderTime,
      message: `渲染时间超过阈值: ${metric.renderTime}ms > ${settings.alertThresholds.renderTime}ms`,
      timestamp,
      resolved: false,
    });
  }

  // 检查验证时间
  if (metric.validationTime > settings.alertThresholds.validationTime) {
    alerts.push({
      id: `validation-${timestamp}`,
      type: 'warning',
      metric: 'validationTime',
      value: metric.validationTime,
      threshold: settings.alertThresholds.validationTime,
      message: `验证时间超过阈值: ${metric.validationTime}ms > ${settings.alertThresholds.validationTime}ms`,
      timestamp,
      resolved: false,
    });
  }

  // 检查内存使用
  if (metric.memoryUsage > settings.alertThresholds.memoryUsage) {
    alerts.push({
      id: `memory-${timestamp}`,
      type: 'error',
      metric: 'memoryUsage',
      value: metric.memoryUsage,
      threshold: settings.alertThresholds.memoryUsage,
      message: `内存使用超过阈值: ${metric.memoryUsage}MB > ${settings.alertThresholds.memoryUsage}MB`,
      timestamp,
      resolved: false,
    });
  }

  // 检查API响应时间
  if (metric.apiResponseTime > settings.alertThresholds.apiResponseTime) {
    alerts.push({
      id: `api-${timestamp}`,
      type: 'warning',
      metric: 'apiResponseTime',
      value: metric.apiResponseTime,
      threshold: settings.alertThresholds.apiResponseTime,
      message: `API响应时间超过阈值: ${metric.apiResponseTime}ms > ${settings.alertThresholds.apiResponseTime}ms`,
      timestamp,
      resolved: false,
    });
  }

  if (alerts.length > 0) {
    usePerformanceStore.setState((prev) => ({
      alerts: [...prev.alerts, ...alerts],
    }));
  }
}

// 生成建议
function generateRecommendations(
  summary: PerformanceReport['summary'],
  trends: PerformanceReport['trends']
): string[] {
  const recommendations: string[] = [];

  // 渲染性能建议
  if (summary.averageRenderTime > 50) {
    recommendations.push('考虑使用React.memo和useMemo优化组件渲染性能');
  }
  if (trends.renderTime.trend === 'degrading') {
    recommendations.push('渲染性能呈下降趋势，建议检查组件复杂度和状态管理');
  }

  // 验证性能建议
  if (summary.averageValidationTime > 25) {
    recommendations.push('考虑优化表单验证逻辑，使用缓存或预编译schema');
  }
  if (trends.validationTime.trend === 'degrading') {
    recommendations.push('验证性能呈下降趋势，建议检查schema复杂度和验证规则');
  }

  // 内存使用建议
  if (summary.averageMemoryUsage > 50) {
    recommendations.push('内存使用较高，建议检查内存泄漏和优化数据结构');
  }
  if (trends.memoryUsage.trend === 'degrading') {
    recommendations.push('内存使用呈上升趋势，建议检查内存泄漏和缓存策略');
  }

  // 缓存建议
  if (summary.cacheHitRate < 80) {
    recommendations.push('缓存命中率较低，建议优化缓存策略');
  }

  return recommendations;
}

// 性能监控 Hook
export const usePerformanceMonitor = () => {
  const metrics = usePerformanceStore((state) => state.metrics);
  const isMonitoring = usePerformanceStore((state) => state.isMonitoring);
  const alerts = usePerformanceStore((state) => state.alerts);
  const startMonitoring = usePerformanceStore((state) => state.startMonitoring);
  const stopMonitoring = usePerformanceStore((state) => state.stopMonitoring);
  const addMetric = usePerformanceStore((state) => state.addMetric);
  const clearMetrics = usePerformanceStore((state) => state.clearMetrics);
  const generateReport = usePerformanceStore((state) => state.generateReport);
  const settings = usePerformanceStore((state) => state.settings);
  const updateSettings = usePerformanceStore((state) => state.updateSettings);

  // 监控组件渲染性能
  const measureRenderPerformance = React.useCallback((componentName: string, renderTime: number) => {
    if (!isMonitoring) return;

    addMetric({
      renderTime,
      componentCount: 1,
      memoryUsage: 0, // 需要单独计算
      validationTime: 0,
      schemaCompilationTime: 0,
      cacheHitRate: 0,
      interactionTime: 0,
      firstInputDelay: 0,
      timeToInteractive: 0,
      apiResponseTime: 0,
      resourceLoadTime: 0,
    });
  }, [isMonitoring, addMetric]);

  // 监控验证性能
  const measureValidationPerformance = React.useCallback((validationTime: number, cacheHitRate: number) => {
    if (!isMonitoring) return;

    addMetric({
      renderTime: 0,
      componentCount: 0,
      memoryUsage: 0,
      validationTime,
      schemaCompilationTime: 0,
      cacheHitRate,
      interactionTime: 0,
      firstInputDelay: 0,
      timeToInteractive: 0,
      apiResponseTime: 0,
      resourceLoadTime: 0,
    });
  }, [isMonitoring, addMetric]);

  // 获取当前内存使用情况
  const getCurrentMemoryUsage = React.useCallback(() => {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    const memory = (performance as any).memory;
    if (memory) {
      return memory.usedJSHeapSize / (1024 * 1024); // 转换为MB
    }
    return 0;
  }, []);

  return {
    metrics,
    isMonitoring,
    alerts,
    settings,
    startMonitoring,
    stopMonitoring,
    addMetric,
    clearMetrics,
    generateReport,
    updateSettings,
    measureRenderPerformance,
    measureValidationPerformance,
    getCurrentMemoryUsage,
  };
};