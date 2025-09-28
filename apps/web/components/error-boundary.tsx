'use client';

import * as React from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: React.ErrorInfo; resetError: () => void }>;
}

/**
 * React Error Boundary 组件
 * 捕获子组件树中的 JavaScript 错误，并显示友好的错误界面
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // 这里可以集成错误监控服务
    this.logErrorToService(error, errorInfo);
  }

  /**
   * 记录错误到监控服务
   */
  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // 发送到错误监控服务
    if (process.env.NODE_ENV === 'production') {
      // 这里可以集成 Sentry、LogRocket 等服务
      // Sentry.captureException(error);
      console.error('Error logged to monitoring service:', errorData);
    }
  };

  /**
   * 重置错误状态
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 刷新页面
   */
  refreshPage = () => {
    window.location.reload();
  };

  /**
   * 返回首页
   */
  goToHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义的 fallback 组件，则使用它
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo!}
            resetError={this.resetError}
          />
        );
      }

      // 默认的错误界面
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-900">Error Details:</p>
                  <p className="text-xs text-gray-700 font-mono mt-1">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button onClick={this.resetError} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.refreshPage} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                <Button variant="ghost" onClick={this.goToHome} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  If this problem persists, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 错误边界的高阶组件
 * 用于包装其他组件
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 错误边界 Hook
 * 用于在函数组件中处理错误
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    console.error('Error captured by hook:', error);
  }, []);

  React.useEffect(() => {
    if (error) {
      // 可以在这里添加错误上报逻辑
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    error,
    resetError,
    captureError,
  };
}

/**
 * 全局错误处理器
 * 处理未捕获的 Promise 拒绝和全局错误
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorBoundaryRef: React.RefObject<ErrorBoundary> | null = null;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  /**
   * 注册错误边界引用
   */
  registerErrorBoundary(ref: React.RefObject<ErrorBoundary>) {
    this.errorBoundaryRef = ref;
  }

  /**
   * 初始化全局错误处理
   */
  init() {
    // 处理未捕获的 JavaScript 错误
    window.addEventListener('error', (event) => {
      console.error('Global error handler:', event.error);
      this.handleGlobalError(event.error);
    });

    // 处理未捕获的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(error: any) {
    // 这里可以集成错误监控服务
    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error('Global error logged:', errorData);

    // 如果配置了错误监控服务，可以在这里发送错误
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error);
    }
  }
}

// 导出默认的错误边界
export default ErrorBoundary;