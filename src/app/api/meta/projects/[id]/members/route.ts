import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "~/lib/server-utils";
import { auditLogger } from "~/server/api/middleware/audit";
import { db } from "~/server/db";

// 成员邀请验证schema
const InviteMemberSchema = z.object({
	email: z.string().email("请输入有效的邮箱地址"),
	role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
});

// 获取项目成员列表
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	const requestId = `get-members-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const user = await getCurrentUser();
		const { id } = await params;
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

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"));
		const limit = Math.min(
			50,
			Math.max(1, Number.parseInt(searchParams.get("limit") || "20")),
		);
		const search = searchParams.get("search") || "";
		const role = searchParams.get("role") as
			| "OWNER"
			| "ADMIN"
			| "EDITOR"
			| "VIEWER"
			| null;

		// 检查项目访问权限
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

		// 构建查询条件
		const where: Prisma.ProjectMemberWhereInput = {
			projectId: id,
		};

		if (search) {
			where.User = {
				OR: [
					{ name: { contains: search, mode: "insensitive" } },
					{ email: { contains: search, mode: "insensitive" } },
				],
			};
		}

		if (role) {
			where.role = role;
		}

		// 分页查询成员
		const [members, total] = await Promise.all([
			db.projectMember.findMany({
				where,
				include: {
					User: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
				orderBy: [
					{ role: "asc" }, // OWNER, ADMIN, EDITOR, VIEWER, NO_ACCESS
					{ createdAt: "asc" },
				],
				skip: (page - 1) * limit,
				take: limit,
			}),
			db.projectMember.count({ where }),
		]);

		// 获取当前用户在项目中的角色
		const currentUserMember = members.find(
			(member) => member.userId === user.id,
		);
		const currentUserRole = currentUserMember?.role || null;

		// 记录审计日志
		await auditLogger.log({
			action: "VIEW_PROJECT_MEMBERS",
			resourceType: "PROJECT_MEMBERS",
			resourceId: id,
			message: "Viewed project members",
			metadata: {
				memberCount: members.length,
			},
			projectId: id,
		});

		const totalPages = Math.ceil(total / limit);
		return NextResponse.json(
			{
				success: true,
				data: {
					members: members.map((member) => ({
						id: member.id,
						role: member.role,
						joinedAt: member.createdAt,
						User: member.User,
					})),
					pagination: {
						page,
						limit,
						total,
						totalPages,
						hasNext: page < totalPages,
						hasPrev: page > 1,
					},
					currentUserRole,
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error(`[${requestId}] Failed to get project members:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "获取项目成员失败",
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

// 邀请成员
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	const requestId = `invite-member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
		const validatedData = InviteMemberSchema.parse(body);

		// 检查项目权限（只有OWNER和ADMIN可以邀请成员）
		const project = await db.project.findFirst({
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

		if (!project) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "没有权限邀请成员",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 查找被邀请用户
		const inviteeUser = await db.user.findUnique({
			where: { email: validatedData.email },
		});

		if (!inviteeUser) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "用户不存在",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 404 },
			);
		}

		// 检查用户是否已经是成员
		const existingMember = project.ProjectMember.find(
			(member) => member.userId === inviteeUser.id,
		);
		if (existingMember) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "CONFLICT",
						message: "用户已经是项目成员",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 409 },
			);
		}

		// 检查当前用户权限（ADMIN不能邀请OWNER）
		const currentUserRole = project.ProjectMember.find(
			(member) => member.userId === user.id,
		)?.role;
		if (currentUserRole === "ADMIN" && validatedData.role === "OWNER") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "FORBIDDEN",
						message: "管理员不能邀请项目所有者",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 403 },
			);
		}

		// 创建成员关系
		const newMember = await db.$transaction(async (tx) => {
			const member = await tx.projectMember.create({
				data: {
					projectId: id,
					userId: inviteeUser.id,
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
				action: "INVITE_PROJECT_MEMBER",
				resourceType: "PROJECT_MEMBER",
				resourceId: member.id,
				message: `Invited ${validatedData.email} as ${validatedData.role}`,
				metadata: {
					inviteeId: inviteeUser.id,
					inviteeEmail: validatedData.email,
					role: validatedData.role,
				},
				projectId: id,
			});

			return member;
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					id: newMember.id,
					role: newMember.role,
					joinedAt: newMember.createdAt,
					User: newMember.User,
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 201 },
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

		console.error(`[${requestId}] Failed to invite member:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "邀请成员失败",
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
