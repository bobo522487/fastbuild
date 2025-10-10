import { ArrowLeft, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectEditForm } from "~/components/project/project-edit-form";
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

interface ProjectEditPageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata({
	params,
}: ProjectEditPageProps): Promise<Metadata> {
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
						role: {
							in: ["OWNER", "ADMIN"],
						},
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
			title: `编辑项目 - ${project.name}`,
			description: `编辑项目 "${project.name}" 的设置和信息`,
		};
	} catch {
		return {
			title: "编辑项目",
		};
	}
}

export default async function ProjectEditPage({
	params,
}: ProjectEditPageProps) {
	const session = await auth();
	const { id } = await params;

	if (!session?.user) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardContent className="p-6 text-center">
						<h1 className="mb-4 font-bold text-2xl">请先登录</h1>
						<p className="mb-4 text-gray-600">您需要登录才能编辑项目</p>
						<Button asChild>
							<Link href="/auth/signin">去登录</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	try {
		// 预检查项目权限
		const project = await prisma.project.findFirst({
			where: {
				id,
				members: {
					some: {
						userId: session.user.id,
						role: {
							in: ["OWNER", "ADMIN"],
						},
					},
				},
			},
			select: {
				id: true,
				name: true,
				slug: true,
			},
		});

		if (!project) {
			notFound();
		}

		return (
			<div className="container mx-auto max-w-4xl py-8">
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
					<span className="text-gray-700">编辑</span>
				</div>

				{/* 页面标题 */}
				<div className="mb-8">
					<div className="mb-2 flex items-center gap-3">
						<Settings className="h-6 w-6 text-gray-600" />
						<h1 className="font-bold text-3xl">编辑项目</h1>
					</div>
					<p className="text-gray-600">
						修改项目 "{project.name}" 的基本信息和设置
					</p>
				</div>

				{/* 编辑表单 */}
				<ProjectEditForm
					projectId={id}
					onSuccess={(updatedProject) => {
						// 可以在这里添加成功后的处理逻辑
						// 比如重定向或显示通知
					}}
					onCancel={() => {
						// 可以在这里添加取消后的处理逻辑
						// 比如重定向回项目页面
					}}
				/>
			</div>
		);
	} catch (error) {
		console.error("Failed to load project for editing:", error);

		return (
			<div className="container mx-auto py-8">
				<Card className="border-red-200">
					<CardContent className="p-6 text-center">
						<h1 className="mb-4 font-bold text-2xl text-red-800">加载失败</h1>
						<p className="mb-4 text-red-600">无法加载项目数据，请稍后重试</p>
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
