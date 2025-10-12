import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "~/lib/server-utils";
import { auditLogger } from "~/server/api/middleware/audit";
import { db } from "~/server/db";

// 更新成员角色验证schema
const UpdateMemberRoleSchema = z.object({
	role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
});

// 更新成员角色
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	const startTime = Date.now();
	const requestId = `update-member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		const { id: projectId, memberId } = await params;
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

		const body = await request.json();

		// 验证请求数据
		const validatedData = UpdateMemberRoleSchema.parse(body);

		// 获取项目和成员信息
		const project = await db.project.findFirst({
			where: {
				id: projectId,
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
			},
		});

		if (!project) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "没有权限管理项目成员",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		const targetMember = project.ProjectMember.find(
			(member) => member.id === memberId,
		);
		if (!targetMember) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "成员不存在",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 404 },
			);
		}

		const currentUserRole =
			project.ProjectMember.find((member) => member.userId === user.id)?.role ?? null;

		// 权限检查
		// 1. 只有OWNER可以修改角色
		if (currentUserRole !== "OWNER") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "只有项目所有者可以修改成员角色",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 2. 不能修改自己的角色
		if (targetMember.userId === user.id) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "不能修改自己的角色",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 3. 项目至少要有一个OWNER
		const currentOwners = project.ProjectMember.filter(
			(member) => member.role === "OWNER",
		);
		if (
			currentOwners.length === 1 &&
			targetMember.role === "OWNER" &&
			validatedData.role !== "OWNER"
		) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "项目至少需要一个所有者",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 更新成员角色
		const updatedMember = await db.$transaction(async (tx) => {
			const member = await tx.projectMember.update({
				where: { id: memberId },
				data: {
					role: validatedData.role,
				},
				include: {
					User: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			// 记录审计日志
			await auditLogger.log({
				action: "UPDATE_MEMBER_ROLE",
				resourceType: "PROJECT_MEMBER",
				resourceId: member.id,
				message: `Updated member role to ${validatedData.role}`,
				metadata: {
					targetUserId: targetMember.userId,
					targetUserEmail: targetMember.User.email,
					previousRole: targetMember.role,
					newRole: validatedData.role,
				},
				projectId,
			});

			return member;
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					id: updatedMember.id,
					role: updatedMember.role,
					joinedAt: updatedMember.createdAt,
					User: updatedMember.User,
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

		console.error(`[${requestId}] Failed to update member role:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "更新成员角色失败",
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

// 移除成员
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; memberId: string }> },
) {
	const startTime = Date.now();
	const requestId = `remove-member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		const { id: projectId, memberId } = await params;
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

		// 获取项目和成员信息
		const project = await db.project.findFirst({
			where: {
				id: projectId,
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
			},
		});

		if (!project) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "没有权限管理项目成员",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		const targetMember = project.ProjectMember.find(
			(member) => member.id === memberId,
		);
		if (!targetMember) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "成员不存在",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 404 },
			);
		}

		const currentUserRole = project.ProjectMember.find(
			(member) => member.userId === user.id,
		)?.role;

		// 权限检查
		const isSelf = targetMember.userId === user.id;

		if (!isSelf) {
			// 移除其他成员需要OWNER或ADMIN权限
			const canManageMembers =
				currentUserRole === "OWNER" || currentUserRole === "ADMIN";
			if (!canManageMembers) {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "FORBIDDEN",
							message: "没有权限移除成员",
						},
						meta: {
							timestamp: new Date().toISOString(),
							requestId,
						},
					},
					{ status: 403 },
				);
			}

			// ADMIN不能移除OWNER
			if (currentUserRole === "ADMIN" && targetMember.role === "OWNER") {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "FORBIDDEN",
							message: "管理员不能移除项目所有者",
						},
						meta: {
							timestamp: new Date().toISOString(),
							requestId,
						},
					},
					{ status: 403 },
				);
			}

			// 项目至少要有一个OWNER
			const currentOwners = project.ProjectMember.filter(
				(member) => member.role === "OWNER",
			);
			if (currentOwners.length === 1 && targetMember.role === "OWNER") {
				return NextResponse.json(
					{
						success: false,
						error: {
							code: "FORBIDDEN",
							message: "项目至少需要一个所有者",
						},
						meta: {
							timestamp: new Date().toISOString(),
							requestId,
						},
					},
					{ status: 403 },
				);
			}
		}

		// 移除成员
		await db.$transaction(async (tx) => {
			await tx.projectMember.delete({
				where: { id: memberId },
			});

			// 记录审计日志
			await auditLogger.log({
				action: isSelf ? "LEAVE_PROJECT" : "REMOVE_PROJECT_MEMBER",
				resourceType: "PROJECT_MEMBER",
				resourceId: memberId,
				message: isSelf ? "Left project" : "Removed project member",
				metadata: {
					targetUserId: targetMember.userId,
					targetUserEmail: targetMember.User.email,
					previousRole: targetMember.role,
					isSelf,
				},
				projectId,
			});
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					message: isSelf ? "已退出项目" : "成员已移除",
					removedMember: {
						id: targetMember.id,
						User: targetMember.User,
						role: targetMember.role,
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
		console.error(`[${requestId}] Failed to remove member:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "移除成员失败",
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
