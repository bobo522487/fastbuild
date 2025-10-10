import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectForm } from "~/components/project/project-form";
import {
	createTestUser,
	mockFetchError,
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

describe("ProjectForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该渲染项目创建表单", () => {
		render(<ProjectForm />);

		expect(screen.getByText("创建新项目")).toBeInTheDocument();
		expect(screen.getByLabelText(/项目名称/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/项目标识符/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/项目描述/i)).toBeInTheDocument();
		expect(screen.getByText("创建项目")).toBeInTheDocument();
	});

	it("应该验证必填字段", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 尝试提交空表单
		const submitButton = screen.getByText("创建项目");
		await user.click(submitButton);

		// 应该显示验证错误
		await waitFor(() => {
			expect(screen.getByText(/项目名称不能为空/)).toBeInTheDocument();
		});
	});

	it("应该自动生成slug", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		const nameInput = screen.getByLabelText(/项目名称/i);
		const slugInput = screen.getByLabelText(/项目标识符/i);

		// 输入项目名称
		await user.type(nameInput, "My Test Project");

		// 验证slug是否自动生成
		expect(slugInput).toHaveValue("my-test-project");
	});

	it("应该成功提交有效表单", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 填写表单
		await user.type(screen.getByLabelText(/项目名称/i), "Test Project");
		await user.type(
			screen.getByLabelText(/项目描述/i),
			"A test project for unit testing",
		);

		// Mock 成功的API响应
		mockFetchResponse(
			{
				success: true,
				data: {
					id: "project-1",
					name: "Test Project",
					slug: "test-project",
					description: "A test project for unit testing",
					visibility: "PRIVATE",
				},
			},
			201,
		);

		// 提交表单
		const submitButton = screen.getByText("创建项目");
		await user.click(submitButton);

		// 验证成功消息
		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith({
				title: "项目创建成功",
				description: '项目 "Test Project" 已成功创建',
			});
		});

		// 验证路由跳转
		expect(mockPush).toHaveBeenCalledWith("/projects/test-project");
	});

	it("应该处理API错误", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 填写表单
		await user.type(screen.getByLabelText(/项目名称/i), "Test Project");
		await user.type(screen.getByLabelText(/项目描述/i), "A test project");

		// Mock API错误
		mockFetchError(new Error("Network error"));

		// 提交表单
		const submitButton = screen.getByText("创建项目");
		await user.click(submitButton);

		// 验证错误消息
		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith({
				title: "创建失败",
				description: "Network error",
				variant: "destructive",
			});
		});
	});

	it("应该处理验证错误", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 填写无效数据
		await user.type(screen.getByLabelText(/项目名称/i), ""); // 空名称

		// Mock 验证错误响应
		mockFetchResponse(
			{
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid input data",
					details: [
						{
							path: ["name"],
							message: "项目名称不能为空",
						},
					],
				},
			},
			400,
		);

		// 提交表单
		const submitButton = screen.getByText("创建项目");
		await user.click(submitButton);

		// 验证错误消息
		await waitFor(() => {
			expect(screen.getByText(/项目名称不能为空/)).toBeInTheDocument();
		});
	});

	it("应该调用取消回调", async () => {
		const onCancel = vi.fn();
		const user = userEvent.setup();

		render(<ProjectForm onCancel={onCancel} />);

		const cancelButton = screen.getByText("取消");
		await user.click(cancelButton);

		expect(onCancel).toHaveBeenCalled();
	});

	it("应该切换可见性选项", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 找到可见性选择器
		const visibilitySelect = screen.getByRole("combobox", { name: /可见性/i });

		// 打开下拉菜单
		await user.click(visibilitySelect);

		// 选择公开选项
		const publicOption = screen.getByText("公开");
		await user.click(publicOption);

		// 验证选择成功
		await waitFor(() => {
			expect(screen.getByText("公开")).toBeInTheDocument();
		});
	});

	it("应该显示加载状态", async () => {
		const user = userEvent.setup();
		render(<ProjectForm />);

		// 填写表单
		await user.type(screen.getByLabelText(/项目名称/i), "Test Project");
		await user.type(screen.getByLabelText(/项目描述/i), "A test project");

		// Mock 延迟响应
		mockFetchResponse(
			{
				success: true,
				data: { id: "1", name: "Test" },
			},
			201,
		);

		// 提交表单
		const submitButton = screen.getByText("创建项目");
		await user.click(submitButton);

		// 验证加载状态
		expect(screen.getByText("创建中...")).toBeInTheDocument();
		expect(submitButton).toBeDisabled();
	});
});
