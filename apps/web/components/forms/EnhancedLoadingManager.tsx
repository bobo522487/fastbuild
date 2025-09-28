'use client';

import React from 'react';
import { LoadingIndicator, LoadingStatus, LoadingOperation, LoadingStateManager, useGlobalLoading } from './LoadingIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Progress } from '@workspace/ui/components/progress';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Database,
  Shield,
  Zap,
  Pause,
  Play,
  RotateCcw,
  BarChart3,
  Activity,
  Cpu,
  HardDrive
} from 'lucide-react';

export interface EnhancedLoadingState {
  status: LoadingStatus;
  operations: LoadingOperation[];
  performance: {
    totalOperations: number;
    completedOperations: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    networkStatus: 'online' | 'offline' | 'slow';
  };
}

export interface EnhancedLoadingManagerProps {
  isVisible?: boolean;
  showPerformance?: boolean;
  showSystemMetrics?: boolean;
  maxVisibleOperations?: number;
  className?: string;
}

// 性能监控器
export class PerformanceMonitor {
  private metrics = {
    startTime: Date.now(),
    operations: 0,
    completedOperations: 0,
    totalResponseTime: 0,
    errors: 0,
    lastResetTime: Date.now()
  };

  recordOperation(duration: number, success: boolean = true) {
    this.metrics.operations++;
    this.metrics.totalResponseTime += duration;

    if (success) {
      this.metrics.completedOperations++;
    } else {
      this.metrics.errors++;
    }
  }

  getPerformanceMetrics() {
    const now = Date.now();
    const timeWindow = now - this.metrics.lastResetTime;

    return {
      totalOperations: this.metrics.operations,
      completedOperations: this.metrics.completedOperations,
      averageResponseTime: this.metrics.completedOperations > 0
        ? this.metrics.totalResponseTime / this.metrics.completedOperations
        : 0,
      errorRate: this.metrics.operations > 0
        ? (this.metrics.errors / this.metrics.operations) * 100
        : 0,
      throughput: timeWindow > 0
        ? (this.metrics.completedOperations / (timeWindow / 1000))
        : 0
    };
  }

  reset() {
    this.metrics = {
      startTime: Date.now(),
      operations: 0,
      completedOperations: 0,
      totalResponseTime: 0,
      errors: 0,
      lastResetTime: Date.now()
    };
  }
}

// 系统状态监控器
export class SystemMonitor {
  private memoryUsage: number = 0;
  private cpuUsage: number = 0;
  private networkStatus: 'online' | 'offline' | 'slow' = 'online';
  private lastNetworkCheck: number = Date.now();

  async updateMetrics() {
    // 模拟系统指标监控（实际应用中可以使用真实的API）
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perfData = performance as any;
      if (perfData.memory) {
        this.memoryUsage = (perfData.memory.usedJSHeapSize / perfData.memory.totalJSHeapSize) * 100;
      }
    }

    // 检测网络状态
    if (Date.now() - this.lastNetworkCheck > 5000) {
      await this.checkNetworkStatus();
      this.lastNetworkCheck = Date.now();
    }
  }

  private async checkNetworkStatus() {
    try {
      const startTime = Date.now();
      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const responseTime = Date.now() - startTime;

      if (responseTime < 300) {
        this.networkStatus = 'online';
      } else if (responseTime < 1000) {
        this.networkStatus = 'slow';
      } else {
        this.networkStatus = 'offline';
      }
    } catch {
      this.networkStatus = 'offline';
    }
  }

  getSystemMetrics() {
    return {
      memoryUsage: Math.round(this.memoryUsage),
      cpuUsage: Math.round(this.cpuUsage),
      networkStatus: this.networkStatus
    };
  }
}

export function EnhancedLoadingManager({
  isVisible = true,
  showPerformance = false,
  showSystemMetrics = false,
  maxVisibleOperations = 10,
  className = ''
}: EnhancedLoadingManagerProps) {
  const { status, operations } = useGlobalLoading();
  const [performanceMonitor] = React.useState(() => new PerformanceMonitor());
  const [systemMonitor] = React.useState(() => new SystemMonitor());
  const [enhancedState, setEnhancedState] = React.useState<EnhancedLoadingState | null>(null);

  React.useEffect(() => {
    if (!isVisible) return;

    const updateEnhancedState = async () => {
      // 更新系统指标
      await systemMonitor.updateMetrics();

      // 获取性能指标
      const performance = performanceMonitor.getPerformanceMetrics();
      const system = systemMonitor.getSystemMetrics();

      setEnhancedState({
        status,
        operations,
        performance,
        system
      });
    };

    updateEnhancedState();
    const interval = setInterval(updateEnhancedState, 1000);

    return () => clearInterval(interval);
  }, [isVisible, status, operations, performanceMonitor, systemMonitor]);

  if (!isVisible || !enhancedState) {
    return null;
  }

  const { performance, system } = enhancedState;

  // 过滤和排序操作
  const visibleOperations = operations
    .filter(op => op.state !== 'success')
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, maxVisibleOperations);

  const getNetworkStatusIcon = () => {
    switch (system.networkStatus) {
      case 'online': return <Wifi className="h-3 w-3 text-green-600" />;
      case 'slow': return <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" />;
      case 'offline': return <WifiOff className="h-3 w-3 text-red-600" />;
    }
  };

  const getNetworkStatusText = () => {
    switch (system.networkStatus) {
      case 'online': return '网络正常';
      case 'slow': return '网络缓慢';
      case 'offline': return '网络断开';
    }
  };

  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.round((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 整体状态卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>系统状态监控</span>
            <Badge variant="outline" className={status.state === 'idle' ? 'text-green-600' : 'text-blue-600'}>
              {status.state === 'idle' ? '空闲' : '忙碌中'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 操作状态 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">当前操作</span>
                <LoadingIndicator status={status} size="sm" />
              </div>
              <div className="text-xs text-gray-500">
                {operations.length} 个活跃操作
              </div>
            </div>

            {/* 网络状态 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">网络状态</span>
                <div className="flex items-center space-x-1">
                  {getNetworkStatusIcon()}
                  <span className="text-xs">{getNetworkStatusText()}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {system.networkStatus === 'online' && '连接稳定'}
                {system.networkStatus === 'slow' && '响应延迟'}
                {system.networkStatus === 'offline' && '连接中断'}
              </div>
            </div>

            {/* 系统负载 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">系统负载</span>
                <div className="flex items-center space-x-1">
                  <Cpu className="h-3 w-3" />
                  <span className="text-xs">{system.cpuUsage}%</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                内存使用: {system.memoryUsage}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能指标 */}
      {showPerformance && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>性能指标</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500">总操作数</div>
                <div className="text-lg font-semibold">{performance.totalOperations}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">完成率</div>
                <div className="text-lg font-semibold text-green-600">
                  {performance.totalOperations > 0
                    ? ((performance.completedOperations / performance.totalOperations) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">平均响应时间</div>
                <div className="text-lg font-semibold">
                  {formatDuration(performance.averageResponseTime)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">错误率</div>
                <div className={`text-lg font-semibold ${
                  performance.errorRate > 5 ? 'text-red-600' :
                  performance.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {performance.errorRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 吞吐量图表 */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>实时吞吐量</span>
                <span className="text-xs text-gray-500">
                  {performance.throughput.toFixed(1)} ops/sec
                </span>
              </div>
              <Progress
                value={Math.min(performance.throughput * 10, 100)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 活动操作列表 */}
      {visibleOperations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>活动操作</span>
                <Badge variant="outline">{visibleOperations.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => performanceMonitor.reset()}
                className="h-6 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                重置
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleOperations.map((operation) => {
                const duration = Date.now() - operation.startTime.getTime();
                const isActive = operation.state === 'loading' || operation.state === 'processing';
                const isError = operation.state === 'error';

                return (
                  <div
                    key={operation.id}
                    className={`p-3 border rounded-lg space-y-2 ${
                      isError ? 'border-red-200 bg-red-50' :
                      isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <LoadingIndicator
                          status={{
                            state: operation.state,
                            message: operation.name,
                            details: operation.details,
                          }}
                          size="sm"
                        />
                        <span className="text-sm font-medium">{operation.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatDuration(duration)}</span>
                        {operation.retryCount && operation.retryCount > 0 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            重试 {operation.retryCount}/{operation.maxRetries}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {operation.details && (
                      <div className="text-xs text-gray-600 pl-6">
                        {operation.details}
                      </div>
                    )}

                    {/* 进度条 */}
                    {isActive && (
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            isError ? 'bg-red-600' : 'bg-blue-600'
                          }`}
                          style={{
                            width: isError ? '100%' : `${Math.min((duration / 30000) * 100, 100)}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 系统资源监控 */}
      {showSystemMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>系统资源</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* CPU 使用率 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>CPU 使用率</span>
                  <span>{system.cpuUsage}%</span>
                </div>
                <Progress value={system.cpuUsage} className="h-2" />
              </div>

              {/* 内存使用率 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>内存使用率</span>
                  <span>{system.memoryUsage}%</span>
                </div>
                <Progress value={system.memoryUsage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 智能加载状态提示
export function SmartLoadingTip({ state }: { state: LoadingStatus }) {
  const getTip = () => {
    switch (state.state) {
      case 'loading':
        return {
          title: '正在处理中',
          message: '请稍候，系统正在处理您的请求',
          suggestions: ['大文件处理可能需要较长时间', '网络状况会影响处理速度']
        };
      case 'validating':
        return {
          title: '正在验证数据',
          message: '系统正在检查输入的数据格式和有效性',
          suggestions: ['请确保所有必填字段都已填写', '检查数据格式是否符合要求']
        };
      case 'syncing':
        return {
          title: '正在同步数据',
          message: '正在将数据同步到服务器',
          suggestions: ['请保持网络连接稳定', '数据同步期间请勿关闭页面']
        };
      case 'retrying':
        return {
          title: '正在重试',
          message: '上次操作失败，正在自动重试',
          suggestions: ['系统会自动重试失败的操作', '如果持续失败，请检查网络连接']
        };
      case 'offline':
        return {
          title: '离线模式',
          message: '网络连接已断开，正在使用离线模式',
          suggestions: ['请检查网络连接', '数据将在网络恢复后自动同步']
        };
      default:
        return null;
    }
  };

  const tip = getTip();
  if (!tip) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-start space-x-2">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <div className="text-sm font-medium text-blue-800">{tip.title}</div>
          <div className="text-xs text-blue-700">{tip.message}</div>
          <ul className="text-xs text-blue-600 space-y-1 ml-4">
            {tip.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start space-x-1">
                <span className="text-blue-400">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// 加载时间预估组件
export function LoadingTimeEstimator({
  operations,
  className = ''
}: {
  operations: LoadingOperation[];
  className?: string;
}) {
  const getEstimatedTime = () => {
    const activeOperations = operations.filter(op =>
      op.state === 'loading' || op.state === 'processing'
    );

    if (activeOperations.length === 0) return 0;

    // 基于操作类型和状态估算剩余时间
    let estimatedTime = 0;

    activeOperations.forEach(op => {
      const elapsed = Date.now() - op.startTime.getTime();

      switch (op.state) {
        case 'loading':
          estimatedTime += Math.max(0, 5000 - elapsed); // 预估5秒完成
          break;
        case 'processing':
          estimatedTime += Math.max(0, 10000 - elapsed); // 预估10秒完成
          break;
        case 'validating':
          estimatedTime += Math.max(0, 2000 - elapsed); // 预估2秒完成
          break;
        case 'syncing':
          estimatedTime += Math.max(0, 8000 - elapsed); // 预估8秒完成
          break;
      }
    });

    return estimatedTime;
  };

  const estimatedTime = getEstimatedTime();

  if (estimatedTime <= 0) return null;

  const formatTime = (milliseconds: number): string => {
    if (milliseconds < 1000) return `${Math.round(milliseconds / 100) * 100}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}秒`;
    return `${Math.floor(milliseconds / 60000)}分${Math.round((milliseconds % 60000) / 1000)}秒`;
  };

  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
      <Clock className="h-4 w-4" />
      <span>预计剩余时间: {formatTime(estimatedTime)}</span>
    </div>
  );
}