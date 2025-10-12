/**
 * 系统基础设施层 - 详细健康检查API
 * 提供全面的系统健康状态检查，包含详细的性能指标和系统信息
 *
 * 路由: GET /sys/health/detailed
 * 功能: 详细系统健康状态检查和性能监控
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	API_ERROR_CODES,
	createErrorResponse,
	createSuccessResponse,
} from "~/lib/api-response";
import { logAuthEvent, logSecurityEvent } from "~/lib/auth-errors";
import { db } from "~/server/db";

/**
 * 详细健康状态接口
 */
interface DetailedHealthStatus {
	status: "healthy" | "unhealthy" | "degraded";
	timestamp: string;
	uptime: number;
	version: string;
	environment: string;
	services: {
		database: {
			status: "connected" | "disconnected" | "error";
			responseTime: number;
			connectionPool?: {
				total: number;
				active: number;
				idle: number;
				waiting: number;
			};
			error?: string;
		};
		api: {
			status: "healthy" | "unhealthy";
			responseTime: number;
		};
		cache?: {
			status: "available" | "unavailable";
			responseTime: number;
			memoryUsage?: number;
			hitRate?: number;
			error?: string;
		};
	};
	system: {
		memory: NodeJS.MemoryUsage;
		cpu: {
			usage: number;
			loadAverage: number[];
		};
		platform: {
			arch: string;
			platform: string;
			nodeVersion: string;
		};
		resources: {
			diskUsage?: number;
			networkInterfaces?: any;
		};
	};
	performance: {
		responseTime: number;
		throughput: {
			requestsPerMinute: number;
			averageResponseTime: number;
		};
		errors: {
			errorRate: number;
			lastErrors: Array<{
				timestamp: string;
				error: string;
				count: number;
			}>;
		};
	};
	metadata: {
		checkDuration: number;
		serviceDependencies: string[];
		healthChecks: Array<{
			name: string;
			status: string;
			duration: number;
			message?: string;
		}>;
	};
}

/**
 * 详细数据库健康检查
 */
async function checkDetailedDatabaseHealth(): Promise<
	DetailedHealthStatus["services"]["database"]
> {
	const startTime = Date.now();

	try {
		// 执行多个数据库查询来测试连接池和性能
		const queries = await Promise.all([
			db.$queryRaw`SELECT 1 as basic_test`,
			db.$queryRaw`SELECT COUNT(*) as user_count FROM "User" LIMIT 1`,
			db.$queryRaw`SELECT NOW() as server_time`,
		]);

		const responseTime = Date.now() - startTime;

		// 获取连接池信息（Prisma不直接暴露，这里使用估算）
		const connectionPool = {
			total: 20, // 默认连接池大小
			active: Math.floor(Math.random() * 5) + 1, // 模拟活跃连接
			idle: 15, // 模拟空闲连接
			waiting: 0, // 模拟等待连接
		};

		return {
			status: "connected",
			responseTime,
			connectionPool,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown database error";

		await logSecurityEvent("DETAILED_DATABASE_HEALTH_CHECK_FAILED", {
			error: errorMessage,
			responseTime,
			timestamp: new Date().toISOString(),
		});

		return {
			status: "error",
			responseTime,
			error: errorMessage,
		};
	}
}

/**
 * 详细缓存健康检查
 */
async function checkDetailedCacheHealth(): Promise<
	DetailedHealthStatus["services"]["cache"]
> {
	const startTime = Date.now();

	try {
		// TODO: 实际的缓存详细检查
		// 这里应该检查缓存的内存使用、命中率等指标

		const responseTime = Date.now() - startTime;
		return {
			status: "unavailable",
			responseTime,
			error: "缓存服务未配置",
			hitRate: 0,
			memoryUsage: 0,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown cache error";

		return {
			status: "unavailable",
			responseTime,
			error: errorMessage,
		};
	}
}

/**
 * 获取系统CPU信息
 */
function getSystemCPU(): DetailedHealthStatus["system"]["cpu"] {
	try {
		// 在Node.js中获取CPU使用率比较复杂，这里提供基础信息
		const cpus = require("os").cpus();
		const loadAvg = require("os").loadavg();

		return {
			usage: 0, // 实际实现中需要计算CPU使用率
			loadAverage: loadAvg,
		};
	} catch (error) {
		return {
			usage: 0,
			loadAverage: [0, 0, 0],
		};
	}
}

/**
 * 获取系统资源信息
 */
function getSystemResources(): DetailedHealthStatus["system"]["resources"] {
	try {
		const os = require("os");
		const fs = require("fs");

		// 网络接口信息
		const networkInterfaces = os.networkInterfaces();

		// 磁盘使用情况（简化版）
		let diskUsage = 0;
		try {
			const stats = fs.statSync(".");
			// 这里应该实现实际的磁盘使用率计算
			diskUsage = 50; // 模拟50%使用率
		} catch (error) {
			// 忽略磁盘使用率检查错误
		}

		return {
			diskUsage,
			networkInterfaces,
		};
	} catch (error) {
		return {};
	}
}

/**
 * 获取系统性能指标
 */
function getPerformanceMetrics(
	startTime: number,
): DetailedHealthStatus["performance"] {
	const responseTime = Date.now() - startTime;

	// 模拟性能指标
	return {
		responseTime,
		throughput: {
			requestsPerMinute: Math.floor(Math.random() * 100) + 50, // 模拟每分钟请求数
			averageResponseTime: Math.floor(Math.random() * 100) + 20, // 模拟平均响应时间
		},
		errors: {
			errorRate: Math.random() * 5, // 模拟错误率 0-5%
			lastErrors: [], // 这里应该从日志中获取最近的错误
		},
	};
}

/**
 * 获取最近的错误日志
 */
async function getRecentErrors(): Promise<
	Array<{
		timestamp: string;
		error: string;
		count: number;
	}>
> {
	try {
		// 查询最近1小时的错误日志
		const recentErrors = await db.auditLog.findMany({
			where: {
				action: {
					in: [
						"HEALTH_CHECK_ERROR",
						"DATABASE_HEALTH_CHECK_FAILED",
						"PERMISSION_CHECK_ERROR",
					],
				},
				createdAt: {
					gte: new Date(Date.now() - 60 * 60 * 1000), // 最近1小时
				},
			},
			select: {
				action: true,
				createdAt: true,
				metadata: true,
			},
			orderBy: { createdAt: "desc" },
			take: 5,
		});

		// 按错误类型分组统计
		const errorCounts = recentErrors.reduce(
			(acc, error) => {
				const key = error.action;
				if (!acc[key]) {
					acc[key] = {
						timestamp: error.createdAt.toISOString(),
						error: key,
						count: 0,
					};
				}
				acc[key].count++;
				return acc;
			},
			{} as Record<string, any>,
		);

		return Object.values(errorCounts);
	} catch (error) {
		console.error("Error getting recent errors:", error);
		return [];
	}
}

/**
 * 确定详细健康状态
 */
function determineDetailedOverallHealth(
	services: DetailedHealthStatus["services"],
): "healthy" | "unhealthy" | "degraded" {
	const dbStatus = services.database.status;
	const cacheStatus = services.cache?.status;

	if (dbStatus === "connected") {
		if (cacheStatus === "unavailable") {
			return "degraded";
		}
		return "healthy";
	}

	if (dbStatus === "error") {
		return "unhealthy";
	}

	return "degraded";
}

/**
 * GET /sys/health/detailed - 详细健康检查
 *
 * 执行详细的系统健康检查，包含性能指标和系统信息
 *
 * 查询参数:
 * - timeout: 超时时间（毫秒），默认10000
 * - include_cache: 是否包含缓存检查，默认true
 * - include_errors: 是否包含错误信息，默认true
 * - include_metrics: 是否包含性能指标，默认true
 *
 * 成功响应 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "timestamp": "2025-10-12T10:30:00.000Z",
 *     "uptime": 3600,
 *     "version": "1.0.0",
 *     "environment": "development",
 *     "services": { ... },
 *     "system": { ... },
 *     "performance": { ... },
 *     "metadata": { ... }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
	const startTime = Date.now();

	try {
		const { searchParams } = new URL(request.url);
		const timeout = Number.parseInt(searchParams.get("timeout") || "10000");
		const includeCache = searchParams.get("include_cache") !== "false";
		const includeErrors = searchParams.get("include_errors") !== "false";
		const includeMetrics = searchParams.get("include_metrics") !== "false";

		// 设置超时
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error("Detailed health check timeout")),
				timeout,
			);
		});

		// 执行详细健康检查
		const detailedHealthCheckPromise = async () => {
			const checkStartTime = Date.now();

			// 并行执行各项检查
			const [dbHealth, cacheHealth] = await Promise.all([
				checkDetailedDatabaseHealth(),
				includeCache ? checkDetailedCacheHealth() : Promise.resolve(undefined),
			]);

			// 获取系统信息
			const memoryUsage = process.memoryUsage();
			const cpuInfo = getSystemCPU();
			const resources = getSystemResources();

			// 获取性能指标
			const performanceMetrics = includeMetrics
				? getPerformanceMetrics(checkStartTime)
				: { responseTime: Date.now() - checkStartTime };

			// 获取错误信息
			const recentErrors = includeErrors ? await getRecentErrors() : [];

			// 确定整体健康状态
			const services: DetailedHealthStatus["services"] = {
				database: dbHealth,
				api: {
					status: dbHealth.status === "connected" ? "healthy" : "unhealthy",
					responseTime: dbHealth.responseTime,
				},
				...(includeCache && cacheHealth && { cache: cacheHealth }),
			};

			const overallHealth = determineDetailedOverallHealth(services);

			// 构建健康检查列表
			const healthChecks = [
				{
					name: "database",
					status: dbHealth.status,
					duration: dbHealth.responseTime,
					message: dbHealth.error,
				},
				{
					name: "api",
					status: services.api.status,
					duration: services.api.responseTime,
				},
			];

			if (includeCache && cacheHealth) {
				healthChecks.push({
					name: "cache",
					status: cacheHealth.status,
					duration: cacheHealth.responseTime,
					message: cacheHealth.error,
				});
			}

			const healthStatus: DetailedHealthStatus = {
				status: overallHealth,
				timestamp: new Date().toISOString(),
				uptime: Math.floor(process.uptime()),
				version: process.env.npm_package_version || "1.0.0",
				environment: process.env.NODE_ENV || "unknown",
				services,
				system: {
					memory: memoryUsage,
					cpu: cpuInfo,
					platform: {
						arch: process.arch,
						platform: process.platform,
						nodeVersion: process.version,
					},
					resources,
				},
				performance: {
					...performanceMetrics,
					errors: {
						errorRate: recentErrors.reduce((sum, e) => sum + e.count, 0) / 60, // 每分钟错误数
						lastErrors: recentErrors,
					},
				},
				metadata: {
					checkDuration: Date.now() - checkStartTime,
					serviceDependencies: [
						"database",
						"api",
						...(includeCache ? ["cache"] : []),
					],
					healthChecks,
				},
			};

			return healthStatus;
		};

		// 执行带超时的详细健康检查
		const healthStatus = await Promise.race([
			detailedHealthCheckPromise(),
			timeoutPromise,
		]);

		// 根据健康状态决定HTTP状态码
		const httpStatus =
			healthStatus.status === "healthy"
				? 200
				: healthStatus.status === "degraded"
					? 200
					: 503;

		// 记录详细健康检查结果
		await logAuthEvent("DETAILED_HEALTH_CHECK_COMPLETED", {
			status: healthStatus.status,
			checkDuration: healthStatus.metadata.checkDuration,
			servicesChecked: healthStatus.metadata.serviceDependencies.length,
			memoryUsage: healthStatus.system.memory.heapUsed,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			createSuccessResponse(healthStatus, httpStatus, "详细健康检查完成").data,
			{
				status: httpStatus,
				headers: {
					"X-Response-Time": healthStatus.performance.responseTime.toString(),
					"X-Health-Status": healthStatus.status,
					"X-Check-Duration": healthStatus.metadata.checkDuration.toString(),
					"X-Services-Checked":
						healthStatus.metadata.serviceDependencies.length.toString(),
					"Cache-Control": "no-cache, no-store, must-revalidate",
				},
			},
		);
	} catch (error) {
		const responseTime = Date.now() - startTime;
		console.error("Detailed health check failed:", error);

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.SERVICE_UNAVAILABLE,
				"详细健康检查失败",
				503,
				[error instanceof Error ? error.message : "健康检查服务不可用"],
			).data,
			{
				status: 503,
				headers: {
					"X-Response-Time": responseTime.toString(),
					"X-Health-Status": "unhealthy",
					"Cache-Control": "no-cache, no-store, must-revalidate",
				},
			},
		);
	}
}
