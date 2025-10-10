#!/bin/bash

# PostgreSQL 扩展兼容性检查脚本
# Linus风格：找出真正的问题，不是制造复杂的解决方案

set -euo pipefail

# 配置参数
PG16_PORT="5432"
PG16_USER="postgres"
LOG_FILE="/var/log/postgresql/extension_check_$(date +%Y%m%d_%H%M%S).log"

# 创建日志目录
mkdir -p "$(dirname "${LOG_FILE}")"

echo "=== PostgreSQL 扩展兼容性检查 $(date) ===" | tee "${LOG_FILE}"

# 函数：执行SQL查询并格式化输出
run_sql() {
    local sql="$1"
    local description="$2"
    echo "" | tee -a "${LOG_FILE}"
    echo "=== $description ===" | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG16_PORT}" -c "$sql" | tee -a "${LOG_FILE}"
}

# 1. 检查所有已安装的扩展
run_sql "
SELECT
    extname as 扩展名,
    extversion as 当前版本,
    n.nspname as 模式名,
    extrelocatable as 可重定位
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;
" "已安装扩展列表"

# 2. 检查每个扩展的更新路径
echo "" | tee -a "${LOG_FILE}"
echo "=== 扩展更新路径检查 ===" | tee -a "${LOG_FILE}"

# 获取所有扩展名并检查更新路径
extensions=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT extname FROM pg_extension ORDER BY extname;")

for ext in $extensions; do
    echo "" | tee -a "${LOG_FILE}"
    echo "--- 扩展: $ext ---" | tee -a "${LOG_FILE}"

    # 检查更新路径
    update_paths=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT * FROM pg_extension_update_paths('$ext');" 2>/dev/null || echo "无法获取更新路径")

    if [ -n "$update_paths" ] && [ "$update_paths" != "无法获取更新路径" ]; then
        echo "更新路径: $update_paths" | tee -a "${LOG_FILE}"

        # 检查是否有可用的更新
        if echo "$update_paths" | grep -q "=>"; then
            echo "⚠️  扩展 $ext 有可用更新，升级前需要处理" | tee -a "${LOG_FILE}"
        else
            echo "✓ 扩展 $ext 无需更新" | tee -a "${LOG_FILE}"
        fi
    else
        echo "❓ 扩展 $ext 更新路径未知，需要手动检查" | tee -a "${LOG_FILE}"
    fi
done

# 3. 检查可能的问题扩展
echo "" | tee -a "${LOG_FILE}"
echo "=== 潜在问题扩展检查 ===" | tee -a "${LOG_FILE}"

run_sql "
-- 检查使用了C语言的扩展（可能需要重新编译）
SELECT
    extname as 扩展名,
    extversion as 版本,
    'C语言扩展' as 类型,
    '可能需要重新编译' as 建议
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN (
    SELECT DISTINCT split_part(extconfig::text, ',', 1)
    FROM pg_extension
    WHERE extconfig IS NOT NULL
) OR extname IN ('pg_stat_statements', 'auto_explain', 'pg_prewarm');
" "C语言扩展检查"

# 4. 检查自定义数据类型
run_sql "
SELECT
    n.nspname as 模式名,
    t.typname as 类型名,
    '自定义类型' as 类型,
    CASE
        WHEN t.typinput::regproc::oid < 16384 THEN '内置类型'
        ELSE '用户定义类型'
    END as 来源
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typtype = 'b'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, t.typname;
" "自定义数据类型检查"

# 5. 检查函数和存储过程
run_sql "
SELECT
    n.nspname as 模式名,
    p.proname as 函数名,
    pg_get_function_result(p.oid) as 返回类型,
    '存储函数' as 类型
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prolang != 13  -- 非 SQL 函数
LIMIT 10;
" "非SQL函数检查（前10个）"

# 6. 检查表和索引统计
run_sql "
SELECT
    count(distinct schemaname) as 模式数,
    count(distinct tablename) as 表数,
    sum(seq_scan) as 总顺序扫描,
    sum(idx_scan) as 总索引扫描,
    sum(n_tup_ins + n_tup_upd + n_tup_del) as 总数据变更
FROM pg_stat_user_tables;
" "数据库活动统计"

# 7. 生成兼容性报告
echo "" | tee -a "${LOG_FILE}"
echo "=== 兼容性检查总结 ===" | tee -a "${LOG_FILE}"

# 检查PostgreSQL版本
version=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT version();")
echo "当前PostgreSQL版本: $version" | tee -a "${LOG_FILE}"

# 统计扩展数量
ext_count=$(echo "$extensions" | wc -w)
echo "已安装扩展数量: $ext_count" | tee -a "${LOG_FILE}"

# 检查磁盘空间
data_size=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT pg_size_pretty(pg_database_size(current_database()));")
echo "数据库大小: $data_size" | tee -a "${LOG_FILE}"

# 检查是否有活跃连接
active_connections=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
echo "活跃连接数: $active_connections" | tee -a "${LOG_FILE}"

# 8. 建议和警告
echo "" | tee -a "${LOG_FILE}"
echo "=== 升级建议 ===" | tee -a "${LOG_FILE}"

if [ "$active_connections" -gt 0 ]; then
    echo "⚠️  发现活跃连接，建议在维护窗口期间执行升级" | tee -a "${LOG_FILE}"
fi

echo "✓ 升级前务必执行完整备份: ./backup_pg16.sh" | tee -a "${LOG_FILE}"
echo "✓ 建议在测试环境中先验证升级过程" | tee -a "${LOG_FILE}"
echo "✓ 升级后运行 ./verify_upgrade.sh 验证功能" | tee -a "${LOG_FILE}"

# 如果有C语言扩展，给出特别警告
c_extensions=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "
SELECT extname FROM pg_extension
WHERE extname IN ('pg_stat_statements', 'auto_explain', 'pg_prewarm', 'plpgsql', 'plpython3u', 'plperl', 'pltcl');")

if [ -n "$c_extensions" ]; then
    echo "" | tee -a "${LOG_FILE}"
    echo "⚠️  检测到以下C语言扩展，升级前确保已安装PostgreSQL 18兼容版本:" | tee -a "${LOG_FILE}"
    echo "$c_extensions" | tee -a "${LOG_FILE}"
fi

echo "" | tee -a "${LOG_FILE}"
echo "=== 扩展兼容性检查完成 $(date) ===" | tee -a "${LOG_FILE}"

exit 0