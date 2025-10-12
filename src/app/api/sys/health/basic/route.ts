/**
 * 系统基础设施层 - 基础健康检查API
 * 提供系统基础健康状态检查功能，支持监控和运维集成
 *
 * 路由: GET /sys/health/basic
 * 功能: 基础系统健康状态检查
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
 * 基础健康状态接口
 */
interface BasicHealthStatus {
	status: "healthy" | "unhealthy" | "degraded";
	timestamp: string;
	uptime: number;
	version: string;
	services: {
		database: {
			status: "connected" | "disconnected" | "error";
			responseTime?: number;
			error?: string;
		};
		api: {
			status: "healthy" | "unhealthy";
			responseTime: number;
		};
		cache?: {
			status: "available" | "unavailable";
			responseTime?: number;
		};
	};
	performance: {
		responseTime: number;
		memoryUsage: NodeJS.MemoryUsage;
	};
}

/**
 * 数据库连接健康检查
 * 优化：使用最轻量级的查询进行连接测试
 */
async function checkDatabaseHealth(): Promise<{
	status: "connected" | "disconnected" | "error";
	responseTime?: number;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		// 使用最轻量级的查询测试数据库连接
		await db.$queryRaw`SELECT 1 as health_check`;
		const responseTime = Date.now() - startTime;

		return {
			status: "connected",
			responseTime,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown database error";

		// 记录数据库连接失败
		await logSecurityEvent("DATABASE_HEALTH_CHECK_FAILED", {
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
 * 缓存服务健康检查
 * 检查Redis或其他缓存服务的连接状态
 */
async function checkCacheHealth(): Promise<{
	status: "available" | "unavailable";
	responseTime?: number;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		// TODO: 实际的缓存健康检查
		// 这里应该检查Redis或其他缓存服务的连接
		// 由于当前架构中没有缓存服务，返回不可用状态

		const responseTime = Date.now() - startTime;
		return {
			status: "unavailable",
			responseTime,
			error: "缓存服务未配置",
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
 * 计算系统启动时间
 */
function getUptime(): number {
	return Math.floor(process.uptime());
}

/**
 * 获取应用版本信息
 */
function getAppVersion(): string {
	return process.env.npm_package_version || "1.0.0";
}

/**
 * 获取系统内存使用情况
 */
function getMemoryUsage(): NodeJS.MemoryUsage {
	return process.memoryUsage();
}

/**
 * 确定整体系统健康状态
 * Linus式简化：基于核心服务状态判断整体健康状态
 */
function determineOverallHealth(
	dbStatus: BasicHealthStatus["services"]["database"],
	cacheStatus?: BasicHealthStatus["services"]["cache"],
): "healthy" | "unhealthy" | "degraded" {
	// 数据库是核心服务，其状态直接决定系统健康状态
	if (dbStatus.status === "connected") {
		// 即使缓存不可用，系统仍然可用（降级状态）
		if (cacheStatus?.status === "unavailable") {
			return "degraded";
		}
		return "healthy";
	}

	if (dbStatus.status === "error") {
		return "unhealthy";
	}

	return "degraded";
}

/**
 * GET /sys/health/basic - 基础健康检查
 *
 * 执行基础系统健康检查，验证核心服务状态
 *
 * 查询参数:
 * - timeout: 超时时间（毫秒），默认5000
 * - include_cache: 是否包含缓存检查，默认false
 *
 * 成功响应 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "timestamp": "2025-10-12T10:30:00.000Z",
 *     "uptime": 3600,
 *     "version": "1.0.0",
 *     "services": {
 *       "database": {
 *         "status": "connected",
 *         "responseTime": 15
 *       },
 *       "api": {
 *         "status": "healthy",
 *         "responseTime": 25
 *       }
 *     },
 *     "performance": {
 *       "responseTime": 25,
 *       "memoryUsage": {
 *         "rss": 50331648,
 *         "heapTotal": 20971520,
 *         "heapUsed": 15728640,
 *         "external": 1048576,
 *         "arrayBuffers": 524288
 *       }
 *     }
 *   }
 * }
 *
 * 错误响应 (503):
 * {
 *   "success": false,
 *   "error": "SERVICE_UNAVAILABLE",
 *   "message": "系统服务不可用",
 *   "data": {
 *     "systemStatus": "unhealthy",
 *     "unhealthyServices": ["database"],
 *     "lastCheckAt": "2025-10-12T10:30:00.000Z"
 *   }
 * }
 */
export async function GET(request: NextRequest) {
	const startTime = Date.now();

	try {
		const { searchParams } = new URL(request.url);
		const timeout = Number.parseInt(searchParams.get("timeout") || "5000");
		const includeCache = searchParams.get("include_cache") === "true";

		// 设置超时
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error("Health check timeout")), timeout);
		});

		// 执行健康检查
		const healthCheckPromise = async () => {
			// 检查数据库连接状态
			const dbHealth = await checkDatabaseHealth();

			// 可选的缓存检查
			let cacheHealth;
			if (includeCache) {
				cacheHealth = await checkCacheHealth();
			}

			// API响应时间
			const apiResponseTime = Date.now() - startTime;

			// 确定整体健康状态
			const overallHealth = determineOverallHealth(dbHealth, cacheHealth);

			// 构建健康状态响应
			const healthStatus: BasicHealthStatus = {
				status: overallHealth,
				timestamp: new Date().toISOString(),
				uptime: getUptime(),
				version: getAppVersion(),
				services: {
					database: dbHealth,
					api: {
						status: overallHealth === "healthy" ? "healthy" : "unhealthy",
						responseTime: apiResponseTime,
					},
					...(includeCache && cacheHealth && { cache: cacheHealth }),
				},
				performance: {
					responseTime: apiResponseTime,
					memoryUsage: getMemoryUsage(),
				},
			};

			return healthStatus;
		};

		// 执行带超时的健康检查
		const healthStatus = await Promise.race([
			healthCheckPromise(),
			timeoutPromise,
		]);

		// 根据健康状态决定HTTP状态码
		const httpStatus =
			healthStatus.status === "healthy"
				? 200
				: healthStatus.status === "degraded"
					? 200
					: 503;

		// 记录健康检查结果
		await logAuthEvent("HEALTH_CHECK_COMPLETED", {
			status: healthStatus.status,
			responseTime: healthStatus.performance.responseTime,
			servicesChecked: Object.keys(healthStatus.services).length,
			memoryUsage: healthStatus.performance.memoryUsage.heapUsed,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			createSuccessResponse(healthStatus, httpStatus, "健康检查完成").data,
			{
				status: httpStatus,
				headers: {
					"X-Response-Time": healthStatus.performance.responseTime.toString(),
					"X-Health-Status": healthStatus.status,
					"X-Uptime": healthStatus.uptime.toString(),
					"Cache-Control": "no-cache, no-store, must-revalidate",
					Pragma: "no-cache",
					Expires: "0",
				},
			},
		);
	} catch (error) {
		const responseTime = Date.now() - startTime;
		console.error("Basic health check failed:", error);

		const errorStatus: BasicHealthStatus = {
			status: "unhealthy",
			timestamp: new Date().toISOString(),
			uptime: getUptime(),
			version: getAppVersion(),
			services: {
				database: {
					status: "error",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				api: {
					status: "unhealthy",
					responseTime: responseTime,
				},
			},
			performance: {
				responseTime,
				memoryUsage: getMemoryUsage(),
			},
		};

		// 记录健康检查失败
		await logSecurityEvent("HEALTH_CHECK_ERROR", {
			error: error instanceof Error ? error.message : "Unknown error",
			responseTime,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.SERVICE_UNAVAILABLE,
				"系统健康检查失败",
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

/**
 * HEAD /sys/health/basic - 简单健康检查
 *
 * 用于负载均衡器和监控系统的快速健康检查
 * 只返回HTTP状态码，不返回响应体
 */
export async function HEAD() {
	try {
		// 快速数据库连接检查
		await db.$queryRaw`SELECT 1`;

		return new NextResponse(null, {
			status: 200,
			headers: {
				"X-Health-Status": "healthy",
				"Cache-Control": "no-cache, no-store, must-revalidate",
			},
		});
	} catch (error) {
		console.error("Quick health check failed:", error);

		return new NextResponse(null, {
			status: 503,
			headers: {
				"X-Health-Status": "unhealthy",
				"Cache-Control": "no-cache, no-store, must-revalidate",
			},
		});
	}
}
