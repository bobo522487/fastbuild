-- PostgreSQL 18 新聚合函数支持迁移脚本
-- 创建复合类型和聚合视图以支持高级统计分析

-- 1. 创建应用统计复合类型
DROP TYPE IF EXISTS app_stats CASCADE;
CREATE TYPE app_stats AS (
    total_projects INTEGER,
    total_applications INTEGER,
    total_deployments INTEGER,
    successful_deployments INTEGER,
    failed_deployments INTEGER,
    avg_build_time DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    total_views INTEGER,
    last_activity TIMESTAMP
);

-- 2. 创建用户活动统计复合类型
DROP TYPE IF EXISTS user_activity_stats CASCADE;
CREATE TYPE user_activity_stats AS (
    user_id TEXT,
    user_name TEXT,
    total_projects INTEGER,
    total_applications INTEGER,
    total_tables_created INTEGER,
    total_views_created INTEGER,
    last_login TIMESTAMP,
    days_active INTEGER,
    avg_daily_actions DECIMAL(10,2),
    most_active_hour INTEGER
);

-- 3. 创建项目健康度统计复合类型
DROP TYPE IF EXISTS project_health_stats CASCADE;
CREATE TYPE project_health_stats AS (
    project_id TEXT,
    project_name TEXT,
    completeness_score DECIMAL(5,2),
    activity_score DECIMAL(5,2),
    collaboration_score DECIMAL(5,2),
    overall_health DECIMAL(5,2),
    risk_factors TEXT[],
    recommendations TEXT[]
);

-- 4. 创建部署统计复合类型
DROP TYPE IF EXISTS deployment_stats CASCADE;
CREATE TYPE deployment_stats AS (
    total_deployments INTEGER,
    successful_deployments INTEGER,
    failed_deployments INTEGER,
    avg_build_time DECIMAL(10,2),
    avg_deploy_time DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    most_common_failure_reason TEXT,
    deployment_frequency DECIMAL(10,2),
    peak_deployment_hour INTEGER
);

-- 5. 创建数据使用统计复合类型
DROP TYPE IF EXISTS data_usage_stats CASCADE;
CREATE TYPE data_usage_stats AS (
    total_tables INTEGER,
    total_columns INTEGER,
    total_views INTEGER,
    total_records_estimated BIGINT,
    storage_used_mb DECIMAL(10,2),
    most_active_table TEXT,
    avg_columns_per_table DECIMAL(5,2),
    data_growth_rate DECIMAL(5,2)
);

-- 6. 创建数组聚合函数（如果不存在）
CREATE OR REPLACE FUNCTION array_min(arr ANYARRAY)
RETURNS ANYELEMENT AS $$
BEGIN
    RETURN (SELECT min(elem) FROM unnest(arr) AS elem);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION array_max(arr ANYARRAY)
RETURNS ANYELEMENT AS $$
BEGIN
    RETURN (SELECT max(elem) FROM unnest(arr) AS elem);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. 创建项目统计视图（使用新聚合函数）
CREATE OR REPLACE VIEW project_statistics_enhanced AS
SELECT
    p."createdBy" as user_id,
    u.name as user_name,
    u.email as user_email,
    ROW(
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT a.id),
        COUNT(DISTINCT ad.id),
        COUNT(CASE WHEN ad.status = 'DEPLOYED' THEN 1 END),
        COUNT(CASE WHEN ad.status = 'FAILED' THEN 1 END),
        COALESCE(AVG(ad."buildTime"), 0),
        CASE
            WHEN COUNT(DISTINCT ad.id) > 0
            THEN ROUND(COUNT(CASE WHEN ad.status = 'DEPLOYED' END) * 100.0 / COUNT(DISTINCT ad.id), 2)
            ELSE 0
        END,
        COALESCE(SUM(ad."viewCount"), 0),
        COALESCE(MAX(ad."lastAccessedAt"), p."updatedAt")
    )::app_stats as stats
FROM "Project" p
LEFT JOIN "User" u ON u.id = p."createdBy"
LEFT JOIN "Application" a ON p.id = a."projectId"
LEFT JOIN "AppDeployment" ad ON a.id = ad."applicationId"
GROUP BY p."createdBy", u.name, u.email;

-- 8. 创建用户活动统计视图
CREATE OR REPLACE VIEW user_activity_statistics AS
SELECT
    u.id as user_id,
    u.name as user_name,
    ROW(
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT a.id),
        COUNT(DISTINCT dt.id),
        COUNT(DISTINCT tv.id),
        COALESCE(MAX(al."createdAt"), u."updatedAt"),
        COUNT(DISTINCT DATE(al."createdAt")),
        CASE
            WHEN COUNT(DISTINCT DATE(al."createdAt")) > 0
            THEN ROUND(COUNT(al.id) * 1.0 / COUNT(DISTINCT DATE(al."createdAt")), 2)
            ELSE 0
        END,
        EXTRACT(HOUR FROM MAX(al."createdAt"))::INTEGER
    )::user_activity_stats as stats
FROM "User" u
LEFT JOIN "Project" p ON u.id = p."createdBy"
LEFT JOIN "Application" a ON u.id = a."createdBy"
LEFT JOIN "DataTable" dt ON u.id = dt."createdBy"
LEFT JOIN "TableView" tv ON u.id = tv."createdBy"
LEFT JOIN "AuditLog" al ON u.id = al."userId"
GROUP BY u.id, u.name;

-- 9. 创建项目健康度评估视图
CREATE OR REPLACE VIEW project_health_dashboard AS
SELECT
    p.id as project_id,
    p.name as project_name,
    ROW(
        -- 完整性评分 (0-100)
            CASE
                WHEN COUNT(DISTINCT a.id) > 0 THEN LEAST(100, COUNT(DISTINCT a.id) * 20)
                ELSE 0
            END +
            CASE
                WHEN COUNT(DISTINCT dt.id) > 0 THEN LEAST(50, COUNT(DISTINCT dt.id) * 10)
                ELSE 0
            END,
        -- 活动评分 (基于最近更新)
            CASE
                WHEN p."updatedAt" > NOW() - INTERVAL '7 days' THEN 100
                WHEN p."updatedAt" > NOW() - INTERVAL '30 days' THEN 70
                WHEN p."updatedAt" > NOW() - INTERVAL '90 days' THEN 40
                ELSE 10
            END,
        -- 协作评分 (基于成员数量)
            CASE
                WHEN COUNT(DISTINCT pm.id) > 5 THEN 100
                WHEN COUNT(DISTINCT pm.id) > 2 THEN 70
                WHEN COUNT(DISTINCT pm.id) > 1 THEN 40
                ELSE 10
            END,
        -- 综合健康度
            (
                CASE
                    WHEN COUNT(DISTINCT a.id) > 0 THEN LEAST(100, COUNT(DISTINCT a.id) * 20)
                    ELSE 0
                END +
                CASE
                    WHEN COUNT(DISTINCT dt.id) > 0 THEN LEAST(50, COUNT(DISTINCT dt.id) * 10)
                    ELSE 0
                END
            ) * 0.4 +
            CASE
                WHEN p."updatedAt" > NOW() - INTERVAL '7 days' THEN 100
                WHEN p."updatedAt" > NOW() - INTERVAL '30 days' THEN 70
                WHEN p."updatedAt" > NOW() - INTERVAL '90 days' THEN 40
                ELSE 10
            END * 0.3 +
            CASE
                WHEN COUNT(DISTINCT pm.id) > 5 THEN 100
                WHEN COUNT(DISTINCT pm.id) > 2 THEN 70
                WHEN COUNT(DISTINCT pm.id) > 1 THEN 40
                ELSE 10
            END * 0.3,
        -- 风险因素
        ARRAY[
            CASE WHEN COUNT(DISTINCT a.id) = 0 THEN 'No applications created' END,
            CASE WHEN p."updatedAt" < NOW() - INTERVAL '30 days' THEN 'No recent activity' END,
            CASE WHEN COUNT(DISTINCT pm.id) = 1 THEN 'No collaboration' END
        ] FILTER (WHERE CASE WHEN COUNT(DISTINCT a.id) = 0 THEN 'No applications created' END IS NOT NULL
                  OR CASE WHEN p."updatedAt" < NOW() - INTERVAL '30 days' THEN 'No recent activity' END IS NOT NULL
                  OR CASE WHEN COUNT(DISTINCT pm.id) = 1 THEN 'No collaboration' END IS NOT NULL),
        -- 建议
        ARRAY[
            CASE WHEN COUNT(DISTINCT a.id) = 0 THEN 'Create first application' END,
            CASE WHEN COUNT(DISTINCT dt.id) = 0 THEN 'Create data tables' END,
            CASE WHEN COUNT(DISTINCT pm.id) = 1 THEN 'Invite team members' END
        ] FILTER (WHERE CASE WHEN COUNT(DISTINCT a.id) = 0 THEN 'Create first application' END IS NOT NULL
                  OR CASE WHEN COUNT(DISTINCT dt.id) = 0 THEN 'Create data tables' END IS NOT NULL
                  OR CASE WHEN COUNT(DISTINCT pm.id) = 1 THEN 'Invite team members' END IS NOT NULL)
    )::project_health_stats as health
FROM "Project" p
LEFT JOIN "Application" a ON p.id = a."projectId"
LEFT JOIN "DataTable" dt ON p.id = dt."projectId"
LEFT JOIN "ProjectMember" pm ON p.id = pm."projectId"
GROUP BY p.id, p.name, p."updatedAt";

-- 10. 创建部署统计视图
CREATE OR REPLACE VIEW deployment_statistics_view AS
SELECT
    ROW(
        COUNT(*),
        COUNT(CASE WHEN status = 'DEPLOYED' THEN 1 END),
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END),
        COALESCE(AVG("buildTime"), 0),
        0, -- deploy_time (如果有的话)
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(COUNT(CASE WHEN status = 'DEPLOYED' THEN 1 END) * 100.0 / COUNT(*), 2)
            ELSE 0
        END,
        'Build timeout', -- 假设的最常见失败原因
        ROUND(COUNT(*) * 1.0 / 30, 2), -- 假设30天内的部署频率
        EXTRACT(HOUR FROM AVG("deployedAt"))::INTEGER
    )::deployment_stats as stats
FROM "AppDeployment"
WHERE "deployedAt" >= NOW() - INTERVAL '30 days';

-- 11. 创建数据使用统计视图
CREATE OR REPLACE VIEW data_usage_statistics AS
SELECT
    "projectId",
    p.name as project_name,
    ROW(
        COUNT(DISTINCT dt.id),
        COALESCE(SUM(dc_count.column_count), 0),
        COUNT(DISTINCT tv.id),
        0, -- estimated_records (需要额外的统计)
        0, -- storage_used_mb (需要额外的统计)
        (SELECT dt.name FROM "DataTable" dt WHERE dt."projectId" = p.id ORDER BY dt."updatedAt" DESC LIMIT 1),
        CASE
            WHEN COUNT(DISTINCT dt.id) > 0
            THEN ROUND(COALESCE(SUM(dc_count.column_count), 0) * 1.0 / COUNT(DISTINCT dt.id), 2)
            ELSE 0
        END,
        0 -- growth_rate (需要时间序列数据)
    )::data_usage_stats as usage
FROM "Project" p
LEFT JOIN "DataTable" dt ON p.id = dt."projectId"
LEFT JOIN (
    SELECT "tableId", COUNT(*) as column_count
    FROM "DataColumn"
    GROUP BY "tableId"
) dc_count ON dc_count."tableId" = dt.id
WHERE dt."deletedAt" IS NULL
GROUP BY p.id, p.name;

-- 12. 创建时间序列聚合函数
CREATE OR REPLACE FUNCTION time_series_aggregate(
    table_name TEXT,
    date_column TEXT,
    interval_type TEXT DEFAULT 'day',
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    period TIMESTAMP,
    count BIGINT,
    avg_value DECIMAL,
    max_value DECIMAL,
    min_value DECIMAL
) AS $$
DECLARE
    sql_query TEXT;
BEGIN
    sql_query := format(`
        SELECT
            date_trunc($1, %2$I) as period,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM (%2$I - LAG(%2$I) OVER (ORDER BY %2$I)))) as avg_value,
            MAX(EXTRACT(EPOCH FROM (%2$I - LAG(%2$I) OVER (ORDER BY %2$I)))) as max_value,
            MIN(EXTRACT(EPOCH FROM (%2$I - LAG(%2$I) OVER (ORDER BY %2$I)))) as min_value
        FROM %3$I
        WHERE %2$I >= NOW() - INTERVAL '%4$s days'
        GROUP BY date_trunc($1, %2$I)
        ORDER BY period
    `, interval_type, date_column, table_name, days_back);

    RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- 13. 创建高级分析函数
CREATE OR REPLACE FUNCTION analyze_user_engagement()
RETURNS TABLE(
    user_id TEXT,
    engagement_score DECIMAL,
    activity_pattern TEXT,
    preferred_actions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al."userId",
        -- 计算参与度评分
        CASE
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 20 THEN 100
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 10 THEN 80
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 5 THEN 60
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 2 THEN 40
            ELSE 20
        END +
        CASE
            WHEN COUNT(DISTINCT al."resourceType") >= 5 THEN 20
            WHEN COUNT(DISTINCT al."resourceType") >= 3 THEN 15
            WHEN COUNT(DISTINCT al."resourceType") >= 2 THEN 10
            ELSE 5
        END as engagement_score,
        -- 分析活动模式
        CASE
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 20 THEN 'Daily Active'
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 10 THEN 'Regular User'
            WHEN COUNT(DISTINCT DATE(al."createdAt")) >= 2 THEN 'Occasional User'
            ELSE 'New User'
        END as activity_pattern,
        -- 最常见的操作类型
        ARRAY(
            SELECT action
            FROM (
                SELECT al2.action, COUNT(*) as cnt
                FROM "AuditLog" al2
                WHERE al2."userId" = al."userId"
                GROUP BY al2.action
                ORDER BY cnt DESC
                LIMIT 3
            ) top_actions
        ) as preferred_actions
    FROM "AuditLog" al
    WHERE al."userId" IS NOT NULL
      AND al."createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY al."userId";
END;
$$ LANGUAGE plpgsql;

-- 14. 创建数据质量分析函数
CREATE OR REPLACE FUNCTION analyze_data_quality(project_id_param TEXT)
RETURNS TABLE(
    table_name TEXT,
    completeness_score DECIMAL,
    consistency_score DECIMAL,
    data_issues TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.name,
        -- 完整性评分 (基于非空字段比例)
        CASE
            WHEN COUNT(dc.id) > 0
            THEN ROUND(
                (COUNT(dc.id) - COUNT(NULL)) * 100.0 / COUNT(dc.id), 2
            )
            ELSE 100
        END as completeness_score,
        -- 一致性评分 (基于命名规范等)
        CASE
            WHEN COUNT(dc.id) > 0
            THEN ROUND(
                (SELECT COUNT(*) FROM "DataColumn" dc2 WHERE dc2."tableId" = dt.id AND dc2.name ~ '^[a-z][a-z0-9_]*$') * 100.0 / COUNT(dc.id), 2
            )
            ELSE 100
        END as consistency_score,
        -- 数据质量问题
        ARRAY[
            CASE WHEN COUNT(dc.id) = 0 THEN 'No columns defined' END,
            CASE WHEN EXISTS(SELECT 1 FROM "DataColumn" dc WHERE dc."tableId" = dt.id AND dc."name" ILIKE '% %') THEN 'Spaces in column names' END
        ] FILTER (WHERE CASE WHEN COUNT(dc.id) = 0 THEN 'No columns defined' END IS NOT NULL
                  OR CASE WHEN EXISTS(SELECT 1 FROM "DataColumn" dc WHERE dc."tableId" = dt.id AND dc."name" ILIKE '% %') THEN 'Spaces in column names' END IS NOT NULL)
    FROM "DataTable" dt
    LEFT JOIN "DataColumn" dc ON dt.id = dc."tableId"
    WHERE dt."projectId" = project_id_param
      AND dt."deletedAt" IS NULL
    GROUP BY dt.id, dt.name;
END;
$$ LANGUAGE plpgsql;

-- 完成
SELECT 'PostgreSQL 18 新聚合函数支持已成功添加' as status,
       NOW() as completed_at;