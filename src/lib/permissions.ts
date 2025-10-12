/**
 * 权限检查工具函数
 * 提供项目级别的权限检查和角色验证功能
 */

import { db } from "~/server/db";

// 项目角色枚举
export enum ProjectRole {
	OWNER = "OWNER",
	ADMIN = "ADMIN",
	EDITOR = "EDITOR",
	VIEWER = "VIEWER",
	NO_ACCESS = "NO_ACCESS",
}

// 权限操作枚举
export enum PermissionAction {
	READ = "READ",
	CREATE = "CREATE",
	UPDATE = "UPDATE",
	DELETE = "DELETE",
	MANAGE = "MANAGE",
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<ProjectRole, PermissionAction[]> = {
	[ProjectRole.OWNER]: [
		PermissionAction.READ,
		PermissionAction.CREATE,
		PermissionAction.UPDATE,
		PermissionAction.DELETE,
		PermissionAction.MANAGE,
	],
	[ProjectRole.ADMIN]: [
		PermissionAction.READ,
		PermissionAction.CREATE,
		PermissionAction.UPDATE,
		PermissionAction.DELETE,
	],
	[ProjectRole.EDITOR]: [
		PermissionAction.READ,
		PermissionAction.CREATE,
		PermissionAction.UPDATE,
	],
	[ProjectRole.VIEWER]: [PermissionAction.READ],
	[ProjectRole.NO_ACCESS]: [],
};

/**
 * 检查用户是否有项目的指定权限
 */
export async function checkProjectPermission(
	userId: string,
	projectId: string,
	requiredAction: PermissionAction,
): Promise<boolean> {
	try {
		// 获取用户在项目中的角色
		const member = await db.projectMember.findFirst({
			where: {
				userId,
				projectId,
			},
			select: {
				role: true,
			},
		});

		if (!member) {
			return false;
		}

		const userRole = member.role as ProjectRole;
		const userPermissions = ROLE_PERMISSIONS[userRole];

		return userPermissions.includes(requiredAction);
	} catch (error) {
		console.error("Error checking project permission:", error);
		return false;
	}
}

/**
 * 获取用户在项目中的角色
 */
export async function getUserProjectRole(
	userId: string,
	projectId: string,
): Promise<ProjectRole | null> {
	try {
		const member = await db.projectMember.findFirst({
			where: {
				userId,
				projectId,
			},
			select: {
				role: true,
			},
		});

		return member ? (member.role as ProjectRole) : null;
	} catch (error) {
		console.error("Error getting user project role:", error);
		return null;
	}
}

/**
 * 检查用户是否可以执行指定的项目操作
 */
export async function canPerformProjectAction(
	userId: string,
	projectId: string,
	action: PermissionAction,
): Promise<boolean> {
	return await checkProjectPermission(userId, projectId, action);
}

/**
 * 获取项目所有者
 */
export async function getProjectOwner(
	projectId: string,
): Promise<string | null> {
	try {
		const owner = await db.projectMember.findFirst({
			where: {
				projectId,
				role: ProjectRole.OWNER,
			},
			select: {
				userId: true,
			},
		});

		return owner ? owner.userId : null;
	} catch (error) {
		console.error("Error getting project owner:", error);
		return null;
	}
}

/**
 * 检查用户是否是项目所有者
 */
export async function isProjectOwner(
	userId: string,
	projectId: string,
): Promise<boolean> {
	const role = await getUserProjectRole(userId, projectId);
	return role === ProjectRole.OWNER;
}

/**
 * 检查用户是否是项目管理员
 */
export async function isProjectAdmin(
	userId: string,
	projectId: string,
): Promise<boolean> {
	const role = await getUserProjectRole(userId, projectId);
	return role === ProjectRole.ADMIN || role === ProjectRole.OWNER;
}

/**
 * 获取用户有权限访问的项目列表
 */
export async function getUserAccessibleProjects(userId: string) {
	try {
		const projects = await db.project.findMany({
			where: {
				OR: [
					{ createdBy: userId },
					{
						ProjectMember: {
							some: {
								userId,
								role: {
									not: ProjectRole.NO_ACCESS,
								},
							},
						},
					},
				],
				deletedAt: null,
			},
			select: {
				id: true,
				slug: true,
				name: true,
				description: true,
				visibility: true,
				createdAt: true,
				updatedAt: true,
				ProjectMember: {
					where: {
						userId,
					},
					select: {
						role: true,
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
			orderBy: {
				updatedAt: "desc",
			},
		});

		return projects.map((project) => ({
			...project,
			currentUserRole: project.ProjectMember[0]?.role || null,
			memberCount: project._count.ProjectMember,
			applicationCount: project._count.Application,
			dataVersionCount: project._count.DataModelDeployment,
		}));
	} catch (error) {
		console.error("Error getting user accessible projects:", error);
		return [];
	}
}

/**
 * 权限中间件辅助函数
 */
export function createPermissionChecker(requiredAction: PermissionAction) {
	return async (userId: string, projectId: string): Promise<boolean> => {
		return await checkProjectPermission(userId, projectId, requiredAction);
	};
}

// 预定义的权限检查器
export const canReadProject = createPermissionChecker(PermissionAction.READ);
export const canCreateProjectContent = createPermissionChecker(
	PermissionAction.CREATE,
);
export const canUpdateProject = createPermissionChecker(
	PermissionAction.UPDATE,
);
export const canDeleteProjectContent = createPermissionChecker(
	PermissionAction.DELETE,
);
export const canManageProject = createPermissionChecker(
	PermissionAction.MANAGE,
);
