'use client';

import React, { Profiler, ProfilerOnRenderCallback } from 'react';
import { trackPerformance, monitoringService } from '@/lib/monitoring-service';

export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  validationTime?: number;
  networkTime?: number;
  timestamp: number;
}

export interface FormPerformanceData {
  formId: string;
  fieldCount: number;
  renderTime: number;
  validationTime: number;
  memoryUsage?: number;
  timestamp: number;
  metadata: {
    hasConditionalFields: boolean;
    hasValidation: boolean;
    hasNetworkOperations: boolean;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private thresholds = {
    renderTime: 100, // 100ms target
    validationTime: 50, // 50ms target
    memoryUsage: 50 * 1024 * 1024, // 50MB
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetrics(componentId: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(componentId)) {
      this.metrics.set(componentId, []);
    }

    const componentMetrics = this.metrics.get(componentId)!;
    componentMetrics.push(metrics);

    // Keep only last 100 metrics
    if (componentMetrics.length > 100) {
      componentMetrics.shift();
    }

    // Send to monitoring service
    trackPerformance(`${componentId}_render`, metrics.renderTime, 'ms', {
      componentId,
      componentCount: metrics.componentCount,
      memoryUsage: metrics.memoryUsage,
      validationTime: metrics.validationTime,
      networkTime: metrics.networkTime,
    });

    // Check for performance issues
    this.checkPerformanceIssues(componentId, metrics);
  }

  private checkPerformanceIssues(componentId: string, metrics: PerformanceMetrics): void {
    const issues: string[] = [];

    if (metrics.renderTime > this.thresholds.renderTime) {
      issues.push(`渲染时间过长: ${metrics.renderTime}ms > ${this.thresholds.renderTime}ms`);
    }

    if (metrics.validationTime && metrics.validationTime > this.thresholds.validationTime) {
      issues.push(`验证时间过长: ${metrics.validationTime}ms > ${this.thresholds.validationTime}ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > this.thresholds.memoryUsage) {
      issues.push(`内存使用过高: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB > ${(this.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    if (issues.length > 0) {
      console.warn(`🚨 性能警告 [${componentId}]:`, issues.join(', '));
    }
  }

  getAverageMetrics(componentId: string): PerformanceMetrics | null {
    const componentMetrics = this.metrics.get(componentId);
    if (!componentMetrics || componentMetrics.length === 0) {
      return null;
    }

    const sum = componentMetrics.reduce((acc, metric) => ({
      renderTime: acc.renderTime + metric.renderTime,
      componentCount: acc.componentCount + metric.componentCount,
      memoryUsage: (acc.memoryUsage || 0) + (metric.memoryUsage || 0),
      validationTime: (acc.validationTime || 0) + (metric.validationTime || 0),
      networkTime: (acc.networkTime || 0) + (metric.networkTime || 0),
      timestamp: 0, // Not relevant for average
    }), {
      renderTime: 0,
      componentCount: 0,
      memoryUsage: 0,
      validationTime: 0,
      networkTime: 0,
      timestamp: 0,
    });

    const count = componentMetrics.length;
    return {
      renderTime: sum.renderTime / count,
      componentCount: sum.componentCount / count,
      memoryUsage: sum.memoryUsage / count,
      validationTime: sum.validationTime / count,
      networkTime: sum.networkTime / count,
      timestamp: Date.now(),
    };
  }

  getMetricsReport(): Record<string, PerformanceMetrics[]> {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(componentId?: string): void {
    if (componentId) {
      this.metrics.delete(componentId);
    } else {
      this.metrics.clear();
    }
  }
}

// Profiler回调函数
export const createProfilerCallback = (
  componentId: string,
  callback: (metrics: PerformanceMetrics) => void
): ProfilerOnRenderCallback => {
  return (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const metrics: PerformanceMetrics = {
      renderTime: actualDuration,
      componentCount: 1, // 简化计算
      timestamp: Date.now(),
    };

    // 尝试获取内存使用情况
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        metrics.memoryUsage = memory.usedJSHeapSize;
      }
    }

    callback(metrics);
  };
};

// 性能监控Hook
export function usePerformanceMonitor(componentId: string) {
  const monitor = PerformanceMonitor.getInstance();
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  const recordPerformance = React.useCallback((newMetrics: PerformanceMetrics) => {
    monitor.recordMetrics(componentId, newMetrics);
    setMetrics(newMetrics);
  }, [componentId]);

  const getAverageMetrics = React.useCallback(() => {
    return monitor.getAverageMetrics(componentId);
  }, [componentId]);

  return {
    metrics,
    recordPerformance,
    getAverageMetrics,
  };
}

// 性能监控组件
export interface PerformanceMonitorProps {
  componentId: string;
  children: React.ReactNode;
  showMetrics?: boolean;
  onPerformanceWarning?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({
  componentId,
  children,
  showMetrics = false,
  onPerformanceWarning,
}: PerformanceMonitorProps) {
  const monitor = PerformanceMonitor.getInstance();
  const [currentMetrics, setCurrentMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [averageMetrics, setAverageMetrics] = React.useState<PerformanceMetrics | null>(null);

  const handleRender = React.useCallback<ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      const metrics: PerformanceMetrics = {
        renderTime: actualDuration,
        componentCount: 1,
        timestamp: Date.now(),
      };

      // 尝试获取内存使用情况
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          metrics.memoryUsage = memory.usedJSHeapSize;
        }
      }

      monitor.recordMetrics(componentId, metrics);
      setCurrentMetrics(metrics);
      setAverageMetrics(monitor.getAverageMetrics(componentId));

      // 检查性能问题
      if (actualDuration > 100) {
        onPerformanceWarning?.(metrics);
      }
    },
    [componentId, onPerformanceWarning]
  );

  return (
    <Profiler id={componentId} onRender={handleRender}>
      {children}
      {showMetrics && (
        <div className="performance-metrics text-xs text-gray-500 p-2 border rounded">
          <div>组件: {componentId}</div>
          {currentMetrics && (
            <div className="space-y-1">
              <div>渲染时间: {currentMetrics.renderTime.toFixed(2)}ms</div>
              {currentMetrics.memoryUsage && (
                <div>内存使用: {(currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
              )}
            </div>
          )}
          {averageMetrics && (
            <div className="mt-2 pt-2 border-t">
              <div className="font-medium">平均性能:</div>
              <div>渲染时间: {averageMetrics.renderTime.toFixed(2)}ms</div>
              {averageMetrics.memoryUsage && (
                <div>内存使用: {(averageMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
              )}
            </div>
          )}
        </div>
      )}
    </Profiler>
  );
}

// 表单性能监控
export function useFormPerformanceMonitor(formId: string, fieldCount: number) {
  const monitor = PerformanceMonitor.getInstance();
  const [performanceData, setPerformanceData] = React.useState<FormPerformanceData | null>(null);

  const recordFormPerformance = React.useCallback((
    renderTime: number,
    validationTime?: number,
    networkTime?: number
  ) => {
    const data: FormPerformanceData = {
      formId,
      fieldCount,
      renderTime,
      validationTime: validationTime || 0,
      networkTime: networkTime || 0,
      timestamp: Date.now(),
      metadata: {
        hasConditionalFields: fieldCount > 5,
        hasValidation: true,
        hasNetworkOperations: networkTime !== undefined,
      },
    };

    const metrics: PerformanceMetrics = {
      renderTime,
      componentCount: fieldCount,
      validationTime,
      networkTime,
      timestamp: Date.now(),
    };

    monitor.recordMetrics(formId, metrics);
    setPerformanceData(data);
  }, [formId, fieldCount]);

  return {
    performanceData,
    recordFormPerformance,
  };
}

// 性能优化建议
export function getPerformanceOptimizationSuggestions(metrics: PerformanceMetrics): string[] {
  const suggestions: string[] = [];

  if (metrics.renderTime > 100) {
    suggestions.push('考虑使用React.memo优化组件渲染');
    suggestions.push('检查是否有不必要的重新渲染');
    suggestions.push('考虑使用虚拟滚动优化长列表');
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) {
    suggestions.push('检查是否有内存泄漏');
    suggestions.push('优化数据结构，减少内存占用');
    suggestions.push('使用useMemo和useCallback优化计算');
  }

  if (metrics.validationTime && metrics.validationTime > 50) {
    suggestions.push('优化验证逻辑，考虑缓存验证结果');
    suggestions.push('使用Web Worker进行复杂验证');
  }

  return suggestions;
}