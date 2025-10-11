/**
 * 简单直接的API响应格式
 * 不要浪费带宽在无用的元数据上
 */

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
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
): ApiResponse {
	return {
		success: false,
		error: {
			code,
			message,
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
