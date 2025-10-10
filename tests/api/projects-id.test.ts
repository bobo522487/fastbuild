import { MemberRole } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	ApiTestHelper,
	cleanupTestDb,
	createTestProjectInDb,
	createTestUserInDb,
	expectErrorResponse,
	expectSuccessResponse,
	expectValidationError,
	testDb,
} from "../utils/api-test-utils";

describe("/api/projects/[id] API", () => {
	let apiHelper: ApiTestHelper;
	let testUser: any;
	let adminUser: any;
	let regularUser: any;
	let authToken: string;
	let adminAuthToken: string;
	let regularAuthToken: string;

	beforeAll(async () => {
		apiHelper = new ApiTestHelper();

		// 创建测试用户
		testUser = await createTestUserInDb({
			email: "project-owner@test.com",
			name: "Project Owner",
		});

		adminUser = await createTestUserInDb({
			email: "project-admin@test.com",
			name: "Project Admin",
		});

		regularUser = await createTestUserInDb({
			email: "regular-user@test.com",
			name: "Regular User",
		});

		// 创建认证token
		authToken = "owner-auth-token";
		adminAuthToken = "admin-auth-token";
		regularAuthToken = "regular-auth-token";
	});

	afterAll(async () => {
		await cleanupTestDb();
		await testDb.$disconnect();
	});

	beforeEach(async () => {
		// 清理项目数据
		await testDb.project.deleteMany();
		await testDb.projectMember.deleteMany();
	});

	describe("GET /api/projects/[id]", () => {
		it("应该返回项目详情给项目所有者", async () => {
			// 创建测试项目
			const project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
					visibility: "PRIVATE",
				},
				testUser.id,
			);

			const response = await apiHelper.get(
				`/api/projects/${project.id}`,
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.id).toBe(project.id);
			expect(response.data.data.name).toBe("Test Project");
			expect(response.data.data.slug).toBe("test-project");
			expect(response.data.data.visibility).toBe("PRIVATE");
			expect(response.data.data.currentUserRole).toBe("OWNER");
			expect(response.data.data.memberCount).toBe(1);
			expect(response.data.data.members).toHaveLength(1);
			expect(response.data.data.createdBy).toBeDefined();
		});

		it("应该返回项目详情给项目管理员", async () => {
			const project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
				},
				testUser.id,
			);

			// 添加管理员成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: MemberRole.ADMIN,
				},
			});

			const response = await apiHelper.get(
				`/api/projects/${project.id}`,
				adminAuthToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.currentUserRole).toBe("ADMIN");
		});

		it("应该返回公开项目详情给非成员用户", async () => {
			const project = await createTestProjectInDb(
				{
					name: "Public Project",
					slug: "public-project",
					visibility: "PUBLIC",
				},
				testUser.id,
			);

			const response = await apiHelper.get(
				`/api/projects/${project.id}`,
				regularAuthToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.visibility).toBe("PUBLIC");
			expect(response.data.data.currentUserRole).toBeNull();
		});

		it("应该拒绝访问私有项目的非成员用户", async () => {
			const project = await createTestProjectInDb(
				{
					name: "Private Project",
					slug: "private-project",
					visibility: "PRIVATE",
				},
				testUser.id,
			);

			const response = await apiHelper.get(
				`/api/projects/${project.id}`,
				regularAuthToken,
			);

			expectErrorResponse(response, 404);
		});

		it("应该拒绝未认证的请求", async () => {
			const project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
					visibility: "PUBLIC",
				},
				testUser.id,
			);

			const response = await apiHelper.get(`/api/projects/${project.id}`);

			expectErrorResponse(response, 401);
		});

		it("应该返回不存在的项目404错误", async () => {
			const response = await apiHelper.get(
				"/api/projects/nonexistent-id",
				authToken,
			);

			expectErrorResponse(response, 404);
		});
	});

	describe("PUT /api/projects/[id]", () => {
		let project: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Original Project",
					slug: "original-project",
					description: "Original description",
					visibility: "PRIVATE",
				},
				testUser.id,
			);
		});

		it("应该允许项目所有者更新项目", async () => {
			const updateData = {
				name: "Updated Project",
				slug: "updated-project",
				description: "Updated description",
				visibility: "PUBLIC",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.name).toBe("Updated Project");
			expect(response.data.data.slug).toBe("updated-project");
			expect(response.data.data.description).toBe("Updated description");
			expect(response.data.data.visibility).toBe("PUBLIC");
		});

		it("应该允许项目管理员更新项目", async () => {
			// 添加管理员成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: MemberRole.ADMIN,
				},
			});

			const updateData = {
				name: "Admin Updated Project",
				description: "Updated by admin",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				adminAuthToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.name).toBe("Admin Updated Project");
			expect(response.data.data.description).toBe("Updated by admin");
		});

		it("应该拒绝普通成员更新项目", async () => {
			// 添加普通成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: regularUser.id,
					role: MemberRole.VIEWER,
				},
			});

			const updateData = {
				name: "Should Not Update",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				regularAuthToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝非成员更新项目", async () => {
			const updateData = {
				name: "Should Not Update",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				regularAuthToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该验证项目名称", async () => {
			const invalidData = {
				name: "", // 空名称
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				invalidData,
				authToken,
			);

			expectValidationError(response);
		});

		it("应该验证项目标识符格式", async () => {
			const invalidData = {
				slug: "Invalid Slug!",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				invalidData,
				authToken,
			);

			expectValidationError(response);
		});

		it("应该拒绝重复的项目标识符", async () => {
			// 创建另一个项目
			const otherProject = await createTestProjectInDb(
				{
					name: "Other Project",
					slug: "other-project",
				},
				testUser.id,
			);

			const updateData = {
				slug: "other-project", // 尝试使用已存在的slug
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				authToken,
			);

			expectErrorResponse(response, 409);
		});

		it("应该允许部分更新", async () => {
			const updateData = {
				description: "New description only",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.name).toBe("Original Project"); // 未更改
			expect(response.data.data.description).toBe("New description only"); // 已更改
		});

		it("应该拒绝未认证的更新请求", async () => {
			const updateData = {
				name: "Should Not Update",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}`,
				updateData,
			);

			expectErrorResponse(response, 401);
		});
	});

	describe("DELETE /api/projects/[id]", () => {
		let project: any;
		let projectWithApps: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Deletable Project",
					slug: "deletable-project",
				},
				testUser.id,
			);

			// 创建有依赖项的项目
			projectWithApps = await createTestProjectInDb(
				{
					name: "Project With Apps",
					slug: "project-with-apps",
				},
				testUser.id,
			);

			// 添加应用程序依赖
			await testDb.application.create({
				data: {
					name: "Test App",
					slug: "test-app",
					description: "Test application",
					projectId: projectWithApps.id,
					createdBy: testUser.id,
				},
			});
		});

		it("应该允许项目所有者删除项目", async () => {
			const response = await apiHelper.delete(
				`/api/projects/${project.id}`,
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.message).toBe("项目删除成功");
			expect(response.data.data.deletedProject.id).toBe(project.id);

			// 验证项目已删除
			const deletedProject = await testDb.project.findUnique({
				where: { id: project.id },
			});
			expect(deletedProject).toBeNull();

			// 验证成员关系已删除
			const members = await testDb.projectMember.findMany({
				where: { projectId: project.id },
			});
			expect(members).toHaveLength(0);
		});

		it("应该拒绝项目管理员删除项目", async () => {
			// 添加管理员成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: MemberRole.ADMIN,
				},
			});

			const response = await apiHelper.delete(
				`/api/projects/${project.id}`,
				adminAuthToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝普通成员删除项目", async () => {
			// 添加普通成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: regularUser.id,
					role: MemberRole.VIEWER,
				},
			});

			const response = await apiHelper.delete(
				`/api/projects/${project.id}`,
				regularAuthToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝删除有依赖项的项目", async () => {
			const response = await apiHelper.delete(
				`/api/projects/${projectWithApps.id}`,
				authToken,
			);

			expectErrorResponse(response, 409);
			expect(response.data.error.message).toContain("包含应用程序或数据版本");
		});

		it("应该拒绝删除不存在的项目", async () => {
			const response = await apiHelper.delete(
				"/api/projects/nonexistent-id",
				authToken,
			);

			expectErrorResponse(response, 403); // 因为权限检查在存在性检查之前
		});

		it("应该拒绝未认证的删除请求", async () => {
			const response = await apiHelper.delete(`/api/projects/${project.id}`);

			expectErrorResponse(response, 401);
		});
	});

	describe("权限测试", () => {
		it("应该正确处理各种角色权限", async () => {
			const project = await createTestProjectInDb(
				{
					name: "Permission Test Project",
					slug: "permission-test",
				},
				testUser.id,
			);

			// 添加管理员和普通成员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: MemberRole.ADMIN,
				},
			});

			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: regularUser.id,
					role: MemberRole.VIEWER,
				},
			});

			// 测试查看权限
			const ownerView = await apiHelper.get(
				`/api/projects/${project.id}`,
				authToken,
			);
			const adminView = await apiHelper.get(
				`/api/projects/${project.id}`,
				adminAuthToken,
			);
			const memberView = await apiHelper.get(
				`/api/projects/${project.id}`,
				regularAuthToken,
			);

			expectSuccessResponse(ownerView);
			expectSuccessResponse(adminView);
			expectSuccessResponse(memberView);

			expect(ownerView.data.data.currentUserRole).toBe("OWNER");
			expect(adminView.data.data.currentUserRole).toBe("ADMIN");
			expect(memberView.data.data.currentUserRole).toBe("VIEWER");

			// 测试编辑权限
			const ownerEdit = await apiHelper.put(
				`/api/projects/${project.id}`,
				{ name: "Owner Edit" },
				authToken,
			);
			const adminEdit = await apiHelper.put(
				`/api/projects/${project.id}`,
				{ name: "Admin Edit" },
				adminAuthToken,
			);
			const memberEdit = await apiHelper.put(
				`/api/projects/${project.id}`,
				{ name: "Member Edit" },
				regularAuthToken,
			);

			expectSuccessResponse(ownerEdit);
			expectSuccessResponse(adminEdit);
			expectErrorResponse(memberEdit, 403);

			// 测试删除权限
			const ownerDelete = await apiHelper.delete(
				`/api/projects/${project.id}`,
				authToken,
			);
			const adminDelete = await apiHelper.delete(
				`/api/projects/${project.id}`,
				adminAuthToken,
			);
			const memberDelete = await apiHelper.delete(
				`/api/projects/${project.id}`,
				regularAuthToken,
			);

			// 由于项目已被所有者删除，这些请求应该返回404或403
			expect([404, 403]).toContain(ownerDelete.status);
			expect([404, 403]).toContain(adminDelete.status);
			expect([404, 403]).toContain(memberDelete.status);
		});
	});
});
