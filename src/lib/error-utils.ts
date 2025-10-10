import { AppError, ErrorCodes } from "~/components/error/error-handler";

// API错误处理工具
export class APIError extends AppError {
	public readonly statusCode: number;
	public readonly response?: any;

	constructor(
		message: string,
		statusCode = 500,
		code: string = ErrorCodes.API_ERROR,
		response?: any,
		context?: Record<string, any>,
	) {
		super(message, code, context);
		this.name = "APIError";
		this.statusCode = statusCode;
		this.response = response;
	}
}

// 创建API错误的便捷函数
export const createAPIError = {
	badRequest: (message: string, context?: Record<string, any>) =>
		new APIError(message, 400, ErrorCodes.VALIDATION_ERROR, undefined, context),

	unauthorized: (message = "未授权访问") =>
		new APIError(message, 401, ErrorCodes.UNAUTHORIZED),

	forbidden: (message = "权限不足") =>
		new APIError(message, 403, ErrorCodes.FORBIDDEN),

	notFound: (message = "资源不存在") =>
		new APIError(message, 404, ErrorCodes.NOT_FOUND),

	conflict: (message: string, context?: Record<string, any>) =>
		new APIError(message, 409, ErrorCodes.CONFLICT, undefined, context),

	internal: (message = "内部服务器错误", context?: Record<string, any>) =>
		new APIError(message, 500, ErrorCodes.INTERNAL_ERROR, undefined, context),

	network: (message = "网络连接失败") =>
		new APIError(message, 0, ErrorCodes.NETWORK_ERROR),

	timeout: (message = "请求超时") =>
		new APIError(message, 0, ErrorCodes.TIMEOUT_ERROR),
};

// HTTP状态码到错误代码的映射
const statusCodeToErrorCode: Record<number, string> = {
	400: ErrorCodes.VALIDATION_ERROR,
	401: ErrorCodes.UNAUTHORIZED,
	403: ErrorCodes.FORBIDDEN,
	404: ErrorCodes.NOT_FOUND,
	409: ErrorCodes.CONFLICT,
	422: ErrorCodes.VALIDATION_ERROR,
	429: ErrorCodes.TOO_MANY_REQUESTS,
	500: ErrorCodes.INTERNAL_ERROR,
	502: ErrorCodes.API_ERROR,
	503: ErrorCodes.API_ERROR,
	504: ErrorCodes.TIMEOUT_ERROR,
};

// 从HTTP响应创建错误
export function createErrorFromResponse(
	response: Response,
	responseData?: any,
): APIError {
	const statusCode = response.status;
	const errorCode = statusCodeToErrorCode[statusCode] || ErrorCodes.API_ERROR;

	let message =
		responseData?.error?.message || response.statusText || "请求失败";

	// 尝试从响应中提取更具体的错误信息
	if (
		responseData?.error?.details &&
		Array.isArray(responseData.error.details)
	) {
		const details = responseData.error.details;
		if (details.length > 0) {
			message = details[0].message || message;
		}
	}

	return new APIError(message, statusCode, errorCode, responseData, {
		url: response.url,
		status: statusCode,
		statusText: response.statusText,
	});
}

// 错误重试配置
export interface RetryConfig {
	maxAttempts: number;
	initialDelay: number;
	maxDelay: number;
	backoffFactor: number;
	retryCondition?: (error: Error) => boolean;
}

export const defaultRetryConfig: RetryConfig = {
	maxAttempts: 3,
	initialDelay: 1000,
	maxDelay: 10000,
	backoffFactor: 2,
	retryCondition: (error) => {
		// 只重试网络错误和5xx错误
		return (
			error instanceof APIError &&
			(error.code === ErrorCodes.NETWORK_ERROR ||
				error.code === ErrorCodes.TIMEOUT_ERROR ||
				error.statusCode >= 500)
		);
	},
};

// 带重试的fetch包装器
export async function fetchWithRetry(
	input: RequestInfo | URL,
	init?: RequestInit,
	config: Partial<RetryConfig> = {},
): Promise<Response> {
	const finalConfig = { ...defaultRetryConfig, ...config };
	let lastError: Error;

	for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
		try {
			const response = await fetch(input, init);

			// 如果响应成功，直接返回
			if (response.ok) {
				return response;
			}

			// 如果响应失败，尝试创建错误
			let responseData;
			try {
				responseData = await response.clone().json();
			} catch {
				// 如果无法解析JSON，忽略
			}

			const error = createErrorFromResponse(response, responseData);

			// 检查是否应该重试
			if (
				attempt < finalConfig.maxAttempts &&
				finalConfig.retryCondition?.(error)
			) {
				const delay = Math.min(
					finalConfig.initialDelay * finalConfig.backoffFactor ** (attempt - 1),
					finalConfig.maxDelay,
				);

				console.warn(
					`Request failed (attempt ${attempt}/${finalConfig.maxAttempts}), retrying in ${delay}ms:`,
					error.message,
				);

				await new Promise((resolve) => setTimeout(resolve, delay));
				lastError = error;
				continue;
			}

			// 不重试或已达到最大重试次数，抛出错误
			throw error;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Unknown error");

			// 如果是网络错误且可以重试
			if (
				attempt < finalConfig.maxAttempts &&
				lastError instanceof APIError &&
				finalConfig.retryCondition?.(lastError)
			) {
				const delay = Math.min(
					finalConfig.initialDelay * finalConfig.backoffFactor ** (attempt - 1),
					finalConfig.maxDelay,
				);

				console.warn(
					`Network error (attempt ${attempt}/${finalConfig.maxAttempts}), retrying in ${delay}ms:`,
					lastError.message,
				);

				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}

			// 不重试或已达到最大重试次数，抛出错误
			throw lastError;
		}
	}

	throw lastError!;
}

// 请求取消工具
export class RequestCancelled extends AppError {
	constructor(message = "请求已取消") {
		super(message, ErrorCodes.REQUEST_CANCELLED);
		this.name = "RequestCancelled";
	}
}

// 创建可取消的请求
export function makeCancellableRequest(
	input: RequestInfo | URL,
	init?: RequestInit & { signal?: AbortSignal },
): { response: Promise<Response>; cancel: () => void } {
	const controller = new AbortController();
	const signal = controller.signal;

	// 如果外部提供了signal，也要监听它
	if (init?.signal) {
		init.signal.addEventListener("abort", () => {
			controller.abort();
		});
	}

	const responsePromise = fetch(input, {
		...init,
		signal,
	}).catch((error) => {
		if (signal.aborted) {
			throw new RequestCancelled();
		}
		throw error;
	});

	return {
		response: responsePromise,
		cancel: () => controller.abort(),
	};
}

// 错误分类工具
export function categorizeError(error: Error): {
	category: "network" | "auth" | "validation" | "business" | "system";
	severity: "low" | "medium" | "high" | "critical";
	userFriendly: boolean;
	retryable: boolean;
} {
	if (error instanceof APIError) {
		switch (error.code) {
			case ErrorCodes.NETWORK_ERROR:
			case ErrorCodes.TIMEOUT_ERROR:
				return {
					category: "network",
					severity: "medium",
					userFriendly: true,
					retryable: true,
				};

			case ErrorCodes.UNAUTHORIZED:
			case ErrorCodes.FORBIDDEN:
			case ErrorCodes.TOKEN_EXPIRED:
				return {
					category: "auth",
					severity: "high",
					userFriendly: true,
					retryable: false,
				};

			case ErrorCodes.VALIDATION_ERROR:
			case ErrorCodes.INVALID_INPUT:
				return {
					category: "validation",
					severity: "low",
					userFriendly: true,
					retryable: false,
				};

			case ErrorCodes.NOT_FOUND:
			case ErrorCodes.ALREADY_EXISTS:
			case ErrorCodes.CONFLICT:
				return {
					category: "business",
					severity: "medium",
					userFriendly: true,
					retryable: false,
				};

			case ErrorCodes.DATABASE_ERROR:
			case ErrorCodes.INTERNAL_ERROR:
				return {
					category: "system",
					severity: "critical",
					userFriendly: false,
					retryable: true,
				};

			default:
				return {
					category: "system",
					severity: "medium",
					userFriendly: true,
					retryable: error.statusCode >= 500,
				};
		}
	}

	// 非API错误的默认分类
	return {
		category: "system",
		severity: "medium",
		userFriendly: false,
		retryable: false,
	};
}
