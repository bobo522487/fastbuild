import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CreateProjectSchema } from "~/lib/validations";
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

describe("/api/projects API", () => {
	let apiHelper: ApiTestHelper;
	let testUser: any;
	let authToken: string;

	beforeAll(async () => {
		apiHelper = new ApiTestHelper();
		testUser = await createTestUserInDb({
			email: "project-test@example.com",
			name: "Project Test User",
		});

		// 创建认证token（这里简化处理，实际项目中需要正确的JWT生成）
		authToken = "test-auth-token";
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

	describe("GET /api/projects", () => {
		it("应该返回空项目列表", async () => {
			const response = await apiHelper.get("/api/projects", authToken);

			expectSuccessResponse(response);
			expect(response.data.data).toEqual([]);
			expect(response.data.pagination.total).toBe(0);
		});

		it("应该返回用户的项目列表", async () => {
			// 创建测试项目
			await createTestProjectInDb(
				{
					name: "User Project 1",
					slug: "user-project-1",
				},
				testUser.id,
			);

			await createTestProjectInDb(
				{
					name: "User Project 2",
					slug: "user-project-2",
				},
				testUser.id,
			);

			const response = await apiHelper.get("/api/projects", authToken);

			expectSuccessResponse(response);
			expect(response.data.data).toHaveLength(2);
			expect(response.data.pagination.total).toBe(2);

			// 验证返回的数据结构
			const project = response.data.data[0];
			expect(project).toHaveProperty("id");
			expect(project).toHaveProperty("name");
			expect(project).toHaveProperty("slug");
			expect(project).toHaveProperty("visibility");
			expect(project).toHaveProperty("createdAt");
			expect(project).toHaveProperty("members");
			expect(project).toHaveProperty("_count");
		});

		it("应该支持分页", async () => {
			// 创建5个项目
			for (let i = 0; i < 5; i++) {
				await createTestProjectInDb(
					{
						name: `Project ${i}`,
						slug: `project-${i}`,
					},
					testUser.id,
				);
			}

			// 请求第一页，每页2个
			const response = await apiHelper.get(
				"/api/projects?page=1&limit=2",
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data).toHaveLength(2);
			expect(response.data.pagination.total).toBe(5);
			expect(response.data.pagination.totalPages).toBe(3);
			expect(response.data.pagination.hasNext).toBe(true);
			expect(response.data.pagination.hasPrev).toBe(false);
		});

		it("应该支持搜索", async () => {
			await createTestProjectInDb(
				{
					name: "Searchable Project",
					slug: "searchable-project",
				},
				testUser.id,
			);

			await createTestProjectInDb(
				{
					name: "Another Project",
					slug: "another-project",
				},
				testUser.id,
			);

			const response = await apiHelper.get(
				"/api/projects?search=Searchable",
				authToken,
			);

			expectSuccessResponse(response);
			expect(response.data.data).toHaveLength(1);
			expect(response.data.data[0].name).toBe("Searchable Project");
		});

		it("应该拒绝未认证的请求", async () => {
			const response = await apiHelper.get("/api/projects");

			expectErrorResponse(response, 401);
		});
	});

	describe("POST /api/projects", () => {
		const validProjectData = {
			name: "New Test Project",
			slug: "new-test-project",
			description: "A new test project",
			visibility: "PRIVATE",
		};

		it("应该成功创建项目", async () => {
			const response = await apiHelper.post(
				"/api/projects",
				validProjectData,
				authToken,
			);

			expectSuccessResponse(response, 201);
			expect(response.data.data.name).toBe(validProjectData.name);
			expect(response.data.data.slug).toBe(validProjectData.slug);
			expect(response.data.data.description).toBe(validProjectData.description);
			expect(response.data.data.visibility).toBe(validProjectData.visibility);
			expect(response.data.data.createdBy).toBe(testUser.id);

			// 验证创建了成员关系
			expect(response.data.data.members).toHaveLength(1);
			expect(response.data.data.members[0].role).toBe("OWNER");
		});

		it("应该验证必填字段", async () => {
			const invalidData = {
				description: "Missing required fields",
			};

			const response = await apiHelper.post(
				"/api/projects",
				invalidData,
				authToken,
			);

			expectValidationError(response);
		});

		it("应该验证项目名称长度", async () => {
			const invalidData = {
				...validProjectData,
				name: "", // 空名称
			};

			const response = await apiHelper.post(
				"/api/projects",
				invalidData,
				authToken,
			);

			expectValidationError(response, "name");
		});

		it("应该验证slug格式", async () => {
			const invalidData = {
				...validProjectData,
				slug: "Invalid Slug!", // 包含特殊字符
			};

			const response = await apiHelper.post(
				"/api/projects",
				invalidData,
				authToken,
			);

			expectValidationError(response, "slug");
		});

		it("应该拒绝未认证的请求", async () => {
			const response = await apiHelper.post("/api/projects", validProjectData);

			expectErrorResponse(response, 401);
		});

		it("应该处理项目名称重复", async () => {
			// 先创建一个项目
			await createTestProjectInDb(validProjectData, testUser.id);

			// 尝试创建同名项目
			const response = await apiHelper.post(
				"/api/projects",
				validProjectData,
				authToken,
			);

			expectErrorResponse(response, 409);
			expect(response.data.error.code).toBe("ALREADY_EXISTS");
		});

		it("应该自动生成唯一slug", async () => {
			const projectData = {
				name: "Test Project with Duplicate Slug",
				slug: "duplicate-slug", // 可能重复的slug
				description: "Test slug generation",
				visibility: "PUBLIC",
			};

			// 先创建一个项目
			await createTestProjectInDb(projectData, testUser.id);

			// 再次创建同名slug的项目
			const response = await apiHelper.post(
				"/api/projects",
				projectData,
				authToken,
			);

			expectSuccessResponse(response, 201);
			expect(response.data.data.slug).not.toBe("duplicate-slug");
			expect(response.data.data.slug).toContain(
				"test-project-with-duplicate-slug",
			);
		});
	});

	describe("数据验证", () => {
		it("应该正确验证项目名称", () => {
			const validNames = [
				"Valid Project Name",
				"项目名称123",
				"Project-with-dashes",
				"Project_with_underscores",
			];

			validNames.forEach((name) => {
				const result = CreateProjectSchema.safeParse({ name });
				expect(result.success).toBe(true);
			});

			const invalidNames = [
				"",
				"a".repeat(101), // 超过100字符
				"Project@Invalid", // 包含特殊字符
			];

			invalidNames.forEach((name) => {
				const result = CreateProjectSchema.safeParse({ name });
				expect(result.success).toBe(false);
			});
		});

		it("应该正确验证slug", () => {
			const validSlugs = ["valid-slug", "slug_123", "slug-with-dashes", "slug"];

			validSlugs.forEach((slug) => {
				const result = CreateProjectSchema.safeParse({ slug });
				expect(result.success).toBe(true);
			});

			const invalidSlugs = [
				"",
				"a".repeat(51), // 超过50字符
				"Invalid Slug!",
				"UPPERCASE-SLUG",
				"slug with spaces",
			];

			invalidSlugs.forEach((slug) => {
				const result = CreateProjectSchema.safeParse({ slug });
				expect(result.success).toBe(false);
			});
		});

		it("应该正确验证可见性", () => {
			const validVisibilities = ["PUBLIC", "PRIVATE"];

			validVisibilities.forEach((visibility) => {
				const result = CreateProjectSchema.safeParse({ visibility });
				expect(result.success).toBe(true);
			});

			const invalidVisibility = "INVALID";
			const result = CreateProjectSchema.safeParse({
				visibility: invalidVisibility,
			});
			expect(result.success).toBe(false);
		});
	});
});
