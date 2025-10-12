/**
 * /sys/permissions 系统集成测试
 *
 * 测试权限系统的端到端功能，包括：
 * - 硬编码权限系统
 * - JWT 缓存机制
 * - 批量权限检查
 * - 权限验证流程
 */

import { DatabaseTestHelpers } from "@tests/utils/database-helpers";
import { TestDataFactory } from "@tests/utils/factory";
import {
	createSysAuthenticatedRequest,
	createSysLoginRequest,
	expectSysApiResponse,
	expectSysBatchPermissionCheckResponse,
	expectSysPermissionCheckResponse,
	parseSysApiResponse,
} from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("/sys/permissions Integration Tests", () => {
	let testUsers: any[] = [];
	let testProjects: any[] = [];

	beforeEach(async () => {
		await DatabaseTestHelpers.setupTestDatabase();
		await DatabaseTestHelpers.cleanupTestData();

		// 创建测试场景 - 使用带密码的用户
		const scenario = await DatabaseTestHelpers.createTestScenario({
			userCount: 4,
			projectsPerUser: 2,
			membersPerProject: 3,
		});

		// 确保所有用户都有 plainPassword 字段
		testUsers = await Promise.all(
			scenario.users.map(async (user: any) => {
				if (!user.plainPassword) {
					// 如果没有 plainPassword，重新创建一个带密码的用户
					const testUser = await DatabaseTestHelpers.createTestUserWithPassword({
						email: user.email,
						name: user.name,
					});
					return testUser;
				}
				return user;
			})
		);
		testProjects = scenario.projects;
	});

	afterEach(async () => {
		await DatabaseTestHelpers.cleanupTestData();
	});

	describe("硬编码权限系统集成", () => {
		it("应该正确执行 OWNER 权限", async () => {
			const owner = testUsers[0];
			const ownerProject = testProjects.find((p) =>
				testProjects
					.filter((p) => p.createdBy === owner.id)
					.some((project) => project.id === p.id),
			);

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: owner.email,
				passwordHash: owner.plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 测试所有 OWNER 权限
			const ownerActions = ["read", "write", "delete", "manage"];
			const results = [];

			for (const action of ownerActions) {
				const response = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							projectId: ownerProject.id,
							action,
							resourceType: "project",
						}),
					},
				);

				const result = await response.json();
				results.push(result);
			}

			// 验证所有权限都被允许
			results.forEach((result) => {
				expect(result.data.hasPermission).toBe(true);
				expect(result.data.role).toBe("OWNER");
				expect(result.data.cached).toBe(true);
			});
		});

		it("应该正确执行 ADMIN 权限", async () => {
			// 找到一个项目及其管理员
			const adminMember =
				await DatabaseTestHelpers.getInstance().projectMember.findFirst({
					where: { role: "ADMIN" },
					include: { User: true },
				});

			if (!adminMember) return;

			const admin = adminMember.User;
			const project = await DatabaseTestHelpers.getInstance().project.findUnique({
				where: { id: adminMember.projectId },
			});

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: admin.email,
				passwordHash: (admin as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 测试 ADMIN 权限（除了 manage 权限）
			const adminActions = ["read", "write", "delete"];
			const results = [];

			for (const action of adminActions) {
				const response = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							projectId: project?.id,
							action,
							resourceType: "datamodel",
						}),
					},
				);

				const result = await response.json();
				results.push(result);
			}

			// 验证除 manage 外的权限都被允许
			results.forEach((result) => {
				expect(result.data.hasPermission).toBe(true);
				expect(result.data.role).toBe("ADMIN");
				expect(result.data.cached).toBe(true);
			});
		});

		it("应该正确执行 EDITOR 权限", async () => {
			// 找到一个编辑者项目
			const editorMember =
				await DatabaseTestHelpers.getInstance().projectMember.findFirst({
					where: { role: "EDITOR" },
					include: { User: true },
				});

			if (!editorMember) return;

			const editor = editorMember.User;
			const project = await DatabaseTestHelpers.getInstance().project.findUnique({
				where: { id: editorMember.projectId },
			});

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: editor.email,
				passwordHash: (editor as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 测试允许的权限
			const allowedActions = ["read", "write"];
			const allowedResults = [];

			for (const action of allowedActions) {
				const response = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							projectId: project?.id,
							action,
							resourceType: "application",
						}),
					},
				);

				const result = await response.json();
				allowedResults.push(result);
			}

			// 验证允许的权限
			allowedResults.forEach((result) => {
				expect(result.data.hasPermission).toBe(true);
				expect(result.data.role).toBe("EDITOR");
			});

			// 测试不允许的权限
			const deniedActions = ["delete", "manage"];
			const deniedResults = [];

			for (const action of deniedActions) {
				const response = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							projectId: project?.id,
							action,
							resourceType: "application",
						}),
					},
				);

				const result = await response.json();
				deniedResults.push(result);
			}

			// 验证拒绝的权限
			deniedResults.forEach((result) => {
				expect(result.data.hasPermission).toBe(false);
				expect(result.data.role).toBe("EDITOR");
			});
		});

		it("应该正确执行 VIEWER 权限", async () => {
			// 找到一个查看者项目
			const viewerMember =
				await DatabaseTestHelpers.getInstance().projectMember.findFirst({
					where: { role: "VIEWER" },
					include: { User: true },
				});

			if (!viewerMember) return;

			const viewer = viewerMember.User;
			const project = await DatabaseTestHelpers.getInstance().project.findUnique({
				where: { id: viewerMember.projectId },
			});

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: viewer.email,
				passwordHash: (viewer as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 测试允许的权限（只有读权限）
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({
						projectId: project?.id,
						action: "read",
						resourceType: "project",
					}),
				},
			);

			const result = await response.json();
			expect(result.data.hasPermission).toBe(true);
			expect(result.data.role).toBe("VIEWER");

			// 测试拒绝的权限
			const deniedActions = ["write", "delete", "manage"];
			const deniedResults = [];

			for (const action of deniedActions) {
				const deniedResponse = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify({
							projectId: project?.id,
							action,
							resourceType: "project",
						}),
					},
				);

				const deniedResult = await deniedResponse.json();
				deniedResults.push(deniedResult);
			}

			deniedResults.forEach((result) => {
				expect(result.data.hasPermission).toBe(false);
				expect(result.data.role).toBe("VIEWER");
			});
		});
	});

	describe("批量权限检查集成", () => {
		it("应该高效处理批量权限检查", async () => {
			const user = testUsers[0];
			const userProjects = testProjects.filter((p) => p.createdBy === user.id);

			if (userProjects.length === 0) return;

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 创建批量权限检查请求
			const checks: Array<{
				projectId: string;
				action: string;
				resourceType: string;
			}> = [];
			for (const project of userProjects) {
				for (const action of ["read", "write", "delete"]) {
					checks.push({
						projectId: project?.id,
						action,
						resourceType: "project",
					});
				}
			}

			const startTime = Date.now();
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check-batch",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({ checks }),
				},
			);
			const endTime = Date.now();

			expect(response.status).toBe(200);
			const result = await response.json();
			expectSysBatchPermissionCheckResponse(result, checks.length);

			// 验证响应时间
			expect(endTime - startTime).toBeLessThan(1000);
			expect(result.data.responseTime).toBeLessThan(1000);

			// 验证所有检查结果
			result.data.results?.forEach((checkResult: any, index: number) => {
				expect(checkResult.projectId).toBe(checks[index]?.projectId);
				expect(checkResult.action).toBe(checks[index]?.action);
				expect(checkResult.hasPermission).toBe(true); // 所有者是 OWNER
				expect(checkResult.role).toBe("OWNER");
				expect(checkResult.cached).toBe(true);
			});
		});

		it("应该处理混合权限检查结果", async () => {
			// 找到一个有多个成员的项目
			const project = testProjects[0];
			const members =
				await DatabaseTestHelpers.getInstance().projectMember.findMany({
					where: { projectId: project.id },
					include: { User: true },
				});

			if (members.length < 2) return;

			// 使用不同角色的用户进行批量检查
			const member = members.find((m) => m.role !== "OWNER");
			if (!member) return;

			const user = member.User;

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 创建混合权限检查
			const checks = [
				{ projectId: project?.id, action: "read", resourceType: "project" }, // 应该允许
				{ projectId: project?.id, action: "write", resourceType: "project" }, // 可能允许或拒绝
				{ projectId: project?.id, action: "delete", resourceType: "project" }, // 可能拒绝
			];

			const response = await fetch(
				"http://localhost:3000/sys/permissions/check-batch",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({ checks }),
				},
			);

			const result = await response.json();
			expectSysBatchPermissionCheckResponse(result, checks.length);

			// 验证结果一致性
			result.data.results.forEach((checkResult: any) => {
				expect(checkResult.projectId).toBe(project.id);
				expect(checkResult.role).toBe(member.role);
				expect(checkResult.cached).toBe(true);
			});
		});
	});

	describe("JWT 缓存机制集成", () => {
		it("应该从 JWT 缓存快速获取权限", async () => {
			const user = testUsers[0];
			const project = testProjects[0];

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 多次检查相同权限
			const permissionCheck = {
				projectId: project?.id,
				action: "read",
				resourceType: "project",
			};

			const results = [];
			for (let i = 0; i < 5; i++) {
				const response = await fetch(
					"http://localhost:3000/sys/permissions/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
						body: JSON.stringify(permissionCheck),
					},
				);

				const result = await response.json();
				results.push(result);
			}

			// 验证所有检查都从缓存获取
			results.forEach((result) => {
				expect(result.data.hasPermission).toBe(true);
				expect(result.data.role).toBe("OWNER");
				expect(result.data.cached).toBe(true);
			});
		});

		it("应该在 JWT 缓存失效时回退到数据库查询", async () => {
			// 创建一个新用户但不立即分配项目角色
			const user = await DatabaseTestHelpers.createTestUserWithPassword();
			const project = await DatabaseTestHelpers.createTestProject(
				testUsers[0].id,
			);

			// 登录获取令牌（JWT 中可能没有缓存的项目角色）
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 检查权限（应该从数据库查询）
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({
						projectId: project?.id,
						action: "read",
						resourceType: "project",
					}),
				},
			);

			const result = await response.json();
			expectSysPermissionCheckResponse(result);

			// 应该没有权限且不是缓存
			expect(result.data.hasPermission).toBe(false);
			expect(result.data.role).toBe("NO_ACCESS");
			expect(result.data.cached).toBe(false);
		});
	});

	describe("权限验证流程集成", () => {
		it("应该拒绝未认证的权限检查请求", async () => {
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						projectId: testProjects[0].id,
						action: "read",
						resourceType: "project",
					}),
				},
			);

			expect(response.status).toBe(401);
			const result = await response.json();
			expect(result.success).toBe(false);
			expect(result.error.code).toBe("UNAUTHORIZED");
		});

		it("应该拒绝无效令牌的权限检查请求", async () => {
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer invalid_token",
					},
					body: JSON.stringify({
						projectId: testProjects[0].id,
						action: "read",
						resourceType: "project",
					}),
				},
			);

			expect(response.status).toBe(401);
			const result = await response.json();
			expect(result.success).toBe(false);
		});

		it("应该记录权限检查事件", async () => {
			const user = testUsers[0];

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 执行权限检查
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({
						projectId: testProjects[0].id,
						action: "read",
						resourceType: "project",
					}),
				},
			);

			const result = await response.json();
			expectSysPermissionCheckResponse(result);

			// 验证事件被记录（这里需要检查数据库或日志）
			// 实际实现中会有审计日志记录
		});
	});

	describe("性能集成测试", () => {
		it("应该在合理时间内处理大量权限检查", async () => {
			const user = testUsers[0];
			const userProjects = testProjects.filter((p) => p.createdBy === user.id);

			if (userProjects.length === 0) return;

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 创建大量权限检查
			const checks = [];
			for (let i = 0; i < 20; i++) {
				checks.push({
					projectId: userProjects[0].id,
					action: ["read", "write", "delete"][i % 3],
					resourceType: "project",
				});
			}

			const startTime = Date.now();
			const response = await fetch(
				"http://localhost:3000/sys/permissions/check-batch",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({ checks }),
				},
			);
			const endTime = Date.now();

			expect(response.status).toBe(200);
			expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成

			const result = await response.json();
			expectSysBatchPermissionCheckResponse(result, checks.length);
		});

		it("应该支持并发权限检查", async () => {
			const user = testUsers[0];
			const project = testProjects[0];

			// 登录获取令牌
			const loginData = TestDataFactory.createLoginRequest({
				email: user.email,
				passwordHash: (user as any).plainPassword,
			});

			const loginResponse = await fetch(
				"http://localhost:3000/sys/auth/login",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData),
				},
			);

			const loginResult = await loginResponse.json();
			const accessToken = loginResult.data.accessToken;

			// 并发执行多个权限检查
			const permissionPromises = Array.from({ length: 5 }, () => {
				return fetch("http://localhost:3000/sys/permissions/check", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify({
						projectId: project?.id,
						action: "read",
						resourceType: "project",
					}),
				});
			});

			const responses = await Promise.all(permissionPromises);

			// 验证所有请求都成功
			responses.forEach((response) => {
				expect(response.status).toBe(200);
			});

			const results = await Promise.all(responses.map((res) => res.json()));
			results.forEach((result) => {
				expectSysPermissionCheckResponse(result);
				expect(result.data.hasPermission).toBe(true);
				expect(result.data.cached).toBe(true);
			});
		});
	});
});
