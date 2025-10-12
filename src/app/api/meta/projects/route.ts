/**
 * 项目管理API路由
 * 提供项目的创建、查询、更新和删除功能
 * 遵循RESTful API设计规范
 */

import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
	API_ERROR_CODES,
	createErrorResponse,
	createPaginatedResponse,
	createSuccessResponse,
} from "~/lib/api-response";
import { getCurrentUser } from "~/lib/server-utils";
import { generateSlug } from "~/lib/utils";
import { CreateProjectSchema, ProjectQuerySchema } from "~/lib/validations";
import { db } from "~/server/db";
import { createAuditLog } from "~/server/api/middleware/audit";

// 项目响应模式
const ProjectResponseSchema = z
	.object({
		id: z.string().uuid().describe("项目唯一标识"),
		name: z.string().describe("项目名称"),
		slug: z.string().describe("项目唯一标识符"),
		description: z.string().nullable().describe("项目描述"),
		visibility: z.enum(["PUBLIC", "PRIVATE"]).describe("项目可见性"),
		createdBy: z.string().uuid().describe("创建者ID"),
		createdAt: z.string().datetime().describe("创建时间"),
		updatedAt: z.string().datetime().describe("更新时间"),
		members: z
			.array(
				z.object({
					id: z.string().uuid(),
					role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
					user: z.object({
						id: z.string().uuid(),
						name: z.string(),
						email: z.string().email(),
					}),
				}),
			)
			.describe("项目成员"),
		_count: z
			.object({
				members: z.number(),
				applications: z.number(),
				dataModelDeployments: z.number(),
			})
			.describe("关联数据统计"),
	})
	.describe("项目信息");

// 分页项目列表响应模式
const ProjectListResponseSchema = z
	.object({
		data: z.array(ProjectResponseSchema).describe("项目列表"),
		pagination: z
			.object({
				page: z.number().describe("当前页码"),
				limit: z.number().describe("每页数量"),
				total: z.number().describe("总数量"),
				totalPages: z.number().describe("总页数"),
				hasNext: z.boolean().describe("是否有下一页"),
				hasPrev: z.boolean().describe("是否有上一页"),
			})
			.describe("分页信息"),
	})
	.describe("项目列表响应");

/**
 * 获取项目列表
 * @description 获取当前用户有权限访问的项目列表，支持分页、搜索和排序
 * @tags Projects
 * @params ProjectQuerySchema
 * @response 200:ProjectListResponseSchema:成功返回项目列表
 * @response 400:ErrorResponseSchema:请求参数无效
 * @response 401:ErrorResponseSchema:未授权访问
 * @response 500:ErrorResponseSchema:服务器内部错误
 * @auth bearer
 * @openapi
 */
export async function GET(request: NextRequest) {
	try {
		// 获取当前用户
		const user = await getCurrentUser();
		if (!user) {
			const response = createErrorResponse(
				API_ERROR_CODES.UNAUTHORIZED,
				"Authentication required",
				401,
			);
			return NextResponse.json(response, { status: 401 });
		}

		// 解析查询参数
		const { searchParams } = new URL(request.url);
		const queryData = Object.fromEntries(searchParams.entries());
		const validatedQuery = ProjectQuerySchema.parse(queryData);

		// 构建查询条件
		const whereCondition: Prisma.ProjectWhereInput = {
			OR: [
				// 用户创建的项目
				{ createdBy: user.id },
				// 用户参与的项目
				{
					ProjectMember: {
						some: { userId: user.id },
					},
				},
			],
		};

		// 添加搜索条件
		if (validatedQuery.search) {
			whereCondition.name = {
				contains: validatedQuery.search,
				mode: "insensitive",
			};
		}

		// 添加可见性过滤
		if (validatedQuery.visibility) {
			whereCondition.visibility = validatedQuery.visibility;
		}

		// 获取总数
		const total = await db.project.count({
			where: whereCondition,
		});

		// 计算分页
		const skip = (validatedQuery.page - 1) * validatedQuery.limit;
		const totalPages = Math.ceil(total / validatedQuery.limit);

		// 构建排序条件
		const orderBy: Prisma.ProjectOrderByWithRelationInput = {
			[validatedQuery.sort]: validatedQuery.order,
		};

		// 查询项目列表
		const projects = await db.project.findMany({
			where: whereCondition,
			include: {
				ProjectMember: {
					include: {
						User: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
				_count: {
					select: {
						ProjectMember: true,
						Application: true,
						DataModelDeployment: true,
					},
				},
			},
			orderBy,
			skip,
			take: validatedQuery.limit,
		});

		// 返回分页响应
		const response = createPaginatedResponse(projects, {
			page: validatedQuery.page,
			limit: validatedQuery.limit,
			total,
			totalPages,
			hasNext: validatedQuery.page < totalPages,
			hasPrev: validatedQuery.page > 1,
		});

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Error fetching projects:", error);

		if (error instanceof ZodError) {
			const response = createErrorResponse(
				API_ERROR_CODES.VALIDATION_ERROR,
				"Invalid query parameters",
				400,
				error.issues.map((issue) => issue.message),
			);
			return NextResponse.json(response, { status: 400 });
		}

		const errorResponse = createErrorResponse(
			API_ERROR_CODES.INTERNAL_ERROR,
			"Failed to fetch projects",
			500,
		);
		return NextResponse.json(errorResponse, { status: 500 });
	}
}

/**
 * 创建新项目
 * @description 创建一个新的项目，当前用户自动成为项目所有者
 * @tags Projects
 * @body CreateProjectSchema
 * @bodyDescription 项目创建信息，包含名称、描述和可见性设置
 * @response 201:ProjectResponseSchema:项目创建成功
 * @response 400:ErrorResponseSchema:请求参数无效
 * @response 401:ErrorResponseSchema:未授权访问
 * @response 409:ErrorResponseSchema:项目名称或标识符已存在
 * @response 500:ErrorResponseSchema:服务器内部错误
 * @auth bearer
 * @openapi
 */
export async function POST(request: NextRequest) {
	try {
		// 获取当前用户
		const user = await getCurrentUser();
		if (!user) {
			const response = createErrorResponse(
				API_ERROR_CODES.UNAUTHORIZED,
				"Authentication required",
				401,
			);
			return NextResponse.json(response, { status: 401 });
		}

		// 解析请求体
		const body = await request.json();
		const validatedData = CreateProjectSchema.parse(body);

		// 检查项目名称是否已存在
		const existingProjectByName = await db.project.findFirst({
			where: {
				name: validatedData.name,
				deletedAt: null,
			},
		});

		if (existingProjectByName) {
			const response = createErrorResponse(
				API_ERROR_CODES.ALREADY_EXISTS,
				"Project with this name already exists",
				409,
			);
			return NextResponse.json(response, { status: 409 });
		}

		// 检查slug是否已存在，如果存在则生成新的slug
		let finalSlug = validatedData.slug;
		const existingProjectBySlug = await db.project.findFirst({
			where: {
				slug: finalSlug,
				deletedAt: null,
			},
		});

		if (existingProjectBySlug) {
			finalSlug = generateSlug(validatedData.name);

			// 再次检查新生成的slug
			const newSlugExists = await db.project.findFirst({
				where: {
					slug: finalSlug,
					deletedAt: null,
				},
			});

			if (newSlugExists) {
				const response = createErrorResponse(
					API_ERROR_CODES.ALREADY_EXISTS,
					"Unable to generate unique slug, please try a different name",
					409,
				);
				return NextResponse.json(response, { status: 409 });
			}
		}

		// 创建项目（使用事务确保数据一致性）
		const project = await db.$transaction(async (tx) => {
			// 创建项目
			const newProject = await tx.project.create({
				data: {
					name: validatedData.name,
					slug: finalSlug,
					description: validatedData.description,
					visibility: validatedData.visibility,
					createdBy: user.id,
					updatedAt: new Date(),
				},
				include: {
					ProjectMember: {
						include: {
							User: {
								select: {
									id: true,
									name: true,
									email: true,
								},
							},
						},
					},
					_count: {
						select: {
							ProjectMember: true,
							Application: true,
							DataModelDeployment: true,
						},
					},
				},
			});

			// 添加创建者为项目所有者
			await tx.projectMember.create({
				data: {
					projectId: newProject.id,
					userId: user.id,
					role: "OWNER",
				},
			});

			// 记录审计日志
			await createAuditLog({
				projectId: newProject.id,
				action: "CREATE_PROJECT",
				resourceType: "PROJECT",
				resourceId: newProject.id,
				message: `Created project "${newProject.name}"`,
				metadata: {
					projectName: newProject.name,
					visibility: newProject.visibility,
				},
			});

			return newProject;
		});

		// 返回成功响应
		return NextResponse.json(createSuccessResponse(project), {
			status: 201,
		});
	} catch (error) {
		console.error("Error creating project:", error);

		if (error instanceof ZodError) {
			const response = createErrorResponse(
				API_ERROR_CODES.VALIDATION_ERROR,
				"Invalid input data",
				400,
				error.issues.map((issue) => issue.message),
			);
			return NextResponse.json(response, { status: 400 });
		}

		// 检查是否为唯一约束错误
		if (error instanceof Error && error.message.includes("Unique constraint")) {
			const response = createErrorResponse(
				API_ERROR_CODES.ALREADY_EXISTS,
				"Project with this name or slug already exists",
				409,
			);
			return NextResponse.json(response, { status: 409 });
		}

		const errorResponse = createErrorResponse(
			API_ERROR_CODES.INTERNAL_ERROR,
			"Failed to create project",
			500,
		);
		return NextResponse.json(errorResponse, { status: 500 });
	}
}
