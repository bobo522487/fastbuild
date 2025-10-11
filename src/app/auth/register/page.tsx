"use client";

import Link from "next/link";
import { RegisterForm } from "~/components/auth/register-form";
import { Button } from "~/components/ui/button";

export default function RegisterPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h2 className="mt-6 font-extrabold text-3xl text-gray-900">
						创建账户
					</h2>
					<p className="mt-2 text-gray-600 text-sm">
						加入 FastBuild 低代码平台
					</p>
				</div>

				<RegisterForm />

				<div className="text-center">
					<p className="text-gray-600 text-sm">
						已有账户？{" "}
						<Link href="/auth">
							<Button variant="link" className="h-auto p-0 font-normal">
								立即登录
							</Button>
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
