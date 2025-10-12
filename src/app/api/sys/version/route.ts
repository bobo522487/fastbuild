/**
 * 系统基础设施层 - 系统版本信息API
 * 提供系统版本信息和组件状态查询功能
 *
 * 路由: GET /sys/version
 * 功能: 系统版本信息和组件状态管理
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
 * 系统版本信息接口
 */
interface SystemVersionInfo {
	system: {
		name: string;
		version: string;
		buildNumber: string;
		buildDate: string;
		environment: string;
		region?: string;
		datacenter?: string;
	};
	components: {
		api: {
			name: string;
			version: string;
			status: "healthy" | "unhealthy" | "degraded";
			lastUpdated: string;
		};
		database: {
			name: string;
			version: string;
			status: "connected" | "disconnected" | "error";
			connectionInfo: {
				host: string;
				port: number;
				database: string;
			};
		};
		framework: {
			name: string;
			version: string;
			runtime: string;
		};
		dependencies: Array<{
			name: string;
			version: string;
			type: "runtime" | "development" | "peer";
		}>;
	};
	features: {
		auth: {
			enabled: boolean;
			providers: string[];
			jwtEnabled: boolean;
		};
		permissions: {
			system: "hardcoded" | "dynamic";
			cacheEnabled: boolean;
			batchCheckEnabled: boolean;
		};
		monitoring: {
			healthChecks: boolean;
			auditLogging: boolean;
			metricsCollection: boolean;
		};
		security: {
			rateLimiting: boolean;
			ipTracking: boolean;
			auditTrail: boolean;
		};
	};
	metadata: {
		startupTime: string;
		uptime: number;
		deploymentId: string;
		gitCommit?: string;
		gitBranch?: string;
	};
	links: {
		documentation: string;
		apiDocs: string;
		statusPage: string;
		support: string;
	};
}

/**
 * 获取数据库版本信息
 */
async function getDatabaseVersion(): Promise<{
	name: string;
	version: string;
	status: "connected" | "disconnected" | "error";
	connectionInfo: {
		host: string;
		port: number;
		database: string;
	};
}> {
	try {
		// 查询PostgreSQL版本
		const versionResult = await db.$queryRaw<{ version: string }[]>`
			SELECT version() as version
		`;

		// 解析数据库连接信息
		const databaseUrl = process.env.DATABASE_URL || "";
		let host = "unknown";
		let port = 5432;
		let database = "unknown";

		try {
			const url = new URL(databaseUrl);
			host = url.hostname;
			port = Number.parseInt(url.port) || 5432;
			database = url.pathname.substring(1); // 移除开头的'/'
		} catch (error) {
			// 如果解析失败，使用默认值
		}

		return {
			name: "PostgreSQL",
			version: versionResult[0]?.version || "Unknown",
			status: "connected",
			connectionInfo: {
				host,
				port,
				database,
			},
		};
	} catch (error) {
		return {
			name: "PostgreSQL",
			version: "Unknown",
			status: "error",
			connectionInfo: {
				host: "unknown",
				port: 5432,
				database: "unknown",
			},
		};
	}
}

/**
 * 获取依赖包版本信息
 */
function getDependencyVersions(): SystemVersionInfo["components"]["dependencies"] {
	const dependencies: SystemVersionInfo["components"]["dependencies"] = [
		{
			name: "next",
			version: "15.5.4", // 从package.json读取
			type: "runtime",
		},
		{
			name: "react",
			version: "19.2.0", // 从package.json读取
			type: "runtime",
		},
		{
			name: "typescript",
			version: "5.9.3", // 从package.json读取
			type: "development",
		},
		{
			name: "prisma",
			version: "6.17.0", // 从package.json读取
			type: "runtime",
		},
		{
			name: "tailwindcss",
			version: "4.1.14", // 从package.json读取
			type: "development",
		},
		{
			name: "biome",
			version: "1.9.4", // 从package.json读取
			type: "development",
		},
	];

	return dependencies;
}

/**
 * 获取构建信息
 */
function getBuildInfo(): {
	buildNumber: string;
	buildDate: string;
	gitCommit?: string;
	gitBranch?: string;
} {
	try {
		// 在实际部署中，这些信息应该在构建时注入
		return {
			buildNumber: process.env.BUILD_NUMBER || "dev-" + Date.now(),
			buildDate: process.env.BUILD_DATE || new Date().toISOString(),
			gitCommit: process.env.GIT_COMMIT,
			gitBranch: process.env.GIT_BRANCH || "main",
		};
	} catch (error) {
		return {
			buildNumber: "unknown",
			buildDate: new Date().toISOString(),
		};
	}
}

/**
 * 检查API组件状态
 */
async function checkApiComponentStatus(): Promise<{
	name: string;
	version: string;
	status: "healthy" | "unhealthy" | "degraded";
	lastUpdated: string;
}> {
	try {
		// 执行简单的数据库查询来验证API状态
		await db.$queryRaw`SELECT 1`;

		return {
			name: "FastBuild API",
			version: process.env.npm_package_version || "1.0.0",
			status: "healthy",
			lastUpdated: new Date().toISOString(),
		};
	} catch (error) {
		return {
			name: "FastBuild API",
			version: process.env.npm_package_version || "1.0.0",
			status: "unhealthy",
			lastUpdated: new Date().toISOString(),
		};
	}
}

/**
 * GET /sys/version - 系统版本信息
 *
 * 获取系统版本信息和各组件状态
 *
 * 查询参数:
 * - format: 返回格式 (json | yaml)，默认json
 * - include_dependencies: 是否包含依赖信息，默认true
 * - include_health: 是否包含健康状态，默认true
 *
 * 成功响应 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "system": {
 *       "name": "FastBuild",
 *       "version": "1.0.0",
 *       "buildNumber": "build-12345",
 *       "buildDate": "2025-10-12T10:00:00.000Z",
 *       "environment": "production",
 *       "region": "us-east-1",
 *       "datacenter": "aws-us-east-1a"
 *     },
 *     "components": { ... },
 *     "features": { ... },
 *     "metadata": { ... },
 *     "links": { ... }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
	const startTime = Date.now();

	try {
		const { searchParams } = new URL(request.url);
		const format = searchParams.get("format") || "json";
		const includeDependencies =
			searchParams.get("include_dependencies") !== "false";
		const includeHealth = searchParams.get("include_health") !== "false";

		// 记录版本信息查询
		await logAuthEvent("SYSTEM_VERSION_REQUESTED", {
			format,
			includeDependencies,
			includeHealth,
			userAgent: request.headers.get("user-agent"),
			ipAddress: request.headers.get("x-forwarded-for") || "unknown",
		});

		// 并行获取各组件信息
		const [dbVersion, apiStatus, buildInfo] = await Promise.all([
			getDatabaseVersion(),
			includeHealth ? checkApiComponentStatus() : Promise.resolve(undefined),
			getBuildInfo(),
		]);

		// 构建系统版本信息
		const versionInfo: SystemVersionInfo = {
			system: {
				name: "FastBuild",
				version: process.env.npm_package_version || "1.0.0",
				buildNumber: buildInfo.buildNumber,
				buildDate: buildInfo.buildDate,
				environment: process.env.NODE_ENV || "unknown",
				region: process.env.AWS_REGION || process.env.REGION,
				datacenter: process.env.DATACENTER,
			},
			components: {
				api: apiStatus || {
					name: "FastBuild API",
					version: process.env.npm_package_version || "1.0.0",
					status: "unknown" as const,
					lastUpdated: new Date().toISOString(),
				},
				database: dbVersion,
				framework: {
					name: "Next.js",
					version: "15.5.4",
					runtime: "Node.js " + process.version,
				},
				dependencies: includeDependencies ? getDependencyVersions() : [],
			},
			features: {
				auth: {
					enabled: true,
					providers: ["credentials", "github"],
					jwtEnabled: true,
				},
				permissions: {
					system: "hardcoded",
					cacheEnabled: true,
					batchCheckEnabled: true,
				},
				monitoring: {
					healthChecks: true,
					auditLogging: true,
					metricsCollection: false, // 可以根据实际情况调整
				},
				security: {
					rateLimiting: true,
					ipTracking: true,
					auditTrail: true,
				},
			},
			metadata: {
				startupTime: new Date(
					Date.now() - process.uptime() * 1000,
				).toISOString(),
				uptime: Math.floor(process.uptime()),
				deploymentId: buildInfo.buildNumber,
				gitCommit: buildInfo.gitCommit,
				gitBranch: buildInfo.gitBranch,
			},
			links: {
				documentation: "/docs",
				apiDocs: "/api/docs",
				statusPage: "https://status.fastbuild.dev",
				support: "mailto:support@fastbuild.dev",
			},
		};

		const responseTime = Date.now() - startTime;

		// 根据请求格式返回响应
		if (format === "yaml") {
			// 简单的YAML格式化（实际项目中应使用专门的YAML库）
			const yamlContent = `system:
  name: ${versionInfo.system.name}
  version: ${versionInfo.system.version}
  buildNumber: ${versionInfo.system.buildNumber}
  environment: ${versionInfo.system.environment}

components:
  api:
    name: ${versionInfo.components.api.name}
    version: ${versionInfo.components.api.version}
    status: ${versionInfo.components.api.status}
  database:
    name: ${versionInfo.components.database.name}
    version: ${versionInfo.components.database.version}
    status: ${versionInfo.components.database.status}

# 完整信息请使用 ?format=json 获取JSON格式`;

			return new NextResponse(yamlContent, {
				status: 200,
				headers: {
					"Content-Type": "text/yaml; charset=utf-8",
					"X-Response-Time": responseTime.toString(),
					"X-System-Version": versionInfo.system.version,
					"Cache-Control": "public, max-age=300", // 5分钟缓存
				},
			});
		}

		return NextResponse.json(
			createSuccessResponse(versionInfo, 200, "系统版本信息获取成功").data,
			{
				status: 200,
				headers: {
					"X-Response-Time": responseTime.toString(),
					"X-System-Version": versionInfo.system.version,
					"X-Build-Number": versionInfo.system.buildNumber,
					"X-Environment": versionInfo.system.environment,
					"Cache-Control": "public, max-age=300", // 5分钟缓存
					Vary: "Accept",
				},
			},
		);
	} catch (error) {
		const responseTime = Date.now() - startTime;
		console.error("System version check failed:", error);

		await logSecurityEvent("SYSTEM_VERSION_ERROR", {
			error: error instanceof Error ? error.message : "Unknown error",
			responseTime,
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.INTERNAL_ERROR,
				"获取系统版本信息失败",
				500,
				["服务器内部错误"],
			).data,
			{
				status: 500,
				headers: {
					"X-Response-Time": responseTime.toString(),
					"Cache-Control": "no-cache",
				},
			},
		);
	}
}

/**
 * HEAD /sys/version - 版本检查
 *
 * 快速检查系统版本，只返回HTTP头信息
 */
export async function HEAD() {
	try {
		const version = process.env.npm_package_version || "1.0.0";
		const buildNumber = process.env.BUILD_NUMBER || "unknown";

		return new NextResponse(null, {
			status: 200,
			headers: {
				"X-System-Version": version,
				"X-Build-Number": buildNumber,
				"X-Environment": process.env.NODE_ENV || "unknown",
				"X-System-Name": "FastBuild",
				"Cache-Control": "public, max-age=300",
			},
		});
	} catch (error) {
		return new NextResponse(null, {
			status: 500,
			headers: {
				"X-System-Version": "unknown",
				"X-Environment": "unknown",
				"Cache-Control": "no-cache",
			},
		});
	}
}
