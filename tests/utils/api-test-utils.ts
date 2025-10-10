import { MemberRole } from "@prisma/client";
import { expect } from "vitest";
import { createTestPrismaClient } from "./test-utils";

// 测试数据库配置
export const testDb = createTestPrismaClient();

// 清理测试数据库
export const cleanupTestDb = async () => {
	// 按照外键依赖顺序删除数据
	await testDb.auditLog.deleteMany();
	await testDb.projectMember.deleteMany();
	await testDb.project.deleteMany();
	await testDb.session.deleteMany();
	await testDb.account.deleteMany();
	await testDb.user.deleteMany();
};

// 创建测试用户
export const createTestUserInDb = async (userData = {}) => {
	const defaultUser = {
		email: "test@example.com",
		name: "Test User",
	};

	return await testDb.user.create({
		data: { ...defaultUser, ...userData },
	});
};

// 创建测试项目
export const createTestProjectInDb = async (
	projectData = {},
	userId?: string,
) => {
	const defaultProject = {
		name: "Test Project",
		slug: "test-project",
		description: "Test project description",
		visibility: "PRIVATE" as const,
	};

	const project = await testDb.project.create({
		data: {
			...defaultProject,
			...projectData,
			...(userId && { createdBy: userId }),
		},
		include: {
			members: true,
		},
	});

	// 如果提供了用户ID，创建成员关系
	if (userId) {
		await testDb.projectMember.create({
			data: {
				projectId: project.id,
				userId,
				role: MemberRole.OWNER,
			},
		});
	}

	return project;
};

// API 测试基础类
export class ApiTestHelper {
	private baseUrl: string;

	constructor(baseUrl = "http://localhost:3000") {
		this.baseUrl = baseUrl;
	}

	// 发送 GET 请求
	async get(endpoint: string, token?: string) {
		const headers: HeadersInit = {
			"Content-Type": "application/json",
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: "GET",
			headers,
		});

		return {
			status: response.status,
			data: await response.json(),
		};
	}

	// 发送 POST 请求
	async post(endpoint: string, data: any, token?: string) {
		const headers: HeadersInit = {
			"Content-Type": "application/json",
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: "POST",
			headers,
			body: JSON.stringify(data),
		});

		return {
			status: response.status,
			data: await response.json(),
		};
	}

	// 发送 PUT 请求
	async put(endpoint: string, data: any, token?: string) {
		const headers: HeadersInit = {
			"Content-Type": "application/json",
		};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: "PUT",
			headers,
			body: JSON.stringify(data),
		});

		return {
			status: response.status,
			data: await response.json(),
		};
	}

	// 发送 DELETE 请求
	async delete(endpoint: string, token?: string) {
		const headers: HeadersInit = {};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			method: "DELETE",
			headers,
		});

		return {
			status: response.status,
			data: await response.json(),
		};
	}
}

// 断言辅助函数
export const expectSuccessResponse = (
	response: any,
	expectedStatus?: number,
) => {
	if (expectedStatus) {
		expect(response.status).toBe(expectedStatus);
	} else {
		expect(response.status).toBeGreaterThanOrEqual(200);
		expect(response.status).toBeLessThan(300);
	}
	expect(response.data.success).toBe(true);
};

export const expectErrorResponse = (response: any, expectedStatus?: number) => {
	if (expectedStatus) {
		expect(response.status).toBe(expectedStatus);
	}
	expect(response.data.success).toBe(false);
	expect(response.data.error).toBeDefined();
};

export const expectValidationError = (response: any, field?: string) => {
	expectErrorResponse(response, 400);
	expect(response.data.error.code).toBe("VALIDATION_ERROR");
	if (field) {
		expect(response.data.error.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: expect.arrayContaining([field]),
				}),
			]),
		);
	}
};
