"use client";

import { useState } from "react";
import { LoginForm } from "~/components/auth/login-form";
import { RegisterForm } from "~/components/auth/register-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function AuthPage() {
	const [activeTab, setActiveTab] = useState("login");

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h2 className="mt-6 font-extrabold text-3xl text-gray-900">
						FastBuild 低代码平台
					</h2>
					<p className="mt-2 text-gray-600 text-sm">
						欢迎使用我们的平台，请登录或注册以继续
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="login">登录</TabsTrigger>
						<TabsTrigger value="register">注册</TabsTrigger>
					</TabsList>

					<TabsContent value="login" className="mt-6">
						<LoginForm onRegisterClick={() => setActiveTab("register")} />
					</TabsContent>

					<TabsContent value="register" className="mt-6">
						<RegisterForm onLoginClick={() => setActiveTab("login")} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
