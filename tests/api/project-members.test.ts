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

describe("/api/projects/[id]/members API", () => {
	let apiHelper: ApiTestHelper;
	let ownerUser: any;
	let adminUser: any;
	let memberUser: any;
	let newUser: any;
	let ownerToken: string;
	let adminToken: string;
	let memberToken: string;
	let newUserToken: string;

	beforeAll(async () => {
		apiHelper = new ApiTestHelper();

		// 创建测试用户
		ownerUser = await createTestUserInDb({
			email: "owner@test.com",
			name: "Project Owner",
		});

		adminUser = await createTestUserInDb({
			email: "admin@test.com",
			name: "Project Admin",
		});

		memberUser = await createTestUserInDb({
			email: "member@test.com",
			name: "Project Member",
		});

		newUser = await createTestUserInDb({
			email: "newuser@test.com",
			name: "New User",
		});

		// 创建认证token
		ownerToken = "owner-auth-token";
		adminToken = "admin-auth-token";
		memberToken = "member-auth-token";
		newUserToken = "newuser-auth-token";
	});

	afterAll(async () => {
		await cleanupTestDb();
		await testDb.$disconnect();
	});

	beforeEach(async () => {
		// 清理数据
		await testDb.project.deleteMany();
		await testDb.projectMember.deleteMany();
	});

	describe("GET /api/projects/[id]/members", () => {
		let project: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
				},
				ownerUser.id,
			);

			// 添加管理员和成员
			await testDb.projectMember.createMany({
				data: [
					{
						projectId: project.id,
						userId: adminUser.id,
						role: "ADMIN",
					},
					{
						projectId: project.id,
						userId: memberUser.id,
						role: "VIEWER",
					},
				],
			});
		});

		it("应该返回项目成员列表给项目所有者", async () => {
			const response = await apiHelper.get(
				`/api/projects/${project.id}/members`,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.members).toHaveLength(3);
			expect(response.data.data.currentUserRole).toBe("OWNER");
			expect(response.data.data.pagination.total).toBe(3);

			// 验证成员信息
			const members = response.data.data.members;
			const owner = members.find((m: any) => m.user.email === "owner@test.com");
			const admin = members.find((m: any) => m.user.email === "admin@test.com");
			const member = members.find(
				(m: any) => m.user.email === "member@test.com",
			);

			expect(owner.role).toBe("OWNER");
			expect(admin.role).toBe("ADMIN");
			expect(member.role).toBe("VIEWER");
		});

		it("应该返回项目成员列表给管理员", async () => {
			const response = await apiHelper.get(
				`/api/projects/${project.id}/members`,
				adminToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.currentUserRole).toBe("ADMIN");
			expect(response.data.data.members).toHaveLength(3);
		});

		it("应该返回项目成员列表给普通成员", async () => {
			const response = await apiHelper.get(
				`/api/projects/${project.id}/members`,
				memberToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.currentUserRole).toBe("VIEWER");
			expect(response.data.data.members).toHaveLength(3);
		});

		it("应该支持搜索功能", async () => {
			const response = await apiHelper.get(
				`/api/projects/${project.id}/members?search=admin`,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.members).toHaveLength(1);
			expect(response.data.data.members[0].user.email).toBe("admin@test.com");
		});

		it("应该支持角色过滤", async () => {
			const response = await apiHelper.get(
				`/api/projects/${project.id}/members?role=ADMIN`,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.members).toHaveLength(1);
			expect(response.data.data.members[0].role).toBe("ADMIN");
		});

		it("应该支持分页", async () => {
			// 添加更多成员
			for (let i = 0; i < 5; i++) {
				const user = await createTestUserInDb({
					email: `member${i}@test.com`,
					name: `Member ${i}`,
				});

				await testDb.projectMember.create({
					data: {
						projectId: project.id,
						userId: user.id,
						role: "VIEWER",
					},
				});
			}

			const response = await apiHelper.get(
				`/api/projects/${project.id}/members?page=1&limit=3`,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.members).toHaveLength(3);
			expect(response.data.data.pagination.total).toBe(8);
			expect(response.data.data.pagination.totalPages).toBe(3);
		});

		it("应该拒绝非成员访问私有项目", async () => {
			const privateProject = await createTestProjectInDb(
				{
					name: "Private Project",
					slug: "private-project",
					visibility: "PRIVATE",
				},
				ownerUser.id,
			);

			const response = await apiHelper.get(
				`/api/projects/${privateProject.id}/members`,
				newUserToken,
			);

			expectErrorResponse(response, 404);
		});

		it("应该允许任何人查看公开项目的成员", async () => {
			const publicProject = await createTestProjectInDb(
				{
					name: "Public Project",
					slug: "public-project",
					visibility: "PUBLIC",
				},
				ownerUser.id,
			);

			const response = await apiHelper.get(
				`/api/projects/${publicProject.id}/members`,
				newUserToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.currentUserRole).toBeNull();
			expect(response.data.data.members).toHaveLength(1);
		});
	});

	describe("POST /api/projects/[id]/members", () => {
		let project: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
				},
				ownerUser.id,
			);

			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: "ADMIN",
				},
			});
		});

		it("应该允许所有者邀请成员", async () => {
			const inviteData = {
				email: "newuser@test.com",
				role: "VIEWER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				ownerToken,
			);

			expectSuccessResponse(response, 201);
			expect(response.data.data.user.email).toBe("newuser@test.com");
			expect(response.data.data.role).toBe("VIEWER");
		});

		it("应该允许管理员邀请普通成员", async () => {
			const inviteData = {
				email: "newuser@test.com",
				role: "VIEWER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				adminToken,
			);

			expectSuccessResponse(response, 201);
			expect(response.data.data.role).toBe("VIEWER");
		});

		it("应该拒绝管理员邀请所有者", async () => {
			const inviteData = {
				email: "newuser@test.com",
				role: "OWNER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				adminToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝普通成员邀请其他成员", async () => {
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: memberUser.id,
					role: "VIEWER",
				},
			});

			const inviteData = {
				email: "newuser@test.com",
				role: "VIEWER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				memberToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝邀请不存在的用户", async () => {
			const inviteData = {
				email: "nonexistent@test.com",
				role: "VIEWER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				ownerToken,
			);

			expectErrorResponse(response, 404);
		});

		it("应该拒绝重复邀请同一用户", async () => {
			// 先邀请一次
			await apiHelper.post(
				`/api/projects/${project.id}/members`,
				{
					email: "newuser@test.com",
					role: "VIEWER",
				},
				ownerToken,
			);

			// 再次邀请同一用户
			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				{
					email: "newuser@test.com",
					role: "ADMIN",
				},
				ownerToken,
			);

			expectErrorResponse(response, 409);
		});

		it("应该验证邮箱格式", async () => {
			const inviteData = {
				email: "invalid-email",
				role: "VIEWER",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				ownerToken,
			);

			expectValidationError(response);
		});

		it("应该验证角色参数", async () => {
			const inviteData = {
				email: "newuser@test.com",
				role: "INVALID_ROLE",
			};

			const response = await apiHelper.post(
				`/api/projects/${project.id}/members`,
				inviteData,
				ownerToken,
			);

			expectValidationError(response);
		});
	});

	describe("PUT /api/projects/[id]/members/[memberId]", () => {
		let project: any;
		let targetMember: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
				},
				ownerUser.id,
			);

			// 添加目标成员
			targetMember = await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: memberUser.id,
					role: "VIEWER",
				},
				include: {
					user: true,
				},
			});

			// 添加管理员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: "ADMIN",
				},
			});
		});

		it("应该允许所有者修改成员角色", async () => {
			const updateData = {
				role: "ADMIN",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				updateData,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.role).toBe("ADMIN");
		});

		it("应该拒绝管理员修改成员角色", async () => {
			const updateData = {
				role: "ADMIN",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				updateData,
				adminToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝成员修改角色", async () => {
			const updateData = {
				role: "ADMIN",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				updateData,
				memberToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝用户修改自己的角色", async () => {
			const updateData = {
				role: "ADMIN",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				updateData,
				memberToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝移除唯一的所有者", async () => {
			// 尝试将唯一所有者降级
			const ownerMember = await testDb.projectMember.findFirst({
				where: {
					projectId: project.id,
					userId: ownerUser.id,
				},
			});

			const updateData = {
				role: "ADMIN",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${ownerMember?.id}`,
				updateData,
				ownerToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该验证角色参数", async () => {
			const updateData = {
				role: "INVALID_ROLE",
			};

			const response = await apiHelper.put(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				updateData,
				ownerToken,
			);

			expectValidationError(response);
		});
	});

	describe("DELETE /api/projects/[id]/members/[memberId]", () => {
		let project: any;
		let targetMember: any;

		beforeEach(async () => {
			project = await createTestProjectInDb(
				{
					name: "Test Project",
					slug: "test-project",
				},
				ownerUser.id,
			);

			// 添加目标成员
			targetMember = await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: memberUser.id,
					role: "VIEWER",
				},
				include: {
					user: true,
				},
			});

			// 添加管理员
			await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: adminUser.id,
					role: "ADMIN",
				},
			});
		});

		it("应该允许所有者移除成员", async () => {
			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				ownerToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.message).toBe("成员已移除");
			expect(response.data.data.removedMember.user.email).toBe(
				"member@test.com",
			);

			// 验证成员已被移除
			const deletedMember = await testDb.projectMember.findUnique({
				where: { id: targetMember.id },
			});
			expect(deletedMember).toBeNull();
		});

		it("应该允许管理员移除普通成员", async () => {
			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				adminToken,
			);

			expectSuccessResponse(response);
		});

		it("应该拒绝管理员移除所有者", async () => {
			const ownerMember = await testDb.projectMember.findFirst({
				where: {
					projectId: project.id,
					userId: ownerUser.id,
				},
			});

			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${ownerMember?.id}`,
				adminToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该允许成员自己退出项目", async () => {
			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${targetMember.id}`,
				memberToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data.message).toBe("已退出项目");
		});

		it("应该拒绝成员移除其他成员", async () => {
			// 添加另一个成员
			const anotherMember = await testDb.projectMember.create({
				data: {
					projectId: project.id,
					userId: newUser.id,
					role: "VIEWER",
				},
			});

			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${anotherMember.id}`,
				memberToken,
			);

			expectErrorResponse(response, 403);
		});

		it("应该拒绝移除唯一的所有者", async () => {
			const ownerMember = await testDb.projectMember.findFirst({
				where: {
					projectId: project.id,
					userId: ownerUser.id,
				},
			});

			const response = await apiHelper.delete(
				`/api/projects/${project.id}/members/${ownerMember?.id}`,
				ownerToken,
			);

			expectErrorResponse(response, 403);
		});
	});
});
