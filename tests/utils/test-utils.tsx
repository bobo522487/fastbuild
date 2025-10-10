import { PrismaClient } from "@prisma/client";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

type FetchMock = {
	mockResolvedValueOnce: (value: unknown) => unknown;
	mockRejectedValueOnce: (value: unknown) => unknown;
};

// 创建测试用的 Prisma 客户端
export const createTestPrismaClient = () => {
	return new PrismaClient({
		datasources: {
			db: {
				url:
					process.env.DATABASE_URL ||
					"postgresql://test:test@localhost:5432/test_db",
			},
		},
	});
};

// 自定义渲染函数，包含必要的 Provider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
	return <>{children}</>;
};

// 自定义渲染函数
const customRender = (ui: ReactElement, options?: RenderOptions) =>
	render(ui, { wrapper: AllTheProviders, ...options });

// 重新导出所有 testing-library 的方法
export * from "@testing-library/react";
export { customRender as render };

// 创建测试用户数据
export const createTestUser = (overrides = {}) => ({
	id: "test-user-id",
	email: "test@example.com",
	name: "Test User",
	emailVerified: new Date(),
	image: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

// 创建测试项目数据
export const createTestProject = (overrides = {}) => ({
	id: "test-project-id",
	name: "Test Project",
	slug: "test-project",
	description: "A test project for unit testing",
	visibility: "PRIVATE" as const,
	createdAt: new Date(),
	updatedAt: new Date(),
	createdBy: "test-user-id",
	deletedAt: null,
	revision: 1,
	...overrides,
});

// 创建测试项目成员数据
export const createTestProjectMember = (overrides = {}) => ({
	id: "test-member-id",
	projectId: "test-project-id",
	userId: "test-user-id",
	role: "OWNER" as const,
	createdAt: new Date(),
	...overrides,
});

// Mock fetch 响应
export const mockFetchResponse = (data: unknown, status = 200) => {
	const fetchMock = global.fetch as unknown as FetchMock;
	fetchMock.mockResolvedValueOnce({
		ok: status >= 200 && status < 300,
		status,
		json: async () => data,
	});
};

// Mock fetch 错误
export const mockFetchError = (error: Error) => {
	const fetchMock = global.fetch as unknown as FetchMock;
	fetchMock.mockRejectedValueOnce(error);
};

// 清理所有 mocks
export const clearAllMocks = () => {
	vi.clearAllMocks();
};
