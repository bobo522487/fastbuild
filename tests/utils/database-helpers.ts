import { PrismaClient } from "@prisma/client";
import { TestDataFactory } from "./factory";

export class DatabaseTestHelpers {
	private static instance: PrismaClient;

	/**
	 * 获取Prisma客户端实例
	 */
	static getInstance(): PrismaClient {
		if (!DatabaseTestHelpers.instance) {
			DatabaseTestHelpers.instance = new PrismaClient({
				log: ["query", "info", "warn", "error"],
			});
		}
		return DatabaseTestHelpers.instance;
	}

	/**
	 * 清理所有测试数据
	 */
	static async cleanupTestData(): Promise<void> {
		const db = DatabaseTestHelpers.getInstance();

		// 按照外键依赖关系清理数据
		await db.projectMember.deleteMany();
		await db.auditLog.deleteMany();
		await db.project.deleteMany();
		await db.user.deleteMany();
	}

	/**
	 * 创建测试用户并返回记录
	 */
	static async createTestUser(overrides: Partial<any> = {}) {
		const db = DatabaseTestHelpers.getInstance();
		const userData = TestDataFactory.createTestUser(overrides);

		const user = await db.user.create({
			data: {
				...userData,
				updatedAt: new Date(),
			},
		});

		return user;
	}

	/**
	 * 创建测试项目并返回记录
	 */
	static async createTestProject(
		ownerId: string,
		overrides: Partial<any> = {},
	) {
		const db = DatabaseTestHelpers.getInstance();
		const projectData = TestDataFactory.createTestProject({
			ownerId,
			...overrides,
		});

		const project = await db.project.create({
			data: {
				name: projectData.name,
				slug: projectData.slug,
				description: projectData.description,
				visibility: projectData.visibility,
				createdBy: projectData.ownerId!,
				updatedAt: new Date(),
			},
		});

		// 自动添加创建者为项目所有者
		await db.projectMember.create({
			data: {
				projectId: project.id,
				userId: ownerId,
				role: "OWNER",
			},
		});

		return project;
	}

	/**
	 * 设置测试环境数据库连接
	 */
	static async setupTestDatabase(): Promise<void> {
		const db = DatabaseTestHelpers.getInstance();

		try {
			await db.$connect();
			console.log("✅ Test database connected successfully");
		} catch (error) {
			console.error("❌ Failed to connect to test database:", error);
			throw error;
		}
	}

	/**
	 * 断开测试数据库连接
	 */
	static async teardownTestDatabase(): Promise<void> {
		const db = DatabaseTestHelpers.getInstance();

		try {
			await db.$disconnect();
			console.log("✅ Test database disconnected successfully");
		} catch (error) {
			console.error("❌ Failed to disconnect from test database:", error);
			throw error;
		}
	}

	/**
	 * 检查数据库是否为空
	 */
	static async isDatabaseEmpty(): Promise<boolean> {
		const db = DatabaseTestHelpers.getInstance();

		const userCount = await db.user.count();
		const projectCount = await db.project.count();

		return userCount === 0 && projectCount === 0;
	}

	/**
	 * 获取测试数据统计
	 */
	static async getTestDataStats(): Promise<{
		users: number;
		projects: number;
		projectMembers: number;
		auditLogs: number;
	}> {
		const db = DatabaseTestHelpers.getInstance();

		const [users, projects, projectMembers, auditLogs] = await Promise.all([
			db.user.count(),
			db.project.count(),
			db.projectMember.count(),
			db.auditLog.count(),
		]);

		return { users, projects, projectMembers, auditLogs };
	}

	/**
	 * 创建带密码哈希的测试用户
	 */
	static async createTestUserWithPassword(overrides: Partial<any> = {}) {
		const db = DatabaseTestHelpers.getInstance();
		const userData = TestDataFactory.createTestUser(overrides);

		// 模拟密码哈希 (实际项目中使用 bcrypt)
		const passwordHash = `hashed_${userData.password}`;

		const user = await db.user.create({
			data: {
				email: userData.email,
				name: userData.name,
				passwordHash: passwordHash,
				updatedAt: new Date(),
			},
		});

		return { ...user, plainPassword: userData.password };
	}

	/**
	 * 创建项目成员关系
	 */
	static async createProjectMember(
		projectId: string,
		userId: string,
		role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" = "VIEWER",
	) {
		const db = DatabaseTestHelpers.getInstance();

		const member = await db.projectMember.create({
			data: {
				projectId,
				userId,
				role,
			},
		});

		return member;
	}

	/**
	 * 批量创建项目成员关系
	 */
	static async createProjectMembers(
		projectId: string,
		members: Array<{
			userId: string;
			role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
		}>,
	) {
		const db = DatabaseTestHelpers.getInstance();

		const createdMembers = await db.projectMember.createMany({
			data: members.map((member) => ({
				projectId,
				userId: member.userId,
				role: member.role,
			})),
		});

		return createdMembers;
	}

	/**
	 * 创建审计日志记录
	 */
	static async createAuditLog(overrides: Partial<any> = {}) {
		const db = DatabaseTestHelpers.getInstance();
		const logData = TestDataFactory.createAuditLog(overrides);

		const auditLog = await db.auditLog.create({
			data: logData,
		});

		return auditLog;
	}

	/**
	 * 批量创建审计日志记录 (用于测试账户锁定等功能)
	 */
	static async createAuditLogs(
		userId: string,
		action: string,
		count: number,
		overrides: Partial<any> = {},
	) {
		const db = DatabaseTestHelpers.getInstance();

		const logs = Array.from({ length: count }, (_, index) => ({
			action,
			userId,
			resourceType: "TEST_OPERATION",
			metadata: {
				email: TestDataFactory.createTestUser().email,
				...overrides,
			},
			ipAddress: "127.0.0.1",
			userAgent: "Test-Agent",
		}));

		const createdLogs = await db.auditLog.createMany({
			data: logs,
		});

		return createdLogs;
	}

	/**
	 * 创建失败登录日志 (用于测试账户锁定)
	 */
	static async createFailedLoginAttempts(email: string, count = 5) {
		const db = DatabaseTestHelpers.getInstance();

		const logs = Array.from({ length: count }, (_, index) => ({
			action: "SIGN_IN_FAILED_INVALID_PASSWORD",
			userId: "test-user-id",
			resourceType: "AUTHENTICATION",
			metadata: {
				email,
				failedAttempts: index + 1,
				lockoutLevel: Math.floor((index + 1) / 5),
			},
			ipAddress: "127.0.0.1",
			userAgent: "Test-Agent",
		}));

		const createdLogs = await db.auditLog.createMany({
			data: logs,
		});

		return createdLogs;
	}

	/**
	 * 检查用户在项目中的角色
	 */
	static async getUserProjectRole(
		projectId: string,
		userId: string,
	): Promise<string | null> {
		const db = DatabaseTestHelpers.getInstance();

		const member = await db.projectMember.findUnique({
			where: {
				projectId_userId: {
					projectId,
					userId,
				},
			},
			select: { role: true },
		});

		return member?.role || null;
	}

	/**
	 * 获取用户的所有项目角色
	 */
	static async getUserProjectRoles(
		userId: string,
	): Promise<Array<{ projectId: string; role: string }>> {
		const db = DatabaseTestHelpers.getInstance();

		const members = await db.projectMember.findMany({
			where: { userId },
			select: { projectId: true, role: true },
		});

		return members.map((member) => ({
			projectId: member.projectId,
			role: member.role,
		}));
	}

	/**
	 * 清理特定用户的测试数据
	 */
	static async cleanupUserData(userId: string): Promise<void> {
		const db = DatabaseTestHelpers.getInstance();

		await db.auditLog.deleteMany({
			where: { userId },
		});

		await db.projectMember.deleteMany({
			where: { userId },
		});

		await db.user.delete({
			where: { id: userId },
		});
	}

	/**
	 * 清理特定项目的测试数据
	 */
	static async cleanupProjectData(projectId: string): Promise<void> {
		const db = DatabaseTestHelpers.getInstance();

		await db.projectMember.deleteMany({
			where: { projectId },
		});

		await db.project.delete({
			where: { id: projectId },
		});
	}

	/**
	 * 创建完整的测试场景 (用户 + 项目 + 成员关系)
	 */
	static async createTestScenario(
		overrides: {
			userCount?: number;
			projectsPerUser?: number;
			membersPerProject?: number;
		} = {},
	) {
		const {
			userCount = 2,
			projectsPerUser = 1,
			membersPerProject = 3,
		} = overrides;

		const db = DatabaseTestHelpers.getInstance();
		const scenario: any = { users: [], projects: [], members: [] };

		// 创建用户
		for (let i = 0; i < userCount; i++) {
			const user = await this.createTestUserWithPassword();
			scenario.users.push(user);
		}

		// 为每个用户创建项目并添加成员
		for (const user of scenario.users) {
			for (let i = 0; i < projectsPerUser; i++) {
				const project = await this.createTestProject(user.id);
				scenario.projects.push(project);

				// 添加其他用户为项目成员
				for (const otherUser of scenario.users) {
					if (
						otherUser.id !== user.id &&
						scenario.members.length < membersPerProject
					) {
						const role = Math.random() > 0.5 ? "ADMIN" : "EDITOR";
						const member = await this.createProjectMember(
							project.id,
							otherUser.id,
							role,
						);
						scenario.members.push(member);
					}
				}
			}
		}

		return scenario;
	}
}
