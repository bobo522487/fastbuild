/**
 * /sys/health 系统集成测试
 *
 * 测试健康检查系统的端到端功能，包括：
 * - 系统状态监控
 * - 数据库连接检查
 * - 性能指标收集
 * - 错误状态处理
 */

import { DatabaseTestHelpers } from "@tests/utils/database-helpers";
import {
	createSysHealthCheckRequest,
	createSysVersionRequest,
	expectSysApiResponse,
	expectSysHealthCheckResponse,
	expectSysVersionResponse,
	parseSysApiResponse,
} from "@tests/utils/test-helpers";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("/sys/health Integration Tests", () => {
	beforeEach(async () => {
		await DatabaseTestHelpers.setupTestDatabase();
	});

	afterEach(async () => {
		// 清理测试数据但不关闭连接
	});

	describe("基础健康检查集成", () => {
		it("应该返回完整的系统健康状态", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			expect(response.status).toBe(200);

			const data = await response.json();
			expectSysHealthCheckResponse(data);

			// 验证基本结构
			expect(data.success).toBe(true);
			expect(data.data.status).toBe("healthy");
			expect(data.data.timestamp).toBeTruthy();
			expect(data.data.version).toBeTruthy();
			expect(data.data.uptime).toBeGreaterThan(0);

			// 验证服务状态
			expect(data.data.services).toBeDefined();
			expect(data.data.services.database).toBeDefined();
			expect(data.data.services.api).toBeDefined();
			expect(["healthy", "unhealthy", "degraded"]).toContain(
				data.data.services.database,
			);
			expect(["healthy", "unhealthy", "degraded"]).toContain(
				data.data.services.api,
			);

			// 验证性能指标
			expect(data.data.metrics).toBeDefined();
			expect(data.data.metrics.responseTime).toBeGreaterThan(0);
			expect(data.data.metrics.memoryUsage).toBeDefined();
			expect(data.data.metrics.nodeVersion).toBeTruthy();
		});

		it("应该在数据库可用时显示健康状态", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 验证数据库连接正常
			expect(data.data.services.database).toBe("connected");
			expect(data.data.status).toBe("healthy");
		});

		it("应该包含系统环境信息", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			expect(data.data.environment).toBeTruthy();
			expect(["development", "test", "staging", "production"]).toContain(
				data.data.environment,
			);
			expect(data.data.nodeVersion).toBeTruthy();
			expect(data.data.nodeVersion).toContain("Node.js");
		});

		it("应该设置适当的缓存头", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");

			// 健康检查不应该被缓存
			expect(response.headers.get("cache-control")).toContain("no-cache");
			expect(response.headers.get("cache-control")).toContain("no-store");
		});
	});

	describe("数据库健康检查集成", () => {
		it("应该检测数据库连接性能", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 数据库连接应该快速响应
			expect(data.data.metrics.databaseResponseTime).toBeGreaterThan(0);
			expect(data.data.metrics.databaseResponseTime).toBeLessThan(1000);
		});

		it("应该监控数据库连接状态", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			expect(data.data.services.database).toBeDefined();
			if (data.data.services.database === "connected") {
				expect(data.data.metrics.databaseResponseTime).toBeGreaterThan(0);
			}
		});

		it("应该收集数据库统计信息", async () => {
			const stats = await DatabaseTestHelpers.getTestDataStats();

			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 如果有测试数据，应该反映在健康检查中
			if (stats.users > 0 || stats.projects > 0) {
				expect(data.data.metrics.recordCount).toBeDefined();
				expect(data.data.metrics.recordCount.users).toBe(stats.users);
				expect(data.data.metrics.recordCount.projects).toBe(stats.projects);
			}
		});
	});

	describe("API 组件健康检查", () => {
		it("应该验证 API 组件功能", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			expect(data.data.services.api).toBe("healthy");
			expect(data.data.metrics.apiResponseTime).toBeGreaterThan(0);
			expect(data.data.metrics.endpoints).toBeDefined();
			expect(Array.isArray(data.data.metrics.endpoints)).toBe(true);
		});

		it("应该检查关键 API 端点可用性", async () => {
			const endpoints = ["/sys/version", "/sys/health/basic"];
			const endpointResults = [];

			for (const endpoint of endpoints) {
				try {
					const response = await fetch(`http://localhost:3000${endpoint}`);
					endpointResults.push({
						endpoint,
						status: response.status,
						available: response.status < 500,
					});
				} catch (error) {
					endpointResults.push({
						endpoint,
						status: "error",
						available: false,
					});
				}
			}

			const healthResponse = await fetch(
				"http://localhost:3000/sys/health/basic",
			);
			const healthData = await healthResponse.json();

			// 验证端点状态被记录
			expect(healthData.metrics.endpointAvailability).toBeDefined();
			expect(healthData.metrics.endpointAvailability.healthy).toBeGreaterThan(
				0,
			);
		});
	});

	describe("性能监控集成", () => {
		it("应该监控系统资源使用", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 验证内存使用监控
			expect(data.data.metrics.memoryUsage).toBeDefined();
			expect(data.data.metrics.memoryUsage.rss).toBeGreaterThan(0);
			expect(data.data.metrics.memoryUsage.heapUsed).toBeGreaterThan(0);

			// 验证 CPU 使用监控
			expect(data.data.metrics.cpuUsage).toBeDefined();
			expect(typeof data.data.metrics.cpuUsage).toBe("string");

			// 验证响应时间
			expect(data.data.metrics.responseTime).toBeGreaterThan(0);
			expect(data.data.metrics.responseTime).toBeLessThan(1000);
		});

		it("应该检测性能退化", async () => {
			// 模拟一些负载
			const startTime = Date.now();
			const promises = Array.from({ length: 10 }, () =>
				fetch("http://localhost:3000/sys/health/basic"),
			);

			await Promise.all(promises);
			const endTime = Date.now();

			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 验证性能指标
			expect(data.data.metrics.averageResponseTime).toBeGreaterThan(0);
			expect(data.data.metrics.averageResponseTime).toBeLessThan(1000);
			expect(endTime - startTime).toBeLessThan(5000); // 10个请求在5秒内完成
		});

		it("应该监控请求量统计", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			expect(data.data.metrics.requestCount).toBeDefined();
			expect(typeof data.data.metrics.requestCount).toBe("number");
			expect(data.data.metrics.requestCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("错误处理集成", () => {
		it("应该优雅处理部分服务故障", async () => {
			// 这里我们模拟数据库查询失败的情况
			// 在实际测试环境中，可能需要模拟网络故障或数据库不可用

			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 即使某些组件有问题，健康检查端点本身应该能响应
			expect(response.status).toBe(200);
			expect(data.success).toBe(true);

			// 如果有问题，状态应该反映在数据中
			if (data.data.status !== "healthy") {
				expect(["degraded", "unhealthy"]).toContain(data.data.status);
				expect(data.data.errors).toBeDefined();
			}
		});

		it("应该提供详细的错误信息", async () => {
			// 创建一个会失败的场景
			try {
				// 尝试访问一个可能不存在的端点
				await fetch("http://localhost:3000/sys/health/nonexistent");
			} catch (error) {
				// 然后检查健康状态
				const response = await fetch("http://localhost:3000/sys/health/basic");
				const data = await response.json();

				// 健康检查应该能报告系统整体状态
				expect(data.success).toBe(true);
				expect(data.data.errors).toBeDefined();
			}
		});
	});

	describe("版本信息集成", () => {
		it("应该与版本 API 保持一致", async () => {
			const [healthResponse, versionResponse] = await Promise.all([
				fetch("http://localhost:3000/sys/health/basic"),
				fetch("http://localhost:3000/sys/version"),
			]);

			const healthData = await healthResponse.json();
			const versionData = await versionResponse.json();

			expect(healthResponse.status).toBe(200);
			expect(versionResponse.status).toBe(200);

			// 版本信息应该一致
			expect(healthData.data.version).toBe(versionData.data.system.version);
			expect(healthData.data.nodeVersion).toBe(
				versionData.data.components.framework.runtime,
			);
		});

		it("应该包含构建信息", async () => {
			const response = await fetch("http://localhost:3000/sys/version");
			const data = await response.json();

			expectSysVersionResponse(data);

			expect(data.data.system.buildNumber).toBeTruthy();
			expect(data.data.system.buildDate).toBeTruthy();
			expect(data.data.metadata.deploymentId).toBeTruthy();
		});

		it("应该支持不同格式输出", async () => {
			// 测试 JSON 格式
			const jsonResponse = await fetch(
				"http://localhost:3000/sys/version?format=json",
			);
			expect(jsonResponse.status).toBe(200);
			expect(jsonResponse.headers.get("content-type")).toContain(
				"application/json",
			);

			const jsonData = await jsonResponse.json();
			expectSysVersionResponse(jsonData);

			// 测试 YAML 格式
			const yamlResponse = await fetch(
				"http://localhost:3000/sys/version?format=yaml",
			);
			expect(yamlResponse.status).toBe(200);
			expect(yamlResponse.headers.get("content-type")).toContain("text/yaml");

			const yamlContent = await yamlResponse.text();
			expect(yamlContent).toContain("system:");
			expect(yamlContent).toContain("name: FastBuild");
		});
	});

	describe("监控和告警集成", () => {
		it("应该提供足够的监控指标", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 验证关键监控指标
			const requiredMetrics = [
				"responseTime",
				"memoryUsage",
				"cpuUsage",
				"uptime",
				"nodeVersion",
				"environment",
			];

			requiredMetrics.forEach((metric) => {
				expect(data.data.metrics[metric]).toBeDefined();
			});
		});

		it("应该支持告警阈值配置", async () => {
			const response = await fetch("http://localhost:3000/sys/health/basic");
			const data = await response.json();

			// 验证告警相关的指标
			expect(data.data.metrics).toBeDefined();
			expect(data.data.metrics.alerts).toBeDefined();
			expect(Array.isArray(data.data.metrics.alerts)).toBe(true);

			// 如果有问题，应该有告警
			if (data.data.status !== "healthy") {
				expect(data.data.metrics.alerts.length).toBeGreaterThan(0);
			}
		});

		it("应该记录健康检查历史", async () => {
			// 执行多次健康检查
			const responses = await Promise.all(
				Array.from({ length: 3 }, () =>
					fetch("http://localhost:3000/sys/health/basic"),
				),
			);

			const data = await responses[0]?.json();

			// 验证历史记录
			expect(data.data.metrics.history).toBeDefined();
			expect(Array.isArray(data.data.metrics.history)).toBe(true);
			expect(data.data.metrics.history.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("缓存和性能优化", () => {
		it("应该优化重复健康检查", async () => {
			// 第一次请求
			const startTime1 = Date.now();
			const response1 = await fetch("http://localhost:3000/sys/health/basic");
			const endTime1 = Date.now();

			// 紧接着第二次请求（应该更快）
			const startTime2 = Date.now();
			const response2 = await fetch("http://localhost:3000/sys/health/basic");
			const endTime2 = Date.now();

			const data1 = await response1.json();
			const data2 = await response2.json();

			// 两个响应都应该成功
			expectSysHealthCheckResponse(data1);
			expectSysHealthCheckResponse(data2);

			// 第二次请求可能更快（如果实现了某种缓存）
			const time1 = endTime1 - startTime1;
			const time2 = endTime2 - startTime2;

			// 至少应该都在合理时间内
			expect(time1).toBeLessThan(2000);
			expect(time2).toBeLessThan(2000);
		});

		it("应该支持条件性健康检查", async () => {
			// 基础健康检查
			const basicResponse = await fetch(
				"http://localhost:3000/sys/health/basic",
			);
			const basicData = await basicResponse.json();

			expectSysHealthCheckResponse(basicData);

			// 如果支持详细健康检查
			try {
				const detailedResponse = await fetch(
					"http://localhost:3000/sys/health/detailed",
				);
				if (detailedResponse.status === 200) {
					const detailedData = await detailedResponse.json();
					expect(detailedData.data).toHaveProperty("diagnostics");
					expect(detailedData.data.diagnostics).toBeDefined();
				}
			} catch (error) {
				// 详细健康检查可能不可用，这是正常的
			}
		});
	});
});
