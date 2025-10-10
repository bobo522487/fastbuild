/**
 * 系统健康状态页面
 * 提供完整的系统健康监控和状态可视化
 */

import type { Metadata } from "next";
import { HealthDashboard } from "~/components/health/health-dashboard";
import { DatabaseStatusCompact } from "~/components/status/database-status";

export const metadata: Metadata = {
	title: "系统健康状态 | FastBuild",
	description: "监控系统整体健康状况和性能指标",
};

export default function HealthPage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			{/* 页面头部 */}
			<div className="flex flex-col space-y-2">
				<div className="flex items-center space-x-2">
					<h1 className="font-bold text-3xl">系统健康状态</h1>
					<div className="hidden sm:block">
						<DatabaseStatusCompact />
					</div>
				</div>
				<p className="text-muted-foreground">
					实时监控系统健康状况，包括数据库连接、API服务和系统性能指标
				</p>
			</div>

			{/* 健康状态仪表板 */}
			<HealthDashboard />
		</div>
	);
}
