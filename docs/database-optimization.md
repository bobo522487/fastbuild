# 数据库性能优化指南

## 已实现的优化

### 1. 索引策略优化

#### Form 表单索引
```sql
-- 用户创建的表单按时间排序查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_created_by_created_at ON forms(createdById, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_created_at ON forms(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_name ON forms(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forms_version ON forms(version);
```

#### Submission 提交索引
```sql
-- 表单提交的复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_form_id_submitted_at ON submissions(formId, submittedAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_form_id_status ON submissions(formId, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_submitted_by_submitted_at ON submissions(submittedById, submittedAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_submitted_at ON submissions(submittedAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_ip_address ON submissions(ipAddress);
```

#### User 用户索引
```sql
-- 用户相关查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_is_active ON users(role, isActive);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users(emailVerified);
```

#### Monitoring 监控索引
```sql
-- 监控事件复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_type_timestamp ON monitoring_events(type, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_session_id_timestamp ON monitoring_events(sessionId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_user_id_timestamp ON monitoring_events(userId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_created_at ON monitoring_events(createdAt);

-- JSON 字段 GIN 索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_data_gin ON monitoring_events USING GIN(data);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_metadata_gin ON monitoring_events USING GIN(metadata);
```

#### ErrorLog 错误日志索引
```sql
-- 错误日志查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_level_created_at ON error_logs(level, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_resolved_created_at ON error_logs(resolved, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_component_created_at ON error_logs(component, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_path_created_at ON error_logs(path, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_user_id_created_at ON error_logs(userId, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_session_id_created_at ON error_logs(sessionId, createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_event_id ON error_logs(eventId);

-- 全文搜索索引（PostgreSQL）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_message_fts ON error_logs USING GIN(to_tsvector('english', message));
```

#### PerformanceMetric 性能指标索引
```sql
-- 性能指标查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_name_timestamp ON performance_metrics(name, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_path_timestamp ON performance_metrics(path, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_session_id_timestamp ON performance_metrics(sessionId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_user_id_timestamp ON performance_metrics(userId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(createdAt);

-- JSON 字段 GIN 索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_tags_gin ON performance_metrics USING GIN(tags);

-- 范围查询索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_value ON performance_metrics(value);
```

#### UserActivity 用户活动索引
```sql
-- 用户活动查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_id_timestamp ON user_activities(userId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_action_timestamp ON user_activities(action, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_session_id_timestamp ON user_activities(sessionId, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_path_timestamp ON user_activities(path, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_created_at ON user_activities(createdAt);

-- JSON 字段 GIN 索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_metadata_gin ON user_activities USING GIN(metadata);

-- 操作统计索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_action_element ON user_activities(action, element);
```

## 应用优化

### 1. 启动数据库
```bash
# 启动 PostgreSQL 数据库
docker compose up -d

# 检查数据库状态
docker compose ps
```

### 2. 应用数据库迁移
```bash
# 生成 Prisma 客户端
pnpm db:generate

# 推送架构更改
pnpm db:push

# 或者创建迁移文件
pnpm db:migrate --name add-performance-indexes
```

### 3. 手动创建高级索引
如果需要手动创建全文索引或其他高级索引，可以：

```bash
# 连接到数据库
psql $DATABASE_URL

# 运行索引创建脚本
\i docs/database-indexes.sql
```

## 性能监控

### 1. 查询分析
```sql
-- 启用查询日志
SET log_statement = 'all';
SET log_duration = on;
SET log_min_duration_statement = 1000; -- 记录超过1秒的查询

-- 查看慢查询
SELECT query, calls, total_time, mean_time, min_time, max_time, rows
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### 2. 索引使用情况
```sql
-- 查看索引使用统计
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 查看未使用的索引
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;
```

## 维护建议

### 1. 定期维护
```sql
-- 更新统计信息
ANALYZE;

-- 重建索引（碎片整理）
REINDEX INDEX idx_forms_created_at;
REINDEX INDEX idx_submissions_form_id_submitted_at;

-- 或者重建整个数据库的索引
REINDEX DATABASE fastbuild;
```

### 2. 监控建议
- 设置数据库监控仪表板
- 监控查询性能和索引使用情况
- 定期审查慢查询日志
- 根据使用模式调整索引策略

### 3. 扩展性考虑
- 考虑数据分区策略（按时间分区）
- 设置适当的连接池配置
- 监控数据库资源使用情况
- 考虑读写分离架构