"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{
		error?: Error;
		errorInfo?: React.ErrorInfo;
		reset: () => void;
	}>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
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
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		this.setState({
			error,
			errorInfo,
		});

		// 调用自定义错误处理函数
		this.props.onError?.(error, errorInfo);

		// 在生产环境中上报错误
		if (
			typeof window !== "undefined" &&
			process.env.NODE_ENV === "production"
		) {
			this.reportError(error, errorInfo);
		}
	}

	private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
		try {
			// 这里可以集成错误上报服务，如 Sentry
			fetch("/api/sys/errors", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: error.message,
					stack: error.stack,
					componentStack: errorInfo.componentStack,
					timestamp: new Date().toISOString(),
					url: window.location.href,
					userAgent: navigator.userAgent,
				}),
			}).catch((reportError) => {
				console.error("Failed to report error:", reportError);
			});
		} catch (e) {
			console.error("Error reporting failed:", e);
		}
	};

	private handleReset = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	render() {
		if (this.state.hasError) {
			// 如果提供了自定义fallback，使用它
			if (this.props.fallback) {
				const FallbackComponent = this.props.fallback;
				return (
					<FallbackComponent
						error={this.state.error}
						errorInfo={this.state.errorInfo}
						reset={this.handleReset}
					/>
				);
			}

			// 默认错误UI
			return (
				<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
								<AlertTriangle className="h-6 w-6 text-red-600" />
							</div>
							<CardTitle className="text-red-800">应用程序错误</CardTitle>
							<CardDescription>很抱歉，应用程序遇到了意外错误</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{process.env.NODE_ENV === "development" && this.state.error && (
								<details className="rounded bg-gray-100 p-3 text-sm">
									<summary className="cursor-pointer font-medium">
										错误详情
									</summary>
									<pre className="mt-2 overflow-auto text-red-600 text-xs">
										{this.state.error.toString()}
										{this.state.errorInfo?.componentStack}
									</pre>
								</details>
							)}

							<div className="flex flex-col gap-2 sm:flex-row">
								<Button onClick={this.handleReset} className="flex-1">
									<RefreshCw className="mr-2 h-4 w-4" />
									重试
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										window.location.href = "/";
									}}
									className="flex-1"
								>
									<Home className="mr-2 h-4 w-4" />
									返回首页
								</Button>
							</div>

							<div className="text-center text-gray-500 text-xs">
								错误ID: {Date.now().toString(36)}
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

// 特定组件的错误边界
export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={({ error, reset }) => (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="p-4">
						<div className="flex items-center space-x-2 text-red-800">
							<AlertTriangle className="h-4 w-4" />
							<span className="font-medium text-sm">表单加载失败</span>
						</div>
						<p className="mt-1 text-red-600 text-xs">
							{error?.message || "表单组件遇到错误"}
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={reset}
							className="mt-2"
						>
							重试
						</Button>
					</CardContent>
				</Card>
			)}
		>
			{children}
		</ErrorBoundary>
	);
}

export function APIErrorBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={({ error, reset }) => (
				<Card className="border-yellow-200 bg-yellow-50">
					<CardContent className="p-4">
						<div className="flex items-center space-x-2 text-yellow-800">
							<AlertTriangle className="h-4 w-4" />
							<span className="font-medium text-sm">数据加载失败</span>
						</div>
						<p className="mt-1 text-xs text-yellow-600">
							{error?.message || "API调用遇到错误"}
						</p>
						<Button
							size="sm"
							variant="outline"
							onClick={reset}
							className="mt-2"
						>
							重新加载
						</Button>
					</CardContent>
				</Card>
			)}
		>
			{children}
		</ErrorBoundary>
	);
}

export default ErrorBoundary;
