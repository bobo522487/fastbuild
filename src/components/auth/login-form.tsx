"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
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
import { EmailVerificationForm } from "./email-verification-form";
import { ForgotPasswordForm } from "./forgot-password-form";

const loginSchema = z.object({
	email: z.string().email("请输入有效的邮箱地址"),
	password: z.string().min(1, "密码不能为空"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
	onSuccess?: () => void;
	onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showEmailVerification, setShowEmailVerification] = useState(false);
	const [showForgotPassword, setShowForgotPassword] = useState(false);
	const router = useRouter();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(data: LoginFormValues) {
		setIsLoading(true);
		setError(null);

		try {
			const result = await signIn("credentials", {
				email: data.email,
				password: data.password,
				redirect: false,
			});

			if (result?.error) {
				throw new Error("邮箱或密码错误");
			}

			toast.success("登录成功！");
			onSuccess?.();

			// 登录成功后跳转到项目页面
			router.push("/projects");
			router.refresh();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "登录失败，请稍后重试";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}

	async function handleGitHubLogin() {
		setIsLoading(true);
		try {
			await signIn("github", { callbackUrl: "/projects" });
		} catch (err) {
			const errorMessage = "GitHub登录失败，请稍后重试";
			setError(errorMessage);
			toast.error(errorMessage);
			setIsLoading(false);
		}
	}

	const handleEmailVerificationSuccess = () => {
		setShowEmailVerification(false);
		toast.success("邮箱验证成功！");
		onSuccess?.();
		router.push("/projects");
		router.refresh();
	};

	if (showEmailVerification) {
		return (
			<EmailVerificationForm
				onVerificationSuccess={handleEmailVerificationSuccess}
			/>
		);
	}

	if (showForgotPassword) {
		return (
			<ForgotPasswordForm
				onSuccess={() => setShowForgotPassword(false)}
				onLoginClick={() => setShowForgotPassword(false)}
			/>
		);
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>登录账户</CardTitle>
				<CardDescription>选择您的登录方式</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
							{isLoading ? "登录中..." : "登录"}
						</Button>
					</form>
				</Form>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">
							或者
						</span>
					</div>
				</div>

				<Button
					variant="outline"
					className="w-full"
					onClick={() => setShowEmailVerification(true)}
					disabled={isLoading}
				>
					使用邮箱验证链接登录
				</Button>

				<Button
					variant="outline"
					className="w-full"
					onClick={handleGitHubLogin}
					disabled={isLoading}
				>
					<GitHubLogoIcon className="mr-2 h-4 w-4" />
					使用 GitHub 登录
				</Button>
			</CardContent>
			<CardFooter>
				<div className="w-full space-y-2">
					<div className="text-center">
						<Button
							variant="link"
							onClick={() => setShowForgotPassword(true)}
							className="text-sm"
						>
							忘记密码？
						</Button>
					</div>
					<div className="text-center">
						<Button variant="link" onClick={onRegisterClick} className="text-sm">
							还没有账户？点击注册
						</Button>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
