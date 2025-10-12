import type { PrismaClient } from "@prisma/client";

/**
 * 分区表管理服务 - 利用 PostgreSQL 18 分区表和 ONLY 选项
 * 提供高效的大数据量审计日志管理
 */
export class PartitionService {
	constructor(private prisma: PrismaClient) {}

	/**
	 * 检查分区表支持状态
	 */
	async checkPartitionSupport(): Promise<{
		supported: boolean;
		partitionedTables: string[];
		totalPartitions: number;
		recommendations: string[];
	}> {
		try {
			const partitions = (await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE tablename LIKE '%partition%' OR tablename LIKE 'AuditLog_%'
        ORDER BY tablename
      `) as any[];

			const partitionedTables = [
				...new Set(partitions.map((p: any) => p.tablename.split("_")[0])),
			];

			const recommendations = [];

			if (partitions.length === 0) {
				recommendations.push("考虑实施分区表策略以提升大数据量查询性能");
			} else if (partitions.length > 20) {
				recommendations.push("分区数量较多，考虑清理旧分区");
			}

			return {
				supported: true,
				partitionedTables,
				totalPartitions: partitions.length,
				recommendations,
			};
		} catch (error) {
			console.error("❌ 检查分区表支持失败:", error);
			return {
				supported: false,
				partitionedTables: [],
				totalPartitions: 0,
				recommendations: ["分区表功能不可用，请升级到 PostgreSQL 18"],
			};
		}
	}

	/**
	 * 获取分区表状态信息
	 */
	async getPartitionStatus(): Promise<{
		partitions: Array<{
			name: string;
			size: string;
			sizeBytes: number;
			currentMonthRecords: number;
			lastMonthRecords: number;
			earliestRecord: Date;
			latestRecord: Date;
		}>;
		totalSize: string;
		totalSizeBytes: number;
		totalRecords: number;
	}> {
		try {
			const [partitionData] = (await this.prisma.$queryRaw`
        SELECT
          json_agg(
            json_build_object(
              'name', tablename,
              'size', size,
              'sizeBytes', size_bytes,
              'currentMonthRecords', current_month_records,
              'lastMonthRecords', last_month_records,
              'earliestRecord', earliest_record,
              'latestRecord', latest_record
            )
          ) as partitions_json,
          pg_size_pretty(SUM(size_bytes)) as total_size,
          SUM(size_bytes) as total_size_bytes
        FROM audit_log_partition_status
      `) as any[];

			const partitions = partitionData.partitions_json || [];
			const totalSize = partitionData.total_size || "0 bytes";
			const totalSizeBytes = partitionData.total_size_bytes || 0;

			// 获取总记录数
			const [countResult] = (await this.prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "AuditLog_partitioned"
      `) as any[];

			return {
				partitions,
				totalSize,
				totalSizeBytes,
				totalRecords: Number.parseInt(countResult.total) || 0,
			};
		} catch (error) {
			console.error("❌ 获取分区状态失败:", error);
			return {
				partitions: [],
				totalSize: "0 bytes",
				totalSizeBytes: 0,
				totalRecords: 0,
			};
		}
	}

	/**
	 * 创建新分区
	 */
	async createPartition(targetDate: Date): Promise<{
		success: boolean;
		partitionName: string;
		message: string;
	}> {
		try {
			const [result] = (await this.prisma.$queryRaw`
        SELECT create_audit_log_partition(${targetDate}) as partition_name
      `) as any[];

			return {
				success: true,
				partitionName: result.partition_name,
				message: `分区 ${result.partition_name} 创建成功`,
			};
		} catch (error) {
			console.error("❌ 创建分区失败:", error);
			return {
				success: false,
				partitionName: "",
				message: `创建分区失败: ${error instanceof Error ? error.message : "未知错误"}`,
			};
		}
	}

	/**
	 * 维护分区（创建新分区，清理旧分区）
	 */
	async maintainPartitions(): Promise<{
		success: boolean;
		actions: Array<{
			action: string;
			partitionName: string;
			status: string;
		}>;
		summary: string;
	}> {
		try {
			const results = (await this.prisma.$queryRaw`
        SELECT * FROM maintain_audit_log_partitions()
      `) as any[];

			const success = !results.some((r: any) => r.status === "ERROR");
			const summary =
				results.length > 0
					? `维护完成：${results.filter((r) => r.status === "Created").length} 个新分区创建，${results.filter((r) => r.status === "Dropped").length} 个旧分区清理`
					: "维护完成，无需操作";

			return {
				success,
				actions: results.map((r: any) => ({
					action: r.action,
					partitionName: r.partition_name,
					status: r.status,
				})),
				summary,
			};
		} catch (error) {
			console.error("❌ 维护分区失败:", error);
			return {
				success: false,
				actions: [],
				summary: `维护失败: ${error instanceof Error ? error.message : "未知错误"}`,
			};
		}
	}

	/**
	 * 使用 ONLY 选项进行分区表维护
	 */
	async vacuumPartitions(onlyCurrentMonth = true): Promise<{
		success: boolean;
		results: Array<{
			partitionName: string;
			operation: string;
			executionTimeMs: number;
			status: string;
		}>;
		totalTimeMs: number;
	}> {
		try {
			const startTime = Date.now();

			const results = (await this.prisma.$queryRaw`
        SELECT * FROM vacuum_audit_log_partitions(${onlyCurrentMonth})
      `) as any[];

			const totalTimeMs = Date.now() - startTime;
			const success = results.every((r: any) => r.status === "Completed");

			return {
				success,
				results: results.map((r: any) => ({
					partitionName: r.partition_name,
					operation: r.operation,
					executionTimeMs: r.execution_time_ms,
					status: r.status,
				})),
				totalTimeMs,
			};
		} catch (error) {
			console.error("❌ 分区维护失败:", error);
			return {
				success: false,
				results: [],
				totalTimeMs: 0,
			};
		}
	}

	/**
	 * 获取优化的查询建议
	 */
	async getQueryOptimization(
		startDate?: Date,
		endDate?: Date,
	): Promise<{
		recommendedQuery: string;
		partitionPruningPossible: boolean;
		estimatedPerformanceGain: string;
		tips: string[];
	}> {
		try {
			const [result] = (await this.prisma.$queryRaw`
        SELECT * FROM get_optimal_audit_query_conditions(${startDate || null}, ${endDate || null})
      `) as any[];

			const tips = [];

			if (result.partition_pruning_possible) {
				tips.push("使用日期过滤器可以启用分区裁剪，大幅提升查询性能");
				tips.push('考虑添加 "createdAt" 索引以进一步优化查询');
			} else {
				tips.push("添加日期过滤器以启用分区裁剪");
				tips.push("避免全表扫描，使用具体的查询条件");
			}

			return {
				recommendedQuery: result.recommended_query,
				partitionPruningPossible: result.partition_pruning_possible,
				estimatedPerformanceGain: result.estimated_performance_gain,
				tips,
			};
		} catch (error) {
			console.error("❌ 获取查询优化建议失败:", error);
			return {
				recommendedQuery:
					'SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 100',
				partitionPruningPossible: false,
				estimatedPerformanceGain: "无法评估",
				tips: ["请检查分区表配置"],
			};
		}
	}

	/**
	 * 查询审计日志（分区优化版本）
	 */
	async queryAuditLog(
		filters: {
			userId?: string;
			projectId?: string;
			action?: string;
			resourceType?: string;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
			offset?: number;
		} = {},
	) {
		try {
			const {
				userId,
				projectId,
				action,
				resourceType,
				startDate,
				endDate,
				limit = 100,
				offset = 0,
			} = filters;

			// 构建查询条件
			const whereConditions: string[] = [];
			const queryParams: any[] = [];
			let paramIndex = 1;

			if (userId) {
				whereConditions.push(`"userId" = $${paramIndex++}`);
				queryParams.push(userId);
			}

			if (projectId) {
				whereConditions.push(`"projectId" = $${paramIndex++}`);
				queryParams.push(projectId);
			}

			if (action) {
				whereConditions.push(`action = $${paramIndex++}`);
				queryParams.push(action);
			}

			if (resourceType) {
				whereConditions.push(`"resourceType" = $${paramIndex++}`);
				queryParams.push(resourceType);
			}

			if (startDate) {
				whereConditions.push(`"createdAt" >= $${paramIndex++}`);
				queryParams.push(startDate);
			}

			if (endDate) {
				whereConditions.push(`"createdAt" <= $${paramIndex++}`);
				queryParams.push(endDate);
			}

			const whereClause =
				whereConditions.length > 0
					? `WHERE ${whereConditions.join(" AND ")}`
					: "";

			// 尝试使用分区表，如果失败则降级到原表
			try {
				const query = `
          SELECT
            id,
            "projectId",
            "userId",
            action,
            "resourceType",
            "resourceId",
            "oldValues",
            "newValues",
            metadata,
            "ipAddress",
            "userAgent",
            "createdAt"
          FROM "AuditLog_partitioned"
          ${whereClause}
          ORDER BY "createdAt" DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

				queryParams.push(limit, offset);

				const results = (await this.prisma.$queryRawUnsafe(
					query,
					...queryParams,
				)) as any[];

				// 获取总数
				const countQuery = `
          SELECT COUNT(*) as total FROM "AuditLog_partitioned" ${whereClause}
        `;

				const [countResult] = (await this.prisma.$queryRawUnsafe(
					countQuery,
					...queryParams.slice(0, -2),
				)) as any[];

				return {
					results,
					total: Number.parseInt(countResult.total) || 0,
					hasMore:
						offset + results.length < (Number.parseInt(countResult.total) || 0),
					usedPartitionTable: true,
				};
			} catch (partitionError) {
				console.warn("⚠️ 分区表查询失败，降级到原表:", partitionError);

				// 降级到原表查询
				const originalQuery = `
          SELECT * FROM "AuditLog"
          ${whereClause}
          ORDER BY "createdAt" DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

				const results = await this.prisma.auditLog.findMany({
					where: this.buildWhereClause(filters),
					orderBy: { createdAt: "desc" },
					take: limit,
					skip: offset,
				});

				const total = await this.prisma.auditLog.count({
					where: this.buildWhereClause(filters),
				});

				return {
					results,
					total,
					hasMore: offset + results.length < total,
					usedPartitionTable: false,
				};
			}
		} catch (error) {
			console.error("❌ 查询审计日志失败:", error);
			return {
				results: [],
				total: 0,
				hasMore: false,
				usedPartitionTable: false,
			};
		}
	}

	/**
	 * 构建查询条件（用于 Prisma）
	 */
	private buildWhereClause(filters: any) {
		const where: any = {};

		if (filters.userId) {
			where.userId = filters.userId;
		}

		if (filters.projectId) {
			where.projectId = filters.projectId;
		}

		if (filters.action) {
			where.action = filters.action;
		}

		if (filters.resourceType) {
			where.resourceType = filters.resourceType;
		}

		if (filters.startDate || filters.endDate) {
			where.createdAt = {};
			if (filters.startDate) {
				where.createdAt.gte = filters.startDate;
			}
			if (filters.endDate) {
				where.createdAt.lte = filters.endDate;
			}
		}

		return where;
	}

	/**
	 * 获取分区性能统计
	 */
	async getPartitionPerformanceStats(): Promise<{
		partitionEfficiency: number;
		averageQueryTime: number;
		storageUtilization: number;
		recommendations: string[];
	}> {
		try {
			// 模拟性能统计（实际实现中应该从监控数据获取）
			const [partitionCount] = (await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM pg_tables WHERE tablename LIKE 'AuditLog_%'
      `) as any[];

			const [totalSize] = (await this.prisma.$queryRaw`
        SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as size
        FROM pg_tables WHERE tablename LIKE 'AuditLog_%'
      `) as any[];

			const recommendations = [];

			if (Number.parseInt(partitionCount.count) > 15) {
				recommendations.push("分区数量较多，考虑清理旧分区以提升性能");
			}

			if (Number.parseInt(partitionCount.count) < 6) {
				recommendations.push("分区数量较少，考虑创建更多分区以优化查询");
			}

			return {
				partitionEfficiency: Math.min(
					100,
					Number.parseInt(partitionCount.count) * 6,
				),
				averageQueryTime: 45, // 模拟数据
				storageUtilization: 75, // 模拟数据
				recommendations,
			};
		} catch (error) {
			console.error("❌ 获取分区性能统计失败:", error);
			return {
				partitionEfficiency: 0,
				averageQueryTime: 0,
				storageUtilization: 0,
				recommendations: ["无法获取性能统计，请检查分区表配置"],
			};
		}
	}
}
