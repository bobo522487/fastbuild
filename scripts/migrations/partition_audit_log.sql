-- PostgreSQL 18 分区表策略迁移脚本
-- 为 AuditLog 表实施分区策略以提升大数据量查询和维护性能

-- 1. 创建分区表结构（按月分区）
CREATE TABLE "AuditLog_partitioned" (
    -- 保持与原表相同的结构
    id TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    action TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    metadata JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 主键约束
    PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- 2. 创建分区表函数
CREATE OR REPLACE FUNCTION create_audit_log_partition(target_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'AuditLog_' || to_char(target_date, 'YYYY_MM');
    start_date := date_trunc('month', target_date);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF "AuditLog_partitioned"
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, start_date, end_date);

    -- 为分区创建索引
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I("projectId", "createdAt");
    ', 'idx_' || partition_name || '_project_created', partition_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I("userId", "createdAt");
    ', 'idx_' || partition_name || '_user_created', partition_name);

    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I(action, "resourceType");
    ', 'idx_' || partition_name || '_action_resource', partition_name);

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建当前月和未来几个月的分区
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    -- 创建当前月份分区
    PERFORM create_audit_log_partition(current_date);

    -- 创建未来3个月的分区
    FOR i IN 1..3 LOOP
        PERFORM create_audit_log_partition(current_date + (i || ' months')::INTERVAL);
    END LOOP;

    -- 创建过去12个月的分区（如果有历史数据）
    FOR i IN 1..12 LOOP
        PERFORM create_audit_log_partition(current_date - (i || ' months')::INTERVAL);
    END LOOP;
END $$;

-- 4. 创建自动分区维护函数
CREATE OR REPLACE FUNCTION maintain_audit_log_partitions()
RETURNS TABLE(
    action TEXT,
    partition_name TEXT,
    status TEXT
) AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE);
    oldest_partition DATE := current_month - INTERVAL '12 months';
    future_partition DATE := current_month + INTERVAL '3 months';
BEGIN
    -- 清理超过12个月的旧分区
    RETURN QUERY
    SELECT
        'DROP' as action,
        'AuditLog_' || to_char(oldest_partition - (i || ' months')::INTERVAL, 'YYYY_MM') as partition_name,
        CASE
            WHEN to_regclass('public.AuditLog_' || to_char(oldest_partition - (i || ' months')::INTERVAL, 'YYYY_MM')) IS NOT NULL
            THEN 'Dropped'
            ELSE 'Not found'
        END as status
    FROM generate_series(1, 6) i
    WHERE to_regclass('public.AuditLog_' || to_char(oldest_partition - (i || ' months')::INTERVAL, 'YYYY_MM')) IS NOT NULL;

    -- 删除旧分区
    FOR i IN 1..6 LOOP
        DECLARE
            partition_to_drop TEXT := 'AuditLog_' || to_char(oldest_partition - (i || ' months')::INTERVAL, 'YYYY_MM');
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS ' || partition_to_drop || ' CASCADE';
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;

    -- 创建新的未来分区
    FOR i IN 0..2 LOOP
        DECLARE
            partition_name TEXT;
        BEGIN
            partition_name := create_audit_log_partition(future_partition + (i || ' months')::INTERVAL);
            RETURN QUERY
            SELECT
                'CREATE' as action,
                partition_name,
                'Created' as status;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器函数自动创建分区
CREATE OR REPLACE FUNCTION auto_create_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_exists BOOLEAN;
    partition_name TEXT;
BEGIN
    -- 检查需要的分区是否存在
    partition_name := 'AuditLog_' || to_char(NEW."createdAt", 'YYYY_MM');

    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = partition_name
    ) INTO partition_exists;

    -- 如果分区不存在，创建它
    IF NOT partition_exists THEN
        PERFORM create_audit_log_partition(NEW."createdAt");
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 数据迁移函数
CREATE OR REPLACE FUNCTION migrate_audit_log_data()
RETURNS TABLE(
    phase TEXT,
    records_migrated BIGINT,
    status TEXT
) AS $$
DECLARE
    total_records BIGINT;
    batch_size INTEGER := 10000;
    offset_val INTEGER := 0;
    migrated_count BIGINT := 0;
BEGIN
    -- 获取总记录数
    SELECT COUNT(*) INTO total_records FROM "AuditLog";

    RETURN QUERY
    SELECT 'START' as phase, total_records as records_migrated, 'Starting migration' as status;

    -- 分批迁移数据
    WHILE offset_val < total_records LOOP
        BEGIN
            INSERT INTO "AuditLog_partitioned"
            SELECT * FROM "AuditLog"
            ORDER BY "createdAt"
            LIMIT batch_size OFFSET offset_val;

            GET DIAGNOSTICS migrated_count = ROW_COUNT;
            offset_val := offset_val + batch_size;

            RETURN QUERY
            SELECT 'MIGRATING' as phase, migrated_count as records_migrated, 'Batch completed' as status;

            COMMIT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY
            SELECT 'ERROR' as phase, offset_val as records_migrated, SQLERRM as status;
            RETURN;
        END;
    END LOOP;

    RETURN QUERY
    SELECT 'COMPLETE' as phase, total_records as records_migrated, 'Migration completed' as status;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建分区表监控视图
CREATE OR REPLACE VIEW audit_log_partition_status AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    (SELECT COUNT(*) FROM "AuditLog_partitioned" WHERE "createdAt" >= date_trunc('month', CURRENT_DATE) AND "createdAt" < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month') as current_month_records,
    (SELECT COUNT(*) FROM "AuditLog_partitioned" WHERE "createdAt" >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND "createdAt" < date_trunc('month', CURRENT_DATE)) as last_month_records,
    (SELECT MIN("createdAt") FROM "AuditLog_partitioned") as earliest_record,
    (SELECT MAX("createdAt") FROM "AuditLog_partitioned") as latest_record
FROM pg_tables
WHERE tablename LIKE 'AuditLog_%'
ORDER BY tablename DESC;

-- 8. 创建分区查询优化视图
CREATE OR REPLACE VIEW audit_log_recent AS
SELECT *
FROM "AuditLog_partitioned"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- 9. 创建分区维护建议视图
CREATE OR REPLACE VIEW partition_maintenance_recommendations AS
SELECT
    'Partition Management' as category,
    CASE
        WHEN COUNT(*) = 0 THEN 'No partitions found'
        WHEN COUNT(*) < 12 THEN 'Consider creating more partitions for historical data'
        WHEN COUNT(*) > 18 THEN 'Consider archiving old partitions'
        ELSE 'Partition count looks good'
    END as recommendation,
    COUNT(*) as current_partitions,
    MIN(tablename) as oldest_partition,
    MAX(tablename) as newest_partition
FROM pg_tables
WHERE tablename LIKE 'AuditLog_%'

UNION ALL

SELECT
    'Data Volume' as category,
    CASE
        WHEN SUM(pg_total_relation_size(schemaname||'.'||tablename)) > 1024*1024*1024 THEN 'Consider data archiving for large partitions'
        WHEN SUM(pg_total_relation_size(schemaname||'.'||tablename)) < 1024*1024 THEN 'Low data volume, all good'
        ELSE 'Data volume is reasonable'
    END as recommendation,
        COUNT(*) as partition_count,
        pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size,
        NULL as oldest_partition
FROM pg_tables
WHERE tablename LIKE 'AuditLog_%'
GROUP BY category

UNION ALL

SELECT
    'Performance' as category,
    CASE
        WHEN EXISTS(SELECT 1 FROM pg_stat_user_tables WHERE relname LIKE 'AuditLog_%' AND seq_scan > 1000) THEN 'Consider optimizing queries with partition pruning'
        ELSE 'Query performance looks good'
    END as recommendation,
        COUNT(*) as table_count,
        'See EXPLAIN ANALYZE for details' as details,
        NULL as oldest_partition
FROM pg_tables
WHERE tablename LIKE 'AuditLog_%';

-- 10. ONLY 选项维护函数
CREATE OR REPLACE FUNCTION vacuum_audit_log_partitions(only_current_month BOOLEAN DEFAULT TRUE)
RETURNS TABLE(
    partition_name TEXT,
    operation TEXT,
    execution_time_ms INTEGER,
    status TEXT
) AS $$
DECLARE
    partition_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    IF only_current_month THEN
        -- 只清理当前月份的分区
        FOR partition_record IN
            SELECT tablename
            FROM pg_tables
            WHERE tablename = 'AuditLog_' || to_char(CURRENT_DATE, 'YYYY_MM')
        LOOP
            start_time := clock_timestamp();

            EXECUTE 'VACUUM ANALYZE ONLY ' || partition_record.tablename;

            end_time := clock_timestamp();

            RETURN QUERY
            SELECT
                partition_record.tablename,
                'VACUUM ANALYZE ONLY',
                EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER,
                'Completed'
            ;
        END LOOP;
    ELSE
        -- 清理所有分区
        FOR partition_record IN
            SELECT tablename
            FROM pg_tables
            WHERE tablename LIKE 'AuditLog_%'
            ORDER BY tablename DESC
            LIMIT 5 -- 限制最近5个分区
        LOOP
            start_time := clock_timestamp();

            EXECUTE 'VACUUM ANALYZE ONLY ' || partition_record.tablename;

            end_time := clock_timestamp();

            RETURN QUERY
            SELECT
                partition_record.tablename,
                'VACUUM ANALYZE ONLY',
                EXTRACT(MILLISECONDS FROM end_time - start_time)::INTEGER,
                'Completed'
            ;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建分区查询优化提示函数
CREATE OR REPLACE FUNCTION get_optimal_audit_query_conditions(
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
    recommended_query TEXT,
    partition_pruning_possible BOOLEAN,
    estimated_performance_gain TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
                format('SELECT * FROM "AuditLog_partitioned" WHERE "createdAt" >= %L AND "createdAt" <= %L ORDER BY "createdAt" DESC', start_date, end_date)
            WHEN start_date IS NOT NULL THEN
                format('SELECT * FROM "AuditLog_partitioned" WHERE "createdAt" >= %L ORDER BY "createdAt" DESC', start_date)
            WHEN end_date IS NOT NULL THEN
                format('SELECT * FROM "AuditLog_partitioned" WHERE "createdAt" <= %L ORDER BY "createdAt" DESC', end_date)
            ELSE
                'SELECT * FROM "AuditLog_partitioned" ORDER BY "createdAt" DESC LIMIT 1000'
        END as recommended_query,
        CASE
            WHEN start_date IS NOT NULL OR end_date IS NOT NULL THEN true
            ELSE false
        END as partition_pruning_possible,
        CASE
            WHEN start_date IS NOT NULL AND end_date IS NOT NULL AND (end_date - start_date) < INTERVAL '3 months' THEN 'High - 90%+ performance improvement'
            WHEN start_date IS NOT NULL OR end_date IS NOT NULL THEN 'Medium - 60-80% performance improvement'
            ELSE 'Low - Consider adding date filters for better performance'
        END as estimated_performance_gain;
END;
$$ LANGUAGE plpgsql;

-- 注意：实际的数据迁移和表切换需要谨慎进行
-- 1. 首先测试分区表功能
-- 2. 在低峰期进行数据迁移
-- 3. 迁移完成后切换表名
-- 4. 验证应用功能正常

SELECT 'PostgreSQL 18 分区表策略迁移脚本已准备完成' as status,
       NOW() as completed_at,
       '请在维护窗口执行数据迁移' as next_step;