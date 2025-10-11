/**
 * 项目管理API路由
 * 提供项目的创建、查询、更新和删除功能
 * 遵循RESTful API设计规范
 */

import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
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

/**
 * 获取用户项目列表
 * GET /api/projects?page=1&limit=10&search=keyword&visibility=PUBLIC&sort=createdAt&order=desc
 */
export async function GET(request: NextRequest) {
	try {
		// 获取当前用户
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.UNAUTHORIZED,
					"Authentication required",
					401,
				).data,
				{ status: 401 },
			);
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
					members: {
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
				members: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
					},
				},
				_count: {
					select: {
						members: true,
						applications: true,
						DataVersions: true,
					},
				},
			},
			orderBy,
			skip,
			take: validatedQuery.limit,
		});

		// 返回分页响应
		return NextResponse.json(
			createPaginatedResponse(projects, {
				page: validatedQuery.page,
				limit: validatedQuery.limit,
				total,
				totalPages,
				hasNext: validatedQuery.page < totalPages,
				hasPrev: validatedQuery.page > 1,
			}).data,
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error fetching projects:", error);

		if (error instanceof ZodError) {
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.VALIDATION_ERROR,
					"Invalid query parameters",
					400,
					error.issues,
				).data,
				{ status: 400 },
			);
		}

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.INTERNAL_ERROR,
				"Failed to fetch projects",
				500,
			).data,
			{ status: 500 },
		);
	}
}

/**
 * 创建新项目
 * POST /api/projects
 * Body: { name: string, slug: string, description?: string, visibility?: 'PUBLIC'|'PRIVATE' }
 */
export async function POST(request: NextRequest) {
	try {
		// 获取当前用户
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.UNAUTHORIZED,
					"Authentication required",
					401,
				).data,
				{ status: 401 },
			);
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
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.ALREADY_EXISTS,
					"Project with this name already exists",
					409,
				).data,
				{ status: 409 },
			);
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
				return NextResponse.json(
					createErrorResponse(
						API_ERROR_CODES.ALREADY_EXISTS,
						"Unable to generate unique slug, please try a different name",
						409,
					).data,
					{ status: 409 },
				);
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
				},
				include: {
					members: {
						include: {
							user: {
								select: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
					_count: {
						select: {
							members: true,
							applications: true,
							DataVersions: true,
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
			await tx.auditLog.create({
				data: {
					projectId: newProject.id,
					actorUserId: user.id,
					action: "CREATE_PROJECT",
					targetType: "PROJECT",
					targetId: newProject.id,
					message: `Created project "${newProject.name}"`,
					metadata: {
						projectName: newProject.name,
						visibility: newProject.visibility,
					},
				},
			});

			return newProject;
		});

		// 返回成功响应
		return NextResponse.json(createSuccessResponse(project, 201).data, {
			status: 201,
		});
	} catch (error) {
		console.error("Error creating project:", error);

		if (error instanceof ZodError) {
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.VALIDATION_ERROR,
					"Invalid input data",
					400,
					error.issues,
				).data,
				{ status: 400 },
			);
		}

		// 检查是否为唯一约束错误
		if (error instanceof Error && error.message.includes("Unique constraint")) {
			return NextResponse.json(
				createErrorResponse(
					API_ERROR_CODES.ALREADY_EXISTS,
					"Project with this name or slug already exists",
					409,
				).data,
				{ status: 409 },
			);
		}

		return NextResponse.json(
			createErrorResponse(
				API_ERROR_CODES.INTERNAL_ERROR,
				"Failed to create project",
				500,
			).data,
			{ status: 500 },
		);
	}
}
