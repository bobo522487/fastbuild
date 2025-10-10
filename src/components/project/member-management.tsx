"use client";

import {
	ArrowLeft,
	Crown,
	Mail,
	MoreHorizontal,
	Plus,
	Search,
	Settings,
	Shield,
	User,
	UserMinus,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { useAPIClient } from "~/hooks/use-api-client";
import { useDebounce } from "~/hooks/use-debounce";
import { cn } from "~/lib/utils";

interface Member {
	id: string;
	role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | "NO_ACCESS";
	joinedAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string;
	};
}

interface ProjectMemberManagementProps {
	projectId: string;
	projectName: string;
	currentUserRole: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | "NO_ACCESS" | null;
}

export function ProjectMemberManagement({
	projectId,
	projectName,
	currentUserRole,
}: ProjectMemberManagementProps) {
	const router = useRouter();
	const { handleError } = useErrorHandler();

	// 成员管理状态
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCount, setTotalCount] = useState(0);

	// 邀请成员状态
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">(
		"VIEWER",
	);
	const [isInviting, setIsInviting] = useState(false);

	// 防抖搜索
	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	// 权限检查
	const canInviteMembers =
		currentUserRole === "OWNER" || currentUserRole === "ADMIN";
	const canManageMembers = currentUserRole === "OWNER";
	const canLeaveProject = currentUserRole !== null;

	// 加载成员列表
	const { execute: loadMembers, loading: isLoadingMembers } = useAPIClient(
		`/api/projects/${projectId}/members?page=${currentPage}&limit=20${debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : ""}${roleFilter ? `&role=${encodeURIComponent(roleFilter)}` : ""}`,
		{
			immediate: true,
			onSuccess: (data: {
				members: Member[];
				pagination: { totalPages: number; total: number };
			}) => {
				setMembers(data.members);
				setTotalPages(data.pagination.totalPages);
				setTotalCount(data.pagination.total);
				setLoading(false);
			},
			onError: (error) => {
				setLoading(false);
				handleError(error, {
					showToast: true,
					fallbackMessage: "加载成员列表失败",
				});
			},
		},
	);

	// 邀请成员
	const { execute: inviteMember } = useAPIClient(
		`/api/projects/${projectId}/members`,
		{
			method: "POST",
			immediate: false,
			onSuccess: (newMember: Member) => {
				setIsInviting(false);
				setShowInviteDialog(false);
				setInviteEmail("");
				setInviteRole("VIEWER");
				setMembers((prev) => [...prev, newMember]);
				setTotalCount((prev) => prev + 1);
				toast.success(`已邀请 ${newMember.user.name} 加入项目`);
			},
			onError: (error) => {
				setIsInviting(false);
				handleError(error, {
					showToast: true,
					fallbackMessage: "邀请成员失败",
				});
			},
		},
	);

	// 更新成员角色
	const updateMemberRole = async (
		memberId: string,
		newRole: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | "NO_ACCESS",
	) => {
		const { execute } = useAPIClient(
			`/api/projects/${projectId}/members/${memberId}`,
			{
				method: "PUT",
				immediate: false,
				onSuccess: () => {
					toast.success("成员角色已更新");
					loadMembers();
				},
				onError: (error) => {
					handleError(error, {
						showToast: true,
						fallbackMessage: "更新成员角色失败",
					});
				},
			},
		);

		try {
			await execute({
				body: { role: newRole },
			});
		} catch (error) {
			// 错误已在hook中处理
		}
	};

	// 移除成员
	const removeMember = async (memberId: string) => {
		const { execute } = useAPIClient(
			`/api/projects/${projectId}/members/${memberId}`,
			{
				method: "DELETE",
				immediate: false,
				onSuccess: (data: { removedMember?: Member }) => {
					// 从响应数据中获取被移除的成员信息
					const removedMember = data?.removedMember;
					if (removedMember) {
						setMembers((prev) => prev.filter((m) => m.id !== removedMember.id));
						setTotalCount((prev) => prev - 1);

						if (removedMember.user?.id === getCurrentUserId()) {
							// 如果是自己退出项目，跳转到项目列表
							toast.success("已退出项目");
							router.push("/projects");
						} else {
							toast.success(`已移除 ${removedMember.user?.name}`);
						}
					}
				},
				onError: (error) => {
					handleError(error, {
						showToast: true,
						fallbackMessage: "移除成员失败",
					});
				},
			},
		);

		try {
			await execute({});
		} catch (error) {
			// 错误已在hook中处理
		}
	};

	// 获取当前用户ID
	const getCurrentUserId = () => {
		// 这里应该从认证状态获取用户ID
		// 暂时返回一个占位符
		return "current-user-id";
	};

	// 处理搜索和过滤变化
	useEffect(() => {
		setCurrentPage(1);
		loadMembers();
	}, [debouncedSearchQuery, roleFilter, loadMembers]);

	// 处理分页
	useEffect(() => {
		loadMembers();
	}, [currentPage, loadMembers]);

	const handleInviteMember = async () => {
		if (!inviteEmail.trim()) {
			toast.error("请输入邮箱地址");
			return;
		}

		setIsInviting(true);
		try {
			await inviteMember({
				body: {
					email: inviteEmail.trim(),
					role: inviteRole,
				},
			});
		} catch (error) {
			setIsInviting(false);
		}
	};

	const handleUpdateMemberRole = async (
		memberId: string,
		newRole: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" | "NO_ACCESS",
	) => {
		await updateMemberRole(memberId, newRole);
	};

	const handleRemoveMember = async (memberId: string) => {
		await removeMember(memberId);
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "OWNER":
				return <Crown className="h-4 w-4 text-yellow-600" />;
			case "ADMIN":
				return <Shield className="h-4 w-4 text-blue-600" />;
			case "EDITOR":
				return <Settings className="h-4 w-4 text-green-600" />;
			case "VIEWER":
				return <User className="h-4 w-4 text-gray-600" />;
			case "NO_ACCESS":
				return <UserMinus className="h-4 w-4 text-red-600" />;
			default:
				return <User className="h-4 w-4 text-gray-600" />;
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "OWNER":
				return "所有者";
			case "ADMIN":
				return "管理员";
			case "EDITOR":
				return "编辑者";
			case "VIEWER":
				return "查看者";
			case "NO_ACCESS":
				return "无权限";
			default:
				return "成员";
		}
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case "OWNER":
				return "default";
			case "ADMIN":
				return "secondary";
			case "EDITOR":
				return "outline";
			case "VIEWER":
				return "outline";
			case "NO_ACCESS":
				return "destructive";
			default:
				return "outline";
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center justify-center py-8">
						<div className="text-center">
							<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
							<p className="text-gray-600 text-sm">加载成员列表...</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* 页面标题 */}
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="mr-1 h-4 w-4" />
					返回
				</Button>
				<Users className="h-6 w-6 text-gray-600" />
				<div>
					<h1 className="font-bold text-2xl">项目成员</h1>
					<p className="text-gray-600">管理 "{projectName}" 的成员</p>
				</div>
			</div>

			{/* 统计信息 */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="p-4 text-center">
						<div className="font-bold text-2xl">{totalCount}</div>
						<div className="text-gray-600 text-sm">总成员</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="font-bold text-2xl">
							{members.filter((m) => m.role === "OWNER").length}
						</div>
						<div className="text-gray-600 text-sm">所有者</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="font-bold text-2xl">
							{members.filter((m) => m.role === "ADMIN").length}
						</div>
						<div className="text-gray-600 text-sm">管理员</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="font-bold text-2xl">
							{members.filter((m) => m.role === "EDITOR").length}
						</div>
						<div className="text-gray-600 text-sm">编辑者</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 text-center">
						<div className="font-bold text-2xl">
							{members.filter((m) => m.role === "VIEWER").length}
						</div>
						<div className="text-gray-600 text-sm">查看者</div>
					</CardContent>
				</Card>
			</div>

			{/* 操作栏 */}
			<Card>
				<CardHeader>
					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<div className="flex flex-1 flex-col gap-4 sm:flex-row">
							{/* 搜索 */}
							<div className="relative max-w-sm flex-1">
								<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
								<Input
									placeholder="搜索成员..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>

							{/* 角色过滤 */}
							<Select value={roleFilter} onValueChange={setRoleFilter}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="所有角色" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">所有角色</SelectItem>
									<SelectItem value="OWNER">所有者</SelectItem>
									<SelectItem value="ADMIN">管理员</SelectItem>
									<SelectItem value="EDITOR">编辑者</SelectItem>
									<SelectItem value="VIEWER">查看者</SelectItem>
									<SelectItem value="NO_ACCESS">无权限</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* 邀请成员按钮 */}
						{canInviteMembers && (
							<Dialog
								open={showInviteDialog}
								onOpenChange={setShowInviteDialog}
							>
								<DialogTrigger asChild>
									<Button>
										<Plus className="mr-2 h-4 w-4" />
										邀请成员
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>邀请新成员</DialogTitle>
										<DialogDescription>
											邀请新成员加入项目 "{projectName}"
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4">
										<div className="space-y-2">
											<label htmlFor="email" className="font-medium text-sm">
												邮箱地址
											</label>
											<Input
												id="email"
												type="email"
												placeholder="输入用户邮箱"
												value={inviteEmail}
												onChange={(e) => setInviteEmail(e.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<label htmlFor="role" className="font-medium text-sm">
												角色
											</label>
											<Select
												value={inviteRole}
												onValueChange={(value: "ADMIN" | "EDITOR" | "VIEWER") =>
													setInviteRole(value)
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="VIEWER">查看者</SelectItem>
													<SelectItem value="EDITOR">编辑者</SelectItem>
													{currentUserRole === "OWNER" && (
														<SelectItem value="ADMIN">管理员</SelectItem>
													)}
												</SelectContent>
											</Select>
										</div>
										<div className="flex justify-end gap-2">
											<Button
												variant="outline"
												onClick={() => setShowInviteDialog(false)}
											>
												取消
											</Button>
											<Button
												onClick={handleInviteMember}
												disabled={isInviting}
											>
												{isInviting ? "邀请中..." : "发送邀请"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						)}
					</div>
				</CardHeader>

				{/* 成员列表 */}
				<CardContent>
					{members.length === 0 ? (
						<div className="py-8 text-center">
							<Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
							<h3 className="mb-2 font-medium text-gray-900 text-lg">
								{searchQuery || roleFilter
									? "没有找到匹配的成员"
									: "还没有成员"}
							</h3>
							<p className="mb-4 text-gray-600">
								{searchQuery || roleFilter
									? "尝试调整搜索条件或过滤器"
									: canInviteMembers
										? "邀请第一个成员加入项目"
										: "等待其他成员加入项目"}
							</p>
							{canInviteMembers && !searchQuery && !roleFilter && (
								<Button onClick={() => setShowInviteDialog(true)}>
									<Plus className="mr-2 h-4 w-4" />
									邀请成员
								</Button>
							)}
						</div>
					) : (
						<div className="space-y-4">
							{/* 表格视图 */}
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>成员</TableHead>
											<TableHead>角色</TableHead>
											<TableHead>加入时间</TableHead>
											<TableHead className="text-right">操作</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{members.map((member) => {
											const isCurrentUser =
												member.user.id === getCurrentUserId();
											return (
												<TableRow key={member.id}>
													<TableCell>
														<div className="flex items-center gap-3">
															<Avatar>
																<AvatarImage src={member.user.image} />
																<AvatarFallback>
																	{member.user.name.charAt(0).toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<div>
																<div className="font-medium">
																	{member.user.name}
																</div>
																<div className="flex items-center gap-1 text-gray-600 text-sm">
																	<Mail className="h-3 w-3" />
																	{member.user.email}
																</div>
															</div>
														</div>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															{getRoleIcon(member.role)}
															<Badge variant={getRoleBadgeVariant(member.role)}>
																{getRoleLabel(member.role)}
															</Badge>
															{isCurrentUser && (
																<span className="text-gray-500 text-xs">
																	(您)
																</span>
															)}
														</div>
													</TableCell>
													<TableCell>
														{new Date(member.joinedAt).toLocaleDateString()}
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-2">
															{canManageMembers && !isCurrentUser && (
																<Select
																	value={member.role}
																	onValueChange={(
																		value:
																			| "OWNER"
																			| "ADMIN"
																			| "EDITOR"
																			| "VIEWER"
																			| "NO_ACCESS",
																	) => handleUpdateMemberRole(member.id, value)}
																>
																	<SelectTrigger className="h-8 w-[100px]">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{currentUserRole === "OWNER" && (
																			<SelectItem value="OWNER">
																				所有者
																			</SelectItem>
																		)}
																		<SelectItem value="ADMIN">
																			管理员
																		</SelectItem>
																		<SelectItem value="EDITOR">
																			编辑者
																		</SelectItem>
																		<SelectItem value="VIEWER">
																			查看者
																		</SelectItem>
																		<SelectItem value="NO_ACCESS">
																			无权限
																		</SelectItem>
																	</SelectContent>
																</Select>
															)}

															{(canManageMembers || isCurrentUser) && (
																<AlertDialog>
																	<AlertDialogTrigger asChild>
																		<Button
																			variant="outline"
																			size="sm"
																			className="h-8 w-8 p-0"
																		>
																			<UserMinus className="h-4 w-4" />
																		</Button>
																	</AlertDialogTrigger>
																	<AlertDialogContent>
																		<AlertDialogHeader>
																			<AlertDialogTitle>
																				确认{isCurrentUser ? "退出" : "移除"}
																			</AlertDialogTitle>
																			<AlertDialogDescription>
																				{isCurrentUser
																					? `您确定要退出项目 "${projectName}" 吗？退出后您将失去对该项目的访问权限。`
																					: `确定要从项目 "${projectName}" 中移除 ${member.user.name} 吗？`}
																			</AlertDialogDescription>
																		</AlertDialogHeader>
																		<AlertDialogFooter>
																			<AlertDialogCancel>
																				取消
																			</AlertDialogCancel>
																			<AlertDialogAction
																				onClick={() =>
																					handleRemoveMember(member.id)
																				}
																				className="bg-red-600 hover:bg-red-700"
																			>
																				{isCurrentUser
																					? "退出项目"
																					: "移除成员"}
																			</AlertDialogAction>
																		</AlertDialogFooter>
																	</AlertDialogContent>
																</AlertDialog>
															)}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							{/* 分页 */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between">
									<div className="text-gray-600 text-sm">
										显示 {(currentPage - 1) * 20 + 1} 到{" "}
										{Math.min(currentPage * 20, totalCount)} 个成员，共{" "}
										{totalCount} 个
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setCurrentPage((prev) => Math.max(1, prev - 1))
											}
											disabled={currentPage === 1}
										>
											上一页
										</Button>
										<span className="text-sm">
											第 {currentPage} 页，共 {totalPages} 页
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setCurrentPage((prev) => Math.min(totalPages, prev + 1))
											}
											disabled={currentPage === totalPages}
										>
											下一页
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
