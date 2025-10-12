import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { cn, generateSlug } from "~/lib/utils";
import { CreateProjectSchema, ProjectQuerySchema } from "~/lib/validations";

describe("utils", () => {
	describe("cn (className utility)", () => {
		it("应该合并类名", () => {
			const result = cn("px-2", "py-1", "bg-blue-500");
			expect(result).toBe("px-2 py-1 bg-blue-500");
		});

		it("应该处理条件类名", () => {
			const result = cn("base-class", true && "conditional-class", false && "hidden-class");
			expect(result).toBe("base-class conditional-class");
		});

		it("应该处理Tailwind类名冲突", () => {
			const result = cn("px-2", "px-4", "bg-red-500", "bg-blue-500");
			expect(result).toBe("px-4 bg-blue-500");
		});

		it("应该处理空输入", () => {
			expect(cn()).toBe("");
			expect(cn("", null, undefined)).toBe("");
		});

		it("应该处理数组和对象", () => {
			const result = cn(["px-2", "py-1"], { "bg-blue-500": true, "text-white": false });
			expect(result).toBe("px-2 py-1 bg-blue-500");
		});
	});

	describe("generateSlug", () => {
		it("应该生成基本slug", () => {
			const slug = generateSlug("Test Project");
			expect(slug).toMatch(/^[a-z0-9\-]+-[a-z0-9]+$/);
		});

		it("应该处理中文字符", () => {
			const slug = generateSlug("测试项目");
			expect(slug).toMatch(/^[a-z0-9\-]+-[a-z0-9]+$/);
		});

		it("应该处理特殊字符", () => {
			const slug = generateSlug("Project@#$%^&*()");
			expect(slug).toMatch(/^[a-z0-9\-]+-[a-z0-9]+$/);
		});

		it("应该处理空字符串", () => {
			const slug = generateSlug("");
			expect(slug).toMatch(/^[a-z0-9]+$/);
		});

		it("应该生成唯一的slug", () => {
			const slug1 = generateSlug("Same Name");
			const slug2 = generateSlug("Same Name");
			expect(slug1).not.toBe(slug2);
		});

		it("应该转换为小写", () => {
			const slug = generateSlug("Test Project NAME");
			expect(slug).toBe(slug.toLowerCase());
		});

		it("应该用连字符替换空格", () => {
			const slug = generateSlug("Test Project Name");
			expect(slug).toContain("test-project-name");
		});

		it("应该移除多余的连字符", () => {
			const slug = generateSlug("Test--Project---Name");
			expect(slug).not.toContain("--");
			expect(slug).not.toContain("---");
		});

		it("应该移除开头和结尾的连字符", () => {
			const slug = generateSlug("-Test Project-");
			expect(slug).not.toMatch(/^-|-$/);
		});
	});
});

describe("validations", () => {
	describe("CreateProjectSchema", () => {
		it("应该验证有效的项目数据", () => {
			const validData = {
				name: "Test Project",
				slug: "test-project",
				description: "A test project",
				visibility: "PRIVATE",
			};

			const result = CreateProjectSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validData);
			}
		});

		it("应该使用默认可见性", () => {
			const data = {
				name: "Test Project",
				slug: "test-project",
			};

			const result = CreateProjectSchema.safeParse(data);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.visibility).toBe("PRIVATE");
			}
		});

		it("应该拒绝空项目名称", () => {
			const invalidData = {
				name: "",
				slug: "test-project",
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe("项目名称不能为空");
			}
		});

		it("应该拒绝过长的项目名称", () => {
			const invalidData = {
				name: "a".repeat(101), // 101字符
				slug: "test-project",
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"项目名称不能超过100个字符",
				);
			}
		});

		it("应该拒绝无效的项目名称", () => {
			const invalidData = {
				name: "Project@Invalid",
				slug: "test-project",
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("应该拒绝过长的描述", () => {
			const invalidData = {
				name: "Test Project",
				slug: "test-project",
				description: "a".repeat(501), // 501字符
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"项目描述不能超过500个字符",
				);
			}
		});

		it("应该拒绝无效的slug", () => {
			const invalidData = {
				name: "Test Project",
				slug: "Invalid Slug!",
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("应该拒绝过长的slug", () => {
			const invalidData = {
				name: "Test Project",
				slug: "a".repeat(51), // 51字符
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"项目标识符不能超过50个字符",
				);
			}
		});

		it("应该拒绝无效的可见性", () => {
			const invalidData = {
				name: "Test Project",
				slug: "test-project",
				visibility: "INVALID",
			};

			const result = CreateProjectSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("应该处理空描述", () => {
			const validData = {
				name: "Test Project",
				slug: "test-project",
				description: "",
			};

			const result = CreateProjectSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.description).toBeUndefined();
			}
		});
	});

	describe("ProjectQuerySchema", () => {
		it("应该验证有效的查询参数", () => {
			const validQuery = {
				page: "1",
				limit: "10",
				search: "test",
				visibility: "PUBLIC",
				sort: "name",
				order: "asc",
			};

			const result = ProjectQuerySchema.safeParse(validQuery);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(10);
				expect(result.data.search).toBe("test");
				expect(result.data.visibility).toBe("PUBLIC");
				expect(result.data.sort).toBe("name");
				expect(result.data.order).toBe("asc");
			}
		});

		it("应该使用默认值", () => {
			const emptyQuery = {};

			const result = ProjectQuerySchema.safeParse(emptyQuery);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(10);
				expect(result.data.sort).toBe("updatedAt");
				expect(result.data.order).toBe("desc");
			}
		});

		it("应该转换页码字符串为数字", () => {
			const query = { page: "5" };

			const result = ProjectQuerySchema.safeParse(query);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(5);
			}
		});

		it("应该拒绝无效的页码", () => {
			const invalidQueries = [
				{ page: "0" }, // 小于1
				{ page: "-1" }, // 负数
				{ page: "invalid" }, // 非数字
			];

			for (const query of invalidQueries) {
				const result = ProjectQuerySchema.safeParse(query);
				expect(result.success).toBe(false);
			}
		});

		it("应该拒绝无效的限制", () => {
			const invalidQueries = [
				{ limit: "0" }, // 小于1
				{ limit: "-1" }, // 负数
				{ limit: "101" }, // 大于100
				{ limit: "invalid" }, // 非数字
			];

			for (const query of invalidQueries) {
				const result = ProjectQuerySchema.safeParse(query);
				expect(result.success).toBe(false);
			}
		});

		it("应该拒绝无效的排序字段", () => {
			const invalidQuery = {
				sort: "invalid_field",
			};

			const result = ProjectQuerySchema.safeParse(invalidQuery);
			expect(result.success).toBe(false);
		});

		it("应该拒绝无效的排序方向", () => {
			const invalidQuery = {
				order: "invalid",
			};

			const result = ProjectQuerySchema.safeParse(invalidQuery);
			expect(result.success).toBe(false);
		});

		it("应该拒绝无效的可见性", () => {
			const invalidQuery = {
				visibility: "INVALID",
			};

			const result = ProjectQuerySchema.safeParse(invalidQuery);
			expect(result.success).toBe(false);
		});

		it("应该验证搜索关键词长度", () => {
			const invalidQuery = {
				search: "a".repeat(101), // 超过100字符
			};

			const result = ProjectQuerySchema.safeParse(invalidQuery);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"搜索关键词不能超过100个字符",
				);
			}
		});
	});
});
