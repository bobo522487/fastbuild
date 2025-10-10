"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";

export interface ErrorHandlerOptions {
	showToast?: boolean;
	logToConsole?: boolean;
	reportToService?: boolean;
	fallbackMessage?: string;
}

export interface ErrorContext {
	error: Error;
	context?: Record<string, unknown>;
	timestamp: Date;
	url?: string;
	userId?: string;
}

export class AppError extends Error {
	public readonly code: string;
	public readonly context?: Record<string, unknown>;
	public readonly timestamp: Date;
	public readonly userId?: string;

	constructor(
		message: string,
		code = "UNKNOWN_ERROR",
		context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.context = context;
		this.timestamp = new Date();
	}
}

// 错误类型常量
export const ErrorCodes = {
	// 网络错误
	NETWORK_ERROR: "NETWORK_ERROR",
	API_ERROR: "API_ERROR",
	TIMEOUT_ERROR: "TIMEOUT_ERROR",

	// 认证错误
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",

	// 验证错误
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INVALID_INPUT: "INVALID_INPUT",

	// 业务逻辑错误
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",
	CONFLICT: "CONFLICT",

	// 限流错误
	TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

	// 请求错误
	REQUEST_CANCELLED: "REQUEST_CANCELLED",

	// 系统错误
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
	INTERNAL_ERROR: "INTERNAL_ERROR",
	DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// 错误处理工具函数
export class ErrorHandler {
	private static instance: ErrorHandler;
	private errorQueue: ErrorContext[] = [];
	private isReporting = false;

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * 处理错误
	 */
	static handle(
		error: Error | AppError | string,
		options: ErrorHandlerOptions = {},
	): AppError {
		const {
			showToast = true,
			logToConsole = true,
			reportToService = true,
			fallbackMessage = "操作失败，请重试",
		} = options;

		// 标准化错误对象
		const appError = ErrorHandler.normalizeError(error);

		// 记录到控制台
		if (logToConsole) {
			ErrorHandler.logError(appError);
		}

		// 显示toast
		if (showToast) {
			ErrorHandler.showErrorToast(appError, fallbackMessage);
		}

		// 上报错误
		if (reportToService && typeof window !== "undefined") {
			ErrorHandler.reportError(appError);
		}

		return appError;
	}

	/**
	 * 标准化错误对象
	 */
	private static normalizeError(error: Error | AppError | string): AppError {
		if (error instanceof AppError) {
			return error;
		}

		if (error instanceof Error) {
			// 根据错误消息判断错误类型
			const code = ErrorHandler.detectErrorCode(error);
			return new AppError(error.message, code, { stack: error.stack });
		}

		if (typeof error === "string") {
			return new AppError(error, ErrorCodes.UNKNOWN_ERROR);
		}

		return new AppError("未知错误", ErrorCodes.UNKNOWN_ERROR);
	}

	/**
	 * 检测错误代码
	 */
	private static detectErrorCode(error: Error): ErrorCode {
		const message = error.message.toLowerCase();
		const stack = error.stack?.toLowerCase() || "";

		// 网络错误
		if (message.includes("network") || message.includes("fetch")) {
			return ErrorCodes.NETWORK_ERROR;
		}

		// API错误
		if (message.includes("api") || message.includes("http")) {
			return ErrorCodes.API_ERROR;
		}

		// 认证错误
		if (message.includes("unauthorized") || message.includes("401")) {
			return ErrorCodes.UNAUTHORIZED;
		}

		if (message.includes("forbidden") || message.includes("403")) {
			return ErrorCodes.FORBIDDEN;
		}

		if (message.includes("token") && message.includes("expired")) {
			return ErrorCodes.TOKEN_EXPIRED;
		}

		// 验证错误
		if (message.includes("validation") || message.includes("invalid")) {
			return ErrorCodes.VALIDATION_ERROR;
		}

		// 业务逻辑错误
		if (message.includes("not found") || message.includes("404")) {
			return ErrorCodes.NOT_FOUND;
		}

		if (message.includes("already exists") || message.includes("409")) {
			return ErrorCodes.ALREADY_EXISTS;
		}

		return ErrorCodes.UNKNOWN_ERROR;
	}

	/**
	 * 记录错误到控制台
	 */
	private static logError(error: AppError): void {
		console.group(`🔥 [${error.code}] ${error.message}`);
		console.error("Error:", error);
		console.error("Timestamp:", error.timestamp);
		if (error.context) {
			console.error("Context:", error.context);
		}
		console.groupEnd();
	}

	/**
	 * 显示错误toast
	 */
	private static showErrorToast(
		error: AppError,
		fallbackMessage: string,
	): void {
		const messages = {
			[ErrorCodes.NETWORK_ERROR]: "网络连接失败，请检查网络设置",
			[ErrorCodes.API_ERROR]: "服务暂时不可用，请稍后重试",
			[ErrorCodes.TIMEOUT_ERROR]: "请求超时，请重试",
			[ErrorCodes.UNAUTHORIZED]: "请先登录",
			[ErrorCodes.FORBIDDEN]: "没有权限执行此操作",
			[ErrorCodes.TOKEN_EXPIRED]: "登录已过期，请重新登录",
			[ErrorCodes.VALIDATION_ERROR]: "输入数据有误，请检查",
			[ErrorCodes.INVALID_INPUT]: "输入格式不正确",
			[ErrorCodes.NOT_FOUND]: "请求的资源不存在",
			[ErrorCodes.ALREADY_EXISTS]: "资源已存在",
			[ErrorCodes.CONFLICT]: "操作冲突，请重试",
			[ErrorCodes.TOO_MANY_REQUESTS]: "请求过于频繁，请稍后重试",
			[ErrorCodes.REQUEST_CANCELLED]: "请求已取消",
			[ErrorCodes.DATABASE_ERROR]: "数据操作失败，请重试",
			[ErrorCodes.UNKNOWN_ERROR]: "未知错误，请稍后重试",
			[ErrorCodes.INTERNAL_ERROR]: "系统错误，请稍后重试",
		};

		const message =
			messages[error.code as ErrorCode] || error.message || fallbackMessage;

		if (
			error.code === ErrorCodes.UNAUTHORIZED ||
			error.code === ErrorCodes.TOKEN_EXPIRED
		) {
			toast.error(message, {
				action: {
					label: "去登录",
					onClick: () => {
						window.location.href = "/auth/signin";
					},
				},
			});
		} else {
			toast.error(message);
		}
	}

	/**
	 * 上报错误到服务
	 */
	private static reportError(error: AppError): void {
		const instance = ErrorHandler.getInstance();

		const errorContext: ErrorContext = {
			error,
			context: error.context,
			timestamp: error.timestamp,
			url: window.location.href,
			userId: error.userId,
		};

		// 添加到队列
		instance.errorQueue.push(errorContext);

		// 异步上报
		instance.flushErrorQueue();
	}

	/**
	 * 刷新错误队列
	 */
	private async flushErrorQueue(): Promise<void> {
		if (this.isReporting || this.errorQueue.length === 0) {
			return;
		}

		this.isReporting = true;

		try {
			const errors = [...this.errorQueue];
			this.errorQueue = [];

			await fetch("/api/errors", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					errors,
					userAgent: navigator.userAgent,
					timestamp: new Date().toISOString(),
				}),
			});
		} catch (e) {
			console.error("Failed to report errors:", e);
			// 重新加入队列
			this.errorQueue.unshift(...this.errorQueue);
		} finally {
			this.isReporting = false;
		}
	}
}

// 错误处理Hook
export function useErrorHandler() {
	const [error, setError] = useState<AppError | null>(null);

	const handleError = React.useCallback(
		(err: Error | AppError | string, options?: ErrorHandlerOptions) => {
			const appError = ErrorHandler.handle(err, options);
			setError(appError);
			return appError;
		},
		[],
	);

	const clearError = React.useCallback(() => {
		setError(null);
	}, []);

	return {
		error,
		handleError,
		clearError,
	};
}

// 全局错误处理组件
export function GlobalErrorHandler({
	children,
}: { children: React.ReactNode }) {
	useEffect(() => {
		// 处理未捕获的Promise拒绝
		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			ErrorHandler.handle(event.reason, {
				showToast: true,
				logToConsole: true,
				reportToService: true,
			});
		};

		// 处理未捕获的错误
		const handleError = (event: ErrorEvent) => {
			ErrorHandler.handle(event.error || new Error(event.message), {
				showToast: true,
				logToConsole: true,
				reportToService: true,
			});
		};

		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		window.addEventListener("error", handleError);

		return () => {
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
			window.removeEventListener("error", handleError);
		};
	}, []);

	return <>{children}</>;
}

// HOC用于包装组件 (注释掉，因为ErrorBoundary组件未定义)
// export function withErrorBoundary<P extends object>(
// 	Component: React.ComponentType<P>,
// 	errorBoundaryProps?: ConstructorParameters<typeof ErrorBoundary>[0],
// ) {
// 	const WrappedComponent = (props: P) => (
// 		<ErrorBoundary {...errorBoundaryProps}>
// 			<Component {...props} />
// 		</ErrorBoundary>
// 	);
//
// 	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
//
// 	return WrappedComponent;
// }
