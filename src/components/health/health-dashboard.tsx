/**
 * 健康状态仪表板组件
 * 集成数据库状态和其他系统健康指标的完整仪表板
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { DatabaseStatus } from "~/components/status/database-status";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";

/**
 * 健康状态类型定义
 */
interface HealthStatus {
	status: "healthy" | "unhealthy" | "degraded";
	timestamp: string;
	uptime: number;
	version: string;
	services: {
		database: {
			status: "connected" | "disconnected" | "error";
			responseTime?: number;
			error?: string;
		};
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
 * 系统日志条目类型
 */
interface SystemLog {
	id: string;
	timestamp: string;
	level: "info" | "warn" | "error";
	message: string;
	source: string;
}

/**
 * 状态颜色映射
 */
const statusColors = {
	healthy: "bg-green-500",
	unhealthy: "bg-red-500",
	degraded: "bg-yellow-500",
};

const statusBadgeVariants = {
	healthy: "default",
	unhealthy: "destructive",
	degraded: "secondary",
} as const;

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (days > 0) {
		return `${days}天 ${hours}小时 ${minutes}分钟`;
	}
	if (hours > 0) {
		return `${hours}小时 ${minutes}分钟`;
	}
	return `${minutes}分钟`;
}

/**
 * 格式化内存使用量
 */
function formatMemoryUsage(bytes: number): string {
	const mb = bytes / 1024 / 1024;
	return `${mb.toFixed(2)} MB`;
}

/**
 * 计算内存使用百分比
 */
function getMemoryUsagePercentage(used: number, total: number): number {
	return Math.round((used / total) * 100);
}

/**
 * 系统概览卡片
 */
function SystemOverview({ healthStatus }: { healthStatus: HealthStatus }) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* 整体状态 */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">系统状态</CardTitle>
					<div
						className={cn(
							"h-3 w-3 rounded-full",
							statusColors[healthStatus.status],
						)}
					/>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">
						{healthStatus.status === "healthy"
							? "健康"
							: healthStatus.status === "unhealthy"
								? "不健康"
								: "降级"}
					</div>
					<p className="text-muted-foreground text-xs">
						运行时间: {formatUptime(healthStatus.uptime)}
					</p>
				</CardContent>
			</Card>

			{/* 数据库状态 */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">数据库</CardTitle>
					<div
						className={cn(
							"h-3 w-3 rounded-full",
							healthStatus.services.database.status === "connected"
								? "bg-green-500"
								: healthStatus.services.database.status === "disconnected"
									? "bg-yellow-500"
									: "bg-red-500",
						)}
					/>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">
						{healthStatus.services.database.status === "connected"
							? "已连接"
							: healthStatus.services.database.status === "disconnected"
								? "未连接"
								: "错误"}
					</div>
					{healthStatus.services.database.responseTime && (
						<p className="text-muted-foreground text-xs">
							响应时间: {healthStatus.services.database.responseTime}ms
						</p>
					)}
				</CardContent>
			</Card>

			{/* API状态 */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">API服务</CardTitle>
					<div
						className={cn(
							"h-3 w-3 rounded-full",
							healthStatus.services.api.status === "healthy"
								? "bg-green-500"
								: "bg-red-500",
						)}
					/>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">
						{healthStatus.services.api.status === "healthy" ? "正常" : "异常"}
					</div>
					<p className="text-muted-foreground text-xs">
						响应时间: {healthStatus.services.api.responseTime}ms
					</p>
				</CardContent>
			</Card>

			{/* 系统版本 */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">版本信息</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="font-bold text-2xl">{healthStatus.version}</div>
					<p className="text-muted-foreground text-xs">
						最后检查: {new Date(healthStatus.timestamp).toLocaleTimeString()}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * 系统指标组件
 */
function SystemMetrics({ healthStatus }: { healthStatus: HealthStatus }) {
	if (!healthStatus.metrics) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>系统指标</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">详细指标不可用</p>
				</CardContent>
			</Card>
		);
	}

	const memoryUsage = getMemoryUsagePercentage(
		healthStatus.metrics.memoryUsage.heapUsed,
		healthStatus.metrics.memoryUsage.heapTotal,
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>系统指标</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 内存使用情况 */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>内存使用</span>
						<span>{memoryUsage}%</span>
					</div>
					<div className="h-2 w-full rounded-full bg-secondary">
						<div
							className={cn(
								"h-2 rounded-full transition-all duration-300",
								memoryUsage > 80
									? "bg-red-500"
									: memoryUsage > 60
										? "bg-yellow-500"
										: "bg-green-500",
							)}
							style={{ width: `${memoryUsage}%` }}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						{formatMemoryUsage(healthStatus.metrics.memoryUsage.heapUsed)} /{" "}
						{formatMemoryUsage(healthStatus.metrics.memoryUsage.heapTotal)}
					</p>
				</div>

				{/* 其他系统信息 */}
				<div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
					<div>
						<span className="font-medium">平台:</span>{" "}
						{healthStatus.metrics.platform}
					</div>
					<div>
						<span className="font-medium">Node.js:</span>{" "}
						{healthStatus.metrics.nodeVersion}
					</div>
					<div>
						<span className="font-medium">RSS内存:</span>{" "}
						{formatMemoryUsage(healthStatus.metrics.memoryUsage.rss)}
					</div>
					<div>
						<span className="font-medium">外部内存:</span>{" "}
						{formatMemoryUsage(healthStatus.metrics.memoryUsage.external)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * 模拟系统日志（实际应用中应从日志服务获取）
 */
function getMockSystemLogs(): SystemLog[] {
	return [
		{
			id: "1",
			timestamp: new Date(Date.now() - 60000).toISOString(),
			level: "info",
			message: "数据库连接检查完成",
			source: "health-check",
		},
		{
			id: "2",
			timestamp: new Date(Date.now() - 120000).toISOString(),
			level: "info",
			message: "API健康检查通过",
			source: "health-check",
		},
		{
			id: "3",
			timestamp: new Date(Date.now() - 300000).toISOString(),
			level: "warn",
			message: "内存使用率超过60%",
			source: "monitor",
		},
	];
}

/**
 * 系统日志组件
 */
function SystemLogs() {
	const [logs] = useState<SystemLog[]>(getMockSystemLogs());

	const getLogLevelColor = (level: SystemLog["level"]) => {
		switch (level) {
			case "error":
				return "bg-red-500";
			case "warn":
				return "bg-yellow-500";
			default:
				return "bg-blue-500";
		}
	};

	const getLogLevelVariant = (level: SystemLog["level"]) => {
		switch (level) {
			case "error":
				return "destructive";
			case "warn":
				return "secondary";
			default:
				return "default";
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>系统日志</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="max-h-64 space-y-3 overflow-y-auto">
					{logs.length === 0 ? (
						<p className="text-muted-foreground">暂无日志记录</p>
					) : (
						logs.map((log) => (
							<div key={log.id} className="flex items-start space-x-3 text-sm">
								<div
									className={cn(
										"mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
										getLogLevelColor(log.level),
									)}
								/>
								<div className="min-w-0 flex-1">
									<div className="flex items-center space-x-2">
										<Badge variant={getLogLevelVariant(log.level)}>
											{log.level.toUpperCase()}
										</Badge>
										<span className="font-mono text-muted-foreground text-xs">
											{log.source}
										</span>
										<span className="text-muted-foreground text-xs">
											{new Date(log.timestamp).toLocaleTimeString()}
										</span>
									</div>
									<p className="break-words text-muted-foreground">
										{log.message}
									</p>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * 主要的健康状态仪表板
 */
export function HealthDashboard() {
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

	return (
		<div className="space-y-6">
			{/* 页面头部 */}
			<div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
				<div>
					<h2 className="font-bold text-2xl">系统健康状态</h2>
					<p className="text-muted-foreground">
						监控系统整体健康状况和性能指标
					</p>
				</div>
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
			</div>

			{/* 错误提示 */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* 加载状态 */}
			{loading && !healthStatus && (
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						{[...Array(4)].map((_, i) => (
							<Card key={`skeleton-${i}`}>
								<CardHeader className="pb-2">
									<div className="h-4 w-20 animate-pulse rounded bg-muted" />
								</CardHeader>
								<CardContent>
									<div className="mb-2 h-8 w-16 animate-pulse rounded bg-muted" />
									<div className="h-3 w-24 animate-pulse rounded bg-muted" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* 健康状态内容 */}
			{healthStatus && (
				<Tabs defaultValue="overview" className="space-y-4">
					<TabsList>
						<TabsTrigger value="overview">概览</TabsTrigger>
						<TabsTrigger value="database">数据库</TabsTrigger>
						<TabsTrigger value="metrics">系统指标</TabsTrigger>
						<TabsTrigger value="logs">系统日志</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
						<SystemOverview healthStatus={healthStatus} />
					</TabsContent>

					<TabsContent value="database" className="space-y-4">
						<DatabaseStatus />
					</TabsContent>

					<TabsContent value="metrics" className="space-y-4">
						<SystemMetrics healthStatus={healthStatus} />
					</TabsContent>

					<TabsContent value="logs" className="space-y-4">
						<SystemLogs />
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
