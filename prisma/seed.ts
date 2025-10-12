/**
 * FastBuild 数据库种子数据
 * 为开发环境提供示例数据
 * 使用新的nanoid ID生成系统
 */

import { PrismaClient } from "@prisma/client";
import { FastBuildIdGenerator } from "~/lib/id-generator";

// 简化的密码哈希函数（仅用于种子数据）
async function hashPassword(password: string): Promise<string> {
	// 在实际项目中，这里应该使用bcrypt等安全的哈希算法
	// 这里为了简化种子数据，使用简单的哈希
	return Buffer.from(password + '_seed').toString('base64');
}

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 开始添加种子数据...");
	console.log("🆔 使用新的nanoid ID生成系统");

	try {
		// 清理现有数据（开发环境）
		console.log("🧹 清理现有数据...");
		await prisma.auditLog.deleteMany();
		await prisma.projectMember.deleteMany();
		await prisma.project.deleteMany();
		await prisma.user.deleteMany();

		// 创建测试用户
		console.log("👤 创建测试用户...");
		const hashedPassword = await hashPassword("password123");

		// 使用统一的FastBuild ID生成器
		const demoUserId = FastBuildIdGenerator.generateUserId();
		const adminUserId = FastBuildIdGenerator.generateUserId();

		const demoUser = await prisma.user.create({
			data: {
				id: demoUserId,
				email: "demo@fastbuild.com",
				name: "Demo User",
				passwordHash: hashedPassword,
				updatedAt: new Date(),
			},
		});

		const adminUser = await prisma.user.create({
			data: {
				id: adminUserId,
				email: "admin@fastbuild.com",
				name: "Admin User",
				passwordHash: hashedPassword,
				updatedAt: new Date(),
			},
		});

		console.log(`  ✓ 创建用户: ${demoUser.email} (ID: ${demoUserId})`);
		console.log(`  ✓ 创建用户: ${adminUser.email} (ID: ${adminUserId})`);

		// 创建示例项目
		console.log("📁 创建示例项目...");

		const demoProjectId = FastBuildIdGenerator.generateProjectId();
		const internalProjectId = FastBuildIdGenerator.generateProjectId();
		const mobileAppId = FastBuildIdGenerator.generateProjectId();

		const demoProject = await prisma.project.create({
			data: {
				id: demoProjectId,
				name: "Demo Project",
				slug: "demo-project",
				description: "一个演示项目，展示FastBuild平台的基本功能",
				visibility: "PUBLIC",
				createdBy: demoUser.id,
				updatedAt: new Date(),
			},
		});

		const internalProject = await prisma.project.create({
			data: {
				id: internalProjectId,
				name: "Internal Tools",
				slug: "internal-tools",
				description: "内部工具项目，仅团队成员可见",
				visibility: "PRIVATE",
				createdBy: adminUser.id,
				updatedAt: new Date(),
			},
		});

		const mobileApp = await prisma.project.create({
			data: {
				id: mobileAppId,
				name: "Mobile App",
				slug: "mobile-app",
				description: "移动应用开发项目",
				visibility: "PRIVATE",
				createdBy: demoUser.id,
				updatedAt: new Date(),
			},
		});

		// 创建项目成员关系
		console.log("🔗 创建项目成员关系...");

		const projectMembers = [
			{
				id: FastBuildIdGenerator.generateMemberId(),
				projectId: demoProject.id,
				userId: demoUser.id,
				role: "OWNER" as const
			},
			{
				id: FastBuildIdGenerator.generateMemberId(),
				projectId: internalProject.id,
				userId: adminUser.id,
				role: "OWNER" as const
			},
			{
				id: FastBuildIdGenerator.generateMemberId(),
				projectId: internalProject.id,
				userId: demoUser.id,
				role: "EDITOR" as const
			},
			{
				id: FastBuildIdGenerator.generateMemberId(),
				projectId: mobileApp.id,
				userId: demoUser.id,
				role: "OWNER" as const
			},
		];

		await prisma.projectMember.createMany({
			data: projectMembers,
		});

		console.log(`  ✓ 创建项目: ${demoProject.name} (ID: ${demoProjectId})`);
		console.log(`  ✓ 创建项目: ${internalProject.name} (ID: ${internalProjectId})`);
		console.log(`  ✓ 创建项目: ${mobileApp.name} (ID: ${mobileAppId})`);

		// 创建审计日志
		console.log("📝 创建审计日志...");

		const auditLogs = [
			{
				id: FastBuildIdGenerator.generateAuditLogId(),
				projectId: demoProject.id,
				userId: demoUser.id,
				action: "CREATE_PROJECT",
				resourceType: "PROJECT",
				resourceId: demoProject.id,
				metadata: {
					projectName: demoProject.name,
					visibility: demoProject.visibility,
					generatedId: demoProjectId,
				},
			},
			{
				id: FastBuildIdGenerator.generateAuditLogId(),
				projectId: internalProject.id,
				userId: adminUser.id,
				action: "CREATE_PROJECT",
				resourceType: "PROJECT",
				resourceId: internalProject.id,
				metadata: {
					projectName: internalProject.name,
					visibility: internalProject.visibility,
					generatedId: internalProjectId,
				},
			},
			{
				id: FastBuildIdGenerator.generateAuditLogId(),
				projectId: mobileApp.id,
				userId: demoUser.id,
				action: "CREATE_PROJECT",
				resourceType: "PROJECT",
				resourceId: mobileApp.id,
				metadata: {
					projectName: mobileApp.name,
					visibility: mobileApp.visibility,
					generatedId: mobileAppId,
				},
			},
			{
				id: FastBuildIdGenerator.generateAuditLogId(),
				projectId: internalProject.id,
				userId: adminUser.id,
				action: "ADD_MEMBER",
				resourceType: "PROJECT_MEMBER",
				resourceId: projectMembers[2]?.id || "", // Demo user as editor
				metadata: {
					memberRole: "EDITOR",
					userEmail: demoUser.email,
					memberId: projectMembers[2]?.id || "",
				},
			},
		];

		await prisma.auditLog.createMany({
			data: auditLogs,
		});

		console.log(`  ✓ 创建 ${auditLogs.length} 条审计日志`);

		// 输出统计信息
		const userCount = await prisma.user.count();
		const projectCount = await prisma.project.count();
		const memberCount = await prisma.projectMember.count();
		const auditLogCount = await prisma.auditLog.count();

		console.log("");
		console.log("📊 种子数据统计:");
		console.log(`  👥 用户数量: ${userCount}`);
		console.log(`  📁 项目数量: ${projectCount}`);
		console.log(`  👥 成员关系: ${memberCount}`);
		console.log(`  📝 审计日志: ${auditLogCount}`);

		console.log("");
		console.log("✅ 种子数据添加完成！");
		console.log("🆔 新nanoid ID系统已启用");
		console.log("");
		console.log("🔑 测试账号:");
		console.log("  邮箱: demo@fastbuild.com");
		console.log("  密码: password123");
		console.log("");
		console.log("  邮箱: admin@fastbuild.com");
		console.log("  密码: password123");
		console.log("");
		console.log("🧪 验证ID格式:");
		console.log(`  用户ID: ${demoUserId} - ${FastBuildIdGenerator.validateShortIdFormat(demoUserId, 'user') ? '✅ 有效' : '❌ 无效'}`);
		console.log(`  项目ID: ${demoProjectId} - ${FastBuildIdGenerator.validateShortIdFormat(demoProjectId, 'proj') ? '✅ 有效' : '❌ 无效'}`);
	} catch (error) {
		console.error("❌ 种子数据添加失败:", error);
		throw error;
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
