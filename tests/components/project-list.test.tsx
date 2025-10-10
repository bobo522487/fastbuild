import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectList } from "~/components/project/project-list";
import {
	createTestProject,
	mockFetchResponse,
	render,
} from "../utils/test-utils";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("~/hooks/use-toast", () => ({
	useToast: () => ({
		toast: mockToast,
	}),
}));

describe("ProjectList", () => {
	const mockProjects = [
		createTestProject({
			id: "1",
			name: "Project 1",
			slug: "project-1",
			description: "First test project",
			visibility: "PUBLIC",
			createdAt: new Date("2023-01-01"),
			updatedAt: new Date("2023-01-02"),
		}),
		createTestProject({
			id: "2",
			name: "Project 2",
			slug: "project-2",
			description: "Second test project",
			visibility: "PRIVATE",
			createdAt: new Date("2023-01-03"),
			updatedAt: new Date("3-01-04"),
		}),
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该渲染项目列表标题", () => {
		render(<ProjectList />);

		expect(screen.getByText("我的项目")).toBeInTheDocument();
		expect(
			screen.getByText("管理您的所有项目，创建新的应用程序"),
		).toBeInTheDocument();
	});

	it("应该显示创建项目按钮", () => {
		render(<ProjectList />);

		const createButton = screen.getByText("创建项目");
		expect(createButton).toBeInTheDocument();
	});

	it("应该调用创建项目回调", async () => {
		const onCreateProject = vi.fn();
		const user = userEvent.setup();

		render(<ProjectList onCreateProject={onCreateProject} />);

		const createButton = screen.getByText("创建项目");
		await user.click(createButton);

		expect(onCreateProject).toHaveBeenCalled();
	});

	it("应该显示加载状态", async () => {
		// Mock延迟响应
		vi.stubGlobal(
			"fetch",
			vi.fn(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () =>
										Promise.resolve({
											success: true,
											data: [],
											pagination: {
												page: 1,
												limit: 12,
												total: 0,
												totalPages: 1,
												hasNext: false,
												hasPrev: false,
											},
											meta: {
												timestamp: new Date().toISOString(),
												requestId: "test-id",
											},
										}),
								}),
							1000,
						),
					),
			),
		);

		render(<ProjectList />);

		// 应该显示加载占位符
		expect(screen.getAllByRole("generic")).toHaveLength(6); // 6个加载占位符
	});

	it("应该显示项目列表", async () => {
		// Mock API响应
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: mockProjects,
							pagination: {
								page: 1,
								limit: 12,
								total: 2,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(screen.getByText("Project 1")).toBeInTheDocument();
			expect(screen.getByText("Project 2")).toBeInTheDocument();
			expect(screen.getByText("First test project")).toBeInTheDocument();
			expect(screen.getByText("Second test project")).toBeInTheDocument();
		});
	});

	it("应该显示项目可见性标签", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: mockProjects,
							pagination: {
								page: 1,
								limit: 12,
								total: 2,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(screen.getByText("公开")).toBeInTheDocument();
			expect(screen.getByText("私有")).toBeInTheDocument();
		});
	});

	it("应该显示项目统计信息", async () => {
		const projectsWithCount = mockProjects.map((project) => ({
			...project,
			_count: {
				members: 3,
				applications: 2,
				DataVersions: 1,
			},
		}));

		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: projectsWithCount,
							pagination: {
								page: 1,
								limit: 12,
								total: 2,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(screen.getByText("3 成员")).toBeInTheDocument();
			expect(screen.getByText("2 成员")).toBeInTheDocument();
		});
	});

	it("应该处理搜索功能", async () => {
		const user = userEvent.setup();
		render(<ProjectList />);

		const searchInput = screen.getByPlaceholderText(/搜索项目/i);
		expect(searchInput).toBeInTheDocument();

		// 输入搜索关键词
		await user.type(searchInput, "Project 1");

		// 验证搜索API调用
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("search=Project+1"),
				expect.any(Object), // Headers
			);
		});
	});

	it("应该处理过滤功能", async () => {
		const user = userEvent.setup();
		render(<ProjectList />);

		// 找到可见性过滤器
		const visibilityFilter = screen.getByRole("combobox", { name: /可见性/i });
		await user.click(visibilityFilter);

		// 选择公开项目
		const publicOption = screen.getByText("公开");
		await user.click(publicOption);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("visibility=PUBLIC"),
				expect.any(Object),
			);
		});
	});

	it("应该处理排序功能", async () => {
		const user = userEvent.setup();
		render(<ProjectList />);

		// 找到排序选择器
		const sortFilter = screen.getByRole("combobox", { name: /排序/i });
		await user.click(sortFilter);

		// 选择按名称排序
		const nameOption = screen.getByText("名称");
		await user.click(nameOption);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("sort=name"),
				expect.any(Object),
			);
		});
	});

	it("应该显示空状态", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: [],
							pagination: {
								page: 1,
								limit: 12,
								total: 0,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(screen.getByText("还没有项目")).toBeInTheDocument();
			expect(
				screen.getByText("创建您的第一个项目开始构建应用程序"),
			).toBeInTheDocument();
		});
	});

	it("应该显示搜索无结果状态", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: [],
							pagination: {
								page: 1,
								limit: 12,
								total: 0,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		const searchInput = screen.getByPlaceholderText(/搜索项目/i);
		await user.type(searchInput, "nonexistent");

		await waitFor(() => {
			expect(screen.getByText("没有找到匹配的项目")).toBeInTheDocument();
		});
	});

	it("应该处理项目点击", async () => {
		const onProjectSelect = vi.fn();
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: mockProjects,
							pagination: {
								page: 1,
								limit: 12,
								total: 2,
								totalPages: 1,
								hasNext: false,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList onProjectSelect={onProjectSelect} />);

		await waitFor(() => {
			const projectCard = screen.getByText("Project 1");
			expect(projectCard).toBeInTheDocument();
		});

		// 点击第一个项目
		const projectCard = screen
			.getByText("Project 1")
			.closest('[role="generic"]');
		if (projectCard) {
			await userEvent.click(projectCard);
		}

		expect(onProjectSelect).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "1",
				name: "Project 1",
				slug: "project-1",
			}),
		);
	});

	it("应该处理API错误", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: false,
					json: () =>
						Promise.resolve({
							success: false,
							error: {
								code: "INTERNAL_ERROR",
								message: "Failed to fetch projects",
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith({
				title: "加载失败",
				description: "Failed to fetch projects",
				variant: "destructive",
			});
		});
	});

	it("应该显示分页控件", async () => {
		// Mock多页数据
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: mockProjects,
							pagination: {
								page: 1,
								limit: 1,
								total: 2,
								totalPages: 2,
								hasNext: true,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			expect(screen.getByText("下一页")).toBeInTheDocument();
			expect(screen.getByText("第 1 页，共 2 页")).toBeInTheDocument();
		});
	});

	it("应该处理分页导航", async () => {
		const user = userEvent.setup();

		// 第一页
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: [mockProjects[0]],
							pagination: {
								page: 1,
								limit: 1,
								total: 2,
								totalPages: 2,
								hasNext: true,
								hasPrev: false,
							},
							meta: {
								timestamp: new Date().toISOString(),
								requestId: "test-id",
							},
						}),
				}),
			),
		);

		render(<ProjectList />);

		await waitFor(() => {
			const nextPageButton = screen.getByText("下一页");
			expect(nextPageButton).toBeInTheDocument();
		});

		// 点击下一页
		const nextPageButton = screen.getByText("下一页");
		await user.click(nextPageButton);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("page=2"),
				expect.any(Object),
			);
		});
	});
});
