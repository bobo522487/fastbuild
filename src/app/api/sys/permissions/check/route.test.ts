/**
 * /sys/permissions/check API 单元测试
 *
 * 测试权限检查功能，包括：
 * - 单个权限检查
 * - 批量权限检查
 * - 硬编码权限系统
 * - JWT 缓存机制
 */

import { DatabaseTestHelpers } from "@tests/utils/database-helpers";
import { TestDataFactory } from "@tests/utils/factory";
import {
	createSysAuthenticatedRequest,
	createSysBatchPermissionCheckRequest,
	createSysPermissionCheckRequest,
	expectSysApiResponse,
	expectSysBatchPermissionCheckResponse,
	expectSysPermissionCheckResponse,
	parseSysApiResponse,
} from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Mock 外部依赖
vi.mock("~/server/db", () => ({
	db: {
		projectMember: {
			findMany: vi.fn(),
		},
	},
}));

vi.mock("~/lib/auth-errors", () => ({
	logAuthEvent: vi.fn(),
	logSecurityEvent: vi.fn(),
}));

describe("/sys/permissions/check", () => {
	beforeEach(async () => {
		await DatabaseTestHelpers.setupTestDatabase();
		await DatabaseTestHelpers.cleanupTestData();
	});

	afterEach(async () => {
		await DatabaseTestHelpers.cleanupTestData();
		vi.clearAllMocks();
	});

	describe("POST /sys/permissions/check", () => {
		describe("单个权限检查", () => {
			it("应该正确检查项目所有者权限", async () => {
				const userId = "user-123";
				const projectId = "project-123";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "delete",
					resourceType: "project",
				});

				// Mock JWT payload with project roles
				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "OWNER",
					},
				});

				// Mock 验证 JWT 和提取用户信息
				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(true);
				expect(data.data.role).toBe("OWNER");
				expect(data.data.cached).toBe(true); // 从 JWT 缓存获取
			});

			it("应该正确检查项目管理员权限", async () => {
				const userId = "user-456";
				const projectId = "project-456";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "update",
					resourceType: "datamodel",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "ADMIN",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(true);
				expect(data.data.role).toBe("ADMIN");
				expect(data.data.cached).toBe(true);
			});

			it("应该正确检查项目编辑者权限", async () => {
				const userId = "user-789";
				const projectId = "project-789";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "create",
					resourceType: "application",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "EDITOR",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(true);
				expect(data.data.role).toBe("EDITOR");
				expect(data.data.cached).toBe(true);
			});

			it("应该正确检查项目查看者权限", async () => {
				const userId = "user-999";
				const projectId = "project-999";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "read",
					resourceType: "project",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "VIEWER",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(true);
				expect(data.data.role).toBe("VIEWER");
				expect(data.data.cached).toBe(true);
			});

			it("应该拒绝查看者的写权限", async () => {
				const userId = "user-restricted";
				const projectId = "project-restricted";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "write",
					resourceType: "project",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "VIEWER",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(false);
				expect(data.data.role).toBe("VIEWER");
				expect(data.data.cached).toBe(true);
			});

			it("应该拒绝没有权限的用户", async () => {
				const userId = "user-no-access";
				const projectId = "project-no-access";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "read",
					resourceType: "project",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "NO_ACCESS",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(false);
				expect(data.data.role).toBe("NO_ACCESS");
				expect(data.data.cached).toBe(true);
			});

			it("应该处理用户没有项目角色的情况", async () => {
				const userId = "user-no-role";
				const projectId = "project-no-role";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "read",
					resourceType: "project",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {}, // 用户没有任何项目角色
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysPermissionCheckResponse(data);

				expect(data.data.hasPermission).toBe(false);
				expect(data.data.role).toBe("NO_ACCESS");
				expect(data.data.cached).toBe(false); // 没有缓存，从数据库查询
			});
		});

		describe("输入验证", () => {
			it("应该拒绝缺少 projectId 的请求", async () => {
				const userId = "user-validation";
				const invalidData = {
					action: "read",
					resourceType: "project",
				};

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: invalidData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 400);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
				expect(data.error.code).toBe("BAD_REQUEST");
			});

			it("应该拒绝缺少 action 的请求", async () => {
				const userId = "user-validation";
				const invalidData = {
					projectId: "project-123",
					resourceType: "project",
				};

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: invalidData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 400);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
			});

			it("应该拒绝无效的 action 值", async () => {
				const userId = "user-validation";
				const invalidData = TestDataFactory.createPermissionCheckRequest({
					projectId: "project-123",
					action: "invalid_action" as any,
					resourceType: "project",
				});

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: invalidData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 400);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
			});

			it("应该拒绝无效的 JSON 请求体", async () => {
				const userId = "user-validation";
				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: "invalid json{",
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 400);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
			});
		});

		describe("认证和授权", () => {
			it("应该拒绝未认证的请求", async () => {
				const permissionData = TestDataFactory.createPermissionCheckRequest();
				const request = createSysTestRequest(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 401);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
				expect(data.error.code).toBe("UNAUTHORIZED");
			});

			it("应该拒绝无效的 JWT 令牌", async () => {
				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockRejectedValue(new Error("Invalid JWT token")),
				}));

				const permissionData = TestDataFactory.createPermissionCheckRequest();
				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					"user-123",
					{
						method: "POST",
						body: permissionData,
						token: "invalid_token",
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 401);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
				expect(data.error.code).toBe("UNAUTHORIZED");
			});
		});

		describe("错误处理", () => {
			it("应该处理数据库连接错误", async () => {
				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: "user-error",
						projectRoles: {},
					}),
				}));

				const { db } = await import("~/server/db");
				(db.projectMember.findMany as any).mockRejectedValue(
					new Error("Database connection failed"),
				);

				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId: "project-error",
					action: "read",
				});

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					"user-error",
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 500);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
				expect(data.error.code).toBe("INTERNAL_ERROR");
			});

			it("应该处理权限检查逻辑错误", async () => {
				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi
						.fn()
						.mockRejectedValue(new Error("Permission check failed")),
				}));

				const permissionData = TestDataFactory.createPermissionCheckRequest();
				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					"user-error",
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);

				expectSysApiResponse(response, 500);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
			});
		});

		describe("性能和安全", () => {
			it("应该在合理时间内响应", async () => {
				const userId = "user-performance";
				const projectId = "project-performance";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "read",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "OWNER",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const startTime = Date.now();
				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				const response = await POST(request);
				const endTime = Date.now();

				expectSysApiResponse(response, 200);
				expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内响应
			});

			it("应该记录权限检查事件", async () => {
				const userId = "user-logging";
				const projectId = "project-logging";
				const permissionData = TestDataFactory.createPermissionCheckRequest({
					projectId,
					action: "read",
				});

				const mockJWTPayload = TestDataFactory.createTestJWTPayload(userId, {
					projectRoles: {
						[projectId]: "OWNER",
					},
				});

				vi.doMock("~/lib/auth", () => ({
					verifyJWT: vi.fn().mockResolvedValue({
						sub: userId,
						projectRoles: mockJWTPayload.projectRoles,
					}),
				}));

				const { logAuthEvent } = await import("~/lib/auth-errors");

				const request = createSysAuthenticatedRequest(
					"http://localhost:3000/sys/permissions/check",
					userId,
					{
						method: "POST",
						body: permissionData,
					},
				);

				await POST(request);

				// 验证权限检查事件被记录
				expect(logAuthEvent).toHaveBeenCalledWith(
					"PERMISSION_CHECK",
					expect.objectContaining({
						userId,
						projectId,
						action: "read",
						hasPermission: true,
						role: "OWNER",
					}),
				);
			});
		});
	});
});

// Mock createSysTestRequest function for this test file
function createSysTestRequest(
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
		...headers,
	};

	if (token) {
		defaultHeaders.Authorization = `Bearer ${token}`;
	} else if (userId) {
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
