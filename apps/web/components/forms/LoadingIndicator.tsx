'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Clock, Wifi, WifiOff, Database, Shield } from 'lucide-react';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'validating' | 'syncing' | 'offline' | 'retrying' | 'processing';

export interface LoadingStatus {
  state: LoadingState;
  message?: string;
  progress?: number;
  details?: string;
  timestamp?: Date;
  duration?: number;
  estimatedTimeRemaining?: number;
}

export interface LoadingOperation {
  id: string;
  name: string;
  startTime: Date;
  state: LoadingState;
  progress?: number;
  details?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface LoadingIndicatorProps {
  status: LoadingStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showProgress?: boolean;
}

export function LoadingIndicator({
  status,
  size = 'md',
  className = '',
  showProgress = false,
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const getIcon = () => {
    switch (status.state) {
      case 'loading':
        return (
          <Loader2
            className={`animate-spin ${sizeClasses[size]} text-blue-600`}
          />
        );
      case 'success':
        return (
          <CheckCircle2
            className={`${sizeClasses[size]} text-green-600`}
          />
        );
      case 'error':
        return (
          <XCircle
            className={`${sizeClasses[size]} text-red-600`}
          />
        );
      case 'validating':
        return (
          <AlertCircle
            className={`animate-pulse ${sizeClasses[size]} text-yellow-600`}
          />
        );
      case 'syncing':
        return (
          <Database
            className={`${sizeClasses[size]} text-purple-600 animate-pulse`}
          />
        );
      case 'offline':
        return (
          <WifiOff
            className={`${sizeClasses[size]} text-orange-600`}
          />
        );
      case 'retrying':
        return (
          <Clock
            className={`${sizeClasses[size]} text-orange-600 animate-pulse`}
          />
        );
      case 'processing':
        return (
          <Shield
            className={`${sizeClasses[size]} text-indigo-600 animate-pulse`}
          />
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status.state) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'validating':
        return 'text-yellow-600';
      case 'syncing':
        return 'text-purple-600';
      case 'offline':
        return 'text-orange-600';
      case 'retrying':
        return 'text-orange-600';
      case 'processing':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
    }
  };

  const getDefaultMessage = () => {
    switch (status.state) {
      case 'loading':
        return '加载中...';
      case 'success':
        return '完成';
      case 'error':
        return '失败';
      case 'validating':
        return '验证中...';
      case 'syncing':
        return '同步中...';
      case 'offline':
        return '离线模式';
      case 'retrying':
        return '重试中...';
      case 'processing':
        return '处理中...';
      default:
        return '';
    }
  };

  const displayMessage = status.message || getDefaultMessage();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getIcon()}
      <div className="flex flex-col">
        {displayMessage && (
          <span className={`${textClasses[size]} ${getStatusColor()} font-medium`}>
            {displayMessage}
          </span>
        )}
        {status.details && (
          <span className="text-xs text-gray-500">
            {status.details}
          </span>
        )}
        {showProgress && status.progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
        {status.estimatedTimeRemaining && (
          <span className="text-xs text-gray-400">
            预计剩余时间: {formatDuration(status.estimatedTimeRemaining)}
          </span>
        )}
        {status.duration && (
          <span className="text-xs text-gray-400">
            已用时: {formatDuration(status.duration)}
          </span>
        )}
      </div>
    </div>
  );

  function formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.round((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
}

// 智能加载状态管理器
export class LoadingStateManager {
  private operations: Map<string, LoadingOperation> = new Map();
  private listeners: Set<() => void> = new Set();
  private updateInterval?: NodeJS.Timeout;

  constructor() {
    // 每500ms更新一次状态
    this.updateInterval = setInterval(() => {
      this.updateStatus();
    }, 500);
  }

  private updateStatus() {
    const now = new Date();

    // 更新所有操作的状态
    this.operations.forEach((operation, id) => {
      if (operation.state === 'loading' || operation.state === 'processing') {
        const duration = now.getTime() - operation.startTime.getTime();

        // 如果操作超过30秒，标记为异常
        if (duration > 30000) {
          operation.state = 'error';
          operation.details = '操作超时';
        }
      }
    });

    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // 开始一个新的操作
  startOperation(id: string, name: string, maxRetries = 3): LoadingOperation {
    const operation: LoadingOperation = {
      id,
      name,
      startTime: new Date(),
      state: 'loading',
      retryCount: 0,
      maxRetries,
    };

    this.operations.set(id, operation);
    this.notifyListeners();
    return operation;
  }

  // 更新操作状态
  updateOperation(id: string, updates: Partial<LoadingOperation>): void {
    const operation = this.operations.get(id);
    if (operation) {
      Object.assign(operation, updates);
      this.notifyListeners();
    }
  }

  // 完成操作
  completeOperation(id: string, success: boolean = true): void {
    const operation = this.operations.get(id);
    if (operation) {
      operation.state = success ? 'success' : 'error';
      this.notifyListeners();

      // 5秒后移除成功的操作
      if (success) {
        setTimeout(() => {
          this.operations.delete(id);
          this.notifyListeners();
        }, 5000);
      }
    }
  }

  // 重试操作
  retryOperation(id: string): boolean {
    const operation = this.operations.get(id);
    if (operation && operation.retryCount! < operation.maxRetries!) {
      operation.retryCount! += 1;
      operation.state = 'retrying';
      operation.startTime = new Date();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // 获取所有活跃操作
  getActiveOperations(): LoadingOperation[] {
    return Array.from(this.operations.values()).filter(
      op => op.state !== 'success' && op.state !== 'error'
    );
  }

  // 获取整体状态
  getOverallStatus(): LoadingStatus {
    const activeOps = this.getActiveOperations();

    if (activeOps.length === 0) {
      return {
        state: 'idle',
        message: '',
      };
    }

    // 如果有重试中的操作，显示重试状态
    const retryingOps = activeOps.filter(op => op.state === 'retrying');
    if (retryingOps.length > 0) {
      return {
        state: 'retrying',
        message: '重试中...',
        details: `正在重试 ${retryingOps.length} 个操作`,
      };
    }

    // 如果有验证中的操作，显示验证状态
    const validatingOps = activeOps.filter(op => op.state === 'validating');
    if (validatingOps.length > 0) {
      return {
        state: 'validating',
        message: '验证中...',
        details: `正在验证 ${validatingOps.length} 个字段`,
      };
    }

    // 否则显示处理状态
    return {
      state: 'processing',
      message: '处理中...',
      details: `正在处理 ${activeOps.length} 个操作`,
    };
  }

  // 订阅状态变化
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 清理
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.operations.clear();
    this.listeners.clear();
  }
}

// 创建全局加载状态管理器实例
export const globalLoadingManager = new LoadingStateManager();

// React Hook 用于使用全局加载状态管理器
export function useGlobalLoading() {
  const [status, setStatus] = React.useState<LoadingStatus>(
    globalLoadingManager.getOverallStatus()
  );
  const [operations, setOperations] = React.useState<LoadingOperation[]>(
    globalLoadingManager.getActiveOperations()
  );

  React.useEffect(() => {
    const unsubscribe = globalLoadingManager.subscribe(() => {
      setStatus(globalLoadingManager.getOverallStatus());
      setOperations(globalLoadingManager.getActiveOperations());
    });

    return () => unsubscribe();
  }, []);

  return {
    status,
    operations,
    startOperation: globalLoadingManager.startOperation.bind(globalLoadingManager),
    updateOperation: globalLoadingManager.updateOperation.bind(globalLoadingManager),
    completeOperation: globalLoadingManager.completeOperation.bind(globalLoadingManager),
    retryOperation: globalLoadingManager.retryOperation.bind(globalLoadingManager),
  };
}

// 表单专用的加载状态组件

export function FormLoadingIndicator({
  isSubmitting,
  isValidating,
  submitCount = 0,
  className = '',
}: FormLoadingIndicatorProps) {
  const getLoadingStatus = (): LoadingStatus => {
    if (isSubmitting) {
      return {
        state: 'loading',
        message: '提交中...',
        details: submitCount > 0 ? `第 ${submitCount} 次提交尝试` : undefined,
        timestamp: new Date(),
      };
    }

    if (isValidating) {
      return {
        state: 'validating',
        message: '验证中...',
        timestamp: new Date(),
      };
    }

    return {
      state: 'idle',
      message: '',
    };
  };

  return (
    <LoadingIndicator
      status={getLoadingStatus()}
      size="sm"
      className={className}
    />
  );
}

// 页面级加载组件
export interface PageLoadingProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function PageLoading({
  isLoading,
  message = '加载中...',
  className = '',
}: PageLoadingProps) {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-lg font-medium text-gray-700">{message}</span>
      </div>
    </div>
  );
}

// 字段级加载组件
export interface FieldLoadingIndicatorProps {
  isLoading: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function FieldLoadingIndicator({
  isLoading,
  label,
  size = 'sm',
  className = '',
}: FieldLoadingIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Loader2 className={`animate-spin ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} text-blue-500`} />
      {label && (
        <span className={`text-xs ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-500`}>
          {label}
        </span>
      )}
    </div>
  );
}

// 按钮加载组件
export interface ButtonLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  loadingText?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ButtonLoading({
  isLoading,
  children,
  disabled = false,
  loadingText,
  className = '',
  variant = 'default',
  size = 'default',
  ...props
}: ButtonLoadingProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? loadingText || '处理中...' : children}
    </button>
  );
}

// 全局加载状态面板组件
export interface GlobalLoadingPanelProps {
  className?: string;
  maxVisibleOperations?: number;
  showDetails?: boolean;
}

export function GlobalLoadingPanel({
  className = '',
  maxVisibleOperations = 5,
  showDetails = true,
}: GlobalLoadingPanelProps) {
  const { status, operations } = useGlobalLoading();

  // 只显示最近的操作
  const visibleOperations = operations
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, maxVisibleOperations);

  if (status.state === 'idle' && operations.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 space-y-2 ${className}`}>
      {/* 全局状态指示器 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[300px]">
        <LoadingIndicator
          status={status}
          size="sm"
          showProgress={true}
        />
      </div>

      {/* 详细操作列表 */}
      {showDetails && visibleOperations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-h-[400px] overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2">活动操作</h4>
          <div className="space-y-2">
            {visibleOperations.map((operation) => (
              <div key={operation.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <LoadingIndicator
                    status={{
                      state: operation.state,
                      message: operation.name,
                      details: operation.details,
                    }}
                    size="sm"
                  />
                </div>
                <div className="text-gray-400">
                  {formatDuration(new Date().getTime() - operation.startTime.getTime())}
                  {operation.retryCount && operation.retryCount > 0 && (
                    <span className="ml-2 text-orange-600">
                      (重试 {operation.retryCount}/{operation.maxRetries})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 智能进度条组件
export interface SmartProgressBarProps {
  operations: LoadingOperation[];
  className?: string;
  showEstimatedTime?: boolean;
}

export function SmartProgressBar({
  operations,
  className = '',
  showEstimatedTime = true,
}: SmartProgressBarProps) {
  const totalOperations = operations.length;
  const completedOperations = operations.filter(
    op => op.state === 'success'
  ).length;
  const progress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;

  // 计算平均耗时来预估剩余时间
  const completedWithTime = operations.filter(
    op => op.state === 'success' && op.startTime
  );
  const avgDuration = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, op) => {
        return sum + (new Date().getTime() - op.startTime.getTime());
      }, 0) / completedWithTime.length
    : 0;

  const remainingOperations = totalOperations - completedOperations;
  const estimatedTimeRemaining = remainingOperations > 0 ? avgDuration * remainingOperations : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-xs text-gray-600">
        <span>进度: {completedOperations}/{totalOperations}</span>
        {showEstimatedTime && estimatedTimeRemaining > 1000 && (
          <span>预计剩余: {formatDuration(estimatedTimeRemaining)}</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {progress.toFixed(1)}% 完成
      </div>
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.round((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}