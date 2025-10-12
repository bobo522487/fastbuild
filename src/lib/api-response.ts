/**
 * 简单直接的API响应格式
 * 不要浪费带宽在无用的元数据上
 */

// API 错误代码常量
export const API_ERROR_CODES = {
	// 认证错误
	UNAUTHORIZED: "UNAUTHORIZED",
	INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
	ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",

	// 权限错误
	FORBIDDEN: "FORBIDDEN",
	INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",

	// 请求错误
	BAD_REQUEST: "BAD_REQUEST",
	INVALID_REQUEST: "INVALID_REQUEST",
	VALIDATION_ERROR: "VALIDATION_ERROR",

	// 资源错误
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",

	// 服务器错误
	INTERNAL_ERROR: "INTERNAL_ERROR",
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

	// 限制错误
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
	TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
} as const;

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: string[];
	};
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
	return {
		success: true,
		data,
	};
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
	code: string,
	message: string,
	statusCode?: number,
	details?: string[],
): ApiResponse {
	return {
		success: false,
		error: {
			code,
			message,
			details,
		},
	};
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
	data: T[],
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	},
): PaginatedResponse<T> {
	return {
		success: true,
		data,
		pagination,
	};
}
