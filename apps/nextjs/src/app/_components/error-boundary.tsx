"use client";

import React from "react";
import { Button } from "@fastbuild/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Something went wrong
        </h2>
        <p className="mb-4 text-sm text-red-600">
          {error?.message || "An unexpected error occurred"}
        </p>
        <Button
          onClick={retry}
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}

// Hook for error boundaries in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo);
    // In production, you'd send this to your error monitoring service
  };
}

// Specific error fallbacks for different components
export function PostListErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-lg border border-orange-200 bg-orange-50 p-8">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold text-orange-800">
          Failed to load posts
        </h2>
        <p className="mb-4 text-sm text-orange-600">
          {error?.message || "Unable to fetch posts at this time"}
        </p>
        <Button
          onClick={retry}
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-100"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}

export function CreatePostErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Post creation failed
        </h2>
        <p className="mb-4 text-sm text-red-600">
          {error?.message || "Unable to create post at this time"}
        </p>
        <Button
          onClick={retry}
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}