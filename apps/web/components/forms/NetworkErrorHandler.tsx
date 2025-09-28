'use client';

import React from 'react';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import {
  WifiOff,
  ServerCrash,
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  Database
} from 'lucide-react';

export interface NetworkErrorInfo {
  type: 'network' | 'server' | 'timeout' | 'validation' | 'database' | 'unknown';
  code?: string;
  message: string;
  details?: string;
  retryable: boolean;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface NetworkErrorHandlerProps {
  error: NetworkErrorInfo | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// 错误类型配置
const ERROR_CONFIGS = {
  network: {
    icon: WifiOff,
    title: '网络连接错误',
    description: '无法连接到服务器，请检查您的网络连接',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  server: {
    icon: ServerCrash,
    title: '服务器错误',
    description: '服务器暂时无法响应，请稍后重试',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  timeout: {
    icon: Clock,
    title: '请求超时',
    description: '服务器响应时间过长，请稍后重试',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  validation: {
    icon: AlertTriangle,
    title: '数据验证错误',
    description: '提交的数据格式不正确，请检查表单内容',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  database: {
    icon: Database,
    title: '数据库错误',
    description: '数据存储失败，但表单已正常处理',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  unknown: {
    icon: AlertTriangle,
    title: '未知错误',
    description: '发生了未知错误，请稍后重试',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
};

// 严重程度配置
const SEVERITY_CONFIGS = {
  low: { label: '低', color: 'bg-gray-100 text-gray-700' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  critical: { label: '严重', color: 'bg-red-100 text-red-700' }
};

export function NetworkErrorHandler({
  error,
  onRetry,
  onDismiss,
  className
}: NetworkErrorHandlerProps) {
  if (!error) return null;

  const config = ERROR_CONFIGS[error.type];
  const severityConfig = SEVERITY_CONFIGS[error.severity];
  const Icon = config.icon;

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className={className}>
      <Alert variant="destructive" className={`${config.bgColor} ${config.borderColor} border`}>
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertDescription className={`font-semibold ${config.color}`}>
                  {config.title}
                </AlertDescription>
                <Badge variant="outline" className={severityConfig.color}>
                  {severityConfig.label}
                </Badge>
                {error.retryable && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    可重试
                  </Badge>
                )}
              </div>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              )}
            </div>

            <AlertDescription className="text-sm">
              {error.message}
            </AlertDescription>

            {error.details && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                {error.details}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>错误时间: {formatTime(error.timestamp)}</span>
              {error.code && (
                <span>错误代码: {error.code}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {onRetry && error.retryable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>重试</span>
                </Button>
              )}

              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>您的数据安全，请放心重试</span>
              </div>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

// 错误分析器 - 用于分析原始错误并返回标准化的网络错误信息
export class NetworkErrorAnalyzer {
  static analyze(error: any): NetworkErrorInfo {
    const timestamp = new Date();

    // 处理 Fetch API 错误
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        type: 'network',
        message: '网络连接失败，请检查您的网络设置',
        details: error.message,
        retryable: true,
        timestamp,
        severity: 'medium'
      };
    }

    // 处理 HTTP 错误响应
    if (error?.status) {
      const status = error.status;

      if (status >= 500) {
        return {
          type: 'server',
          code: `HTTP_${status}`,
          message: '服务器内部错误，请稍后重试',
          details: error.statusText || error.message,
          retryable: true,
          timestamp,
          severity: 'high'
        };
      }

      if (status === 408 || status === 429) {
        return {
          type: 'timeout',
          code: `HTTP_${status}`,
          message: status === 408 ? '请求超时' : '请求过于频繁',
          details: error.statusText || error.message,
          retryable: true,
          timestamp,
          severity: 'medium'
        };
      }

      if (status >= 400) {
        return {
          type: 'validation',
          code: `HTTP_${status}`,
          message: '请求数据验证失败',
          details: error.statusText || error.message,
          retryable: false,
          timestamp,
          severity: 'medium'
        };
      }
    }

    // 处理超时错误
    if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: '请求超时，请稍后重试',
        details: error.message,
        retryable: true,
        timestamp,
        severity: 'medium'
      };
    }

    // 处理数据库错误（基于错误消息模式）
    if (error?.message?.includes('database') || error?.message?.includes('prisma')) {
      return {
        type: 'database',
        message: '数据库操作失败',
        details: error.message,
        retryable: true,
        timestamp,
        severity: 'high'
      };
    }

    // 处理通用错误
    const errorMessage = error?.message || error?.toString() || '未知错误';

    // 根据错误关键词判断类型
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: 'network',
        message: '网络连接问题',
        details: errorMessage,
        retryable: true,
        timestamp,
        severity: 'medium'
      };
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return {
        type: 'timeout',
        message: '操作超时',
        details: errorMessage,
        retryable: true,
        timestamp,
        severity: 'medium'
      };
    }

    if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
      return {
        type: 'validation',
        message: '数据验证失败',
        details: errorMessage,
        retryable: false,
        timestamp,
        severity: 'low'
      };
    }

    // 默认未知错误
    return {
      type: 'unknown',
      message: '发生了未知错误',
      details: errorMessage,
      retryable: true,
      timestamp,
      severity: 'medium'
    };
  }
}

// 重试策略配置
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: ['network', 'server', 'timeout', 'database']
};

// 重试工具函数
export class RetryHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    onError?: (error: NetworkErrorInfo, attempt: number) => void
  ): Promise<T> {
    let lastError: NetworkErrorInfo | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = NetworkErrorAnalyzer.analyze(error);

        if (onError) {
          onError(lastError, attempt);
        }

        // 检查是否可重试
        if (!lastError.retryable || !config.retryableErrors.includes(lastError.type)) {
          throw error;
        }

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === config.maxAttempts) {
          throw error;
        }

        // 计算延迟时间
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        // 等待延迟时间
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 这行理论上不会执行，但 TypeScript 需要它
    throw lastError || new Error('All retry attempts failed');
  }
}