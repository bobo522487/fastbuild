import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "~/lib/server-utils";
import { auditLogger } from "~/server/api/middleware/audit";
import { db } from "~/server/db";

// 项目更新验证schema
const UpdateProjectSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/)
		.optional(),
	slug: z
		.string()
		.min(1)
		.max(50)
		.regex(/^[a-z0-9\-_]+$/)
		.transform((val) => val.toLowerCase())
		.optional(),
	description: z.string().max(500).optional(),
	visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

// 获取单个项目
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	const requestId = `get-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "未授权访问",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 401 },
			);
		}

		const { id } = await params;

		// 查询项目，包含成员信息
		const project = await db.project.findFirst({
			where: {
				id,
				OR: [
					{ visibility: "PUBLIC" },
					{
						ProjectMember: {
							some: {
								userId: user.id,
							},
						},
					},
				],
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

		if (!project) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "项目不存在",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 404 },
			);
		}

		// 记录审计日志
		await auditLogger.log({
			action: "VIEW_PROJECT",
			resourceType: "PROJECT",
			resourceId: project.id,
			message: `查看项目: ${project.name}`,
			metadata: {
				projectName: project.name,
				visibility: project.visibility,
			},
			projectId: id,
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					...project,
					memberCount: project._count.ProjectMember,
					applicationCount: project._count.Application,
					dataVersionCount: project._count.DataModelDeployment,
					// 添加当前用户在项目中的角色
					currentUserRole:
						project.ProjectMember.find((member) => member.userId === user.id)?.role ||
						null,
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error(`[${requestId}] Failed to get project:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "获取项目失败",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 500 },
		);
	}
}

// 更新项目
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	const requestId = `update-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "未授权访问",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 401 },
			);
		}

		const { id } = await params;
		const body = await request.json();

		// 验证请求数据
		const validatedData = UpdateProjectSchema.parse(body);

		// 检查项目是否存在以及用户权限
		const existingProject = await db.project.findFirst({
			where: {
				id,
				ProjectMember: {
					some: {
						userId: user.id,
						role: {
							in: ["OWNER", "ADMIN"],
						},
					},
				},
			},
			include: {
				ProjectMember: true,
			},
		});

		if (!existingProject) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "没有权限编辑此项目",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 检查slug唯一性（如果更改了slug）
		if (validatedData.slug && validatedData.slug !== existingProject.slug) {
			const slugExists = await db.project.findFirst({
				where: {
					slug: validatedData.slug,
					id: { not: id },
				},
			});

			if (slugExists) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "CONFLICT",
							message: "项目标识符已存在",
						},
						meta: {
							timestamp: new Date().toISOString(),
							requestId,
						},
					},
					{ status: 409 },
				);
			}
		}

		// 使用事务更新项目
		const updatedProject = await db.$transaction(async (tx) => {
			// 更新项目基本信息
			const project = await tx.project.update({
				where: { id },
				data: {
					...validatedData,
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

			// 记录审计日志
			await auditLogger.log({
				action: "UPDATE_PROJECT",
				resourceType: "PROJECT",
				resourceId: project.id,
				message: `更新项目: ${project.name}`,
				metadata: {
					changes: validatedData,
					previousData: {
						name: existingProject.name,
						slug: existingProject.slug,
						description: existingProject.description,
						visibility: existingProject.visibility,
					},
				},
				projectId: id,
			});

			return project;
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					...updatedProject,
					memberCount: updatedProject._count.ProjectMember,
					applicationCount: updatedProject._count.Application,
					dataVersionCount: updatedProject._count.DataModelDeployment,
					currentUserRole:
						updatedProject.ProjectMember.find((member) => member.userId === user.id)
							?.role || null,
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "请求数据验证失败",
						details: error.issues.map((err) => ({
							path: err.path,
							message: err.message,
						})),
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 400 },
			);
		}

		console.error(`[${requestId}] Failed to update project:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "更新项目失败",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 500 },
		);
	}
}

// 删除项目
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	const requestId = `delete-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "未授权访问",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 401 },
			);
		}

		const { id } = await params;

		// 检查项目是否存在以及用户权限（只有项目所有者可以删除）
		const existingProject = await db.project.findFirst({
			where: {
				id,
				ProjectMember: {
					some: {
						userId: user.id,
						role: "OWNER",
					},
				},
			},
			include: {
				ProjectMember: true,
				Application: true,
				DataModelDeployment: true,
			},
		});

		if (!existingProject) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "只有项目所有者可以删除项目",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 检查是否有依赖项
		const hasDependencies =
			existingProject.Application.length > 0 ||
			existingProject.DataModelDeployment.length > 0;

		if (hasDependencies) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "CONFLICT",
						message: "项目包含应用程序或数据版本，无法删除",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 409 },
			);
		}

		// 使用事务删除项目
		await db.$transaction(async (tx) => {
			// 删除项目成员关系
			await tx.projectMember.deleteMany({
				where: { projectId: id },
			});

			// 删除项目
			await tx.project.delete({
				where: { id },
			});

			// 记录审计日志
			await auditLogger.log({
				action: "DELETE_PROJECT",
				resourceType: "PROJECT",
				resourceId: id,
				message: `删除项目: ${existingProject.name}`,
				metadata: {
					projectName: existingProject.name,
					projectSlug: existingProject.slug,
				},
				projectId: id,
			});
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					message: "项目删除成功",
					deletedProject: {
						id: existingProject.id,
						name: existingProject.name,
						slug: existingProject.slug,
					},
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error(`[${requestId}] Failed to delete project:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "删除项目失败",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 500 },
		);
	}
}
