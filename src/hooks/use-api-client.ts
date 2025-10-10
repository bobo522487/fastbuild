"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppError, ErrorHandler } from "~/components/error/error-handler";
import {
	APIError,
	defaultRetryConfig,
	fetchWithRetry,
	makeCancellableRequest,
} from "~/lib/error-utils";

// API请求配置
export interface APIRequestConfig {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: any;
	retry?: boolean | Partial<typeof defaultRetryConfig>;
	timeout?: number;
	cache?: RequestCache;
	signal?: AbortSignal;
}

// API状态
export interface APIState<T = any> {
	data: T | null;
	loading: boolean;
	error: AppError | null;
	lastUpdated: Date | null;
}

// API请求Hook返回值
export interface UseAPIReturn<T = any> extends APIState<T> {
	execute: (config?: APIRequestConfig) => Promise<T>;
	reset: () => void;
	cancel: () => void;
	refetch: () => Promise<T>;
	isRetrying: boolean;
	retryCount: number;
	retry: () => Promise<void>;
}

// 创建API请求的函数
export function createAPIClient(baseURL = "/api") {
	// 通用请求函数
	const request = async <T = any>(
		endpoint: string,
		config: APIRequestConfig = {},
	): Promise<T> => {
		const {
			method = "GET",
			headers = {},
			body,
			retry = false,
			timeout = 30000,
			cache = "no-store",
			signal,
		} = config;

		const url = endpoint.startsWith("http")
			? endpoint
			: `${baseURL}${endpoint}`;
		const requestHeaders: Record<string, string> = {
			"Content-Type": "application/json",
			...headers,
		};

		// 添加认证token（如果存在）
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("auth_token");
			if (token) {
				requestHeaders.Authorization = `Bearer ${token}`;
			}
		}

		const requestInit: RequestInit = {
			method,
			headers: requestHeaders,
			cache,
			signal,
		};

		if (body && method !== "GET") {
			requestInit.body = JSON.stringify(body);
		}

		try {
			// 设置超时
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			// 如果外部提供了signal，也要监听它
			if (signal) {
				signal.addEventListener("abort", () => {
					controller.abort();
				});
			}

			let response: Response;

			if (retry) {
				// 使用重试机制
				const retryConfig =
					typeof retry === "boolean"
						? defaultRetryConfig
						: { ...defaultRetryConfig, ...retry };
				response = await fetchWithRetry(
					url,
					{ ...requestInit, signal: controller.signal },
					retryConfig,
				);
			} else {
				// 普通请求
				response = await fetch(url, {
					...requestInit,
					signal: controller.signal,
				});
			}

			clearTimeout(timeoutId);

			// 检查响应状态
			if (!response.ok) {
				let responseData;
				try {
					responseData = await response.json();
				} catch {
					// 如果无法解析JSON，使用默认错误信息
				}

				throw new APIError(
					responseData?.error?.message || response.statusText || "请求失败",
					response.status,
					responseData?.error?.code || "API_ERROR",
					responseData,
					{ url, method },
				);
			}

			// 解析响应数据
			const responseData = await response.json();

			// 检查统一的响应格式
			if (
				responseData &&
				typeof responseData === "object" &&
				"success" in responseData
			) {
				if (!responseData.success) {
					throw new APIError(
						responseData.error?.message || "请求失败",
						response.status,
						responseData.error?.code || "API_ERROR",
						responseData,
					);
				}

				return responseData.data;
			}

			return responseData;
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}

			// 处理网络错误、超时等
			if (error instanceof Error) {
				if (error.name === "AbortError") {
					throw new APIError("请求已取消", 0, "REQUEST_CANCELLED");
				}

				if (error.message.includes("Failed to fetch")) {
					throw new APIError("网络连接失败", 0, "NETWORK_ERROR", undefined, {
						originalError: error,
					});
				}

				if (error.message.includes("timeout")) {
					throw new APIError("请求超时", 0, "TIMEOUT_ERROR", undefined, {
						originalError: error,
					});
				}
			}

			throw new APIError(
				error instanceof Error ? error.message : "未知错误",
				0,
				"UNKNOWN_ERROR",
			);
		}
	};

	return request;
}

// 默认API客户端
export const apiClient = createAPIClient();

// 主要的API Hook
export function useAPI<T = any>(
	endpoint: string,
	config: APIRequestConfig & {
		immediate?: boolean;
		onSuccess?: (data: T) => void;
		onError?: (error: AppError) => void;
		refetchInterval?: number;
	} = {},
): UseAPIReturn<T> {
	const {
		immediate = false,
		onSuccess,
		onError,
		refetchInterval,
		...requestConfig
	} = config;

	const [state, setState] = useState<APIState<T>>({
		data: null,
		loading: false,
		error: null,
		lastUpdated: null,
	});

	const [retryCount, setRetryCount] = useState(0);
	const [isRetrying, setIsRetrying] = useState(false);

	const abortControllerRef = useRef<AbortController | null>(null);
	const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// 执行请求的函数
	const execute = useCallback(
		async (overrideConfig?: APIRequestConfig): Promise<T> => {
			// 取消之前的请求
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();

			try {
				setState((prev) => ({ ...prev, loading: true, error: null }));

				const data = await apiClient<T>(endpoint, {
					...requestConfig,
					...overrideConfig,
					signal: abortControllerRef.current?.signal,
				});

				setState({
					data,
					loading: false,
					error: null,
					lastUpdated: new Date(),
				});

				setRetryCount(0);
				setIsRetrying(false);

				onSuccess?.(data);
				return data;
			} catch (error) {
				const appError =
					error instanceof AppError
						? error
						: ErrorHandler.handle(error as Error | string);

				setState((prev) => ({
					...prev,
					loading: false,
					error: appError,
				}));

				onError?.(appError);
				throw appError;
			}
		},
		[endpoint, requestConfig, onSuccess, onError],
	);

	// 重试函数
	const retry = useCallback(async () => {
		setIsRetrying(true);
		setRetryCount((prev) => prev + 1);

		try {
			await execute({
				...requestConfig,
				retry: {
					maxAttempts: 1,
					initialDelay: 1000,
					maxDelay: 5000,
					backoffFactor: 2,
				},
			});
		} finally {
			setIsRetrying(false);
		}
	}, [execute, requestConfig]);

	// 重置状态
	const reset = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		setState({
			data: null,
			loading: false,
			error: null,
			lastUpdated: null,
		});

		setRetryCount(0);
		setIsRetrying(false);
	}, []);

	// 取消请求
	const cancel = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		setIsRetrying(false);
	}, []);

	// 重新获取数据
	const refetch = useCallback(() => {
		return execute();
	}, [execute]);

	// 立即执行请求
	useEffect(() => {
		if (immediate) {
			execute();
		}

		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [immediate, execute]);

	// 设置定时刷新
	useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			refetchIntervalRef.current = setInterval(refetch, refetchInterval);

			return () => {
				if (refetchIntervalRef.current) {
					clearInterval(refetchIntervalRef.current);
				}
			};
		}
	}, [refetchInterval, refetch]);

	// 清理函数
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			if (refetchIntervalRef.current) {
				clearInterval(refetchIntervalRef.current);
			}
		};
	}, []);

	return {
		...state,
		execute,
		reset,
		cancel,
		refetch,
		isRetrying,
		retryCount,
		retry,
	};
}

// 便捷的Hook用于GET请求
export function useGET<T = any>(
	endpoint: string,
	config?: Omit<APIRequestConfig, "method"> & {
		immediate?: boolean;
		onSuccess?: (data: T) => void;
		onError?: (error: AppError) => void;
		refetchInterval?: number;
	},
) {
	return useAPI<T>(endpoint, { ...config, method: "GET" });
}

// 便捷的Hook用于POST请求
export function usePOST<T = any>(
	endpoint: string,
	config?: Omit<APIRequestConfig, "method"> & {
		immediate?: boolean;
		onSuccess?: (data: T) => void;
		onError?: (error: AppError) => void;
	},
) {
	return useAPI<T>(endpoint, { ...config, method: "POST" });
}

// 便捷的Hook用于PUT请求
export function usePUT<T = any>(
	endpoint: string,
	config?: Omit<APIRequestConfig, "method"> & {
		immediate?: boolean;
		onSuccess?: (data: T) => void;
		onError?: (error: AppError) => void;
	},
) {
	return useAPI<T>(endpoint, { ...config, method: "PUT" });
}

// 便捷的Hook用于DELETE请求
export function useDELETE<T = any>(
	endpoint: string,
	config?: Omit<APIRequestConfig, "method"> & {
		immediate?: boolean;
		onSuccess?: (data: T) => void;
		onError?: (error: AppError) => void;
	},
) {
	return useAPI<T>(endpoint, { ...config, method: "DELETE" });
}

// useAPIClient别名，用于向后兼容
export const useAPIClient = useAPI;
