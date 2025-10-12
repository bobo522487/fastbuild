/**
 * 测试配置文件
 *
 * 为测试文件提供 mocks 和配置
 */

import { vi } from "vitest";
import { testEnv } from "./test-env";

// 简化的测试配置 - NextAuth已删除

// Mock database object
const mockDb = {
	user: {
		findUnique: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	project: {
		findUnique: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	},
	projectMember: {
		findMany: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		findFirst: vi.fn(),
	},
	auditLog: {
		create: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
		findFirst: vi.fn(),
	},
	dataTable: {
		create: vi.fn(),
		findMany: vi.fn(),
	},
	$dataModelDeployment: {
		create: vi.fn(),
		findMany: vi.fn(),
	},
	$transaction: vi.fn(),
};

// Mock test user
const mockTestUser = {
	id: "test-user-id",
	email: "test@example.com",
	name: "Test User",
	passwordHash: "hashed_password",
	createdAt: new Date(),
	updatedAt: new Date(),
};

// Mock response creators
const mockCreateSuccessResponse = vi.fn((data: any) => ({
	success: true,
	data,
}));

const mockCreateErrorResponse = vi.fn(
	(code: string, message: string, statusCode?: number, details?: string[]) => ({
		success: false,
		error: {
			code,
			message,
			details: Array.isArray(details) ? details : [details].filter(Boolean),
		},
	}),
);

// 导出 mocks
export {
	mockDb,
	mockTestUser,
	mockCreateSuccessResponse,
	mockCreateErrorResponse,
};

// 设置 mocks
export function setupTestMocks() {
	// Mock environment module
	vi.mock("~/env", () => ({
		env: testEnv,
	}));

	// Mock database connection
	vi.mock("~/server/db", () => ({
		db: mockDb,
	}));

	// Mock API response functions
	vi.mock("~/lib/api-response", () => ({
		API_ERROR_CODES: {
			UNAUTHORIZED: "UNAUTHORIZED",
			INTERNAL_ERROR: "INTERNAL_ERROR",
			TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
		},
		createErrorResponse: mockCreateErrorResponse,
		createSuccessResponse: mockCreateSuccessResponse,
	}));
}

// 重置 mocks 的辅助函数
export function resetTestMocks() {
	vi.clearAllMocks();

	// 重置所有数据库 mocks
	Object.values(mockDb.user).forEach(mock => mock.mockReset?.());
	Object.values(mockDb.project).forEach(mock => mock.mockReset?.());
	Object.values(mockDb.projectMember).forEach(mock => mock.mockReset?.());
	Object.values(mockDb.auditLog).forEach(mock => mock.mockReset?.());
	Object.values(mockDb.dataTable).forEach(mock => mock.mockReset?.());
	Object.values(mockDb.$dataModelDeployment).forEach(mock => mock.mockReset?.());
	mockDb.$transaction.mockReset();
}

// 设置默认 mock 返回值
export async function setupDefaultMockResponses() {
	// 默认用户查找成功
	mockDb.user.findUnique.mockResolvedValue(mockTestUser);

	// 默认项目查找成功
	mockDb.project.findUnique.mockResolvedValue({
		id: "test-project-id",
		name: "Test Project",
		slug: "test-project",
		createdBy: mockTestUser.id,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	// 默认项目成员
	mockDb.projectMember.findMany.mockResolvedValue([
		{
			id: "member-id",
			projectId: "test-project-id",
			userId: mockTestUser.id,
			role: "OWNER",
			createdAt: new Date(),
		},
	]);

	// 默认审计日志创建成功
	mockDb.auditLog.create.mockResolvedValue({
		id: "test-log-id",
		action: "TEST_ACTION",
		userId: mockTestUser.id,
		metadata: {},
		createdAt: new Date(),
	});

	// 默认审计日志计数为0
	mockDb.auditLog.count.mockResolvedValue(0);
	mockDb.auditLog.findFirst.mockResolvedValue(null);

	// 默认事务成功
	mockDb.$transaction.mockImplementation(async (callback) => {
		return callback(mockDb);
	});
}
