import Link from "next/link";
import { auth } from "~/server/auth";

export default async function Home() {
	const session = await auth();

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl tracking-tight sm:text-[5rem]">
					FastBuild <span className="text-[hsl(280,100%,70%)]">低代码平台</span>
				</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
						href="/projects"
					>
						<h3 className="font-bold text-2xl">我的项目 →</h3>
						<div className="text-lg">管理您的所有项目，创建新的应用程序。</div>
					</Link>
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
						href="#"
					>
						<h3 className="font-bold text-2xl">文档 →</h3>
						<div className="text-lg">
							学习如何使用FastBuild平台构建应用程序。
						</div>
					</Link>
				</div>
				<div className="flex flex-col items-center gap-2">
					<div className="flex flex-col items-center justify-center gap-4">
						<p className="text-center text-2xl text-white">
							{session && <span>欢迎，{session.user?.name}</span>}
						</p>
						<div className="flex gap-4">
							{session ? (
								<>
									<Link
										href="/projects"
										className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
									>
										进入项目
									</Link>
									<Link
										href="/api/auth/signout"
										className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
									>
										登出
									</Link>
								</>
							) : (
								<Link
									href="/api/auth/signin"
									className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
								>
									登录
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
