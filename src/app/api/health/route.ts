/**
 * 系统健康检查API端点
 * 提供数据库连接状态和系统整体健康状态检查
 * 支持监控和运维集成
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	API_ERROR_CODES,
	createErrorResponse,
	createSuccessResponse,
} from "~/lib/api-response";
import { db } from "~/server/db";

/**
 * 系统健康状态接口
 */
interface HealthStatus {
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
	};
	metrics?: {
		memoryUsage: NodeJS.MemoryUsage;
		platform: string;
		nodeVersion: string;
	};
}

/**
 * 数据库连接健康检查
 */
async function checkDatabaseHealth(): Promise<{
	status: "connected" | "disconnected" | "error";
	responseTime?: number;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		// 执行简单数据库查询测试连接
		await db.$queryRaw`SELECT 1 as health_check`;
		const responseTime = Date.now() - startTime;

		return {
			status: "connected",
			responseTime,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		return {
			status: "error",
			responseTime,
			error: error instanceof Error ? error.message : "Unknown database error",
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
 * 获取系统指标
 */
function getSystemMetrics() {
	return {
		memoryUsage: process.memoryUsage(),
		platform: process.platform,
		nodeVersion: process.version,
	};
}

/**
 * 确定整体系统健康状态
 */
function determineOverallHealth(
	dbStatus: HealthStatus["services"]["database"],
): "healthy" | "unhealthy" | "degraded" {
	if (dbStatus.status === "connected") {
		return "healthy";
	}
	if (dbStatus.status === "error") {
		return "unhealthy";
	}
	return "degraded";
}

/**
 * GET /api/health - 系统健康检查
 *
 * 返回系统整体健康状态，包括数据库连接状态
 * 支持监控系统集成和运维健康检查
 *
 * Query Parameters:
 * - detailed: boolean - 是否返回详细系统指标
 */
export async function GET(request: NextRequest) {
	const startTime = Date.now();

	try {
		const { searchParams } = new URL(request.url);
		const detailed = searchParams.get("detailed") === "true";

		// 检查数据库连接状态
		const dbHealth = await checkDatabaseHealth();

		// API响应时间
		const apiResponseTime = Date.now() - startTime;

		// 确定整体健康状态
		const overallHealth = determineOverallHealth(dbHealth);

		// 构建健康状态响应
		const healthStatus: HealthStatus = {
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
			},
		};

		// 如果请求详细信息，添加系统指标
		if (detailed) {
			healthStatus.metrics = getSystemMetrics();
		}

		// 根据健康状态决定HTTP状态码
		const httpStatus =
			overallHealth === "healthy"
				? 200
				: overallHealth === "degraded"
					? 200
					: 503;

		return NextResponse.json(
			createSuccessResponse(healthStatus, httpStatus).data,
			{ status: httpStatus },
		);
	} catch (error) {
		console.error("Health check failed:", error);

		const errorStatus: HealthStatus = {
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
					responseTime: Date.now() - startTime,
				},
			},
		};

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.INTERNAL_ERROR,
				"Health check failed",
				503,
				error instanceof Error ? [error.message] : ["Unknown error"],
			).data,
			{ status: 503 },
		);
	}
}

/**
 * HEAD /api/health - 简单健康检查
 *
 * 用于负载均衡器和监控系统的快速健康检查
 * 只返回HTTP状态码，不返回响应体
 */
export async function HEAD() {
	try {
		// 快速数据库连接检查
		await db.$queryRaw`SELECT 1`;

		return new NextResponse(null, { status: 200 });
	} catch (error) {
		console.error("Quick health check failed:", error);
		return new NextResponse(null, { status: 503 });
	}
}
