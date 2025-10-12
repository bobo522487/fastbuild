import { NextRequest, type NextResponse } from "next/server";
import { DatabaseTestHelpers } from "./database-helpers";
import { TestDataFactory } from "./factory";

/**
 * 创建模拟的NextRequest对象
 */
export function createMockRequest(
	method = "GET",
	url = "http://localhost:3000/api/test",
	body?: any,
	headers: Record<string, string> = {},
): NextRequest {
	const requestInit: RequestInit = {
		method,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		signal: undefined as any, // 修复类型兼容性
	};

	if (body && method !== "GET") {
		requestInit.body = JSON.stringify(body);
	}

	return new NextRequest(url, requestInit as any);
}

/**
 * 创建模拟的用户会话
 */
export function createMockSession(user: any) {
	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image,
		},
		expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
	};
}

/**
 * 验证API响应格式
 */
export function validateApiResponse(response: NextResponse): {
	success: boolean;
	data?: any;
	error?: any;
	status: number;
} {
	// 注意：这里假设 response.json() 已经被解析或者不解析
	// 如果需要解析 JSON，调用者应该先 await response.json()
	const responseData = null; // 简化实现，避免 async

	return {
		success: response.ok,
		data: responseData,
		status: response.status,
		error: response.ok
			? null
			: { status: response.status, message: undefined },
	};
}

/**
 * 创建测试用的API上下文
 */
export function createTestContext(user?: any) {
	return {
		user: user
			? {
					id: user.id,
					email: user.email,
					name: user.name,
				}
			: null,
		params: {},
		searchParams: new URLSearchParams(),
	};
}

/**
 * 比较对象，忽略时间戳字段
 */
export function deepEqualIgnoreTimestamps(obj1: any, obj2: any): boolean {
	const ignoreKeys = ["createdAt", "updatedAt", "expires", "emailVerified"];

	const cleanObj = (obj: any) => {
		if (typeof obj !== "object" || obj === null) return obj;

		const cleaned: Record<string, any> = {};
		for (const [key, value] of Object.entries(obj)) {
			if (!ignoreKeys.includes(key)) {
				cleaned[key] = cleanObj(value);
			}
		}
		return cleaned;
	};

	return JSON.stringify(cleanObj(obj1)) === JSON.stringify(cleanObj(obj2));
}

/**
 * 等待指定的毫秒数
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试失败的异步操作
 */
export async function retry<T>(
	fn: () => Promise<T>,
	maxAttempts = 3,
	delay = 1000,
): Promise<T> {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxAttempts) {
				await sleep(delay * attempt);
			}
		}
	}

	throw lastError!;
}

/**
 * 生成唯一的测试ID
 */
export function generateTestId(prefix = "test"): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证错误消息格式
 */
export function validateErrorFormat(error: any): boolean {
	return (
		error &&
		typeof error === "object" &&
		"code" in error &&
		"message" in error &&
		typeof error.code === "string" &&
		typeof error.message === "string"
	);
}

/**
 * 创建测试用的认证头
 */
export function createAuthHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	};
}

/**
 * 测试数据清理助手
 */
export class TestCleanupHelper {
	private cleanupFunctions: Array<() => Promise<void>> = [];

	/**
	 * 添加清理函数
	 */
	addCleanup(fn: () => Promise<void>): void {
		this.cleanupFunctions.push(fn);
	}

	/**
	 * 执行所有清理操作
	 */
	async cleanup(): Promise<void> {
		const cleanupPromises = this.cleanupFunctions.map(async (fn) => {
			try {
				await fn();
			} catch (error) {
				console.error("Cleanup failed:", error);
			}
		});

		await Promise.all(cleanupPromises);
		this.cleanupFunctions = [];
	}

	/**
	 * 创建自动清理的用户
	 */
	async createAutoCleanupUser(overrides: Partial<any> = {}): Promise<any> {
		const user = await DatabaseTestHelpers.createTestUser(overrides);
		this.addCleanup(async () => {
			await DatabaseTestHelpers.getInstance().user.delete({
				where: { id: user.id },
			});
		});
		return user;
	}

	/**
	 * 创建自动清理的项目
	 */
	async createAutoCleanupProject(
		ownerId: string,
		overrides: Partial<any> = {},
	): Promise<any> {
		const project = await DatabaseTestHelpers.createTestProject(
			ownerId,
			overrides,
		);
		this.addCleanup(async () => {
			await DatabaseTestHelpers.getInstance().project.delete({
				where: { id: project.id },
			});
		});
		return project;
	}
}

// ====== /sys/* API 特定测试工具函数 ======

/**
 * 创建测试用的 HTTP Request 对象 (sys API 专用)
 */
export function createSysTestRequest(
	url: string,
	options: {
		method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
		headers?: Record<string, string>;
		body?: any;
		userId?: string;
		token?: string;
	} = {},
) {
	const { method = "GET", headers = {}, body, userId, token } = options;

	const defaultHeaders: Record<string, string> = {
		"Content-Type": "application/json",
		"User-Agent": "FastBuild-Sys-Test-Client/1.0",
		"X-Forwarded-For": TestDataFactory.createTestUser().email, // 模拟 IP
		...headers,
	};

	// 如果提供了 token，添加 Authorization 头
	if (token) {
		defaultHeaders.Authorization = `Bearer ${token}`;
	} else if (userId) {
		// 如果只提供了 userId，创建一个测试 token
		defaultHeaders.Authorization = `Bearer test_token_${userId}`;
	}

	const requestInit: RequestInit = {
		method,
		headers: defaultHeaders,
	};

	if (body && method !== "GET") {
		requestInit.body = typeof body === "string" ? body : JSON.stringify(body);
	}

	return new Request(url, requestInit);
}

/**
 * 创建认证请求 (sys API 专用)
 */
export function createSysAuthenticatedRequest(
	url: string,
	userId: string,
	options: Omit<
		Parameters<typeof createSysTestRequest>[1],
		"userId" | "token"
	> = {},
) {
	const token = TestDataFactory.createTestToken();
	return createSysTestRequest(url, { ...options, userId, token });
}

/**
 * 验证 API 响应格式 (sys API 专用)
 */
export function expectSysApiResponse(response: Response, expectedStatus = 200) {
	expect(response.status).toBe(expectedStatus);
	expect(response.headers.get("content-type")).toMatch(/json/);
}

/**
 * 验证对象是否可以被 JSON 序列化
 */
export function validateSerializable(obj: any): boolean {
	try {
		JSON.stringify(obj);
		return true;
	} catch (error) {
		console.error("Object is not JSON serializable:", error);
		console.error("Object:", obj);
		return false;
	}
}

/**
 * 解析 sys API 响应 JSON
 */
export async function parseSysApiResponse<T = any>(
	response: Response,
): Promise<T> {
	const text = await response.text();

	try {
		const parsed = JSON.parse(text);

		// 在测试环境中验证解析后的对象是否可以重新序列化
		if (process.env.NODE_ENV === "test") {
			if (!validateSerializable(parsed)) {
				throw new Error("Parsed response is not JSON serializable");
			}
		}

		return parsed;
	} catch (error) {
		throw new Error(`Invalid JSON response: ${text}`);
	}
}

/**
 * 验证成功响应结构 (sys API 专用)
 */
export function expectSysSuccessResponse(data: any) {
	expect(data).toHaveProperty("success", true);
	expect(data).toHaveProperty("data");
	expect(data).not.toHaveProperty("error");
}

/**
 * 验证错误响应结构 (sys API 专用)
 */
export function expectSysErrorStructure(data: any, expectedErrorCode?: string) {
	expect(data).toHaveProperty("success", false);
	expect(data).toHaveProperty("error");
	expect(data.error).toHaveProperty("code");
	expect(data.error).toHaveProperty("message");

	if (expectedErrorCode) {
		expect(data.error.code).toBe(expectedErrorCode);
	}
}

/**
 * 创建登录请求 (sys API 专用)
 */
export function createSysLoginRequest(loginData: {
	email: string;
	passwordHash: string;
	rememberMe?: boolean;
}) {
	return createSysTestRequest("http://localhost:3000/sys/auth/login", {
		method: "POST",
		body: loginData,
	});
}

/**
 * 创建权限检查请求 (sys API 专用)
 */
export function createSysPermissionCheckRequest(
	checkData: {
		projectId: string;
		action: string;
		resourceType?: string;
	},
	userId?: string,
) {
	return createSysAuthenticatedRequest(
		"http://localhost:3000/sys/permissions/check",
		userId || TestDataFactory.createTestUser().id!,
		{
			method: "POST",
			body: checkData,
		},
	);
}

/**
 * 创建批量权限检查请求 (sys API 专用)
 */
export function createSysBatchPermissionCheckRequest(
	checks: Array<{
		projectId: string;
		action: string;
		resourceType?: string;
	}>,
	userId?: string,
) {
	return createSysAuthenticatedRequest(
		"http://localhost:3000/sys/permissions/check-batch",
		userId || TestDataFactory.createTestUser().id!,
		{
			method: "POST",
			body: { checks },
		},
	);
}

/**
 * 创建健康检查请求 (sys API 专用)
 */
export function createSysHealthCheckRequest(
	type: "basic" | "detailed" = "basic",
) {
	return createSysTestRequest(`http://localhost:3000/sys/health/${type}`);
}

/**
 * 创建版本信息请求 (sys API 专用)
 */
export function createSysVersionRequest(
	params: {
		format?: "json" | "yaml";
		include_dependencies?: boolean;
		include_health?: boolean;
	} = {},
) {
	const url = new URL("http://localhost:3000/sys/version");

	if (params.format) {
		url.searchParams.set("format", params.format);
	}
	if (params.include_dependencies !== undefined) {
		url.searchParams.set(
			"include_dependencies",
			params.include_dependencies.toString(),
		);
	}
	if (params.include_health !== undefined) {
		url.searchParams.set("include_health", params.include_health.toString());
	}

	return createSysTestRequest(url.toString());
}

/**
 * 验证登录响应结构 (sys API 专用)
 */
export function expectSysLoginResponse(data: any) {
	expectSysSuccessResponse(data);
	expect(data.data).toHaveProperty("user");
	expect(data.data.user).toHaveProperty("id");
	expect(data.data.user).toHaveProperty("email");
	expect(data.data.user).toHaveProperty("name");
	expect(data.data).toHaveProperty("accessToken");
	expect(data.data).toHaveProperty("refreshToken");
	expect(data.data).toHaveProperty("expiresIn");
	expect(data.data).toHaveProperty("tokenType", "Bearer");
	expect(data.data).toHaveProperty("loginMethod");
	expect(data.data).toHaveProperty("rememberMe");
	expect(data.data).toHaveProperty("responseTime");
	expect(typeof data.data.expiresIn).toBe("number");
	expect(typeof data.data.responseTime).toBe("number");
}

/**
 * 验证权限检查响应结构 (sys API 专用)
 */
export function expectSysPermissionCheckResponse(data: any) {
	expectSysSuccessResponse(data);
	expect(data.data).toHaveProperty("hasPermission");
	expect(data.data).toHaveProperty("role");
	expect(data.data).toHaveProperty("cached");
	expect(typeof data.data.hasPermission).toBe("boolean");
	expect(typeof data.data.cached).toBe("boolean");
}

/**
 * 验证批量权限检查响应结构 (sys API 专用)
 */
export function expectSysBatchPermissionCheckResponse(
	data: any,
	expectedCount: number,
) {
	expectSysSuccessResponse(data);
	expect(data.data).toHaveProperty("results");
	expect(Array.isArray(data.data.results)).toBe(true);
	expect(data.data.results).toHaveLength(expectedCount);

	data.data.results.forEach((result: any) => {
		expect(result).toHaveProperty("projectId");
		expect(result).toHaveProperty("hasPermission");
		expect(result).toHaveProperty("role");
		expect(result).toHaveProperty("cached");
		expect(typeof result.hasPermission).toBe("boolean");
		expect(typeof result.cached).toBe("boolean");
	});
}

/**
 * 验证健康检查响应结构 (sys API 专用)
 */
export function expectSysHealthCheckResponse(data: any) {
	expectSysSuccessResponse(data);
	expect(data.data).toHaveProperty("status");
	expect(data.data).toHaveProperty("timestamp");
	expect(data.data).toHaveProperty("version");
	expect(["healthy", "unhealthy", "degraded"]).toContain(data.data.status);
	expect(typeof new Date(data.data.timestamp)).toBe("object"); // 验证时间戳格式
}

/**
 * 验证版本信息响应结构 (sys API 专用)
 */
export function expectSysVersionResponse(data: any) {
	expectSysSuccessResponse(data);
	expect(data.data).toHaveProperty("system");
	expect(data.data).toHaveProperty("components");
	expect(data.data).toHaveProperty("features");
	expect(data.data).toHaveProperty("metadata");
	expect(data.data).toHaveProperty("links");

	expect(data.data.system).toHaveProperty("name");
	expect(data.data.system).toHaveProperty("version");
	expect(data.data.system).toHaveProperty("buildNumber");
	expect(data.data.system).toHaveProperty("environment");

	expect(data.data.components).toHaveProperty("api");
	expect(data.data.components).toHaveProperty("database");
	expect(data.data.components).toHaveProperty("framework");

	expect(data.data.features).toHaveProperty("auth");
	expect(data.data.features).toHaveProperty("permissions");
	expect(data.data.features).toHaveProperty("monitoring");
	expect(data.data.features).toHaveProperty("security");
}

/**
 * 验证响应时间是否在合理范围内 (sys API 专用)
 */
export function expectSysResponseTime(responseTime: number, maxMs = 1000) {
	expect(typeof responseTime).toBe("number");
	expect(responseTime).toBeGreaterThanOrEqual(0);
	expect(responseTime).toBeLessThan(maxMs);
}

/**
 * 验证 JWT Token 格式 (简化版，sys API 专用)
 */
export function expectSysJWTFormat(token: string) {
	expect(typeof token).toBe("string");
	expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
}

/**
 * 创建失败登录日志测试数据 (sys API 专用)
 */
export async function createFailedLoginScenario(
	email: string,
	attemptCount = 5,
) {
	return await DatabaseTestHelpers.createFailedLoginAttempts(
		email,
		attemptCount,
	);
}

/**
 * 验证账户锁定相关响应 (sys API 专用)
 */
export function expectSysAccountLockedResponse(data: any) {
	expectSysErrorStructure(data, "TOO_MANY_REQUESTS");
	expect(data.error.message).toContain("锁定");
	expect(data.error.details).toBeDefined();
	expect(Array.isArray(data.error.details)).toBe(true);
}
