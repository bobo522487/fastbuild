"use client";

import { LogInIcon, LogOutIcon, PlusIcon, UserIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function Header() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const isLoading = status === "loading";

	const handleSignOut = async () => {
		await signOut({ callbackUrl: "/" });
	};

	const handleCreateProject = () => {
		router.push("/projects");
	};

	const getUserInitials = (name?: string | null, email?: string | null) => {
		if (name) {
			return name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2);
		}
		if (email) {
			return email[0]?.toUpperCase() || "U";
		}
		return "U";
	};

	return (
		<header className="border-gray-200 border-b bg-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo and Brand */}
					<div className="flex items-center">
						<Link href="/" className="flex items-center space-x-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
								<span className="font-bold text-sm text-white">FB</span>
							</div>
							<span className="font-bold text-gray-900 text-xl">FastBuild</span>
						</Link>
					</div>

					{/* Navigation Actions */}
					<div className="flex items-center space-x-4">
						{isLoading ? (
							<div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
						) : session ? (
							<>
								{/* Create Project Button */}
								<Button
									onClick={handleCreateProject}
									variant="outline"
									size="sm"
									className="hidden items-center space-x-2 sm:flex"
								>
									<PlusIcon className="h-4 w-4" />
									<span>创建项目</span>
								</Button>

								{/* User Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											className="relative h-8 w-8 rounded-full"
										>
											<Avatar className="h-8 w-8">
												<AvatarFallback>
													{getUserInitials(
														session.user?.name,
														session.user?.email,
													)}
												</AvatarFallback>
											</Avatar>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-56" align="end" forceMount>
										<div className="flex flex-col space-y-1 p-2">
											<p className="font-medium text-sm leading-none">
												{session.user?.name || "用户"}
											</p>
											<p className="text-muted-foreground text-xs leading-none">
												{session.user?.email || ""}
											</p>
										</div>
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link href="/projects" className="flex items-center">
												<PlusIcon className="mr-2 h-4 w-4" />
												<span>我的项目</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/profile" className="flex items-center">
												<UserIcon className="mr-2 h-4 w-4" />
												<span>个人设置</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={handleSignOut}
											className="flex cursor-pointer items-center"
										>
											<LogOutIcon className="mr-2 h-4 w-4" />
											<span>退出登录</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<div className="flex items-center space-x-2">
								<Button asChild variant="ghost" size="sm">
									<Link href="/auth">登录</Link>
								</Button>
								<Button asChild size="sm">
									<Link href="/auth/register">注册</Link>
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
