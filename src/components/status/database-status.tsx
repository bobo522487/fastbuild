/**
 * 数据库连接状态显示组件
 * 提供实时的数据库连接状态监控和可视化
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

/**
 * 数据库状态类型定义
 */
interface DatabaseStatus {
	status: "connected" | "disconnected" | "error";
	responseTime?: number;
	error?: string;
	lastChecked: string;
}

interface HealthStatus {
	status: "healthy" | "unhealthy" | "degraded";
	timestamp: string;
	uptime: number;
	version: string;
	services: {
		database: DatabaseStatus;
		api: {
			status: "healthy" | "unhealthy";
			responseTime: number;
		};
	};
	metrics?: {
		memoryUsage: NodeJS.MemoryUsage;
		platform: string;
		nodeVersion: string;
	};
}

/**
 * 状态颜色映射
 */
const statusColors = {
	connected: "bg-green-500",
	disconnected: "bg-yellow-500",
	error: "bg-red-500",
	healthy: "bg-green-500",
	unhealthy: "bg-red-500",
	degraded: "bg-yellow-500",
};

const statusBadgeVariants = {
	connected: "default",
	disconnected: "secondary",
	error: "destructive",
	healthy: "default",
	unhealthy: "destructive",
	degraded: "secondary",
} as const;

/**
 * 格式化响应时间
 */
function formatResponseTime(ms?: number): string {
	if (ms === undefined) return "N/A";
	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}d ${hours}h ${minutes}m`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

/**
 * 格式化内存使用量
 */
function formatMemoryUsage(bytes: number): string {
	const mb = bytes / 1024 / 1024;
	return `${mb.toFixed(2)} MB`;
}

/**
 * 数据库状态指示器组件
 */
function DatabaseStatusIndicator({
	status,
}: { status: DatabaseStatus["status"] }) {
	return (
		<div className="flex items-center space-x-2">
			<div className={cn("h-3 w-3 rounded-full", statusColors[status])} />
			<Badge variant={statusBadgeVariants[status]}>
				{status === "connected"
					? "已连接"
					: status === "disconnected"
						? "未连接"
						: "错误"}
			</Badge>
		</div>
	);
}

/**
 * 主要的数据库状态组件
 */
export function DatabaseStatus() {
	const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

	/**
	 * 获取健康状态数据
	 */
	const fetchHealthStatus = useCallback(async () => {
		try {
			setError(null);
			const response = await fetch("/api/health?detailed=true");

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			if (data.success) {
				setHealthStatus(data.data);
			} else {
				throw new Error(data.error?.message || "获取健康状态失败");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "获取健康状态时发生错误");
			console.error("Failed to fetch health status:", err);
		} finally {
			setLoading(false);
			setLastRefresh(new Date());
		}
	}, []);

	/**
	 * 手动刷新状态
	 */
	const handleRefresh = () => {
		setLoading(true);
		fetchHealthStatus();
	};

	/**
	 * 自动刷新状态（每30秒）
	 */
	useEffect(() => {
		fetchHealthStatus();

		const interval = setInterval(fetchHealthStatus, 30000);
		return () => clearInterval(interval);
	}, [fetchHealthStatus]);

	if (loading && !healthStatus) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>数据库状态</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-24" />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* 错误提示 */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* 主要状态卡片 */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>数据库状态</CardTitle>
					<div className="flex items-center space-x-2">
						<span className="text-muted-foreground text-sm">
							最后更新: {lastRefresh.toLocaleTimeString()}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRefresh}
							disabled={loading}
						>
							刷新
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{healthStatus && (
						<>
							{/* 数据库连接状态 */}
							<div className="space-y-2">
								<h4 className="font-medium">连接状态</h4>
								<DatabaseStatusIndicator
									status={healthStatus.services.database.status}
								/>
								{healthStatus.services.database.responseTime && (
									<p className="text-muted-foreground text-sm">
										响应时间:{" "}
										{formatResponseTime(
											healthStatus.services.database.responseTime,
										)}
									</p>
								)}
								{healthStatus.services.database.error && (
									<Alert variant="destructive">
										<AlertDescription>
											{healthStatus.services.database.error}
										</AlertDescription>
									</Alert>
								)}
							</div>

							{/* 系统整体状态 */}
							<div className="space-y-2">
								<h4 className="font-medium">系统状态</h4>
								<div className="flex items-center space-x-2">
									<div
										className={cn(
											"h-3 w-3 rounded-full",
											statusColors[healthStatus.status],
										)}
									/>
									<Badge variant={statusBadgeVariants[healthStatus.status]}>
										{healthStatus.status === "healthy"
											? "健康"
											: healthStatus.status === "unhealthy"
												? "不健康"
												: "降级"}
									</Badge>
								</div>
								<p className="text-muted-foreground text-sm">
									运行时间: {formatUptime(healthStatus.uptime)}
								</p>
								<p className="text-muted-foreground text-sm">
									版本: {healthStatus.version}
								</p>
							</div>

							{/* 详细系统指标 */}
							{healthStatus.metrics && (
								<div className="space-y-2">
									<h4 className="font-medium">系统指标</h4>
									<div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
										<div>
											<span className="font-medium">内存使用:</span>{" "}
											{formatMemoryUsage(
												healthStatus.metrics.memoryUsage.heapUsed,
											)}{" "}
											/
											{formatMemoryUsage(
												healthStatus.metrics.memoryUsage.heapTotal,
											)}
										</div>
										<div>
											<span className="font-medium">平台:</span>{" "}
											{healthStatus.metrics.platform}
										</div>
										<div>
											<span className="font-medium">Node.js:</span>{" "}
											{healthStatus.metrics.nodeVersion}
										</div>
										<div>
											<span className="font-medium">API响应时间:</span>{" "}
											{formatResponseTime(
												healthStatus.services.api.responseTime,
											)}
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * 紧凑型数据库状态指示器
 * 用于仪表板或侧边栏显示
 */
export function DatabaseStatusCompact() {
	const [dbStatus, setDbStatus] =
		useState<DatabaseStatus["status"]>("disconnected");
	const [responseTime, setResponseTime] = useState<number | undefined>();

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const response = await fetch("/api/health");
				if (response.ok) {
					const data = await response.json();
					if (data.success) {
						setDbStatus(data.data.services.database.status);
						setResponseTime(data.data.services.database.responseTime);
					}
				}
			} catch (error) {
				setDbStatus("error");
			}
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 10000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex items-center space-x-2">
			<div className={cn("h-2 w-2 rounded-full", statusColors[dbStatus])} />
			<span className="text-sm">
				{dbStatus === "connected"
					? "数据库已连接"
					: dbStatus === "disconnected"
						? "数据库未连接"
						: "数据库错误"}
			</span>
			{responseTime && (
				<span className="text-muted-foreground text-xs">
					({formatResponseTime(responseTime)})
				</span>
			)}
		</div>
	);
}
