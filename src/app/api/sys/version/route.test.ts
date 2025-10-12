/**
 * /sys/version API 单元测试
 *
 * 测试系统版本信息功能，包括：
 * - 系统版本和组件状态
 * - 构建信息
 * - 不同格式输出
 * - 缓存头设置
 */

import {
	createSysVersionRequest,
	expectSysApiResponse,
	expectSysVersionResponse,
	parseSysApiResponse,
} from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, HEAD } from "./route";

// Mock 外部依赖
vi.mock("~/server/db", () => ({
	db: {
		$queryRaw: vi.fn(),
	},
}));

vi.mock("~/lib/auth-errors", () => ({
	logAuthEvent: vi.fn(),
	logSecurityEvent: vi.fn(),
}));

// Mock 环境变量
const originalEnv = process.env;

describe("/sys/version", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = {
			...originalEnv,
			npm_package_version: "1.0.0",
			NODE_ENV: "test",
			BUILD_NUMBER: "test-123",
			BUILD_DATE: "2025-01-01T00:00:00.000Z",
			GIT_COMMIT: "abc123def456",
			GIT_BRANCH: "main",
			AWS_REGION: "us-east-1",
			DATACENTER: "aws-us-east-1a",
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
		process.env = originalEnv;
	});

	describe("GET /sys/version", () => {
		describe("JSON 格式响应", () => {
			it("应该返回完整的系统版本信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0 on x86_64-pc-linux-gnu" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				// 验证系统信息
				expect(data.data.system).toMatchObject({
					name: "FastBuild",
					version: "1.0.0",
					buildNumber: "test-123",
					environment: "test",
				});

				// 验证组件信息
				expect(data.data.components).toHaveProperty("api");
				expect(data.data.components).toHaveProperty("database");
				expect(data.data.components).toHaveProperty("framework");

				expect(data.data.components.api).toMatchObject({
					name: "FastBuild API",
					version: "1.0.0",
					status: "healthy",
				});

				expect(data.data.components.database).toMatchObject({
					name: "PostgreSQL",
					status: "connected",
				});

				expect(data.data.components.framework).toMatchObject({
					name: "Next.js",
					version: "15.5.4",
					runtime: expect.stringContaining("Node.js"),
				});

				// 验证功能特性
				expect(data.data.features).toHaveProperty("auth");
				expect(data.data.features).toHaveProperty("permissions");
				expect(data.data.features).toHaveProperty("monitoring");
				expect(data.data.features).toHaveProperty("security");

				expect(data.data.features.auth).toMatchObject({
					enabled: true,
					providers: ["credentials", "github"],
					jwtEnabled: true,
				});

				expect(data.data.features.permissions).toMatchObject({
					system: "hardcoded",
					cacheEnabled: true,
					batchCheckEnabled: true,
				});

				// 验证元数据
				expect(data.data.metadata).toHaveProperty("startupTime");
				expect(data.data.metadata).toHaveProperty("uptime");
				expect(data.data.metadata).toHaveProperty("deploymentId");

				// 验证链接
				expect(data.data.links).toMatchObject({
					documentation: "/docs",
					apiDocs: "/api/docs",
					statusPage: "https://status.fastbuild.dev",
					support: "mailto:support@fastbuild.dev",
				});
			});

			it("应该支持自定义查询参数", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest({
					format: "json",
					include_dependencies: false,
					include_health: false,
				});

				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				// 应该不包含依赖信息
				expect(data.data.components.dependencies).toEqual([]);
				// 应该不包含健康状态
				expect(data.data.components.api.status).toBe("unknown");
			});

			it("应该包含依赖信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest({
					include_dependencies: true,
				});

				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.dependencies).toBeDefined();
				expect(Array.isArray(data.data.components.dependencies)).toBe(true);
				expect(data.data.components.dependencies.length).toBeGreaterThan(0);

				// 验证依赖项结构
				data.data.components.dependencies.forEach((dep: any) => {
					expect(dep).toHaveProperty("name");
					expect(dep).toHaveProperty("version");
					expect(dep).toHaveProperty("type");
					expect(["runtime", "development", "peer"]).toContain(dep.type);
				});
			});

			it("应该包含健康状态", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest({
					include_health: true,
				});

				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.api.status).toBe("healthy");
				expect(["healthy", "unhealthy", "degraded"]).toContain(
					data.data.components.api.status,
				);
			});

			it("应该记录版本信息查询事件", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const { logAuthEvent } = await import("~/lib/auth-errors");

				const request = createSysVersionRequest();
				await GET(request);

				// 验证版本查询事件被记录
				expect(logAuthEvent).toHaveBeenCalledWith(
					"SYSTEM_VERSION_REQUESTED",
					expect.objectContaining({
						format: "json",
						includeDependencies: true,
						includeHealth: true,
					}),
				);
			});
		});

		describe("YAML 格式响应", () => {
			it("应该返回 YAML 格式的版本信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest({ format: "yaml" });
				const response = await GET(request);

				expect(response.status).toBe(200);
				expect(response.headers.get("content-type")).toBe(
					"text/yaml; charset=utf-8",
				);

				const yamlContent = await response.text();
				expect(yamlContent).toContain("system:");
				expect(yamlContent).toContain("name: FastBuild");
				expect(yamlContent).toContain("version: 1.0.0");
				expect(yamlContent).toContain("components:");
				expect(yamlContent).toContain("api:");
				expect(yamlContent).toContain("database:");
			});

			it("应该为 YAML 格式设置正确的响应头", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest({ format: "yaml" });
				const response = await GET(request);

				expect(response.headers.get("content-type")).toBe(
					"text/yaml; charset=utf-8",
				);
				expect(response.headers.get("x-response-time")).toBeTruthy();
				expect(response.headers.get("x-system-version")).toBe("1.0.0");
				expect(response.headers.get("cache-control")).toBe(
					"public, max-age=300",
				);
			});
		});

		describe("数据库连接状态", () => {
			it("应该检测数据库连接失败", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(
					new Error("Database connection failed"),
				);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.database.status).toBe("error");
				expect(data.data.components.database.version).toBe("Unknown");
				expect(data.data.components.database.connectionInfo.host).toBe(
					"unknown",
				);
			});

			it("应该解析数据库连接信息", async () => {
				// Mock DATABASE_URL
				process.env.DATABASE_URL =
					"postgresql://user:password@localhost:5432/testdb";

				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0 on x86_64-pc-linux-gnu" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.database.connectionInfo).toMatchObject({
					host: "localhost",
					port: 5432,
					database: "testdb",
				});

				// 恢复原始 DATABASE_URL
				process.env.DATABASE_URL = originalEnv.DATABASE_URL;
			});
		});

		describe("API 组件状态", () => {
			it("应该检测 API 组件健康状态", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysVersionRequest({ include_health: true });
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.api.status).toBe("healthy");
				expect(data.data.components.api.lastUpdated).toBeTruthy();
			});

			it("应该检测 API 组件不健康状态", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(new Error("Database error"));

				const request = createSysVersionRequest({ include_health: true });
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.components.api.status).toBe("unhealthy");
				expect(data.data.components.api.lastUpdated).toBeTruthy();
			});
		});

		describe("构建信息", () => {
			it("应该包含完整的构建信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.system.buildNumber).toBe("test-123");
				expect(data.data.system.buildDate).toBe("2025-01-01T00:00:00.000Z");
				expect(data.data.metadata.gitCommit).toBe("abc123def456");
				expect(data.data.metadata.gitBranch).toBe("main");
			});

			it("应该处理缺失的构建信息", async () => {
				// 移除构建相关的环境变量
				delete process.env.BUILD_NUMBER;
				delete process.env.BUILD_DATE;
				delete process.env.GIT_COMMIT;
				delete process.env.GIT_BRANCH;

				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.system.buildNumber).toBeTruthy();
				expect(data.data.system.buildDate).toBeTruthy();
				expect(typeof data.data.system.buildNumber).toBe("string");
				expect(typeof data.data.system.buildDate).toBe("string");
			});
		});

		describe("环境信息", () => {
			it("应该包含正确的环境信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.system.environment).toBe("test");
				expect(data.data.system.region).toBe("us-east-1");
				expect(data.data.system.datacenter).toBe("aws-us-east-1a");
			});

			it("应该处理生产环境配置", async () => {
				process.env.NODE_ENV = "production";

				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				expect(data.data.system.environment).toBe("production");

				// 恢复环境变量
				process.env.NODE_ENV = "test";
			});
		});

		describe("缓存和响应头", () => {
			it("应该设置适当的缓存头", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expectSysApiResponse(response, 200);

				// 验证缓存相关的响应头
				expect(response.headers.get("cache-control")).toBe(
					"public, max-age=300",
				);
				expect(response.headers.get("vary")).toBe("Accept");
			});

			it("应该包含版本相关的响应头", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expect(response.headers.get("x-system-version")).toBe("1.0.0");
				expect(response.headers.get("x-build-number")).toBe("test-123");
				expect(response.headers.get("x-environment")).toBe("test");
			});

			it("应该包含响应时间头", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([
					{ version: "PostgreSQL 18.0" },
				]);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expect(response.headers.get("x-response-time")).toBeTruthy();
				expect(
					Number.parseInt(response.headers.get("x-response-time") || "0"),
				).toBeGreaterThan(0);
			});
		});

		describe("错误处理", () => {
			it("应该处理数据库查询错误", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(
					new Error("Database query failed"),
				);

				const { logSecurityEvent } = await import("~/lib/auth-errors");

				const request = createSysVersionRequest();
				const response = await GET(request);

				expectSysApiResponse(response, 500);
				const data = await parseSysApiResponse(response);
				expect(data.success).toBe(false);
				expect(data.error.code).toBe("INTERNAL_ERROR");

				// 验证错误事件被记录
				expect(logSecurityEvent).toHaveBeenCalledWith(
					"SYSTEM_VERSION_ERROR",
					expect.objectContaining({
						error: "Database query failed",
						responseTime: expect.any(Number),
					}),
				);
			});

			it("应该处理部分组件失败", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(
					new Error("Database unavailable"),
				);

				const request = createSysVersionRequest();
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysVersionResponse(data);

				// API 应该能响应，但数据库组件会显示错误
				expect(data.data.components.database.status).toBe("error");
				expect(data.data.components.api.status).toBe("unknown"); // 没有健康检查时
			});
		});
	});

	describe("HEAD /sys/version", () => {
		it("应该返回版本信息头", async () => {
			const request = createSysVersionRequest();
			request.method = "HEAD";

			const response = await HEAD(request);

			expect(response.status).toBe(200);
			expect(response.headers.get("x-system-version")).toBe("1.0.0");
			expect(response.headers.get("x-build-number")).toBe("test-123");
			expect(response.headers.get("x-environment")).toBe("test");
			expect(response.headers.get("x-system-name")).toBe("FastBuild");
			expect(response.headers.get("cache-control")).toBe("public, max-age=300");
		});

		it("应该处理错误情况", async () => {
			// Mock 错误情况
			vi.doMock("~/server/db", () => ({
				db: {
					$queryRaw: vi.fn().mockRejectedValue(new Error("Database error")),
				},
			}));

			const request = createSysVersionRequest();
			request.method = "HEAD";

			const response = await HEAD(request);

			// 即使出错，HEAD 也应该返回基本头信息
			expect(response.status).toBe(500);
			expect(response.headers.get("x-system-version")).toBe("unknown");
			expect(response.headers.get("x-environment")).toBe("unknown");
			expect(response.headers.get("cache-control")).toBe("no-cache");
		});
	});
});
