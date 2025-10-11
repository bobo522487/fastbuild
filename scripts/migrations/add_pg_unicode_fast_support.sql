-- PostgreSQL 18 PG_UNICODE_FAST 排序规则迁移脚本
-- 提升多语言应用的排序性能

-- 1. 检查是否支持 PG_UNICODE_FAST 排序规则
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_collation
        WHERE collname = 'pg_unicode_fast'
    ) THEN
        RAISE EXCEPTION 'PG_UNICODE_FAST 排序规则不可用，请升级到 PostgreSQL 18+';
    END IF;
END $$;

-- 2. 为 Project 表添加 PG_UNICODE_FAST 排序字段
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS name_unifast TEXT COLLATE "pg_unicode_fast",
ADD COLUMN IF NOT EXISTS description_unifast TEXT COLLATE "pg_unicode_fast";

-- 3. 为 Application 表添加 PG_UNICODE_FAST 排序字段
ALTER TABLE "Application"
ADD COLUMN IF NOT EXISTS name_unifast TEXT COLLATE "pg_unicode_fast",
ADD COLUMN IF NOT EXISTS description_unifast TEXT COLLATE "pg_unicode_fast";

-- 4. 为 DataTable 表添加 PG_UNICODE_FAST 排序字段
ALTER TABLE "DataTable"
ADD COLUMN IF NOT EXISTS name_unifast TEXT COLLATE "pg_unicode_fast",
ADD COLUMN IF NOT EXISTS display_name_unifast TEXT COLLATE "pg_unicode_fast",
ADD COLUMN IF NOT EXISTS description_unifast TEXT COLLATE "pg_unicode_fast";

-- 5. 为 TableView 表添加 PG_UNICODE_FAST 排序字段
ALTER TABLE "TableView"
ADD COLUMN IF NOT EXISTS name_unifast TEXT COLLATE "pg_unicode_fast",
ADD COLUMN IF NOT EXISTS description_unifast TEXT COLLATE "pg_unicode_fast";

-- 6. 为 User 表添加 PG_UNICODE_FAST 排序字段（如果需要按名称排序）
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS name_unifast TEXT COLLATE "pg_unicode_fast";

-- 7. 创建索引以提升排序性能
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_name_unifast
ON "Project"(name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_description_unifast
ON "Project"(description_unifast) WHERE description_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_name_unifast
ON "Application"(name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datatable_name_unifast
ON "DataTable"(name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datatable_display_name_unifast
ON "DataTable"(display_name_unifast) WHERE display_name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tableview_name_unifast
ON "TableView"(name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_name_unifast
ON "User"(name_unifast) WHERE name_unifast IS NOT NULL;

-- 8. 创建复合索引以支持多语言排序和过滤
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_visibility_name_unifast
ON "Project"(visibility, name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_application_project_name_unifast
ON "Application"("projectId", name_unifast) WHERE name_unifast IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_datatable_project_name_unifast
ON "DataTable"("projectId", name_unifast) WHERE name_unifast IS NOT NULL;

-- 9. 创建函数自动同步排序字段
CREATE OR REPLACE FUNCTION sync_unifast_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- 同步 Project 表
    IF TG_TABLE_NAME = 'Project' THEN
        NEW.name_unifast = NEW.name;
        NEW.description_unifast = NEW.description;
    -- 同步 Application 表
    ELSIF TG_TABLE_NAME = 'Application' THEN
        NEW.name_unifast = NEW.name;
        NEW.description_unifast = NEW.description;
    -- 同步 DataTable 表
    ELSIF TG_TABLE_NAME = 'DataTable' THEN
        NEW.name_unifast = NEW.name;
        NEW.display_name_unifast = NEW."displayName";
        NEW.description_unifast = NEW.description;
    -- 同步 TableView 表
    ELSIF TG_TABLE_NAME = 'TableView' THEN
        NEW.name_unifast = NEW.name;
        NEW.description_unifast = NEW.description;
    -- 同步 User 表
    ELSIF TG_TABLE_NAME = 'User' THEN
        NEW.name_unifast = NEW.name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. 为相关表添加触发器
DROP TRIGGER IF EXISTS sync_project_unifast_trigger ON "Project";
CREATE TRIGGER sync_project_unifast_trigger
    BEFORE INSERT OR UPDATE ON "Project"
    FOR EACH ROW EXECUTE FUNCTION sync_unifast_fields();

DROP TRIGGER IF EXISTS sync_application_unifast_trigger ON "Application";
CREATE TRIGGER sync_application_unifast_trigger
    BEFORE INSERT OR UPDATE ON "Application"
    FOR EACH ROW EXECUTE FUNCTION sync_unifast_fields();

DROP TRIGGER IF EXISTS sync_datatable_unifast_trigger ON "DataTable";
CREATE TRIGGER sync_datatable_unifast_trigger
    BEFORE INSERT OR UPDATE ON "DataTable"
    FOR EACH ROW EXECUTE FUNCTION sync_unifast_fields();

DROP TRIGGER IF EXISTS sync_tableview_unifast_trigger ON "TableView";
CREATE TRIGGER sync_tableview_unifast_trigger
    BEFORE INSERT OR UPDATE ON "TableView"
    FOR EACH ROW EXECUTE FUNCTION sync_unifast_fields();

DROP TRIGGER IF EXISTS sync_user_unifast_trigger ON "User";
CREATE TRIGGER sync_user_unifast_trigger
    BEFORE INSERT OR UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION sync_unifast_fields();

-- 11. 初始化现有数据的排序字段
UPDATE "Project" SET
    name_unifast = name,
    description_unifast = description
WHERE name_unifast IS NULL;

UPDATE "Application" SET
    name_unifast = name,
    description_unifast = description
WHERE name_unifast IS NULL;

UPDATE "DataTable" SET
    name_unifast = name,
    display_name_unifast = "displayName",
    description_unifast = description
WHERE name_unifast IS NULL;

UPDATE "TableView" SET
    name_unifast = name,
    description_unifast = description
WHERE name_unifast IS NULL;

UPDATE "User" SET
    name_unifast = name
WHERE name_unifast IS NULL AND name IS NOT NULL;

-- 12. 创建性能比较视图
CREATE OR REPLACE VIEW sorting_performance_comparison AS
SELECT
    'Project Sort Performance' as test_name,
    COUNT(*) as total_records,
    MIN(LENGTH(name)) as min_name_length,
    MAX(LENGTH(name)) as max_name_length,
    AVG(LENGTH(name)) as avg_name_length
FROM "Project"
WHERE name IS NOT NULL

UNION ALL

SELECT
    'Application Sort Performance' as test_name,
    COUNT(*) as total_records,
    MIN(LENGTH(name)) as min_name_length,
    MAX(LENGTH(name)) as max_name_length,
    AVG(LENGTH(name)) as avg_name_length
FROM "Application"
WHERE name IS NOT NULL

UNION ALL

SELECT
    'DataTable Sort Performance' as test_name,
    COUNT(*) as total_records,
    MIN(LENGTH(name)) as min_name_length,
    MAX(LENGTH(name)) as max_name_length,
    AVG(LENGTH(name)) as avg_name_length
FROM "DataTable"
WHERE name IS NOT NULL;

-- 13. 创建排序测试函数
CREATE OR REPLACE FUNCTION test_sorting_performance()
RETURNS TABLE(
    table_name TEXT,
    method TEXT,
    execution_time_ms NUMERIC
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result RECORD;
BEGIN
    -- 测试 Project 表排序性能
    start_time := clock_timestamp();
    PERFORM * FROM "Project" ORDER BY name_unifast LIMIT 100;
    end_time := clock_timestamp();

    RETURN QUERY SELECT
        'Project'::TEXT,
        'PG_UNICODE_FAST'::TEXT,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::NUMERIC;

    -- 测试传统排序性能
    start_time := clock_timestamp();
    PERFORM * FROM "Project" ORDER BY name COLLATE "default" LIMIT 100;
    end_time := clock_timestamp();

    RETURN QUERY SELECT
        'Project'::TEXT,
        'Default Collation'::TEXT,
        EXTRACT(MILLISECONDS FROM end_time - start_time)::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- 完成
SELECT 'PG_UNICODE_FAST 排序规则支持已成功添加' as status,
       NOW() as completed_at;