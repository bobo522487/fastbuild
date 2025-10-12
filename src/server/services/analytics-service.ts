import type { PrismaClient } from "@prisma/client";

/**
 * 高级统计分析服务 - 利用 PostgreSQL 18 新聚合函数
 * 提供深度的数据洞察和业务智能分析
 */
export class AnalyticsService {
	constructor(private prisma: PrismaClient) {}

	/**
	 * 获取用户项目统计（使用复合类型聚合）
	 */
	async getUserProjectStats(userId?: string) {
		try {
			const whereClause = userId ? `WHERE u.id = ${userId}` : "";

			const query = `
        SELECT
          u.id as "userId",
          u.name as "userName",
          u.email as "userEmail",
          (stats).*
        FROM project_statistics_enhanced
        JOIN "User" u ON u.id = user_id
        ${whereClause}
        ORDER BY (stats).total_projects DESC, (stats).total_applications DESC
      `;

			const results = (await this.prisma.$queryRawUnsafe(query)) as any[];

			return results.map((row: any) => ({
				userId: row.userId,
				userName: row.userName,
				userEmail: row.userEmail,
				stats: {
					totalProjects: row.total_projects,
					totalApplications: row.total_applications,
					totalDeployments: row.total_deployments,
					successfulDeployments: row.successful_deployments,
					failedDeployments: row.failed_deployments,
					avgBuildTime: Number.parseFloat(row.avg_build_time) || 0,
					successRate: Number.parseFloat(row.success_rate) || 0,
					totalViews: row.total_views,
					lastActivity: row.last_activity,
				},
			}));
		} catch (error) {
			console.error("❌ 获取用户项目统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取用户参与度分析
	 */
	async getUserEngagementAnalysis() {
		try {
			const results = (await this.prisma.$queryRaw`
        SELECT * FROM analyze_user_engagement()
        ORDER BY engagement_score DESC
        LIMIT 50
      `) as any[];

			return results.map((row: any) => ({
				userId: row.user_id,
				engagementScore: Number.parseFloat(row.engagement_score),
				activityPattern: row.activity_pattern,
				preferredActions: row.preferred_actions || [],
			}));
		} catch (error) {
			console.error("❌ 获取用户参与度分析失败:", error);
			return [];
		}
	}

	/**
	 * 获取项目健康度仪表板
	 */
	async getProjectHealthDashboard(projectId?: string) {
		try {
			const whereClause = projectId ? `WHERE project_id = ${projectId}` : "";

			const query = `
        SELECT
          project_id,
          project_name,
          (health).*
        FROM project_health_dashboard
        ${whereClause}
        ORDER BY (health).overall_health DESC
      `;

			const results = (await this.prisma.$queryRawUnsafe(query)) as any[];

			return results.map((row: any) => ({
				projectId: row.project_id,
				projectName: row.project_name,
				health: {
					completenessScore: Number.parseFloat(row.completeness_score) || 0,
					activityScore: Number.parseFloat(row.activity_score) || 0,
					collaborationScore: Number.parseFloat(row.collaboration_score) || 0,
					overallHealth: Number.parseFloat(row.overall_health) || 0,
					riskFactors: row.risk_factors || [],
					recommendations: row.recommendations || [],
				},
			}));
		} catch (error) {
			console.error("❌ 获取项目健康度仪表板失败:", error);
			return [];
		}
	}

	/**
	 * 获取部署统计分析
	 */
	async getDeploymentStatistics(days = 30) {
		try {
			const [stats] = (await this.prisma.$queryRaw`
        SELECT (stats).* FROM deployment_statistics_view
      `) as any[];

			// 获取时间序列数据
			const timeSeriesData = (await this.prisma.$queryRaw`
        SELECT * FROM time_series_aggregate(
          'AppDeployment',
          'deployedAt',
          'day',
          ${days}
        )
      `) as any[];

			// 获取失败原因统计
			const failureReasons = (await this.prisma.$queryRaw`
        SELECT
          'Build Error' as reason,
          COUNT(*) as count
        FROM "AppDeployment"
        WHERE status = 'FAILED'
          AND "deployedAt" >= NOW() - INTERVAL '${days} days'
          AND "buildLog" ILIKE '%error%'
        GROUP BY reason

        UNION ALL

        SELECT
          'Timeout' as reason,
          COUNT(*) as count
        FROM "AppDeployment"
        WHERE status = 'FAILED'
          AND "deployedAt" >= NOW() - INTERVAL '${days} days'
          AND "buildTime" > 300000 -- 5分钟
        GROUP BY reason

        UNION ALL

        SELECT
          'Configuration Error' as reason,
          COUNT(*) as count
        FROM "AppDeployment"
        WHERE status = 'FAILED'
          AND "deployedAt" >= NOW() - INTERVAL '${days} days'
        GROUP BY reason
        ORDER BY count DESC
      `) as any[];

			return {
				summary: stats
					? {
							totalDeployments: stats.total_deployments,
							successfulDeployments: stats.successful_deployments,
							failedDeployments: stats.failed_deployments,
							avgBuildTime: Number.parseFloat(stats.avg_build_time) || 0,
							avgDeployTime: Number.parseFloat(stats.avg_deploy_time) || 0,
							successRate: Number.parseFloat(stats.success_rate) || 0,
							mostCommonFailureReason: stats.most_common_failure_reason,
							deploymentFrequency:
								Number.parseFloat(stats.deployment_frequency) || 0,
							peakDeploymentHour: stats.peak_deployment_hour,
						}
					: null,
				timeSeries: timeSeriesData.map((row: any) => ({
					period: row.period,
					count: Number.parseInt(row.count),
					avgValue: Number.parseFloat(row.avg_value) || 0,
					maxValue: Number.parseFloat(row.max_value) || 0,
					minValue: Number.parseFloat(row.min_value) || 0,
				})),
				failureReasons: failureReasons.map((row: any) => ({
					reason: row.reason,
					count: Number.parseInt(row.count),
				})),
			};
		} catch (error) {
			console.error("❌ 获取部署统计失败:", error);
			return {
				summary: null,
				timeSeries: [],
				failureReasons: [],
			};
		}
	}

	/**
	 * 获取数据使用统计
	 */
	async getDataUsageStatistics(projectId?: string) {
		try {
			const whereClause = projectId ? `WHERE "projectId" = ${projectId}` : "";

			const query = `
        SELECT
          project_id,
          project_name,
          (usage).*
        FROM data_usage_statistics
        ${whereClause}
        ORDER BY (usage).total_tables DESC, (usage).total_columns DESC
      `;

			const results = (await this.prisma.$queryRawUnsafe(query)) as any[];

			return results.map((row: any) => ({
				projectId: row.project_id,
				projectName: row.project_name,
				usage: {
					totalTables: row.total_tables,
					totalColumns: row.total_columns,
					totalViews: row.total_views,
					totalRecordsEstimated: row.total_records_estimated,
					storageUsedMB: Number.parseFloat(row.storage_used_mb) || 0,
					mostActiveTable: row.most_active_table,
					avgColumnsPerTable: Number.parseFloat(row.avg_columns_per_table) || 0,
					dataGrowthRate: Number.parseFloat(row.data_growth_rate) || 0,
				},
			}));
		} catch (error) {
			console.error("❌ 获取数据使用统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取数据质量分析
	 */
	async getDataQualityAnalysis(projectId: string) {
		try {
			const results = (await this.prisma.$queryRaw`
        SELECT * FROM analyze_data_quality(${projectId})
      `) as any[];

			return results.map((row: any) => ({
				tableName: row.table_name,
				completenessScore: Number.parseFloat(row.completeness_score) || 0,
				consistencyScore: Number.parseFloat(row.consistency_score) || 0,
				dataIssues: row.data_issues || [],
			}));
		} catch (error) {
			console.error("❌ 获取数据质量分析失败:", error);
			return [];
		}
	}

	/**
	 * 获取平台整体统计
	 */
	async getPlatformOverview() {
		try {
			const [userStats, projectStats, appStats, deploymentStats, dataStats] =
				await Promise.all([
					// 用户统计
					this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total_users,
            COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
            COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
            COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_week
          FROM "User"
        ` as any[],

					// 项目统计
					this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total_projects,
            COUNT(CASE WHEN visibility = 'PUBLIC' THEN 1 END) as public_projects,
            COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as new_projects_week,
            COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_projects_week
          FROM "Project"
          WHERE "deletedAt" IS NULL
        ` as any[],

					// 应用统计
					this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total_applications,
            COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as new_applications_week,
            COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_applications_week
          FROM "Application"
        ` as any[],

					// 部署统计
					this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total_deployments,
            COUNT(CASE WHEN status = 'DEPLOYED' THEN 1 END) as successful_deployments,
            COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as deployments_week,
            AVG("buildTime") as avg_build_time
          FROM "AppDeployment"
        ` as any[],

					// 数据统计
					this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total_tables,
            COUNT(*) as total_columns
          FROM "DataTable"
          WHERE "deletedAt" IS NULL
        ` as any[],
				]);

			// 获取最近的审计活动
			const recentActivity = (await this.prisma.$queryRaw`
        SELECT
          action,
          resourceType,
          COUNT(*) as count
        FROM "AuditLog"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY action, resourceType
        ORDER BY count DESC
        LIMIT 10
      `) as any[];

			return {
				users: userStats[0] || {},
				projects: projectStats[0] || {},
				applications: appStats[0] || {},
				deployments: deploymentStats[0] || {},
				data: dataStats[0] || {},
				recentActivity: recentActivity.map((row: any) => ({
					action: row.action,
					resourceType: row.resourceType,
					count: Number.parseInt(row.count),
				})),
				generatedAt: new Date(),
			};
		} catch (error) {
			console.error("❌ 获取平台概览失败:", error);
			return {
				users: {},
				projects: {},
				applications: {},
				deployments: {},
				data: {},
				recentActivity: [],
				generatedAt: new Date(),
			};
		}
	}

	/**
	 * 获取增长趋势分析
	 */
	async getGrowthTrends(days = 90) {
		try {
			const [userGrowth, projectGrowth, appGrowth] = await Promise.all([
				this.prisma.$queryRaw`
          SELECT * FROM time_series_aggregate(
            'User',
            'createdAt',
            'week',
            ${days}
          )
        ` as any[],

				this.prisma.$queryRaw`
          SELECT * FROM time_series_aggregate(
            'Project',
            'createdAt',
            'week',
            ${days}
          )
        ` as any[],

				this.prisma.$queryRaw`
          SELECT * FROM time_series_aggregate(
            'Application',
            'createdAt',
            'week',
            ${days}
          )
        ` as any[],
			]);

			return {
				users: userGrowth.map((row: any) => ({
					period: row.period,
					newUsers: Number.parseInt(row.count),
					avgTimeBetweenUsers: Number.parseFloat(row.avg_value) || 0,
				})),
				projects: projectGrowth.map((row: any) => ({
					period: row.period,
					newProjects: Number.parseInt(row.count),
					avgTimeBetweenProjects: Number.parseFloat(row.avg_value) || 0,
				})),
				applications: appGrowth.map((row: any) => ({
					period: row.period,
					newApplications: Number.parseInt(row.count),
					avgTimeBetweenApplications: Number.parseFloat(row.avg_value) || 0,
				})),
			};
		} catch (error) {
			console.error("❌ 获取增长趋势失败:", error);
			return {
				users: [],
				projects: [],
				applications: [],
			};
		}
	}

	/**
	 * 获取性能基准测试
	 */
	async getPerformanceBenchmarks() {
		try {
			const benchmarks = (await this.prisma.$queryRaw`
        -- 查询性能基准
        SELECT
          'Project Query Performance' as test_name,
          EXTRACT(MILLISECONDS FROM (
            SELECT NOW()
          )) as start_time,
          EXTRACT(MILLISECONDS FROM (
            SELECT * FROM "Project" LIMIT 100
          )) as end_time
      `) as any[];

			// 这里可以添加更多的性能基准测试

			return {
				benchmarks: benchmarks.map((row: any) => ({
					testName: row.test_name,
					executionTime: 0, // 实际实现中需要计算差值
				})),
				recommendations: [
					"为频繁查询的字段添加索引",
					"考虑分区表处理大数据量",
					"使用复合类型聚合减少数据传输",
					"优化查询性能和索引策略",
				],
			};
		} catch (error) {
			console.error("❌ 获取性能基准失败:", error);
			return {
				benchmarks: [],
				recommendations: [],
			};
		}
	}
}
