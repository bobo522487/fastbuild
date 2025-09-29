'use client';

import React from 'react';
import { useLoading } from '@/hooks/use-loading';
import { LoadingIndicator, PageLoading } from '@/components/forms/LoadingIndicator';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export interface GlobalLoadingConfig {
  showSpinner?: boolean;
  showProgress?: boolean;
  showDetails?: boolean;
  message?: string;
  timeout?: number;
}

export interface LoadingOverlayProps {
  config?: GlobalLoadingConfig;
  className?: string;
}

export function LoadingOverlay({ config = {}, className = '' }: LoadingOverlayProps) {
  const { globalLoading, getRunningTasks, getTaskStats } = useLoading();

  if (!globalLoading) return null;

  const {
    showSpinner = true,
    showProgress = true,
    showDetails = true,
    message = '处理中...',
  } = config;

  const runningTasks = getRunningTasks();
  const stats = getTaskStats();

  // 计算总体进度
  const totalProgress = runningTasks.length > 0
    ? runningTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / runningTasks.length
    : 0;

  const getStatusState = () => {
    if (stats.failed > 0) return 'error';
    if (stats.running > 0) return 'loading';
    if (stats.completed > 0 && stats.running === 0) return 'success';
    return 'loading';
  };

  const getStatusMessage = () => {
    if (runningTasks.length === 1) {
      return runningTasks[0]?.message || message;
    }
    if (runningTasks.length > 1) {
      return `正在执行 ${runningTasks.length} 个任务...`;
    }
    return message;
  };

  const status = {
    state: getStatusState() as 'idle' | 'loading' | 'success' | 'error' | 'validating',
    message: getStatusMessage(),
    progress: totalProgress,
    details: showDetails ? `${stats.completed}/${stats.total} 任务完成` : undefined,
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <LoadingIndicator
            status={status}
            size="lg"
            showProgress={showProgress}
          />

          {showDetails && (
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>任务进度</span>
                <span>{stats.running} 运行中, {stats.completed} 已完成</span>
              </div>

              {runningTasks.length > 1 && (
                <div className="space-y-1">
                  {runningTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-xs text-gray-500">
                      <span className="truncate max-w-[200px]">{task.name}</span>
                      <span>{task.progress || 0}%</span>
                    </div>
                  ))}
                  {runningTasks.length > 3 && (
                    <div className="text-xs text-gray-400 text-center">
                      还有 {runningTasks.length - 3} 个任务...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 轻量级加载指示器
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function Spinner({ size = 'md', className = '', text }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-600`} />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}

// 骨架屏加载组件
export interface SkeletonProps {
  lines?: number;
  className?: string;
  animate?: boolean;
}

export function Skeleton({ lines = 3, className = '', animate = true }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`}
          style={{
            height: `${i === lines - 1 ? '1rem' : '1.5rem'}`,
            width: `${i === 0 ? '100%' : i === lines - 1 ? '80%' : '90%'}`,
          }}
        />
      ))}
    </div>
  );
}

// 表格骨架屏
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: TableSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="bg-gray-200 rounded animate-pulse flex-1"
              style={{
                height: '2rem',
                width: colIndex === 0 ? '30%' : colIndex === columns - 1 ? '20%' : '25%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// 卡片骨架屏
export interface CardSkeletonProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  className?: string;
}

export function CardSkeleton({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  className = '',
}: CardSkeletonProps) {
  return (
    <div className={`p-4 border rounded-lg space-y-3 ${className}`}>
      {showAvatar && (
        <div className="bg-gray-200 rounded-full w-12 h-12 animate-pulse" />
      )}
      {showTitle && (
        <div className="space-y-2">
          <div className="bg-gray-200 rounded h-4 w-3/4 animate-pulse" />
          <div className="bg-gray-200 rounded h-3 w-1/2 animate-pulse" />
        </div>
      )}
      {showDescription && (
        <div className="space-y-2">
          <div className="bg-gray-200 rounded h-3 w-full animate-pulse" />
          <div className="bg-gray-200 rounded h-3 w-5/6 animate-pulse" />
        </div>
      )}
    </div>
  );
}

// 页面加载包装器
export interface PageLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function PageLoader({
  isLoading,
  children,
  fallback,
  className = '',
}: PageLoaderProps) {
  if (isLoading) {
    return fallback || (
      <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 导出默认的全局加载配置
export const defaultLoadingConfig: GlobalLoadingConfig = {
  showSpinner: true,
  showProgress: true,
  showDetails: true,
  message: '加载中...',
  timeout: 30000,
};