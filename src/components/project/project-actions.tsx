"use client";

import {
	Copy,
	Edit,
	ExternalLink,
	Eye,
	EyeOff,
	MoreHorizontal,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import { useErrorHandler } from "~/components/error/error-handler";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAPIClient } from "~/hooks/use-api-client";
import type { Project } from "./project-edit-form";

interface ProjectActionsProps {
	project: Project;
	onUpdate?: (project: Project) => void;
	onDelete?: (projectId: string) => void;
	variant?: "dropdown" | "buttons";
}

export function ProjectActions({
	project,
	onUpdate,
	onDelete,
	variant = "dropdown",
}: ProjectActionsProps) {
	const router = useRouter();
	const { handleError } = useErrorHandler();
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDuplicating, setIsDuplicating] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);

	// 复制项目
	const { execute: duplicateProject } = useAPIClient("/api/projects", {
		method: "POST",
		immediate: false,
		onSuccess: (newProject: Project) => {
			setIsDuplicating(false);
			toast.success(`项目 "${project.name}" 复制成功`);
			router.push(`/projects/${newProject.slug}`);
		},
		onError: (error) => {
			setIsDuplicating(false);
			handleError(error, {
				showToast: true,
				fallbackMessage: "复制项目失败",
			});
		},
	});

	// 删除项目
	const { execute: deleteProject } = useAPIClient(
		`/api/projects/${project.id}`,
		{
			method: "DELETE",
			immediate: false,
			onSuccess: () => {
				setIsDeleting(false);
				toast.success(`项目 "${project.name}" 删除成功`);
				onDelete?.(project.id);
				router.push("/projects");
			},
			onError: (error) => {
				setIsDeleting(false);
				handleError(error, {
					showToast: true,
					fallbackMessage: "删除项目失败",
				});
			},
		},
	);

	const handleDuplicateProject = async () => {
		setIsDuplicating(true);
		try {
			await duplicateProject({
				body: {
					name: `${project.name} (副本)`,
					slug: `${project.slug}-copy-${Date.now()}`,
					description: project.description
						? `${project.description} (副本)`
						: undefined,
					visibility: project.visibility,
				},
			});
		} catch (error) {
			setIsDuplicating(false);
		}
	};

	const handleDeleteProject = async () => {
		setIsDeleting(true);
		try {
			await deleteProject();
		} catch (error) {
			setIsDeleting(false);
		}
	};

	const handleCopyProjectId = () => {
		navigator.clipboard.writeText(project.id);
		toast.success("项目ID已复制到剪贴板");
	};

	const handleCopyProjectUrl = () => {
		const url = `${window.location.origin}/projects/${project.slug}`;
		navigator.clipboard.writeText(url);
		toast.success("项目链接已复制到剪贴板");
	};

	const canEdit = ["OWNER", "ADMIN"].includes(project.currentUserRole);
	const canDelete = project.currentUserRole === "OWNER";

	const ActionsContent = () => (
		<>
			{/* 查看项目 */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => router.push(`/projects/${project.slug}`)}
				className="h-8 px-2"
			>
				<ExternalLink className="mr-1 h-4 w-4" />
				查看
			</Button>

			{/* 项目管理 */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => router.push(`/projects/${project.slug}/settings`)}
				className="h-8 px-2"
			>
				<Settings className="mr-1 h-4 w-4" />
				设置
			</Button>

			{/* 成员管理 */}
			{canEdit && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push(`/projects/${project.slug}/members`)}
					className="h-8 px-2"
				>
					<Users className="mr-1 h-4 w-4" />
					成员
				</Button>
			)}

			{/* 编辑项目 */}
			{canEdit && (
				<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="h-8 px-2">
							<Edit className="mr-1 h-4 w-4" />
							编辑
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>编辑项目</DialogTitle>
							<DialogDescription>修改项目的基本信息和设置</DialogDescription>
						</DialogHeader>
						{React.createElement(
							require("./project-edit-form").ProjectEditForm,
							{
								projectId: project.id,
								onSuccess: (updatedProject: Project) => {
									setShowEditDialog(false);
									onUpdate?.(updatedProject);
								},
								onCancel: () => setShowEditDialog(false),
							},
						)}
					</DialogContent>
				</Dialog>
			)}

			{/* 更多操作 */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="h-8 w-8 p-0">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{/* 复制操作 */}
					<DropdownMenuItem onClick={handleCopyProjectId}>
						<Copy className="mr-2 h-4 w-4" />
						复制项目ID
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleCopyProjectUrl}>
						<Copy className="mr-2 h-4 w-4" />
						复制项目链接
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* 可见性显示 */}
					<DropdownMenuItem
						disabled
						className="flex items-center justify-between"
					>
						<span className="flex items-center">
							{project.visibility === "PUBLIC" ? (
								<>
									<Eye className="mr-2 h-4 w-4" />
									公开项目
								</>
							) : (
								<>
									<EyeOff className="mr-2 h-4 w-4" />
									私有项目
								</>
							)}
						</span>
						<Badge
							variant={
								project.visibility === "PUBLIC" ? "default" : "secondary"
							}
						>
							{project.visibility}
						</Badge>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* 复制项目 */}
					{canEdit && (
						<DropdownMenuItem
							onClick={handleDuplicateProject}
							disabled={isDuplicating}
						>
							<Copy className="mr-2 h-4 w-4" />
							{isDuplicating ? "复制中..." : "复制项目"}
						</DropdownMenuItem>
					)}

					{/* 删除项目 */}
					{canDelete && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<DropdownMenuItem
									className="text-red-600 focus:text-red-600"
									onSelect={(e) => e.preventDefault()}
									disabled={isDeleting}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									{isDeleting ? "删除中..." : "删除项目"}
								</DropdownMenuItem>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>确认删除项目</AlertDialogTitle>
									<AlertDialogDescription>
										您确定要删除项目 "{project.name}"
										吗？此操作不可撤销，将永久删除：
										<ul className="mt-2 list-inside list-disc text-sm">
											<li>项目基本信息</li>
											<li>所有项目成员</li>
											<li>相关数据版本</li>
											<li>所有应用程序</li>
										</ul>
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>取消</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDeleteProject}
										className="bg-red-600 hover:bg-red-700"
									>
										确认删除
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);

	if (variant === "buttons") {
		return (
			<div className="flex flex-wrap gap-2">
				<ActionsContent />
			</div>
		);
	}

	return <ActionsContent />;
}

// 项目卡片操作按钮（用于项目列表）
export function ProjectCardActions({
	project,
	onUpdate,
	onDelete,
}: ProjectActionsProps) {
	const router = useRouter();
	const { handleError } = useErrorHandler();

	const handleProjectClick = () => {
		router.push(`/projects/${project.slug}`);
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="ghost"
				size="sm"
				onClick={handleProjectClick}
				className="h-8 px-3"
			>
				查看详情
			</Button>

			<ProjectActions
				project={project}
				onUpdate={onUpdate}
				onDelete={onDelete}
				variant="buttons"
			/>
		</div>
	);
}

// 快速操作组件
export function QuickProjectActions({
	project,
	onUpdate,
	onDelete,
}: ProjectActionsProps) {
	const canEdit = ["OWNER", "ADMIN"].includes(project.currentUserRole);
	const canDelete = project.currentUserRole === "OWNER";

	return (
		<div className="flex items-center gap-1">
			{/* 可见性指示器 */}
			<div className="mr-2 flex items-center">
				{project.visibility === "PUBLIC" ? (
					<Eye className="h-4 w-4 text-green-600" />
				) : (
					<EyeOff className="h-4 w-4 text-gray-400" />
				)}
			</div>

			{/* 快速操作 */}
			<ProjectActions
				project={project}
				onUpdate={onUpdate}
				onDelete={onDelete}
				variant="dropdown"
			/>
		</div>
	);
}
