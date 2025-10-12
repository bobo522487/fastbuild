"use client";

import { AlertTriangle, Bug, RefreshCw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useErrorHandler } from "./error-handler";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
	retryCount: number;
}

export class APIErrorBoundary extends Component<Props, State> {
	private maxRetries = 3;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			retryCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("API Error Boundary caught an error:", error, errorInfo);

		this.setState({
			error,
			errorInfo,
		});

		// 调用自定义错误处理
		this.props.onError?.(error, errorInfo);

		// 上报错误
		this.reportError(error, errorInfo);
	}

	private reportError = async (error: Error, errorInfo: ErrorInfo) => {
		try {
			const errorData = {
				message: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
				timestamp: new Date().toISOString(),
				url: window.location.href,
				userAgent: navigator.userAgent,
				errorBoundary: "APIErrorBoundary",
			};

			await fetch("/api/sys/errors", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(errorData),
			});
		} catch (e) {
			console.error("Failed to report API error:", e);
		}
	};

	private handleRetry = () => {
		if (this.state.retryCount < this.maxRetries) {
			this.setState((prevState) => ({
				hasError: false,
				error: undefined,
				errorInfo: undefined,
				retryCount: prevState.retryCount + 1,
			}));
		}
	};

	private handleReset = () => {
		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
			retryCount: 0,
		});
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<APIErrorFallback
					error={this.state.error}
					onRetry={this.handleRetry}
					onReset={this.handleReset}
					retryCount={this.state.retryCount}
					maxRetries={this.maxRetries}
				/>
			);
		}

		return this.props.children;
	}
}

interface APIErrorFallbackProps {
	error?: Error;
	onRetry: () => void;
	onReset: () => void;
	retryCount: number;
	maxRetries: number;
}

function APIErrorFallback({
	error,
	onRetry,
	onReset,
	retryCount,
	maxRetries,
}: APIErrorFallbackProps) {
	const { handleError } = useErrorHandler();

	const handleReport = () => {
		if (error) {
			handleError(error, {
				showToast: true,
				reportToService: true,
			});
		}
	};

	const canRetry = retryCount < maxRetries;

	return (
		<Card className="mx-auto w-full max-w-md border-yellow-200 bg-yellow-50">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
					<AlertTriangle className="h-6 w-6 text-yellow-600" />
				</div>
				<CardTitle className="text-yellow-800">数据加载失败</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-center text-sm text-yellow-700">
					无法加载数据，请稍后重试
				</p>

				{process.env.NODE_ENV === "development" && error && (
					<details className="rounded bg-yellow-100 p-3 text-xs">
						<summary className="cursor-pointer font-medium">错误详情</summary>
						<pre className="mt-2 overflow-auto whitespace-pre-wrap text-red-600 text-xs">
							{error.toString()}
						</pre>
					</details>
				)}

				<div className="flex flex-col gap-2">
					{canRetry ? (
						<Button onClick={onRetry} className="w-full" variant="default">
							<RefreshCw className="mr-2 h-4 w-4" />
							重试 ({retryCount + 1}/{maxRetries})
						</Button>
					) : (
						<div className="rounded bg-gray-100 p-2 text-center text-gray-500 text-sm">
							已达到最大重试次数 ({maxRetries})
						</div>
					)}

					<Button onClick={onReset} variant="outline" className="w-full">
						重置
					</Button>

					{process.env.NODE_ENV === "development" && (
						<Button
							onClick={handleReport}
							variant="outline"
							size="sm"
							className="w-full"
						>
							<Bug className="mr-2 h-4 w-4" />
							上报错误
						</Button>
					)}
				</div>

				<div className="text-center text-gray-500 text-xs">
					错误ID: {Date.now().toString(36)}
				</div>
			</CardContent>
		</Card>
	);
}

// Hook用于包装API调用
export function useAPICall<T, Args extends unknown[]>(
	apiCall: (...args: Args) => Promise<T>,
) {
	const [data, setData] = React.useState<T | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<Error | null>(null);
	const { handleError } = useErrorHandler();

	const execute = React.useCallback(
		async (...args: Args) => {
			try {
				setLoading(true);
				setError(null);
				const result = await apiCall(...args);
				setData(result);
				return result;
			} catch (err) {
				const error = err instanceof Error ? err : new Error("API call failed");
				setError(error);
				handleError(error, {
					showToast: true,
					fallbackMessage: "API调用失败，请重试",
				});
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[apiCall, handleError],
	);

	const reset = React.useCallback(() => {
		setData(null);
		setError(null);
		setLoading(false);
	}, []);

	return {
		data,
		loading,
		error,
		execute,
		reset,
	};
}

// 高阶组件用于包装需要API错误处理的组件
export function withAPIErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
) {
	return function WrappedComponent(props: P) {
		return (
			<APIErrorBoundary>
				<Component {...props} />
			</APIErrorBoundary>
		);
	};
}
