-- FastBuild 数据库约束补全
-- 修复DataTable模型缺失的唯一约束和索引

-- DataTable 模型的唯一约束（软删除支持）
-- 防止在同一项目中创建同名的活跃表
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_table_active_unique
ON "DataTable"(projectId, name)
WHERE deletedAt IS NULL;

-- DataTable 的复合索引（提高查询性能）
CREATE INDEX IF NOT EXISTS idx_data_table_project_name
ON "DataTable"(projectId, name);

-- DataColumn 的复合索引
CREATE INDEX IF NOT EXISTS idx_data_column_table_name
ON "DataColumn"(tableId, name);

-- TableView 的复合索引
CREATE INDEX IF NOT EXISTS idx_table_view_table_name
ON "TableView"(tableId, name);

-- 审计日志系统的关键索引
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
ON "AuditLog"(action, createdAt);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type_id
ON "AuditLog"(resourceType, resourceId);

-- 发布系统索引优化
CREATE INDEX IF NOT EXISTS idx_data_model_deployment_project_env_status
ON "DataModelDeployment"(projectId, environment, status);

CREATE INDEX IF NOT EXISTS idx_data_model_deployment_env_status
ON "DataModelDeployment"(environment, status);

CREATE INDEX IF NOT EXISTS idx_app_deployment_app_env_status
ON "AppDeployment"(applicationId, environment, status);

CREATE INDEX IF NOT EXISTS idx_app_deployment_data_model
ON "AppDeployment"(dataModelDeploymentId);

-- 用户查询优化索引
CREATE INDEX IF NOT EXISTS idx_user_email_lookup
ON "User"(email);

-- 项目查询优化索引
CREATE INDEX IF NOT EXISTS idx_project_creator_lookup
ON "Project"(createdBy);

CREATE INDEX IF NOT EXISTS idx_project_visibility
ON "Project"(visibility);

-- 项目成员查询优化
CREATE INDEX IF NOT EXISTS idx_project_member_role
ON "ProjectMember"(projectId, role);

-- 应用查询优化
CREATE INDEX IF NOT EXISTS idx_application_project_slug
ON "Application"(projectId, slug);

-- 应用页面查询优化
CREATE INDEX IF NOT EXISTS idx_app_page_path
ON "AppPage"(applicationId, path);

-- 添加约束说明注释
COMMENT ON INDEX idx_data_table_active_unique IS '防止同一项目中的同名活跃表（软删除支持）';
COMMENT ON INDEX idx_data_table_project_name IS 'DataTable按项目和名称的复合查询';
COMMENT ON INDEX idx_audit_log_action_created IS '审计日志按操作类型和时间的查询';
COMMENT ON INDEX idx_data_model_deployment_project_env_status IS '数据模型发布的复合查询';
COMMENT ON INDEX idx_app_deployment_app_env_status IS '应用发布的复合查询';

-- 检查约束是否创建成功
SELECT
    indexname as index_name,
    tablename as table_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_%_unique'
        OR indexname LIKE 'idx_%_lookup'
        OR indexname LIKE 'idx_%_project'
        OR indexname LIKE 'idx_%_table'
        OR indexname LIKE 'idx_%_view'
        OR indexname LIKE 'idx_%_action'
        OR indexname LIKE 'idx_%_deployment'
    )
ORDER BY tablename, indexname;