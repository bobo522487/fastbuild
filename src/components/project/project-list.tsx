"use client";

import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Globe,
	Lock,
	MoreHorizontal,
	Plus,
	Search,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useToast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";
import type { ProjectQueryInput } from "~/lib/validations";

interface Project {
	id: string;
	name: string;
	slug: string;
	description?: string;
	visibility: "PUBLIC" | "PRIVATE";
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	members: Array<{
		id: string;
		role: string;
		user: {
			id: string;
			name: string;
			email: string;
			image?: string;
		};
	}>;
	_count: {
		members: number;
		applications: number;
		DataVersions: number;
	};
}

interface PaginatedProjectsResponse {
	success: boolean;
	data: Project[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
	meta: {
		timestamp: string;
		requestId: string;
	};
}

const SORT_OPTIONS = ["name", "createdAt", "updatedAt"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const ORDER_OPTIONS = ["asc", "desc"] as const;
type OrderOption = (typeof ORDER_OPTIONS)[number];
const VISIBILITY_OPTIONS = ["all", "PUBLIC", "PRIVATE"] as const;
type VisibilityFilter = (typeof VISIBILITY_OPTIONS)[number];

interface FilterState {
	visibility: VisibilityFilter;
	sort: SortOption;
	order: OrderOption;
}

type ErrorResponse = {
	error?: {
		message?: string;
	};
};

const isSortOption = (value: string): value is SortOption =>
	SORT_OPTIONS.includes(value as SortOption);

const isOrderOption = (value: string): value is OrderOption =>
	ORDER_OPTIONS.includes(value as OrderOption);

const isVisibilityOption = (value: string): value is VisibilityFilter =>
	VISIBILITY_OPTIONS.includes(value as VisibilityFilter);

const isErrorResponse = (value: unknown): value is ErrorResponse => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	if (!("error" in value)) {
		return false;
	}

	const error = (value as { error?: unknown }).error;
	return typeof error === "object" && error !== null;
};

interface ProjectListProps {
	onCreateProject?: () => void;
	onProjectSelect?: (project: Project) => void;
}

export function ProjectList({
	onCreateProject,
	onProjectSelect,
}: ProjectListProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [projects, setProjects] = useState<Project[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [filters, setFilters] = useState<FilterState>({
		visibility: "all",
		sort: "updatedAt",
		order: "desc",
	});
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 12,
		total: 0,
		totalPages: 1,
		hasNext: false,
		hasPrev: false,
	});

	// 获取项目列表
	const fetchProjects = useCallback(
		async (resetPage = false) => {
			setIsLoading(true);
			try {
				const params = new URLSearchParams();
				const currentPage = resetPage ? 1 : pagination.page;
				params.set("page", currentPage.toString());
				params.set("limit", pagination.limit.toString());
				if (searchQuery) params.set("search", searchQuery);

				const filterEntries = Object.entries(filters) as Array<
					[keyof FilterState, FilterState[keyof FilterState]]
				>;
				for (const [key, value] of filterEntries) {
					if (value !== "all") {
						params.set(key, String(value));
					}
				}

				const response = await fetch(`/api/meta/projects?${params.toString()}`);
				const payload = (await response.json()) as unknown;

				if (!response.ok) {
					const message = isErrorResponse(payload)
						? (payload.error?.message ?? "Failed to fetch projects")
						: "Failed to fetch projects";
					throw new Error(message);
				}

				const result = payload as PaginatedProjectsResponse;

				setProjects(result.data);
				if (resetPage) {
					setPagination({
						...result.pagination,
						page: 1,
					});
				} else {
					setPagination(result.pagination);
				}
			} catch (error) {
				console.error("Error fetching projects:", error);
				toast({
					title: "加载失败",
					description: error instanceof Error ? error.message : "未知错误",
					variant: "destructive",
				});
			} finally {
				setIsLoading(false);
			}
		},
		[filters, pagination.limit, pagination.page, searchQuery, toast],
	);

	// 初始加载
	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects]);

	// 防抖搜索
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchProjects(true);
		}, 300);

		return () => clearTimeout(timer);
	}, [fetchProjects, searchQuery]);

	// 过滤器变化时重新加载
	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects, filters]);

	// 处理页码变化
	const handlePageChange = (newPage: number) => {
		setPagination((prev) => ({ ...prev, page: newPage }));
		fetchProjects(false);
	};

	// 处理项目点击
	const handleProjectClick = (project: Project) => {
		if (onProjectSelect) {
			onProjectSelect(project);
		} else {
			router.push(`/projects/${project.slug}`);
		}
	};

	// 格式化日期
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// 获取用户在项目中的角色
	const getUserRole = (project: Project) => {
		// 这里应该从当前用户会话中获取用户ID
		// 暂时返回创建者角色
		return "OWNER";
	};

	return (
		<div className="space-y-6">
			{/* 头部操作区 */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">我的项目</h1>
					<p className="text-muted-foreground">
						管理您的所有项目，创建新的应用程序
					</p>
				</div>
				<Button onClick={onCreateProject}>
					<Plus className="mr-2 h-4 w-4" />
					创建项目
				</Button>
			</div>

			{/* 搜索和过滤器 */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<div className="relative flex-1">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
					<Input
						placeholder="搜索项目..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>

				<div className="flex gap-2">
					<Select
						value={filters.visibility}
						onValueChange={(value) => {
							if (isVisibilityOption(value)) {
								setFilters((prev) => ({ ...prev, visibility: value }));
							}
						}}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">全部</SelectItem>
							<SelectItem value="PUBLIC">公开</SelectItem>
							<SelectItem value="PRIVATE">私有</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={filters.sort}
						onValueChange={(value) => {
							if (isSortOption(value)) {
								setFilters((prev) => ({ ...prev, sort: value }));
							}
						}}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name">名称</SelectItem>
							<SelectItem value="createdAt">创建时间</SelectItem>
							<SelectItem value="updatedAt">更新时间</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={filters.order}
						onValueChange={(value) => {
							if (isOrderOption(value)) {
								setFilters((prev) => ({ ...prev, order: value }));
							}
						}}
					>
						<SelectTrigger className="w-[100px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="asc">升序</SelectItem>
							<SelectItem value="desc">降序</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* 项目列表 */}
			{isLoading ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={`project-skeleton-${i}`} className="animate-pulse">
							<CardHeader>
								<div className="h-6 w-3/4 rounded bg-muted" />
								<div className="h-4 w-1/2 rounded bg-muted" />
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="h-4 rounded bg-muted" />
									<div className="flex items-center justify-between">
										<div className="h-4 w-16 rounded bg-muted" />
										<div className="h-8 w-20 rounded bg-muted" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : projects.length === 0 ? (
				<Card className="py-12">
					<CardContent className="flex flex-col items-center space-y-4 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
							<Plus className="h-8 w-8 text-muted-foreground" />
						</div>
						<div>
							<h3 className="font-semibold text-lg">还没有项目</h3>
							<p className="text-muted-foreground">
								{searchQuery
									? "没有找到匹配的项目"
									: "创建您的第一个项目开始构建应用程序"}
							</p>
						</div>
						{!searchQuery && (
							<Button onClick={onCreateProject}>
								<Plus className="mr-2 h-4 w-4" />
								创建项目
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{projects.map((project) => (
							<Card
								key={project.id}
								className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
								onClick={() => handleProjectClick(project)}
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex-1 space-y-1">
											<CardTitle className="text-lg leading-tight">
												{project.name}
											</CardTitle>
											<div className="flex items-center gap-2">
												<Badge
													variant={
														project.visibility === "PUBLIC"
															? "default"
															: "secondary"
													}
													className="text-xs"
												>
													{project.visibility === "PUBLIC" ? (
														<>
															<Globe className="mr-1 h-3 w-3" />
															公开
														</>
													) : (
														<>
															<Lock className="mr-1 h-3 w-3" />
															私有
														</>
													)}
												</Badge>
												<Badge variant="outline" className="text-xs">
													{getUserRole(project)}
												</Badge>
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
											onClick={(e) => {
												e.stopPropagation();
												// TODO: 显示更多操作菜单
											}}
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</div>
									{project.description && (
										<CardDescription className="line-clamp-2">
											{project.description}
										</CardDescription>
									)}
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{/* 统计信息 */}
										<div className="flex items-center justify-between text-muted-foreground text-sm">
											<div className="flex items-center gap-1">
												<Users className="h-4 w-4" />
												<span>{project._count.members} 成员</span>
											</div>
											<div className="flex items-center gap-1">
												<Calendar className="h-4 w-4" />
												<span>{formatDate(project.updatedAt)}</span>
											</div>
										</div>

										{/* 成员头像 */}
										{project.members.length > 0 && (
											<div className="-space-x-2 flex items-center">
												{project.members.slice(0, 3).map((member) => (
													<div
														key={member.user.id}
														className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-xs"
														title={member.user.name || member.user.email}
													>
														{member.user.name?.[0]?.toUpperCase() ||
															member.user.email?.[0]?.toUpperCase() ||
															"U"}
													</div>
												))}
												{project.members.length > 3 && (
													<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-xs">
														+{project.members.length - 3}
													</div>
												)}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{/* 分页控件 */}
					{pagination.totalPages > 1 && (
						<div className="flex items-center justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePageChange(pagination.page - 1)}
								disabled={!pagination.hasPrev || isLoading}
							>
								<ChevronLeft className="mr-1 h-4 w-4" />
								上一页
							</Button>

							<span className="px-4 text-muted-foreground text-sm">
								第 {pagination.page} 页，共 {pagination.totalPages} 页
							</span>

							<Button
								variant="outline"
								size="sm"
								onClick={() => handlePageChange(pagination.page + 1)}
								disabled={!pagination.hasNext || isLoading}
							>
								下一页
								<ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
