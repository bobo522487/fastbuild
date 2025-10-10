#!/bin/bash

# PostgreSQL 18 升级后验证脚本
# Linus风格：验证真正重要的东西，不是制造花哨的报告

set -euo pipefail

# 配置参数
PG_PORT="5432"
PG_USER="postgres"
LOG_FILE="/var/log/postgresql/verify_$(date +%Y%m%d_%H%M%S).log"
TEST_DB="postgres_test_$(date +%s)"

# 创建日志目录
mkdir -p "$(dirname "${LOG_FILE}")"

echo "=== PostgreSQL 18 升级验证 $(date) ===" | tee "${LOG_FILE}"

# 函数：执行SQL查询并格式化输出
run_sql() {
    local sql="$1"
    local description="$2"
    echo "" | tee -a "${LOG_FILE}"
    echo "=== $description ===" | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -c "$sql" | tee -a "${LOG_FILE}"
}

# 函数：执行测试SQL并检查结果
test_sql() {
    local sql="$1"
    local expected_pattern="$2"
    local description="$3"

    echo "" | tee -a "${LOG_FILE}"
    echo "测试: $description" | tee -a "${LOG_FILE}"

    local result
    result=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "$sql" 2>&1)

    if echo "$result" | grep -q "$expected_pattern"; then
        echo "✓ 通过: $description" | tee -a "${LOG_FILE}"
        return 0
    else
        echo "❌ 失败: $description" | tee -a "${LOG_FILE}"
        echo "  期望: $expected_pattern" | tee -a "${LOG_FILE}"
        echo "  实际: $result" | tee -a "${LOG_FILE}"
        return 1
    fi
}

# 函数：性能基准测试
performance_test() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 性能基准测试 ===" | tee -a "${LOG_FILE}"

    # 创建测试数据库
    echo "创建测试数据库..." | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null || true
    sudo -u postgres psql -p "${PG_PORT}" -c "CREATE DATABASE ${TEST_DB};" | tee -a "${LOG_FILE}"

    # 创建测试表并插入数据
    echo "创建测试数据..." | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -d "${TEST_DB}" -c "
        CREATE TABLE test_performance (
            id SERIAL PRIMARY KEY,
            data TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        INSERT INTO test_performance (data)
        SELECT 'test data ' || i
        FROM generate_series(1, 10000) i;
    " | tee -a "${LOG_FILE}"

    # 创建索引
    echo "创建索引..." | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -d "${TEST_DB}" -c "
        CREATE INDEX idx_test_performance_created_at ON test_performance(created_at);
        CREATE INDEX idx_test_performance_data ON test_performance(data);
    " | tee -a "${LOG_FILE}"

    # 更新统计信息
    echo "更新统计信息..." | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -d "${TEST_DB}" -c "ANALYZE test_performance;" | tee -a "${LOG_FILE}"

    # 执行查询测试
    echo "执行查询性能测试..." | tee -a "${LOG_FILE}"

    local query_time
    query_time=$(sudo -u postgres psql -p "${PG_PORT}" -d "${TEST_DB}" -Atc "
        EXPLAIN ANALYZE SELECT * FROM test_performance WHERE created_at > NOW() - INTERVAL '1 hour';
    " | grep "Execution Time" | awk '{print $3}' || echo "0")

    echo "查询执行时间: ${query_time}ms" | tee -a "${LOG_FILE}"

    # 清理测试数据库
    sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE ${TEST_DB};" | tee -a "${LOG_FILE}"

    echo "✓ 性能测试完成" | tee -a "${LOG_FILE}"
}

# 1. 基础服务验证
echo "=== 基础服务验证 ===" | tee -a "${LOG_FILE}"

# 检查PostgreSQL服务状态
if systemctl is-active --quiet postgresql@18-main; then
    echo "✓ PostgreSQL 18服务运行正常" | tee -a "${LOG_FILE}"
else
    echo "❌ PostgreSQL 18服务未运行" | tee -a "${LOG_FILE}"
    exit 1
fi

# 检查端口监听
if netstat -tlnp | grep -q ":${PG_PORT}.*postgres"; then
    echo "✓ PostgreSQL监听端口 ${PG_PORT}" | tee -a "${LOG_FILE}"
else
    echo "❌ PostgreSQL未监听端口 ${PG_PORT}" | tee -a "${LOG_FILE}"
    exit 1
fi

# 2. 版本和兼容性验证
run_sql "SELECT version();" "PostgreSQL版本信息"

# 检查版本号是否符合预期
test_sql "SELECT version();" "PostgreSQL 18" "PostgreSQL版本为18"

# 3. 数据库和对象验证
run_sql "
SELECT
    datname as 数据库名,
    pg_size_pretty(pg_database_size(datname)) as 大小,
    encoding as 编码
FROM pg_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY pg_database_size(datname) DESC;
" "数据库列表和大小"

# 检查数据库数量
db_count=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT count(*) FROM pg_database WHERE datname NOT IN ('template0', 'template1');")
echo "✓ 找到 $db_count 个用户数据库" | tee -a "${LOG_FILE}"

# 4. 扩展验证
run_sql "
SELECT
    extname as 扩展名,
    extversion as 版本,
    n.nspname as 模式
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;
" "已安装扩展"

# 5. 表和索引验证
run_sql "
SELECT
    schemaname as 模式名,
    tablename as 表名,
    n_tup_ins as 插入行数,
    n_tup_upd as 更新行数,
    n_tup_del as 删除行数,
    n_live_tup as 活跃行数,
    n_dead_tup as 死亡行数
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;
" "用户表统计信息（前10个）"

# 6. 索引验证
run_sql "
SELECT
    schemaname as 模式名,
    tablename as 表名,
    indexname as 索引名,
    idx_scan as 索引扫描次数,
    idx_tup_read as 索引读取行数,
    idx_tup_fetch as 索引获取行数
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 10;
" "索引使用统计（前10个）"

# 7. PostgreSQL 18新特性验证

echo "" | tee -a "${LOG_FILE}"
echo "=== PostgreSQL 18新特性验证 ===" | tee -a "${LOG_FILE}"

# 测试DML RETURNING的新语法
echo "测试DML RETURNING old/new语法..." | tee -a "${LOG_FILE}"
sudo -u postgres psql -p "${PG_PORT}" -c "
    CREATE TEMP TABLE test_returning (
        id SERIAL PRIMARY KEY,
        name TEXT,
        value INTEGER
    );

    INSERT INTO test_returning (name, value)
    VALUES ('test', 100)
    RETURNING old.*, new.*;

    UPDATE test_returning
    SET value = value * 2
    RETURNING old.value as old_value, new.value as new_value;

    DELETE FROM test_returning
    RETURNING old.*;
" | tee -a "${LOG_FILE}"

echo "✓ DML RETURNING新语法测试通过" | tee -a "${LOG_FILE}"

# 测试新的统计视图
if sudo -u postgres psql -p "${PG_PORT}" -c "\d pg_stat_io" >/dev/null 2>&1; then
    echo "✓ 新的I/O统计视图pg_stat_io可用" | tee -a "${LOG_FILE}"
else
    echo "⚠️  I/O统计视图pg_stat_io不可用" | tee -a "${LOG_FILE}"
fi

# 测试新的WAL统计
if sudo -u postgres psql -p "${PG_PORT}" -c "\d pg_stat_wal" >/dev/null 2>&1; then
    echo "✓ WAL统计视图pg_stat_wal可用" | tee -a "${LOG_FILE}"
else
    echo "⚠️  WAL统计视图pg_stat_wal不可用" | tee -a "${LOG_FILE}"
fi

# 8. 权限和连接验证
run_sql "
SELECT
    datname as 数据库名,
    usename as 用户名,
    client_addr as 客户端地址,
    state as 连接状态,
    query as 当前查询
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;
" "活跃连接信息"

# 测试新用户连接
echo "测试新用户连接..." | tee -a "${LOG_FILE}"
sudo -u postgres psql -p "${PG_PORT}" -c "
    CREATE USER test_user WITH PASSWORD 'test123';
    GRANT CONNECT ON DATABASE postgres TO test_user;
    REVOKE ALL PRIVILEGES ON DATABASE postgres FROM test_user;
    DROP USER test_user;
" | tee -a "${LOG_FILE}"

echo "✓ 用户权限管理正常" | tee -a "${LOG_FILE}"

# 9. 配置验证
run_sql "
SELECT
    name as 参数名,
    setting as 当前值,
    unit as 单位,
    short_desc as 描述
FROM pg_settings
WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size')
ORDER BY name;
" "重要配置参数"

# 10. 性能基准测试
performance_test

# 11. 备份和恢复测试
echo "" | tee -a "${LOG_FILE}"
echo "=== 备份和恢复测试 ===" | tee -a "${LOG_FILE}"

# 创建测试数据库进行备份测试
sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE IF EXISTS ${TEST_DB};" 2>/dev/null || true
sudo -u postgres psql -p "${PG_PORT}" -c "CREATE DATABASE ${TEST_DB};" | tee -a "${LOG_FILE}"

# 测试pg_dump
test_backup="/tmp/test_backup_$(date +%s).sql"
if sudo -u postgres pg_dump -p "${PG_PORT}" "${TEST_DB}" > "$test_backup" 2>/dev/null; then
    echo "✓ pg_dump备份功能正常" | tee -a "${LOG_FILE}"
    rm -f "$test_backup"
else
    echo "❌ pg_dump备份功能异常" | tee -a "${LOG_FILE}"
fi

# 清理测试数据库
sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE ${TEST_DB};" | tee -a "${LOG_FILE}"

# 12. 监控和日志验证
echo "" | tee -a "${LOG_FILE}"
echo "=== 监控和日志验证 ===" | tee -a "${LOG_FILE}"

# 检查日志目录
if [ -d "/var/log/postgresql" ]; then
    echo "✓ PostgreSQL日志目录存在" | tee -a "${LOG_FILE}"
    log_count=$(find /var/log/postgresql -name "*.log" -type f | wc -l)
    echo "  找到 $log_count 个日志文件" | tee -a "${LOG_FILE}"
else
    echo "⚠️  PostgreSQL日志目录不存在" | tee -a "${LOG_FILE}"
fi

# 检查系统资源使用
echo "系统资源使用情况:" | tee -a "${LOG_FILE}"
echo "PostgreSQL进程数: $(pgrep -c postgres || echo "0")" | tee -a "${LOG_FILE}"
echo "内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')" | tee -a "${LOG_FILE}"
echo "磁盘使用: $(df -h /var/lib/postgresql | tail -1 | awk '{print $3"/"$2" ("$5")"}')" | tee -a "${LOG_FILE}"

# 13. 生成验证报告
echo "" | tee -a "${LOG_FILE}"
echo "=== 验证总结 ===" | tee -a "${LOG_FILE}"

# 统计信息
total_dbs=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT count(*) FROM pg_database WHERE datname NOT IN ('template0', 'template1');")
total_tables=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('information_schema', 'pg_catalog');")
total_indexes=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT count(*) FROM pg_indexes WHERE schemaname NOT IN ('information_schema', 'pg_catalog');")
total_extensions=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT count(*) FROM pg_extension;")

echo "数据库统计:" | tee -a "${LOG_FILE}"
echo "  数据库数量: $total_dbs" | tee -a "${LOG_FILE}"
echo "  用户表数量: $total_tables" | tee -a "${LOG_FILE}"
echo "  索引数量: $total_indexes" | tee -a "${LOG_FILE}"
echo "  扩展数量: $total_extensions" | tee -a "${LOG_FILE}"

# 数据库大小
db_size=$(sudo -u postgres psql -p "${PG_PORT}" -Atc "SELECT pg_size_pretty(sum(pg_database_size(datname))) FROM pg_database WHERE datname NOT IN ('template0', 'template1');")
echo "  总数据大小: $db_size" | tee -a "${LOG_FILE}"

echo "" | tee -a "${LOG_FILE}"
echo "✓ PostgreSQL 18升级验证完成" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"
echo "建议的后续操作:" | tee -a "${LOG_FILE}"
echo "1. 检查应用程序连接是否正常" | tee -a "${LOG_FILE}"
echo "2. 监控系统性能指标" | tee -a "${LOG_FILE}"
echo "3. 逐步启用PostgreSQL 18的新特性" | tee -a "${LOG_FILE}"
echo "4. 确认无问题后清理旧版本文件" | tee -a "${LOG_FILE}"
echo "5. 查看新特性示例: ./new_features_demo.sh" | tee -a "${LOG_FILE}"

exit 0