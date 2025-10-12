/**
 * OpenAPI 共享 Schema 定义
 *
 * 此文件定义了 API 文档中常用的响应模式，
 * 可以在不同的 API 路由中引用和复用
 */

import { z } from "zod";

/**
 * 通用 API 错误响应模式
 */
export const ErrorResponseSchema = z
	.object({
		error: z
			.object({
				code: z.string().describe("错误代码"),
				message: z.string().describe("错误消息"),
				details: z.array(z.string()).optional().describe("错误详情列表"),
			})
			.describe("错误信息"),
	})
	.describe("API 错误响应");

/**
 * 成功响应包装器
 */
export const SuccessResponseSchema = z
	.object({
		data: z.any().describe("响应数据"),
		success: z.literal(true).describe("操作成功标识"),
	})
	.describe("成功响应");

/**
 * 分页信息模式
 */
export const PaginationInfoSchema = z
	.object({
		page: z.number().int().positive().describe("当前页码"),
		limit: z.number().int().positive().max(100).describe("每页数量"),
		total: z.number().int().nonnegative().describe("总记录数"),
		totalPages: z.number().int().nonnegative().describe("总页数"),
		hasNext: z.boolean().describe("是否有下一页"),
		hasPrev: z.boolean().describe("是否有上一页"),
	})
	.describe("分页信息");

/**
 * 分页响应模式
 */
export function PaginatedResponseSchema<T extends z.ZodType>(dataSchema: T) {
	return z
		.object({
			data: z.array(dataSchema).describe("数据列表"),
			pagination: PaginationInfoSchema.describe("分页信息"),
		})
		.describe(`分页响应 - ${dataSchema.description || "Unknown"}`);
}

/**
 * 用户信息模式
 */
export const UserInfoSchema = z
	.object({
		id: z.string().uuid().describe("用户唯一标识"),
		email: z.string().email().describe("用户邮箱"),
		name: z.string().describe("用户姓名"),
		avatar: z.string().url().nullable().optional().describe("用户头像URL"),
		createdAt: z.string().datetime().describe("账户创建时间"),
		updatedAt: z.string().datetime().describe("信息更新时间"),
	})
	.describe("用户信息");

/**
 * JWT 令牌响应模式
 */
export const TokenResponseSchema = z
	.object({
		user: UserInfoSchema.describe("用户信息"),
		accessToken: z.string().describe("JWT 访问令牌"),
		refreshToken: z.string().describe("JWT 刷新令牌"),
		expiresIn: z.number().int().positive().describe("访问令牌过期时间（秒）"),
		tokenType: z.literal("Bearer").describe("令牌类型"),
	})
	.describe("JWT 令牌响应");

/**
 * 项目信息模式
 */
export const ProjectInfoSchema = z
	.object({
		id: z.string().uuid().describe("项目唯一标识"),
		name: z.string().describe("项目名称"),
		slug: z.string().describe("项目唯一标识符"),
		description: z.string().nullable().describe("项目描述"),
		visibility: z.enum(["PUBLIC", "PRIVATE"]).describe("项目可见性"),
		createdBy: z.string().uuid().describe("创建者ID"),
		createdAt: z.string().datetime().describe("创建时间"),
		updatedAt: z.string().datetime().describe("更新时间"),
	})
	.describe("项目信息");

/**
 * API 版本信息模式
 */
export const ApiVersionSchema = z
	.object({
		version: z.string().describe("API 版本号"),
		environment: z
			.enum(["development", "staging", "production"])
			.describe("运行环境"),
		buildTime: z.string().datetime().describe("构建时间"),
		gitCommit: z.string().optional().describe("Git 提交哈希"),
	})
	.describe("API 版本信息");

/**
 * 健康检查响应模式
 */
export const HealthCheckSchema = z
	.object({
		status: z.enum(["healthy", "unhealthy", "degraded"]).describe("服务状态"),
		timestamp: z.string().datetime().describe("检查时间"),
		version: z.string().describe("应用版本"),
		services: z
			.record(z.enum(["healthy", "unhealthy", "unknown"]))
			.optional()
			.describe("依赖服务状态"),
		metrics: z
			.object({
				uptime: z.number().describe("运行时间（秒）"),
				memoryUsage: z.string().describe("内存使用率"),
				cpuUsage: z.string().describe("CPU 使用率"),
			})
			.optional()
			.describe("性能指标"),
	})
	.describe("健康检查响应");

/**
 * 验证错误详情模式
 */
export const ValidationErrorSchema = z
	.object({
		field: z.string().describe("错误字段"),
		message: z.string().describe("错误消息"),
		code: z.string().optional().describe("错误代码"),
		value: z.any().optional().describe("错误值"),
	})
	.describe("验证错误详情");

/**
 * 详细错误响应模式
 */
export const DetailedErrorResponseSchema = z
	.object({
		error: z
			.object({
				code: z.string().describe("错误代码"),
				message: z.string().describe("错误消息"),
				details: z
					.array(ValidationErrorSchema)
					.optional()
					.describe("详细错误信息"),
				requestId: z.string().optional().describe("请求追踪ID"),
				timestamp: z.string().datetime().describe("错误发生时间"),
				path: z.string().optional().describe("请求路径"),
			})
			.describe("错误信息"),
	})
	.describe("详细错误响应");
