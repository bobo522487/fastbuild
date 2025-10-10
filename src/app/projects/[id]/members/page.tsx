import { ArrowLeft, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectMemberManagement } from "~/components/project/member-management";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";

interface ProjectMembersPageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata({
	params,
}: ProjectMembersPageProps): Promise<Metadata> {
	const session = await auth();
	const { id } = await params;

	if (!session?.user) {
		return {
			title: "未授权访问",
		};
	}

	try {
		const project = await prisma.project.findFirst({
			where: {
				id,
				members: {
					some: {
						userId: session.user.id,
					},
				},
			},
			select: {
				name: true,
				slug: true,
			},
		});

		if (!project) {
			return {
				title: "项目不存在",
			};
		}

		return {
			title: `项目成员 - ${project.name}`,
			description: `管理项目 "${project.name}" 的成员`,
		};
	} catch {
		return {
			title: "项目成员",
		};
	}
}

export default async function ProjectMembersPage({
	params,
}: ProjectMembersPageProps) {
	const session = await auth();
	const { id } = await params;

	if (!session?.user) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardContent className="p-6 text-center">
						<h1 className="mb-4 font-bold text-2xl">请先登录</h1>
						<p className="mb-4 text-gray-600">您需要登录才能查看项目成员</p>
						<Button asChild>
							<Link href="/auth/signin">去登录</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	try {
		// 获取项目和成员信息
		const project = await prisma.project.findFirst({
			where: {
				id,
				members: {
					some: {
						userId: session.user.id,
					},
				},
			},
			include: {
				members: {
					where: {
						userId: session.user.id,
					},
					select: {
						role: true,
					},
				},
			},
		});

		if (!project) {
			notFound();
		}

		const currentUserRole = project.members[0]?.role || null;

		return (
			<div className="container mx-auto max-w-6xl py-8">
				{/* 面包屑导航 */}
				<div className="mb-6 flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/projects">
							<ArrowLeft className="mr-1 h-4 w-4" />
							返回项目
						</Link>
					</Button>
					<span className="text-gray-500">/</span>
					<Button variant="ghost" size="sm" asChild>
						<Link href={`/projects/${project.slug}`}>{project.name}</Link>
					</Button>
					<span className="text-gray-500">/</span>
					<span className="text-gray-700">成员</span>
				</div>

				{/* 页面标题 */}
				<div className="mb-8">
					<div className="mb-2 flex items-center gap-3">
						<Users className="h-6 w-6 text-gray-600" />
						<h1 className="font-bold text-3xl">项目成员</h1>
						{currentUserRole && (
							<div className="flex items-center gap-2">
								{currentUserRole === "OWNER" && (
									<div className="flex items-center gap-1 text-yellow-600">
										<Shield className="h-4 w-4" />
										<span className="font-medium text-sm">所有者</span>
									</div>
								)}
								{currentUserRole === "ADMIN" && (
									<div className="flex items-center gap-1 text-blue-600">
										<Shield className="h-4 w-4" />
										<span className="font-medium text-sm">管理员</span>
									</div>
								)}
								{currentUserRole === "EDITOR" && (
									<div className="flex items-center gap-1 text-gray-600">
										<Shield className="h-4 w-4" />
										<span className="font-medium text-sm">编辑者</span>
									</div>
								)}
								{currentUserRole === "VIEWER" && (
									<div className="flex items-center gap-1 text-gray-600">
										<Shield className="h-4 w-4" />
										<span className="font-medium text-sm">查看者</span>
									</div>
								)}
							</div>
						)}
					</div>
					<p className="text-gray-600">
						管理项目 "{project.name}" 的成员和权限
					</p>
				</div>

				{/* 权限提示 */}
				{currentUserRole === null && (
					<Card className="mb-6 border-yellow-200">
						<CardContent className="p-4">
							<div className="flex items-center gap-3">
								<Shield className="h-5 w-5 text-yellow-600" />
								<div>
									<h3 className="font-medium text-yellow-800">观察者权限</h3>
									<p className="text-sm text-yellow-600">
										您只能查看项目成员，无法进行管理操作。如需管理权限，请联系项目所有者。
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* 成员管理组件 */}
				<ProjectMemberManagement
					projectId={id}
					projectName={project.name}
					currentUserRole={currentUserRole}
				/>
			</div>
		);
	} catch (error) {
		console.error("Failed to load project members:", error);

		return (
			<div className="container mx-auto py-8">
				<Card className="border-red-200">
					<CardContent className="p-6 text-center">
						<h1 className="mb-4 font-bold text-2xl text-red-800">加载失败</h1>
						<p className="mb-4 text-red-600">
							无法加载项目成员数据，请稍后重试
						</p>
						<div className="flex justify-center gap-2">
							<Button
								variant="outline"
								onClick={() => window.location.reload()}
							>
								重新加载
							</Button>
							<Button asChild>
								<Link href="/projects">返回项目列表</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}
}
