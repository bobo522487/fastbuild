/**
 * 统一API响应格式定义
 * 遵循RESTful API设计规范，提供标准化的成功和错误响应结构
 */

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: unknown[];
	};
	meta: {
		timestamp: string;
		requestId: string;
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
export function createSuccessResponse<T>(
	data: T,
	statusCode = 200,
	requestId?: string,
): {
	data: ApiResponse<T>;
	status: number;
} {
	return {
		data: {
			success: true,
			data,
			meta: {
				timestamp: new Date().toISOString(),
				requestId: requestId || crypto.randomUUID(),
			},
		},
		status: statusCode,
	};
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
	code: string,
	message: string,
	statusCode = 400,
	details?: unknown[],
	requestId?: string,
): {
	data: ApiResponse;
	status: number;
} {
	return {
		data: {
			success: false,
			error: {
				code,
				message,
				details,
			},
			meta: {
				timestamp: new Date().toISOString(),
				requestId: requestId || crypto.randomUUID(),
			},
		},
		status: statusCode,
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
	requestId?: string,
): {
	data: PaginatedResponse<T>;
	status: number;
} {
	return {
		data: {
			success: true,
			data,
			pagination,
			meta: {
				timestamp: new Date().toISOString(),
				requestId: requestId || crypto.randomUUID(),
			},
		},
		status: 200,
	};
}

/**
 * 常用错误代码定义
 */
export const API_ERROR_CODES = {
	// 认证相关
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",

	// 验证相关
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INVALID_INPUT: "INVALID_INPUT",

	// 资源相关
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",

	// 系统相关
	INTERNAL_ERROR: "INTERNAL_ERROR",
	DATABASE_ERROR: "DATABASE_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",

	// 业务相关
	INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
	RESOURCE_LIMIT_EXCEEDED: "RESOURCE_LIMIT_EXCEEDED",
} as const;

export type ApiErrorCode =
	(typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
