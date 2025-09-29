'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * 性能监控组件
 * 实时监控React组件性能和页面性能指标
 */
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentCount: number;
  stateUpdates: number;
  lastUpdated: string;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showInProduction?: boolean;
  sampleInterval?: number;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

/**
 * 高级性能监控组件
 * 提供实时的性能指标收集和分析
 */
export function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  showInProduction = false,
  sampleInterval = 1000,
  onMetrics,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    stateUpdates: 0,
    lastUpdated: new Date().toISOString(),
  });

  const [isVisible, setIsVisible] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const stateUpdateCount = useRef(0);

  // 性能阈值配置
  const thresholds = {
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 50, // 50MB
    componentCount: 100, // 100个组件
  };

  // 警告管理
  const addWarning = (message: string) => {
    setWarnings(prev => {
      const newWarnings = [...prev, message];
      // 保持最近10个警告
      return newWarnings.slice(-10);
    });
  };

  const clearWarnings = () => {
    setWarnings([]);
  };

  // 组件渲染性能监控
  useEffect(() => {
    if (!enabled) return;

    const renderStart = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStart;
      lastRenderTime.current = renderTime;

      if (renderTime > thresholds.renderTime) {
        addWarning(`渲染时间过长: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [enabled, metrics]);

  // 内存使用监控
  useEffect(() => {
    if (!enabled || typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }

    const interval = setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);

        if (memoryUsageMB > thresholds.memoryUsage) {
          addWarning(`内存使用过高: ${memoryUsageMB.toFixed(2)}MB`);
        }

        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryUsageMB,
        }));
      }
    }, sampleInterval);

    return () => clearInterval(interval);
  }, [enabled, sampleInterval]);

  // 全局状态更新监控（简化版）
  useEffect(() => {
    if (!enabled) return;

    // 简化的状态更新计数器
    const interval = setInterval(() => {
      // 模拟状态更新监控
      if (stateUpdateCount.current > thresholds.componentCount) {
        addWarning(`状态更新过多: ${stateUpdateCount.current}`);
      }
    }, sampleInterval);

    return () => clearInterval(interval);
  }, [enabled, sampleInterval]);

  // 组件计数监控
  useEffect(() => {
    if (!enabled) return;

    const countComponents = () => {
      const components = document.querySelectorAll('[data-reactroot] *');
      return components.length;
    };

    const interval = setInterval(() => {
      const count = countComponents();

      if (count > thresholds.componentCount) {
        addWarning(`组件数量过多: ${count}`);
      }

      setMetrics(prev => ({
        ...prev,
        componentCount: count,
        stateUpdates: stateUpdateCount.current,
        renderTime: lastRenderTime.current,
        lastUpdated: new Date().toISOString(),
      }));
    }, sampleInterval);

    return () => clearInterval(interval);
  }, [enabled, sampleInterval]);

  // 性能指标回调
  useEffect(() => {
    if (onMetrics) {
      onMetrics(metrics);
    }
  }, [metrics, onMetrics]);

  // 键盘快捷键切换显示/隐藏
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [enabled]);

  // 性能健康检查
  const performHealthCheck = () => {
    const issues: string[] = [];

    if (metrics.renderTime > thresholds.renderTime) {
      issues.push(`渲染时间: ${metrics.renderTime.toFixed(2)}ms > ${thresholds.renderTime}ms`);
    }

    if (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage) {
      issues.push(`内存使用: ${metrics.memoryUsage.toFixed(2)}MB > ${thresholds.memoryUsage}MB`);
    }

    if (metrics.componentCount > thresholds.componentCount) {
      issues.push(`组件数量: ${metrics.componentCount} > ${thresholds.componentCount}`);
    }

    if (issues.length > 0) {
      addWarning(`健康检查发现问题: ${issues.join(', ')}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  };

  // 导出性能报告
  const exportPerformanceReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      warnings,
      thresholds,
      healthCheck: performHealthCheck(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 如果未启用且不在生产环境中显示，则不渲染
  if (!enabled && (!showInProduction || process.env.NODE_ENV !== 'production')) {
    return null;
  }

  return (
    <div className={`performance-monitor ${isVisible ? 'visible' : 'hidden'}`}>
      {/* 浮动按钮 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        title="性能监控 (Ctrl+P)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* 性能监控面板 */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">性能监控</h3>
              <div className="flex gap-2">
                <button
                  onClick={performHealthCheck}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="健康检查"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  onClick={exportPerformanceReport}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="导出报告"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={clearWarnings}
                  className="p-1 text-yellow-600 hover:text-yellow-800"
                  title="清除警告"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 text-gray-600 hover:text-gray-800"
                  title="关闭"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              最后更新: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* 性能指标 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">渲染时间</div>
                <div className={`font-medium ${metrics.renderTime > thresholds.renderTime ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.renderTime.toFixed(2)}ms
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">内存使用</div>
                <div className={`font-medium ${metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.memoryUsage ? `${metrics.memoryUsage.toFixed(2)}MB` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">组件数量</div>
                <div className={`font-medium ${metrics.componentCount > thresholds.componentCount ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.componentCount}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">状态更新</div>
                <div className="font-medium text-blue-600">
                  {metrics.stateUpdates}
                </div>
              </div>
            </div>

            {/* 警告信息 */}
            {warnings.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-red-600 mb-2">性能警告</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 使用提示 */}
            <div className="text-xs text-gray-500 border-t pt-2">
              <div>• 按 Ctrl+P 显示/隐藏监控面板</div>
              <div>• 绿色数值表示正常，红色表示超出阈值</div>
              <div>• 警告信息会自动记录最近的10条</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;

/**
 * 使用性能监控的Hook
 */
export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    stateUpdates: 0,
    lastUpdated: new Date().toISOString(),
  });

  const recordPerformance = React.useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({
      ...prev,
      ...newMetrics,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  return { metrics, recordPerformance };
}