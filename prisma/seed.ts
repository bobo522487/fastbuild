/**
 * FastBuild 数据库种子数据
 * 为开发环境提供示例数据
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "~/server/auth/password";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 开始添加种子数据...");

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

		const demoUser = await prisma.user.create({
			data: {
				email: "demo@fastbuild.com",
				name: "Demo User",
				password: hashedPassword,
			},
		});

		const adminUser = await prisma.user.create({
			data: {
				email: "admin@fastbuild.com",
				name: "Admin User",
				password: hashedPassword,
			},
		});

		console.log(`  ✓ 创建用户: ${demoUser.email}`);
		console.log(`  ✓ 创建用户: ${adminUser.email}`);

		// 创建示例项目
		console.log("📁 创建示例项目...");

		const demoProject = await prisma.project.create({
			data: {
				name: "Demo Project",
				slug: "demo-project",
				description: "一个演示项目，展示FastBuild平台的基本功能",
				visibility: "PUBLIC",
				createdBy: demoUser.id,
				members: {
					create: {
						userId: demoUser.id,
						role: "OWNER",
					},
				},
			},
			include: {
				members: true,
			},
		});

		const internalProject = await prisma.project.create({
			data: {
				name: "Internal Tools",
				slug: "internal-tools",
				description: "内部工具项目，仅团队成员可见",
				visibility: "PRIVATE",
				createdBy: adminUser.id,
				members: {
					create: [
						{
							userId: adminUser.id,
							role: "OWNER",
						},
						{
							userId: demoUser.id,
							role: "EDITOR",
						},
					],
				},
			},
			include: {
				members: true,
			},
		});

		const mobileApp = await prisma.project.create({
			data: {
				name: "Mobile App",
				slug: "mobile-app",
				description: "移动应用开发项目",
				visibility: "PRIVATE",
				createdBy: demoUser.id,
				members: {
					create: {
						userId: demoUser.id,
						role: "OWNER",
					},
				},
			},
			include: {
				members: true,
			},
		});

		console.log(`  ✓ 创建项目: ${demoProject.name}`);
		console.log(`  ✓ 创建项目: ${internalProject.name}`);
		console.log(`  ✓ 创建项目: ${mobileApp.name}`);

		// 创建审计日志
		console.log("📝 创建审计日志...");

		await prisma.auditLog.createMany({
			data: [
				{
					projectId: demoProject.id,
					actorUserId: demoUser.id,
					action: "CREATE_PROJECT",
					targetType: "PROJECT",
					targetId: demoProject.id,
					message: `创建项目 "${demoProject.name}"`,
					metadata: {
						projectName: demoProject.name,
						visibility: demoProject.visibility,
					},
				},
				{
					projectId: internalProject.id,
					actorUserId: adminUser.id,
					action: "CREATE_PROJECT",
					targetType: "PROJECT",
					targetId: internalProject.id,
					message: `创建项目 "${internalProject.name}"`,
					metadata: {
						projectName: internalProject.name,
						visibility: internalProject.visibility,
					},
				},
				{
					projectId: mobileApp.id,
					actorUserId: demoUser.id,
					action: "CREATE_PROJECT",
					targetType: "PROJECT",
					targetId: mobileApp.id,
					message: `创建项目 "${mobileApp.name}"`,
					metadata: {
						projectName: mobileApp.name,
						visibility: mobileApp.visibility,
					},
				},
				{
					projectId: internalProject.id,
					actorUserId: adminUser.id,
					action: "ADD_MEMBER",
					targetType: "PROJECT_MEMBER",
					targetId: internalProject.members[1]?.id || "",
					message: `将 ${demoUser.name} 添加到项目 "${internalProject.name}"`,
					metadata: {
						memberRole: "EDITOR",
						userEmail: demoUser.email,
					},
				},
			],
		});

		console.log(`  ✓ 创建 ${4} 条审计日志`);

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
		console.log("");
		console.log("🔑 测试账号:");
		console.log("  邮箱: demo@fastbuild.com");
		console.log("  密码: password123");
		console.log("");
		console.log("  邮箱: admin@fastbuild.com");
		console.log("  密码: password123");
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
