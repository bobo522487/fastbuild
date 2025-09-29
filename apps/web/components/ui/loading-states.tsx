'use client';

import React from 'react';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'validating';

export interface LoadingStateProps {
  state: LoadingState;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 通用加载状态指示器
export const LoadingStateIndicator = React.memo(({
  state,
  message,
  className = '',
  size = 'md'
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const getStateIcon = () => {
    switch (state) {
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
      default:
        return null;
    }
  };

  const getDefaultMessage = () => {
    switch (state) {
      case 'loading': return '加载中...';
      case 'success': return '完成';
      case 'error': return '失败';
      case 'validating': return '验证中...';
      default: return '';
    }
  };

  const displayMessage = message || getDefaultMessage();

  if (state === 'idle') {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStateIcon()}
      {displayMessage && (
        <span className="text-sm font-medium text-muted-foreground">
          {displayMessage}
        </span>
      )}
    </div>
  );
});

LoadingStateIndicator.displayName = 'LoadingStateIndicator';

// 页面级加载骨架
export const PageSkeleton = React.memo(({ className = '' }: { className?: string }) => (
  <div className={`space-y-6 ${className}`}>
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
));

PageSkeleton.displayName = 'PageSkeleton';

// 表单字段骨架
export const FormFieldSkeleton = React.memo(({
  className = '',
  showLabel = true,
  showDescription = false
}: {
  className?: string;
  showLabel?: boolean;
  showDescription?: boolean;
}) => (
  <div className={`space-y-2 ${className}`}>
    {showLabel && <Skeleton className="h-4 w-32" />}
    <Skeleton className="h-10 w-full" />
    {showDescription && <Skeleton className="h-3 w-48" />}
  </div>
));

FormFieldSkeleton.displayName = 'FormFieldSkeleton';

// 表单骨架
export const FormSkeleton = React.memo(({
  fieldCount = 3,
  className = ''
}: {
  fieldCount?: number;
  className?: string;
}) => (
  <div className={`space-y-4 ${className}`}>
    <div className="space-y-2">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>

    {[...Array(fieldCount)].map((_, i) => (
      <FormFieldSkeleton
        key={i}
        showLabel={true}
        showDescription={i === 1}
      />
    ))}

    <div className="flex space-x-4 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
));

FormSkeleton.displayName = 'FormSkeleton';

// 表格骨架
export const TableSkeleton = React.memo(({
  rowCount = 5,
  columnCount = 4,
  className = ''
}: {
  rowCount?: number;
  columnCount?: number;
  className?: string;
}) => (
  <div className={`space-y-4 ${className}`}>
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-24" />
    </div>

    <div className="space-y-3">
      {/* 表头 */}
      <div className="flex space-x-4">
        {[...Array(columnCount)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>

      {/* 表格行 */}
      {[...Array(rowCount)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {[...Array(columnCount)].map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-32" />
          ))}
        </div>
      ))}
    </div>
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';

// 卡片骨架
export const CardSkeleton = React.memo(({
  className = '',
  lines = 3
}: {
  className?: string;
  lines?: number;
}) => (
  <Card className={className}>
    <CardHeader>
      <Skeleton className="h-5 w-3/4" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {[...Array(lines)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
));

CardSkeleton.displayName = 'CardSkeleton';

// 列表骨架
export const ListSkeleton = React.memo(({
  itemCount = 5,
  className = ''
}: {
  itemCount?: number;
  className?: string;
}) => (
  <div className={`space-y-4 ${className}`}>
    {[...Array(itemCount)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
));

ListSkeleton.displayName = 'ListSkeleton';

// 侧边栏骨架
export const SidebarSkeleton = React.memo(({ className = '' }: { className?: string }) => (
  <div className={`space-y-4 p-4 ${className}`}>
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-5/6" />
      <Skeleton className="h-8 w-4/6" />
    </div>

    <div className="space-y-2">
      <Skeleton className="h-4 w-6" />
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  </div>
));

SidebarSkeleton.displayName = 'SidebarSkeleton';

// 仪表板骨架
export const DashboardSkeleton = React.memo(({ className = '' }: { className?: string }) => (
  <div className={`space-y-6 ${className}`}>
    {/* 顶部统计卡片 */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* 图表区域 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <ListSkeleton itemCount={4} />
        </CardContent>
      </Card>
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

// 智能加载组件 - 根据上下文自动选择合适的骨架
export interface SmartLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  type?: 'page' | 'form' | 'table' | 'card' | 'list' | 'dashboard' | 'sidebar';
  skeletonProps?: {
    fieldCount?: number;
    rowCount?: number;
    columnCount?: number;
    itemCount?: number;
    lines?: number;
  };
  className?: string;
}

export const SmartLoading = React.memo(({
  isLoading,
  children,
  type = 'page',
  skeletonProps = {},
  className = ''
}: SmartLoadingProps) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  const renderSkeleton = () => {
    switch (type) {
      case 'form':
        return <FormSkeleton {...skeletonProps} className={className} />;
      case 'table':
        return <TableSkeleton {...skeletonProps} className={className} />;
      case 'card':
        return <CardSkeleton {...skeletonProps} className={className} />;
      case 'list':
        return <ListSkeleton {...skeletonProps} className={className} />;
      case 'dashboard':
        return <DashboardSkeleton className={className} />;
      case 'sidebar':
        return <SidebarSkeleton className={className} />;
      case 'page':
      default:
        return <PageSkeleton className={className} />;
    }
  };

  return (
    <div className="transition-opacity duration-300">
      {renderSkeleton()}
    </div>
  );
});

SmartLoading.displayName = 'SmartLoading';

// 带状态的内容包装器
export interface ContentWithLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  error?: Error | null;
  errorComponent?: React.ReactNode;
  className?: string;
}

export const ContentWithLoading = React.memo(({
  isLoading,
  children,
  loadingComponent,
  error,
  errorComponent,
  className = ''
}: ContentWithLoadingProps) => {
  if (error) {
    return errorComponent || (
      <div className={`p-4 text-center ${className}`}>
        <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <p className="text-red-600 font-medium">加载失败</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return loadingComponent || <PageSkeleton className={className} />;
  }

  return <>{children}</>;
});

ContentWithLoading.displayName = 'ContentWithLoading';

// 页面级全屏加载组件
export interface FullScreenLoadingProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export const FullScreenLoading = React.memo(({
  isLoading,
  message = '加载中...',
  className = ''
}: FullScreenLoadingProps) => {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-lg font-medium text-gray-700">{message}</span>
      </div>
    </div>
  );
});

FullScreenLoading.displayName = 'FullScreenLoading';