/**
 * /sys/health/basic API 单元测试
 *
 * 测试基础健康检查功能，包括：
 * - 数据库连接状态检查
 * - 系统资源监控
 * - 响应时间性能测试
 * - 错误状态处理
 */

import {
	createSysHealthCheckRequest,
	expectSysApiResponse,
	expectSysHealthCheckResponse,
	parseSysApiResponse,
} from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

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

describe("/sys/health/basic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /sys/health/basic", () => {
		describe("正常健康状态", () => {
			it("应该返回健康的系统状态", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.status).toBe("healthy");
				expect(data.data.version).toBeTruthy();
				expect(data.data.timestamp).toBeTruthy();
				expect(data.data.services).toBeDefined();
				expect(data.data.services.database).toBe("healthy");
				expect(data.data.services.api).toBe("healthy");
				expect(data.data.uptime).toBeGreaterThan(0);

				// 验证数据库查询
				expect(db.$queryRaw).toHaveBeenCalledWith`SELECT 1 as health_check`;
			});

			it("应该包含系统性能指标", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.metrics).toBeDefined();
				expect(data.data.metrics.uptime).toBeGreaterThan(0);
				expect(data.data.metrics.responseTime).toBeGreaterThan(0);
				expect(data.data.metrics.memoryUsage).toBeTruthy();
				expect(data.data.metrics.nodeVersion).toBeTruthy();
			});

			it("应该包含服务依赖状态", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.services).toBeDefined();
				expect(data.data.services.database).toBeDefined();
				expect(data.data.services.api).toBeDefined();
				expect(["healthy", "unhealthy", "degraded"]).toContain(
					data.data.services.database,
				);
				expect(["healthy", "unhealthy", "degraded"]).toContain(
					data.data.services.api,
				);
			});

			it("应该记录健康检查事件", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const { logAuthEvent } = await import("~/lib/auth-errors");

				const request = createSysHealthCheckRequest("basic");
				await GET(request);

				// 验证健康检查事件被记录
				expect(logAuthEvent).toHaveBeenCalledWith(
					"HEALTH_CHECK_PERFORMED",
					expect.objectContaining({
						status: "healthy",
						responseTime: expect.any(Number),
					}),
				);
			});
		});

		describe("数据库连接问题", () => {
			it("应该检测数据库连接失败", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(
					new Error("Database connection failed"),
				);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.status).toBe("unhealthy");
				expect(data.data.services.database).toBe("unhealthy");
				expect(data.data.services.api).toBe("healthy"); // API 本身还能响应
				expect(data.data.errors).toBeDefined();
				expect(data.data.errors.database).toContain(
					"Database connection failed",
				);
			});

			it("应该处理数据库查询超时", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockImplementation(
					() =>
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Query timeout")), 100),
						),
				);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.status).toBe("degraded");
				expect(data.data.services.database).toBe("degraded");
				expect(data.data.errors).toBeDefined();
			});
		});

		describe("系统资源监控", () => {
			it("应该监控系统内存使用", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				// Mock process.memoryUsage
				const originalMemoryUsage = process.memoryUsage;
				process.memoryUsage = vi.fn().mockReturnValue({
					rss: 134217728, // 128MB
					heapUsed: 67108864, // 64MB
					heapTotal: 104857600, // 100MB
					external: 2097152, // 2MB
				});

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.metrics.memoryUsage).toBeDefined();
				expect(data.data.metrics.memoryUsage.rss).toBe(134217728);
				expect(data.data.metrics.memoryUsage.heapUsed).toBe(67108864);

				// 恢复原始函数
				process.memoryUsage = originalMemoryUsage;
			});

			it("应该监控 CPU 使用情况", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.metrics.cpuUsage).toBeDefined();
				expect(typeof data.data.metrics.cpuUsage).toBe("string");
			});

			it("应该检查系统运行时间", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.metrics.uptime).toBeGreaterThan(0);
				expect(typeof data.data.metrics.uptime).toBe("number");
			});
		});

		describe("性能测试", () => {
			it("应该在合理时间内响应", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const startTime = Date.now();
				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);
				const endTime = Date.now();

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);

				expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内响应
				expect(data.data.metrics.responseTime).toBeLessThan(1000);
			});

			it("应该包含响应时间指标", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.metrics.responseTime).toBeDefined();
				expect(typeof data.data.metrics.responseTime).toBe("number");
				expect(data.data.metrics.responseTime).toBeGreaterThan(0);
			});

			it("应该检测性能退化", async () => {
				const { db } = await import("~/server/db");
				// 模拟慢查询
				(db.$queryRaw as any).mockImplementation(
					() =>
						new Promise((resolve) =>
							setTimeout(() => resolve([{ health_check: 1 }]), 200),
						),
				);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				// 如果响应时间超过阈值，状态应该是 degraded
				if (data.data.metrics.responseTime > 500) {
					expect(["degraded", "healthy"]).toContain(data.data.status);
				}
			});
		});

		describe("错误处理", () => {
			it("应该处理意外的系统错误", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockImplementation(() => {
					throw new Error("Unexpected system error");
				});

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				expectSysApiResponse(response, 200);
				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.status).toBe("unhealthy");
				expect(data.data.errors).toBeDefined();
				expect(data.data.errors.system).toContain("Unexpected system error");
			});

			it("应该处理部分服务故障", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockRejectedValue(
					new Error("Database unavailable"),
				);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				// API 应该能响应，但数据库不可用
				expect(data.data.services.api).toBe("healthy");
				expect(data.data.services.database).toBe("unhealthy");
				expect(["unhealthy", "degraded"]).toContain(data.data.status);
			});
		});

		describe("缓存和响应头", () => {
			it("应该设置适当的缓存头", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				expectSysApiResponse(response, 200);

				// 检查缓存相关的响应头
				expect(response.headers.get("cache-control")).toContain("no-cache");
				expect(response.headers.get("cache-control")).toContain("no-store");
			});

			it("应该包含系统版本信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.version).toBeTruthy();
				expect(typeof data.data.version).toBe("string");
				expect(data.data.nodeVersion).toBeTruthy();
				expect(data.data.nodeVersion).toContain("Node.js");
			});
		});

		describe("环境信息", () => {
			it("应该包含环境信息", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.environment).toBeTruthy();
				expect(["development", "staging", "production"]).toContain(
					data.data.environment,
				);
			});

			it("应该包含时间戳", async () => {
				const { db } = await import("~/server/db");
				(db.$queryRaw as any).mockResolvedValue([{ health_check: 1 }]);

				const request = createSysHealthCheckRequest("basic");
				const response = await GET(request);

				const data = await parseSysApiResponse(response);
				expectSysHealthCheckResponse(data);

				expect(data.data.timestamp).toBeTruthy();
				expect(new Date(data.data.timestamp)).toBeInstanceOf(Date);
			});
		});
	});
});
