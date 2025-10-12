"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useToast } from "~/hooks/use-toast";
import { generateSlug } from "~/lib/utils";
import {
	type CreateProjectInput,
	CreateProjectSchema,
} from "~/lib/validations";

interface ProjectFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm({
		resolver: zodResolver(CreateProjectSchema),
		defaultValues: {
			name: "",
			slug: "",
			description: undefined,
			visibility: "PRIVATE",
		},
	});

	// 自动生成slug
	const handleNameChange = (name: string) => {
		form.setValue("name", name);
		if (
			!form.getValues("slug") ||
			form.getValues("slug") === generateSlug(form.getValues("name"))
		) {
			form.setValue("slug", generateSlug(name));
		}
	};

	const onSubmit = async (data: FieldValues) => {
		setIsLoading(true);

		try {
			// 验证数据类型
			const validatedData = CreateProjectSchema.parse(data);

			const response = await fetch("/api/meta/projects", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(validatedData),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || "Failed to create project");
			}

			toast({
				title: "项目创建成功",
				description: `项目 "${data.name}" 已成功创建`,
			});

			// 重置表单
			form.reset();

			// 调用成功回调，让父组件决定页面跳转逻辑
			onSuccess?.();
		} catch (error) {
			console.error("Error creating project:", error);
			toast({
				title: "创建失败",
				description: error instanceof Error ? error.message : "未知错误",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Plus className="h-5 w-5" />
					创建新项目
				</CardTitle>
				<CardDescription>
					创建一个新的项目来开始构建您的应用程序。项目是组织您所有资源的基础容器。
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{/* 项目名称 */}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>项目名称 *</FormLabel>
									<FormControl>
										<Input
											placeholder="输入项目名称"
											{...field}
											onChange={(e) => handleNameChange(e.target.value)}
										/>
									</FormControl>
									<FormDescription>
										项目的显示名称，最多100个字符，支持中英文、数字、空格和连字符。
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* 项目标识符 */}
						<FormField
							control={form.control}
							name="slug"
							render={({ field }) => (
								<FormItem>
									<FormLabel>项目标识符 *</FormLabel>
									<FormControl>
										<Input placeholder="项目标识符" {...field} />
									</FormControl>
									<FormDescription>
										项目的唯一标识符，用于URL路径。只能包含小写字母、数字、连字符和下划线。
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* 项目描述 */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>项目描述</FormLabel>
									<FormControl>
										<Textarea
											placeholder="简要描述项目的用途和功能..."
											className="min-h-[80px] resize-none"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										可选的项目描述，最多500个字符。
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* 可见性设置 */}
						<FormField
							control={form.control}
							name="visibility"
							render={({ field }) => (
								<FormItem>
									<FormLabel>项目可见性</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="选择项目可见性" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="PRIVATE">
												<div className="flex items-center gap-2">
													<EyeOff className="h-4 w-4" />
													<div>
														<div className="font-medium">私有</div>
														<div className="text-muted-foreground text-sm">
															只有项目成员可以访问
														</div>
													</div>
												</div>
											</SelectItem>
											<SelectItem value="PUBLIC">
												<div className="flex items-center gap-2">
													<Eye className="h-4 w-4" />
													<div>
														<div className="font-medium">公开</div>
														<div className="text-muted-foreground text-sm">
															所有人都可以查看项目
														</div>
													</div>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										设置项目的访问权限。私有项目只有受邀成员才能访问。
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* 操作按钮 */}
						<div className="flex items-center justify-end gap-4 pt-4">
							{onCancel && (
								<Button
									type="button"
									variant="outline"
									onClick={onCancel}
									disabled={isLoading}
								>
									取消
								</Button>
							)}
							<Button type="submit" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										创建中...
									</>
								) : (
									<>
										<Plus className="mr-2 h-4 w-4" />
										创建项目
									</>
								)}
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
