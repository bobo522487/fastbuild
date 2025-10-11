import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ErrorCodes } from "~/components/error/error-handler";
import {
	APIError,
	RequestCancelled,
	categorizeError,
	createAPIError,
	createErrorFromResponse,
	defaultRetryConfig,
	fetchWithRetry,
	makeCancellableRequest,
} from "~/lib/error-utils";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("error-utils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("APIError", () => {
		it("应该创建基本的API错误", () => {
			const error = new APIError("Test error", 404, "NOT_FOUND", {
				detail: "test",
			});

			expect(error).toBeInstanceOf(AppError);
			expect(error).toBeInstanceOf(APIError);
			expect(error.message).toBe("Test error");
			expect(error.statusCode).toBe(404);
			expect(error.code).toBe("NOT_FOUND");
			expect(error.response).toEqual({ detail: "test" });
			expect(error.name).toBe("APIError");
		});

		it("应该使用默认状态码和错误代码", () => {
			const error = new APIError("Test error");

			expect(error.statusCode).toBe(500);
			expect(error.code).toBe("API_ERROR");
		});
	});

	describe("createAPIError", () => {
		it("应该创建不同类型的API错误", () => {
			const badRequest = createAPIError.badRequest("Invalid input");
			expect(badRequest.statusCode).toBe(400);
			expect(badRequest.code).toBe("VALIDATION_ERROR");

			const unauthorized = createAPIError.unauthorized();
			expect(unauthorized.statusCode).toBe(401);
			expect(unauthorized.code).toBe("UNAUTHORIZED");
			expect(unauthorized.message).toBe("未授权访问");

			const notFound = createAPIError.notFound("Project not found");
			expect(notFound.statusCode).toBe(404);
			expect(notFound.code).toBe("NOT_FOUND");

			const internal = createAPIError.internal("Server error", {
				userId: "123",
			});
			expect(internal.statusCode).toBe(500);
			expect(internal.code).toBe("INTERNAL_ERROR");
			expect(internal.context).toEqual({ userId: "123" });
		});
	});

	describe("createErrorFromResponse", () => {
		it("应该从HTTP响应创建错误", () => {
			const mockResponse = {
				ok: false,
				status: 404,
				statusText: "Not Found",
				url: "https://api.example.com/test",
			} as Response;

			const error = createErrorFromResponse(mockResponse);

			expect(error).toBeInstanceOf(APIError);
			expect(error.statusCode).toBe(404);
			expect(error.code).toBe("NOT_FOUND");
			expect(error.message).toBe("Not Found");
			expect(error.context).toEqual({
				url: "https://api.example.com/test",
				status: 404,
				statusText: "Not Found",
			});
		});

		it("应该从响应体中提取错误信息", () => {
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: "Bad Request",
				url: "https://api.example.com/test",
			} as Response;

			const responseData = {
				error: {
					message: "Validation failed",
					code: "VALIDATION_ERROR",
					details: [
						{ path: ["name"], message: "Name is required" },
						{ path: ["email"], message: "Email is invalid" },
					],
				},
			};

			const error = createErrorFromResponse(mockResponse, responseData);

			expect(error.message).toBe("Name is required"); // 使用第一个详细错误信息
			expect(error.statusCode).toBe(400);
			expect(error.code).toBe("VALIDATION_ERROR");
			expect(error.response).toEqual(responseData);
		});
	});

	describe("fetchWithRetry", () => {
		it("应该在第一次成功时返回响应", async () => {
			const mockResponse = {
				ok: true,
				json: () => Promise.resolve({ data: "success" }),
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await fetchWithRetry("https://api.example.com/test");

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(result).toBe(mockResponse);
		});

		it("应该在网络错误时重试", async () => {
			const mockError = new Error("Network error");
			const mockResponse = {
				ok: true,
				json: () => Promise.resolve({ data: "success" }),
			};

			// 前两次失败，第三次成功
			mockFetch
				.mockRejectedValueOnce(mockError)
				.mockRejectedValueOnce(mockError)
				.mockResolvedValueOnce(mockResponse);

			const promise = fetchWithRetry(
				"https://api.example.com/test",
				undefined,
				{
					maxAttempts: 3,
					initialDelay: 100,
					maxDelay: 500,
					backoffFactor: 2,
					retryCondition: () => true,
				},
			);

			// 快进时间，触发重试
			vi.advanceTimersByTime(100);
			vi.advanceTimersByTime(200);

			const result = await promise;

			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(result).toBe(mockResponse);
		});

		it("应该在达到最大重试次数后抛出错误", async () => {
			const mockError = new Error("Network error");

			mockFetch.mockRejectedValue(mockError);

			const promise = fetchWithRetry(
				"https://api.example.com/test",
				undefined,
				{
					maxAttempts: 2,
					initialDelay: 100,
					maxDelay: 500,
					backoffFactor: 2,
					retryCondition: () => true,
				},
			);

			// 快进时间，触发重试
			vi.advanceTimersByTime(100);

			await expect(promise).rejects.toThrow("Network error");
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("应该在5xx错误时重试", async () => {
			const serverErrorResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				clone: () => serverErrorResponse,
				json: () => Promise.resolve({ error: { message: "Server error" } }),
			};

			const successResponse = {
				ok: true,
				json: () => Promise.resolve({ data: "success" }),
			};

			mockFetch
				.mockResolvedValueOnce(serverErrorResponse)
				.mockResolvedValueOnce(successResponse);

			const promise = fetchWithRetry(
				"https://api.example.com/test",
				undefined,
				defaultRetryConfig,
			);

			// 快进时间，触发重试
			vi.advanceTimersByTime(1000);

			const result = await promise;

			expect(mockFetch).toHaveBeenCalledTimes(2);
			expect(result).toBe(successResponse);
		});

		it("应该在4xx错误时不重试", async () => {
			const clientErrorResponse = {
				ok: false,
				status: 404,
				statusText: "Not Found",
				clone: () => clientErrorResponse,
				json: () => Promise.resolve({ error: { message: "Not found" } }),
			};

			mockFetch.mockResolvedValue(clientErrorResponse);

			await expect(
				fetchWithRetry("https://api.example.com/test"),
			).rejects.toThrow();

			expect(mockFetch).toHaveBeenCalledTimes(1); // 没有重试
		});
	});

	describe("makeCancellableRequest", () => {
		it("应该创建可取消的请求", async () => {
			const mockResponse = { ok: true };
			mockFetch.mockResolvedValue(mockResponse);

			const { response, cancel } = makeCancellableRequest(
				"https://api.example.com/test",
			);

			// 取消请求
			cancel();

			await expect(response).rejects.toThrow();
		});

		it("应该传播外部的取消信号", async () => {
			const mockResponse = { ok: true };
			mockFetch.mockResolvedValue(mockResponse);

			const externalController = new AbortController();
			const { response } = makeCancellableRequest(
				"https://api.example.com/test",
				{
					signal: externalController.signal,
				},
			);

			// 通过外部信号取消
			externalController.abort();

			await expect(response).rejects.toThrow();
		});
	});

	describe("RequestCancelled", () => {
		it("应该创建请求取消错误", () => {
			const error = new RequestCancelled("Custom cancel message");

			expect(error).toBeInstanceOf(AppError);
			expect(error).toBeInstanceOf(RequestCancelled);
			expect(error.message).toBe("Custom cancel message");
			expect(error.code).toBe("REQUEST_CANCELLED");
			expect(error.name).toBe("RequestCancelled");
		});

		it("应该使用默认取消消息", () => {
			const error = new RequestCancelled();

			expect(error.message).toBe("请求已取消");
		});
	});

	describe("categorizeError", () => {
		it("应该正确分类网络错误", () => {
			const networkError = createAPIError.network("Connection failed");
			const category = categorizeError(networkError);

			expect(category.category).toBe("network");
			expect(category.severity).toBe("medium");
			expect(category.userFriendly).toBe(true);
			expect(category.retryable).toBe(true);
		});

		it("应该正确分类认证错误", () => {
			const authError = createAPIError.unauthorized("Access denied");
			const category = categorizeError(authError);

			expect(category.category).toBe("auth");
			expect(category.severity).toBe("high");
			expect(category.userFriendly).toBe(true);
			expect(category.retryable).toBe(false);
		});

		it("应该正确分类验证错误", () => {
			const validationError = createAPIError.badRequest("Invalid input");
			const category = categorizeError(validationError);

			expect(category.category).toBe("validation");
			expect(category.severity).toBe("low");
			expect(category.userFriendly).toBe(true);
			expect(category.retryable).toBe(false);
		});

		it("应该正确分类业务逻辑错误", () => {
			const notFoundError = createAPIError.notFound("Resource not found");
			const category = categorizeError(notFoundError);

			expect(category.category).toBe("business");
			expect(category.severity).toBe("medium");
			expect(category.userFriendly).toBe(true);
			expect(category.retryable).toBe(false);
		});

		it("应该正确分类系统错误", () => {
			const internalError = createAPIError.internal("Database error");
			const category = categorizeError(internalError);

			expect(category.category).toBe("system");
			expect(category.severity).toBe("critical");
			expect(category.userFriendly).toBe(false);
			expect(category.retryable).toBe(true);
		});

		it("应该处理非API错误", () => {
			const genericError = new Error("Some error");
			const category = categorizeError(genericError);

			expect(category.category).toBe("system");
			expect(category.severity).toBe("medium");
			expect(category.userFriendly).toBe(false);
			expect(category.retryable).toBe(false);
		});
	});

	describe("重试配置", () => {
		it("应该使用默认重试配置", () => {
			expect(defaultRetryConfig.maxAttempts).toBe(3);
			expect(defaultRetryConfig.initialDelay).toBe(1000);
			expect(defaultRetryConfig.maxDelay).toBe(10000);
			expect(defaultRetryConfig.backoffFactor).toBe(2);
			expect(defaultRetryConfig.retryCondition).toBeDefined();
		});

		it("应该验证重试条件", () => {
			const networkError = createAPIError.network("Network error");
			const clientError = createAPIError.badRequest("Bad request");
			const serverError = createAPIError.internal("Internal error");

			expect(defaultRetryConfig.retryCondition?.(networkError)).toBe(true);
			expect(defaultRetryConfig.retryCondition?.(clientError)).toBe(false);
			expect(defaultRetryConfig.retryCondition?.(serverError)).toBe(true);
		});
	});
});
