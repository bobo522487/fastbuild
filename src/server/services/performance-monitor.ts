import type { PrismaClient } from "@prisma/client";

/**
 * PostgreSQL 18 性能监控服务
 * 利用新的统计视图提供详细的数据库性能数据
 */
export class PerformanceMonitorService {
	constructor(private prisma: PrismaClient) {}

	/**
	 * 启用 PostgreSQL 18 的增强统计选项
	 */
	async enableEnhancedStatistics(): Promise<void> {
		try {
			await this.prisma.$executeRaw`ALTER SYSTEM SET track_wal_io_timing = on`;
			await this.prisma
				.$executeRaw`ALTER SYSTEM SET track_cost_delay_timing = on`;
			await this.prisma.$executeRaw`SELECT pg_reload_conf()`;
			console.log("✅ PostgreSQL 18 增强统计已启用");
		} catch (error) {
			console.error("❌ 启用增强统计失败:", error);
			throw error;
		}
	}

	/**
	 * 获取 I/O 统计信息
	 */
	async getIOStatistics(): Promise<any[]> {
		try {
			const result = (await this.prisma.$queryRaw`
        SELECT
          object,
          reads,
          read_time,
          writes,
          write_time,
          extend_time,
          fsync_calls,
          fsync_time,
          total_read_time,
          total_write_time,
          total_extend_time,
          total_fsync_time
        FROM pg_stat_io
        WHERE object IN ('relation', 'temp file')
        ORDER BY reads DESC, writes DESC
        LIMIT 10
      `) as any[];

			return result;
		} catch (error) {
			console.error("❌ 获取 I/O 统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取 WAL 统计信息
	 */
	async getWALStatistics(): Promise<any> {
		try {
			const [walStats] = (await this.prisma.$queryRaw`
        SELECT
          wal_records,
          wal_fpi,
          wal_bytes,
          wal_buffers_full,
          wal_write_time,
          wal_sync_time,
          wal_write_time_ms,
          wal_sync_time_ms
        FROM pg_stat_wal
      `) as any[];

			return walStats || {};
		} catch (error) {
			console.error("❌ 获取 WAL 统计失败:", error);
			return {};
		}
	}

	/**
	 * 获取检查点统计信息
	 */
	async getCheckpointStatistics(): Promise<any> {
		try {
			const [checkpointStats] = (await this.prisma.$queryRaw`
        SELECT
          num_timed,
          num_requested,
          checkpoint_write_time,
          checkpoint_sync_time,
          checkpoint_write_time_ms,
          checkpoint_sync_time_ms,
          checkpoint_flush_time_ms,
          restartpoint_write_time_ms,
          restartpoint_sync_time_ms,
          restartpoint_flush_time_ms
        FROM pg_stat_checkpointer
      `) as any[];

			return checkpointStats || {};
		} catch (error) {
			console.error("❌ 获取检查点统计失败:", error);
			return {};
		}
	}

	/**
	 * 获取 VACUUM/ANALYZE 统计信息
	 */
	async getVacuumStatistics(): Promise<any[]> {
		try {
			const result = (await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          total_vacuum_time,
          total_autovacuum_time,
          total_analyze_time,
          total_autoanalyze_time,
          vacuum_count,
          autovacuum_count,
          analyze_count,
          autoanalyze_count,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY total_vacuum_time DESC, total_analyze_time DESC
        LIMIT 10
      `) as any[];

			return result;
		} catch (error) {
			console.error("❌ 获取 VACUUM 统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取活跃连接信息
	 */
	async getActiveConnections(): Promise<any[]> {
		try {
			const result = (await this.prisma.$queryRaw`
        SELECT
          datname as database_name,
          usename as username,
          application_name,
          client_addr as client_address,
          state as connection_state,
          backend_start,
          query_start,
          state_change,
          wait_event_type,
          wait_event,
          query
        FROM pg_stat_activity
        WHERE state != 'idle'
        ORDER BY query_start DESC
        LIMIT 10
      `) as any[];

			return result;
		} catch (error) {
			console.error("❌ 获取活跃连接失败:", error);
			return [];
		}
	}

	/**
	 * 获取表级别的统计信息
	 */
	async getTableStatistics(): Promise<any[]> {
		try {
			const result = (await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_tup_hot_upd,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze,
          vacuum_count,
          autovacuum_count,
          analyze_count,
          autoanalyze_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
        LIMIT 10
      `) as any[];

			return result;
		} catch (error) {
			console.error("❌ 获取表统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取索引使用统计
	 */
	async getIndexStatistics(): Promise<any[]> {
		try {
			const result = (await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 15
      `) as any[];

			return result;
		} catch (error) {
			console.error("❌ 获取索引统计失败:", error);
			return [];
		}
	}

	/**
	 * 获取综合性能报告
	 */
	async getPerformanceReport(): Promise<{
		ioStats: any[];
		walStats: any;
		checkpointStats: any;
		vacuumStats: any[];
		tableStats: any[];
		indexStats: any[];
		activeConnections: any[];
		timestamp: Date;
	}> {
		const [
			ioStats,
			walStats,
			checkpointStats,
			vacuumStats,
			tableStats,
			indexStats,
			activeConnections,
		] = await Promise.all([
			this.getIOStatistics(),
			this.getWALStatistics(),
			this.getCheckpointStatistics(),
			this.getVacuumStatistics(),
			this.getTableStatistics(),
			this.getIndexStatistics(),
			this.getActiveConnections(),
		]);

		return {
			ioStats,
			walStats,
			checkpointStats,
			vacuumStats,
			tableStats,
			indexStats,
			activeConnections,
			timestamp: new Date(),
		};
	}

	/**
	 * 检查数据库是否支持 PostgreSQL 18 特性
	 */
	async checkPostgreSQLVersion(): Promise<{
		version: string;
		supportsEnhancedStats: boolean;
		supportsReturningSyntax: boolean;
		supportsUnicodeFast: boolean;
		supportsSHA512: boolean;
	}> {
		try {
			const [versionResult] = (await this.prisma
				.$queryRaw`SELECT version()`) as any[];
			const version = versionResult.version;

			// 简单的版本检查（实际应该更精确）
			const isPG18OrHigher =
				version.includes("PostgreSQL 18") ||
				version.includes("PostgreSQL 19") ||
				version.includes("PostgreSQL 20");

			return {
				version,
				supportsEnhancedStats: isPG18OrHigher,
				supportsReturningSyntax: true, // 较早版本也支持，但 PG18 增强了
				supportsUnicodeFast: isPG18OrHigher,
				supportsSHA512: isPG18OrHigher,
			};
		} catch (error) {
			console.error("❌ 检查 PostgreSQL 版本失败:", error);
			return {
				version: "Unknown",
				supportsEnhancedStats: false,
				supportsReturningSyntax: false,
				supportsUnicodeFast: false,
				supportsSHA512: false,
			};
		}
	}
}
