"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Eye, EyeOff, Save, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useErrorHandler } from "~/components/error/error-handler";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useAPIClient } from "~/hooks/use-api-client";
import { generateSlug } from "~/lib/utils";

// 项目更新表单验证schema
const UpdateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "项目名称不能为空")
		.max(100, "项目名称不能超过100个字符")
		.regex(
			/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/,
			"项目名称只能包含字母、数字、中文、空格、连字符和下划线",
		),
	slug: z
		.string()
		.min(1, "项目标识符不能为空")
		.max(50, "项目标识符不能超过50个字符")
		.regex(
			/^[a-z0-9\-_]+$/,
			"项目标识符只能包含小写字母、数字、连字符和下划线",
		),
	description: z.string().max(500, "项目描述不能超过500个字符").optional(),
	visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

type UpdateProjectFormData = z.infer<typeof UpdateProjectSchema>;

export interface Project {
	id: string;
	name: string;
	slug: string;
	description?: string;
	visibility: "PUBLIC" | "PRIVATE";
	createdAt: string;
	updatedAt: string;
	memberCount: number;
	applicationCount: number;
	dataVersionCount: number;
	currentUserRole: string;
}

interface ProjectEditFormProps {
	projectId: string;
	onSuccess?: (project: Project) => void;
	onCancel?: () => void;
}

export function ProjectEditForm({
	projectId,
	onSuccess,
	onCancel,
}: ProjectEditFormProps) {
	const router = useRouter();
	const { handleError } = useErrorHandler();
	const [isLoading, setIsLoading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [project, setProject] = useState<Project | null>(null);
	const [nameForDeletion, setNameForDeletion] = useState("");

	// 加载项目数据
	const {
		execute: loadProject,
		loading: isLoadingProject,
		error: loadError,
	} = useAPIClient(`/api/projects/${projectId}`, {
		immediate: true,
		onSuccess: (data: Project) => {
			setProject(data);
			reset({
				name: data.name,
				slug: data.slug,
				description: data.description || "",
				visibility: data.visibility,
			});
		},
		onError: (error) => {
			handleError(error, {
				showToast: true,
				fallbackMessage: "加载项目数据失败",
			});
		},
	});

	const {
		control,
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isDirty, dirtyFields },
	} = useForm<UpdateProjectFormData>({
		resolver: zodResolver(UpdateProjectSchema),
		mode: "onBlur",
	});

	const watchedName = watch("name");
	const watchedSlug = watch("slug");

	// 自动生成slug
	useEffect(() => {
		if (watchedName && watchedName !== project?.name && !dirtyFields.slug) {
			const newSlug = generateSlug(watchedName);
			setValue("slug", newSlug, { shouldValidate: true });
		}
	}, [watchedName, project?.name, dirtyFields.slug, setValue]);

	// 更新项目
	const { execute: updateProject, loading: isUpdating } = useAPIClient(
		`/api/projects/${projectId}`,
		{
			method: "PUT",
			immediate: false,
			onSuccess: (data: Project) => {
				setIsLoading(false);
				setProject(data);
				toast.success("项目更新成功");
				onSuccess?.(data);
			},
			onError: (error) => {
				setIsLoading(false);
				handleError(error, {
					showToast: true,
					fallbackMessage: "更新项目失败",
				});
			},
		},
	);

	// 删除项目
	const { execute: deleteProject } = useAPIClient(
		`/api/projects/${projectId}`,
		{
			method: "DELETE",
			immediate: false,
			onSuccess: () => {
				setIsDeleting(false);
				toast.success("项目删除成功");
				router.push("/projects");
			},
			onError: (error) => {
				setIsDeleting(false);
				setShowDeleteConfirm(false);
				handleError(error, {
					showToast: true,
					fallbackMessage: "删除项目失败",
				});
			},
		},
	);

	const onSubmit = async (data: UpdateProjectFormData) => {
		setIsLoading(true);
		try {
			await updateProject({ body: data });
		} catch (error) {
			setIsLoading(false);
		}
	};

	const handleDeleteProject = async () => {
		if (nameForDeletion !== project?.name) {
			toast.error("项目名称不匹配");
			return;
		}

		setIsDeleting(true);
		try {
			await deleteProject();
		} catch (error) {
			setIsDeleting(false);
		}
	};

	if (isLoadingProject) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
							<p className="text-gray-600 text-sm">加载项目数据...</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (loadError || !project) {
		return (
			<Card className="border-red-200">
				<CardContent className="p-6">
					<div className="text-center">
						<AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-500" />
						<h3 className="mb-2 font-medium text-lg text-red-800">加载失败</h3>
						<p className="mb-4 text-red-600 text-sm">
							无法加载项目数据，请刷新页面重试
						</p>
						<Button variant="outline" onClick={() => window.location.reload()}>
							刷新页面
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// 检查编辑权限
	if (!["OWNER", "ADMIN"].includes(project.currentUserRole)) {
		return (
			<Card className="border-yellow-200">
				<CardContent className="p-6">
					<div className="text-center">
						<Settings className="mx-auto mb-4 h-8 w-8 text-yellow-500" />
						<h3 className="mb-2 font-medium text-lg text-yellow-800">
							权限不足
						</h3>
						<p className="text-sm text-yellow-600">您没有权限编辑此项目</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const watchedDescription = watch("description");
	const watchedVisibility = watch("visibility");

	return (
		<div className="space-y-6">
			{/* 项目信息卡片 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						项目设置
					</CardTitle>
					<CardDescription>修改项目的基本信息和设置</CardDescription>
				</CardHeader>
				<CardContent>
					{/* 项目统计 */}
					<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="rounded-lg bg-gray-50 p-4 text-center">
							<div className="font-bold text-2xl text-gray-900">
								{project.memberCount}
							</div>
							<div className="text-gray-600 text-sm">成员</div>
						</div>
						<div className="rounded-lg bg-gray-50 p-4 text-center">
							<div className="font-bold text-2xl text-gray-900">
								{project.applicationCount}
							</div>
							<div className="text-gray-600 text-sm">应用</div>
						</div>
						<div className="rounded-lg bg-gray-50 p-4 text-center">
							<div className="font-bold text-2xl text-gray-900">
								{project.dataVersionCount}
							</div>
							<div className="text-gray-600 text-sm">数据版本</div>
						</div>
					</div>

					{/* 当前角色 */}
					<div className="mb-6">
						<Badge
							variant={
								project.currentUserRole === "OWNER" ? "default" : "secondary"
							}
						>
							{project.currentUserRole === "OWNER" ? "项目所有者" : "管理员"}
						</Badge>
						<p className="mt-1 text-gray-600 text-sm">您在此项目中的角色</p>
					</div>

					<Separator className="mb-6" />

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* 项目名称 */}
						<div className="space-y-2">
							<Label htmlFor="name">项目名称 *</Label>
							<Input
								id="name"
								placeholder="输入项目名称"
								{...register("name")}
								className={errors.name ? "border-red-500" : ""}
							/>
							{errors.name && (
								<p className="text-red-500 text-sm">{errors.name.message}</p>
							)}
						</div>

						{/* 项目标识符 */}
						<div className="space-y-2">
							<Label htmlFor="slug">项目标识符 *</Label>
							<Input
								id="slug"
								placeholder="项目唯一标识符"
								{...register("slug")}
								className={errors.slug ? "border-red-500" : ""}
							/>
							{errors.slug && (
								<p className="text-red-500 text-sm">{errors.slug.message}</p>
							)}
							<p className="text-gray-500 text-xs">
								项目标识符将用于URL和API路径，只能包含小写字母、数字、连字符和下划线
							</p>
						</div>

						{/* 项目描述 */}
						<div className="space-y-2">
							<Label htmlFor="description">项目描述</Label>
							<Textarea
								id="description"
								placeholder="描述您的项目..."
								rows={4}
								{...register("description")}
								className={errors.description ? "border-red-500" : ""}
							/>
							{errors.description && (
								<p className="text-red-500 text-sm">
									{errors.description.message}
								</p>
							)}
							<p className="text-gray-500 text-xs">
								{watchedDescription?.length || 0}/500 字符
							</p>
						</div>

						{/* 项目可见性 */}
						<div className="space-y-4">
							<Label>项目可见性</Label>
							<Controller
								name="visibility"
								control={control}
								render={({ field }) => (
									<div className="flex items-center space-x-2">
										<Switch
											checked={field.value === "PUBLIC"}
											onCheckedChange={(checked) =>
												field.onChange(checked ? "PUBLIC" : "PRIVATE")
											}
										/>
										<Label className="flex items-center gap-2">
											{field.value === "PUBLIC" ? (
												<>
													<Eye className="h-4 w-4" />
													公开项目
												</>
											) : (
												<>
													<EyeOff className="h-4 w-4" />
													私有项目
												</>
											)}
										</Label>
									</div>
								)}
							/>
							<p className="text-gray-600 text-sm">
								{watchedVisibility === "PUBLIC"
									? "公开项目可以被任何人查看，只有项目成员可以编辑"
									: "私有项目只有项目成员可以查看和编辑"}
							</p>
						</div>

						{/* 操作按钮 */}
						<div className="flex justify-between pt-4">
							<div className="flex gap-2">
								{onCancel && (
									<Button
										type="button"
										variant="outline"
										onClick={onCancel}
										disabled={isLoading || isUpdating}
									>
										取消
									</Button>
								)}
							</div>

							<div className="flex gap-2">
								<Button
									type="submit"
									disabled={!isDirty || isLoading || isUpdating}
									className="min-w-[120px]"
								>
									{isLoading || isUpdating ? (
										<>
											<div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
											保存中...
										</>
									) : (
										<>
											<Save className="mr-2 h-4 w-4" />
											保存更改
										</>
									)}
								</Button>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* 危险操作区域 */}
			{project.currentUserRole === "OWNER" && (
				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="text-red-800">危险操作</CardTitle>
						<CardDescription>以下操作不可撤销，请谨慎操作</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!showDeleteConfirm ? (
							<Button
								variant="destructive"
								onClick={() => setShowDeleteConfirm(true)}
								disabled={isDeleting}
							>
								删除项目
							</Button>
						) : (
							<div className="space-y-4">
								<Alert>
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription>
										删除项目将永久删除所有相关数据，此操作不可撤销。
										如果项目包含应用程序或数据版本，将无法删除。
									</AlertDescription>
								</Alert>

								<div className="space-y-2">
									<Label>
										请输入项目名称 <strong>{project.name}</strong> 确认删除：
									</Label>
									<Input
										value={nameForDeletion}
										onChange={(e) => setNameForDeletion(e.target.value)}
										placeholder={project.name}
										className="border-red-300 focus:border-red-500"
									/>
								</div>

								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={() => {
											setShowDeleteConfirm(false);
											setNameForDeletion("");
										}}
										disabled={isDeleting}
									>
										取消
									</Button>
									<Button
										variant="destructive"
										onClick={handleDeleteProject}
										disabled={isDeleting || nameForDeletion !== project.name}
										className="min-w-[120px]"
									>
										{isDeleting ? (
											<>
												<div className="mr-2 h-4 w-4 animate-spin rounded-full border-white border-b-2" />
												删除中...
											</>
										) : (
											"确认删除"
										)}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
