"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { Label } from "~/components/ui/label";

const registerSchema = z
	.object({
		name: z.string().min(1, "姓名是必填项").max(50, "姓名不能超过50个字符"),
		email: z.string().email("请输入有效的邮箱地址"),
		password: z
			.string()
			.min(6, "密码至少需要6个字符")
			.max(100, "密码不能超过100个字符"),
		confirmPassword: z.string().min(1, "请确认密码"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "两次输入的密码不一致",
		path: ["confirmPassword"],
	});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
	onSuccess?: () => void;
	onLoginClick?: () => void;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const form = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(data: RegisterFormValues) {
		setIsLoading(true);
		setError(null);

		try {
			// 第一步：注册用户
			const registerResponse = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: data.name,
					email: data.email,
					password: data.password,
				}),
			});

			const registerResult = await registerResponse.json();

			if (!registerResponse.ok) {
				throw new Error(registerResult.error || "注册失败");
			}

			// 第二步：自动登录用户
			const signInResult = await signIn("credentials", {
				email: data.email,
				password: data.password,
				redirect: false,
			});

			if (signInResult?.error) {
				// 注册成功但登录失败，这不应该发生
				throw new Error("账户创建成功，但自动登录失败，请手动登录");
			}

			toast.success("注册成功！已自动登录");
			onSuccess?.();

			// 注册并登录成功后跳转到项目页面
			router.push("/projects");
			router.refresh();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "注册失败，请稍后重试";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>创建账户</CardTitle>
				<CardDescription>输入您的信息来创建新的账户</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }: { field: any }) => (
								<FormItem>
									<FormLabel>姓名</FormLabel>
									<FormControl>
										<Input placeholder="请输入您的姓名" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }: { field: any }) => (
								<FormItem>
									<FormLabel>邮箱</FormLabel>
									<FormControl>
										<Input
											placeholder="your@email.com"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }: { field: any }) => (
								<FormItem>
									<FormLabel>密码</FormLabel>
									<FormControl>
										<Input
											placeholder="请输入密码"
											type="password"
											{...field}
										/>
									</FormControl>
									<FormDescription>密码至少需要6个字符</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }: { field: any }) => (
								<FormItem>
									<FormLabel>确认密码</FormLabel>
									<FormControl>
										<Input
											placeholder="请再次输入密码"
											type="password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? "注册中..." : "创建账户"}
						</Button>
					</form>
				</Form>
			</CardContent>
			<CardFooter>
				<div className="w-full text-center">
					<Button variant="link" onClick={onLoginClick} className="text-sm">
						已有账户？点击登录
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
