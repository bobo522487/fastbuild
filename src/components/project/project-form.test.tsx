import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestDataFactory } from "@tests/utils/factory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectForm } from "~/components/project/project-form";

describe("ProjectForm 组件 - 单元测试", () => {
	const mockToast = {
		success: vi.fn(),
		error: vi.fn(),
	};

	const mockRouter = {
		push: vi.fn(),
		refresh: vi.fn(),
	};

	beforeEach(() => {
		// Setup toast mock
		vi.mock("sonner", () => ({
			toast: mockToast,
		}));

		// Setup router mock
		vi.mock("next/navigation", () => ({
			useRouter: () => mockRouter,
		}));

		// Mock global fetch
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("表单渲染", () => {
		it("AC1: 应该渲染所有必需字段", () => {
			render(<ProjectForm />);

			expect(screen.getByLabelText("项目名称")).toBeInTheDocument();
			expect(screen.getByLabelText("项目描述")).toBeInTheDocument();
			expect(screen.getByLabelText("可见性")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "创建项目" }),
			).toBeInTheDocument();
		});

		it("AC1: 应该显示正确的占位符文本", () => {
			render(<ProjectForm />);

			expect(screen.getByPlaceholderText("输入项目名称")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("输入项目描述（可选）"),
			).toBeInTheDocument();
		});

		it("AC1: 应该提供可见性选项", () => {
			render(<ProjectForm />);

			expect(screen.getByText("私有")).toBeInTheDocument();
			expect(screen.getByText("公开")).toBeInTheDocument();
		});
	});

	describe("表单验证", () => {
		it("AC1: 应该验证项目名称必填", async () => {
			render(<ProjectForm />);

			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("项目名称是必填项")).toBeInTheDocument();
			});
		});

		it("AC1: 应该验证项目名称长度", async () => {
			render(<ProjectForm />);

			const nameInput = screen.getByLabelText("项目名称");
			const submitButton = screen.getByRole("button", { name: "创建项目" });

			fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText("项目名称不能超过100个字符"),
				).toBeInTheDocument();
			});
		});

		it("AC1: 应该验证可见性选项", async () => {
			render(<ProjectForm />);

			const submitButton = screen.getByRole("button", { name: "创建项目" });

			// 尝试提交无效的可见性值
			const visibilitySelect = screen.getByLabelText("可见性");
			fireEvent.change(visibilitySelect, { target: { value: "INVALID" } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("请选择有效的可见性选项")).toBeInTheDocument();
			});
		});

		it("AC1: 应该验证特殊字符输入", async () => {
			render(<ProjectForm />);

			const nameInput = screen.getByLabelText("项目名称");
			const submitButton = screen.getByRole("button", { name: "创建项目" });

			// 测试包含特殊字符的项目名称
			fireEvent.change(nameInput, {
				target: { value: '项目<script>alert("xss")</script>' },
			});
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("项目名称包含无效字符")).toBeInTheDocument();
			});
		});
	});

	describe("表单提交", () => {
		it("AC1: 应该成功创建项目", async () => {
			// Mock successful API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							id: "project-id",
							slug: "test-project",
							name: "测试项目",
							description: "这是一个测试项目",
							visibility: "PRIVATE",
						},
					}),
			});

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "测试项目" },
			});
			fireEvent.change(screen.getByLabelText("项目描述"), {
				target: { value: "这是一个测试项目" },
			});
			fireEvent.change(screen.getByLabelText("可见性"), {
				target: { value: "PRIVATE" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith(
					"/api/projects",
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							name: "测试项目",
							description: "这是一个测试项目",
							visibility: "PRIVATE",
						}),
					}),
				);

				expect(mockToast.success).toHaveBeenCalledWith("项目创建成功！");
				expect(mockRouter.push).toHaveBeenCalledWith("/projects/test-project");
			});
		});

		it("AC1: 应该使用默认可见性PRIVATE", async () => {
			// Mock successful API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							id: "project-id",
							slug: "test-project",
							name: "测试项目",
							visibility: "PRIVATE",
						},
					}),
			});

			render(<ProjectForm />);

			// Fill form (不设置可见性)
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "测试项目" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				const requestBody = JSON.parse(
					(global.fetch as any).mock.calls[0][1].body,
				);
				expect(requestBody.visibility).toBe("PRIVATE");
			});
		});

		it("AC1: 应该处理创建失败", async () => {
			// Mock failed API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () =>
					Promise.resolve({
						success: false,
						error: { message: "项目名称已存在" },
					}),
			});

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "重复项目名" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith("项目名称已存在");
				expect(screen.getByText("项目名称已存在")).toBeInTheDocument();
			});
		});

		it("AC1: 应该处理网络错误", async () => {
			// Mock network error
			(global.fetch as any).mockRejectedValueOnce(new Error("网络连接失败"));

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "测试项目" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith(
					"创建项目失败，请稍后重试",
				);
			});
		});

		it("AC1: 应该处理服务器错误响应", async () => {
			// Mock server error with validation details
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () =>
					Promise.resolve({
						success: false,
						error: {
							code: "VALIDATION_ERROR",
							message: "输入验证失败",
							details: [
								{ field: "name", message: "项目名称格式不正确" },
								{ field: "description", message: "描述包含敏感内容" },
							],
						},
					}),
			});

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "无效项目名" },
			});
			fireEvent.change(screen.getByLabelText("项目描述"), {
				target: { value: "敏感描述内容" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("项目名称格式不正确")).toBeInTheDocument();
				expect(screen.getByText("描述包含敏感内容")).toBeInTheDocument();
			});
		});
	});

	describe("加载状态", () => {
		it("AC1: 应该在提交时显示加载状态", async () => {
			// Mock delayed response
			(global.fetch as any).mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () =>
										Promise.resolve({
											success: true,
											data: { id: "project-id" },
										}),
								}),
							100,
						);
					}),
			);

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "测试项目" },
			});

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			// Should show loading state
			expect(
				screen.getByRole("button", { name: "创建中..." }),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "创建中..." })).toBeDisabled();

			// Wait for completion
			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "创建项目" }),
				).toBeInTheDocument();
			});
		});

		it("AC1: 应该在加载时禁用表单字段", async () => {
			// Mock delayed response
			(global.fetch as any).mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () =>
										Promise.resolve({
											success: true,
											data: { id: "project-id" },
										}),
								}),
							100,
						);
					}),
			);

			render(<ProjectForm />);

			// Fill form
			const nameInput = screen.getByLabelText("项目名称");
			const descriptionInput = screen.getByLabelText("项目描述");
			const visibilitySelect = screen.getByLabelText("可见性");

			fireEvent.change(nameInput, { target: { value: "测试项目" } });

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			// Should disable form fields during loading
			expect(nameInput).toBeDisabled();
			expect(descriptionInput).toBeDisabled();
			expect(visibilitySelect).toBeDisabled();
		});
	});

	describe("表单重置", () => {
		it("AC1: 应该在成功创建后重置表单", async () => {
			// Mock successful API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							id: "project-id",
							slug: "test-project",
							name: "测试项目",
						},
					}),
			});

			render(<ProjectForm />);

			// Fill form
			const nameInput = screen.getByLabelText("项目名称");
			const descriptionInput = screen.getByLabelText("项目描述");

			fireEvent.change(nameInput, { target: { value: "测试项目" } });
			fireEvent.change(descriptionInput, { target: { value: "测试描述" } });

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				// Form should be reset
				expect(nameInput).toHaveValue("");
				expect(descriptionInput).toHaveValue("");
			});
		});

		it("AC1: 不应该在失败时重置表单", async () => {
			// Mock failed API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				json: () =>
					Promise.resolve({
						success: false,
						error: { message: "创建失败" },
					}),
			});

			render(<ProjectForm />);

			// Fill form
			const nameInput = screen.getByLabelText("项目名称");
			const descriptionInput = screen.getByLabelText("项目描述");

			fireEvent.change(nameInput, { target: { value: "测试项目" } });
			fireEvent.change(descriptionInput, { target: { value: "测试描述" } });

			// Submit form
			const submitButton = screen.getByRole("button", { name: "创建项目" });
			fireEvent.click(submitButton);

			await waitFor(() => {
				// Form should not be reset
				expect(nameInput).toHaveValue("测试项目");
				expect(descriptionInput).toHaveValue("测试描述");
			});
		});
	});

	describe("用户体验", () => {
		it("AC1: 应该提供实时验证反馈", async () => {
			render(<ProjectForm />);

			const nameInput = screen.getByLabelText("项目名称");

			// Test name length validation
			fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });
			fireEvent.blur(nameInput);

			await waitFor(() => {
				expect(
					screen.getByText("项目名称不能超过100个字符"),
				).toBeInTheDocument();
			});

			// Fix the validation error
			fireEvent.change(nameInput, { target: { value: "有效名称" } });
			fireEvent.blur(nameInput);

			await waitFor(() => {
				expect(
					screen.queryByText("项目名称不能超过100个字符"),
				).not.toBeInTheDocument();
			});
		});

		it("AC1: 应该显示帮助文本", () => {
			render(<ProjectForm />);

			expect(screen.getByText("项目名称不能超过100个字符")).toBeInTheDocument();
			expect(screen.getByText("选择项目的可见性设置")).toBeInTheDocument();
		});

		it("AC1: 应该支持键盘提交", async () => {
			// Mock successful API response
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: { id: "project-id" },
					}),
			});

			render(<ProjectForm />);

			// Fill form
			fireEvent.change(screen.getByLabelText("项目名称"), {
				target: { value: "测试项目" },
			});

			// Submit with Enter key
			const nameInput = screen.getByLabelText("项目名称");
			fireEvent.keyDown(nameInput, { key: "Enter", code: "Enter" });

			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalled();
			});
		});

		it("AC1: 应该使用测试数据工厂进行批量测试", async () => {
			// Generate test projects using factory
			const testProjects = TestDataFactory.createTestProjects(
				3,
				"test-owner-id",
			);

			for (const project of testProjects) {
				// Mock successful API response
				(global.fetch as any).mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: { id: `project-${project.slug}` },
						}),
				});

				render(<ProjectForm />);

				// Fill form with test data
				fireEvent.change(screen.getByLabelText("项目名称"), {
					target: { value: project.name },
				});
				fireEvent.change(screen.getByLabelText("项目描述"), {
					target: { value: project.description },
				});
				fireEvent.change(screen.getByLabelText("可见性"), {
					target: { value: project.visibility },
				});

				// Submit form
				const submitButton = screen.getByRole("button", { name: "创建项目" });
				fireEvent.click(submitButton);

				await waitFor(() => {
					expect(global.fetch).toHaveBeenCalledWith(
						"/api/projects",
						expect.objectContaining({
							method: "POST",
							body: JSON.stringify({
								name: project.name,
								description: project.description,
								visibility: project.visibility,
							}),
						}),
					);
				});

				// Cleanup for next test
				vi.clearAllMocks();
			}
		});
	});
});
