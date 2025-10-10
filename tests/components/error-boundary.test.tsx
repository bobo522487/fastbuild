import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary, {
	FormErrorBoundary,
	APIErrorBoundary,
} from "~/components/error/error-boundary";
import {
	GlobalErrorHandler,
	useErrorHandler,
} from "~/components/error/error-handler";

// Mock toast
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

// Mock console.error
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

// Mock fetch for error reporting
global.fetch = vi.fn();

describe("ErrorBoundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该渲染子组件而没有错误", () => {
		render(
			<ErrorBoundary>
				<div>正常内容</div>
			</ErrorBoundary>,
		);

		expect(screen.getByText("正常内容")).toBeInTheDocument();
	});

	it("应该捕获并显示错误", () => {
		const ThrowError = () => {
			throw new Error("测试错误");
		};

		render(
			<ErrorBoundary>
				<ThrowError />
			</ErrorBoundary>,
		);

		expect(screen.getByText("应用程序错误")).toBeInTheDocument();
		expect(
			screen.getByText("很抱歉，应用程序遇到了意外错误"),
		).toBeInTheDocument();
	});

	it("应该在开发模式中显示错误详情", () => {
		const originalEnv = process.env.NODE_ENV;
		vi.stubEnv("NODE_ENV", "development");

		const ThrowError = () => {
			throw new Error("测试错误");
		};

		render(
			<ErrorBoundary>
				<ThrowError />
			</ErrorBoundary>,
		);

		expect(screen.getByText("错误详情")).toBeInTheDocument();

		// 点击展开错误详情
		fireEvent.click(screen.getByText("错误详情"));

		expect(screen.getByText(/测试错误/)).toBeInTheDocument();

		vi.stubEnv("NODE_ENV", originalEnv);
	});

	it("应该在重置按钮点击时重置错误状态", async () => {
		const user = userEvent.setup();
		let shouldThrow = true;

		const ThrowingComponent = () => {
			if (shouldThrow) {
				throw new Error("测试错误");
			}
			return <div>恢复的内容</div>;
		};

		const { rerender } = render(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		// 显示错误状态
		expect(screen.getByText("应用程序错误")).toBeInTheDocument();

		// 修复组件
		shouldThrow = false;

		// 点击重试按钮
		const retryButton = screen.getByText("重试");
		await user.click(retryButton);

		// 重新渲染组件
		rerender(
			<ErrorBoundary>
				<ThrowingComponent />
			</ErrorBoundary>,
		);

		// 应该显示正常内容
		expect(screen.getByText("恢复的内容")).toBeInTheDocument();
	});

	it("应该调用自定义错误处理函数", () => {
		const onError = vi.fn();

		const ThrowError = () => {
			throw new Error("测试错误");
		};

		render(
			<ErrorBoundary onError={onError}>
				<ThrowError />
			</ErrorBoundary>,
		);

		expect(onError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({
				componentStack: expect.any(String),
			}),
		);
	});

	it("应该使用自定义fallback组件", () => {
		const CustomFallback = ({
			error,
			reset,
		}: { error?: Error; reset: () => void }) => (
			<div>
				<h1>自定义错误</h1>
				<p>{error?.message}</p>
				<button onClick={reset}>重试</button>
			</div>
		);

		const ThrowError = () => {
			throw new Error("测试错误");
		};

		render(
			<ErrorBoundary fallback={CustomFallback}>
				<ThrowError />
			</ErrorBoundary>,
		);

		expect(screen.getByText("自定义错误")).toBeInTheDocument();
		expect(screen.getByText("测试错误")).toBeInTheDocument();
		expect(screen.getByText("重试")).toBeInTheDocument();
	});

	it("应该返回首页按钮", async () => {
		const user = userEvent.setup();

		// Mock window.location
		const mockLocation = {
			href: "http://localhost:3000/test",
			assign: vi.fn(),
			reload: vi.fn(),
			replace: vi.fn(),
		};
		Object.defineProperty(window, "location", {
			value: mockLocation,
			writable: true,
		});

		const ThrowError = () => {
			throw new Error("测试错误");
		};

		render(
			<ErrorBoundary>
				<ThrowError />
			</ErrorBoundary>,
		);

		const homeButton = screen.getByText("返回首页");
		await user.click(homeButton);

		expect(mockLocation.assign).toHaveBeenCalledWith("/");
	});
});

describe("FormErrorBoundary", () => {
	it("应该显示表单特定的错误UI", () => {
		const ThrowError = () => {
			throw new Error("表单验证错误");
		};

		render(
			<FormErrorBoundary>
				<ThrowError />
			</FormErrorBoundary>,
		);

		expect(screen.getByText("表单加载失败")).toBeInTheDocument();
		expect(screen.getByText("表单验证错误")).toBeInTheDocument();
		expect(screen.getByText("重试")).toBeInTheDocument();
	});
});

describe("APIErrorBoundary", () => {
	it("应该显示API特定的错误UI", () => {
		const ThrowError = () => {
			throw new Error("API调用失败");
		};

		render(
			<APIErrorBoundary>
				<ThrowError />
			</APIErrorBoundary>,
		);

		expect(screen.getByText("数据加载失败")).toBeInTheDocument();
		expect(screen.getByText("API调用失败")).toBeInTheDocument();
		expect(screen.getByText("重新加载")).toBeInTheDocument();
	});
});

describe("useErrorHandler", () => {
	it("应该处理错误并显示toast", () => {
		const TestComponent = () => {
			const { handleError } = useErrorHandler();

			const handleClick = () => {
				handleError("测试错误消息");
			};

			return <button onClick={handleClick}>触发错误</button>;
		};

		render(
			<GlobalErrorHandler>
				<TestComponent />
			</GlobalErrorHandler>,
		);

		const button = screen.getByText("触发错误");
		fireEvent.click(button);

		expect(toast.error).toHaveBeenCalledWith("测试错误消息");
	});

	it("应该清除错误状态", () => {
		const TestComponent = () => {
			const { handleError, clearError, error } = useErrorHandler();

			return (
				<div>
					<button onClick={() => handleError("测试错误")}>触发错误</button>
					<button onClick={clearError}>清除错误</button>
					{error && <span>错误: {error.message}</span>}
				</div>
			);
		};

		render(
			<GlobalErrorHandler>
				<TestComponent />
			</GlobalErrorHandler>,
		);

		// 触发错误
		const triggerButton = screen.getByText("触发错误");
		fireEvent.click(triggerButton);

		expect(screen.getByText("错误: 测试错误")).toBeInTheDocument();

		// 清除错误
		const clearButton = screen.getByText("清除错误");
		fireEvent.click(clearButton);

		expect(screen.queryByText("错误: 测试错误")).not.toBeInTheDocument();
	});
});

describe("GlobalErrorHandler", () => {
	it("应该处理未捕获的Promise拒绝", () => {
		const TestComponent = () => {
			React.useEffect(() => {
				// 触发未捕获的Promise拒绝
				Promise.reject("未处理的Promise拒绝");
			}, []);

			return <div>测试组件</div>;
		};

		render(
			<GlobalErrorHandler>
				<TestComponent />
			</GlobalErrorHandler>,
		);

		expect(toast.error).toHaveBeenCalled();
	});

	it("应该处理未捕获的错误事件", () => {
		const TestComponent = () => {
			React.useEffect(() => {
				// 触发未捕获的错误事件
				const error = new Error("未处理的错误");
				const event = new ErrorEvent("error", { error });
				window.dispatchEvent(event);
			}, []);

			return <div>测试组件</div>;
		};

		render(
			<GlobalErrorHandler>
				<TestComponent />
			</GlobalErrorHandler>,
		);

		expect(toast.error).toHaveBeenCalled();
	});
});
