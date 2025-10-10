#!/bin/bash

# PostgreSQL 18 新特性演示脚本
# Linus风格：展示真正有用的改进，不是花哨的功能

set -euo pipefail

# 配置参数
PG_PORT="5432"
PG_USER="postgres"
DEMO_DB="pg18_demo"
LOG_FILE="/var/log/postgresql/demo_$(date +%Y%m%d_%H%M%S).log"

# 创建日志目录
mkdir -p "$(dirname "${LOG_FILE}")"

echo "=== PostgreSQL 18 新特性演示 $(date) ===" | tee "${LOG_FILE}"

# 函数：执行SQL并格式化输出
run_sql() {
    local sql="$1"
    local description="$2"
    echo "" | tee -a "${LOG_FILE}"
    echo "=== $description ===" | tee -a "${LOG_FILE}"
    sudo -u postgres psql -p "${PG_PORT}" -c "$sql" | tee -a "${LOG_FILE}"
}

# 函数：创建演示环境
setup_demo() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 设置演示环境 ===" | tee -a "${LOG_FILE}"

    # 创建演示数据库
    sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE IF EXISTS ${DEMO_DB};" 2>/dev/null || true
    sudo -u postgres psql -p "${PG_PORT}" -c "CREATE DATABASE ${DEMO_DB};" | tee -a "${LOG_FILE}"

    # 创建测试表
    sudo -u postgres psql -p "${PG_PORT}" -d "${DEMO_DB}" -c "
        CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price DECIMAL(10,2),
            category TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER,
            order_date TIMESTAMP DEFAULT NOW(),
            status TEXT DEFAULT 'pending'
        );

        CREATE TABLE audit_log (
            id SERIAL PRIMARY KEY,
            table_name TEXT,
            operation TEXT,
            old_data JSONB,
            new_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );

        INSERT INTO products (name, price, category) VALUES
        ('Laptop', 999.99, 'Electronics'),
        ('Mouse', 29.99, 'Electronics'),
        ('Keyboard', 79.99, 'Electronics'),
        ('Monitor', 299.99, 'Electronics'),
        ('Desk Chair', 199.99, 'Furniture');

        INSERT INTO orders (product_id, quantity, status) VALUES
        (1, 1, 'completed'),
        (2, 2, 'completed'),
        (3, 1, 'pending'),
        (1, 1, 'shipped');
    " | tee -a "${LOG_FILE}"

    echo "✓ 演示环境设置完成" | tee -a "${LOG_FILE}"
}

# 1. DML RETURNING 增强功能
demo_returning_syntax() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 1: DML RETURNING old/new 语法增强 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- INSERT 操作返回新旧值
        INSERT INTO products (name, price, category)
        VALUES ('Webcam', 49.99, 'Electronics')
        RETURNING old.*, new.*;
    " "INSERT RETURNING old/new 语法"

    run_sql "
        -- UPDATE 操作返回新旧值对比
        UPDATE products
        SET price = price * 1.10, updated_at = NOW()
        WHERE category = 'Electronics'
        RETURNING
            name,
            old.price AS old_price,
            new.price AS new_price,
            new.price - old.price AS price_increase;
    " "UPDATE RETURNING 新旧值对比"

    run_sql "
        -- DELETE 操作返回被删除的数据
        DELETE FROM orders
        WHERE status = 'pending'
        RETURNING old.*;
    " "DELETE RETURNING 被删除数据"

    run_sql "
        -- MERGE 操作的RETURNING语法
        MERGE INTO products p
        USING (VALUES ('Monitor', 319.99), ('Desk Chair', 219.99)) AS updates(name, price)
        ON p.name = updates.name
        WHEN MATCHED THEN
            UPDATE SET price = updates.price
            RETURNING old.price AS old_price, new.price AS new_price;
    " "MERGE RETURNING 语法"
}

# 2. 新的统计和监控功能
demo_monitoring_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 2: 增强的统计和监控功能 ===" | tee -a "${LOG_FILE}"

    # 启用新的统计选项
    sudo -u postgres psql -p "${PG_PORT}" -d "${DEMO_DB}" -c "
        SET track_cost_delay_timing = on;
        SET track_wal_io_timing = on;
    " | tee -a "${LOG_FILE}"

    run_sql "
        -- 查看新的I/O统计视图
        SELECT
            object,
            reads,
            read_time,
            writes,
            write_time,
            extend_time
        FROM pg_stat_io
        WHERE object = 'relation'
        LIMIT 5;
    " "新的I/O统计视图 pg_stat_io"

    run_sql "
        -- 查看WAL统计信息
        SELECT
            wal_records,
            wal_fpi,
            wal_bytes,
            wal_buffers_full,
            wal_write_time,
            wal_sync_time
        FROM pg_stat_wal;
    " "增强的WAL统计 pg_stat_wal"

    run_sql "
        -- 查看检查点统计
        SELECT
            num_timed,
            num_requested,
            checkpoint_write_time,
            checkpoint_sync_time,
            checkpoint_write_time_ms,
            checkpoint_sync_time_ms
        FROM pg_stat_checkpointer;
    " "检查点统计增强"

    # 执行一些操作来生成统计数据
    sudo -u postgres psql -p "${PG_PORT}" -d "${DEMO_DB}" -c "
        -- 执行一些查询和更新操作
        UPDATE products SET price = price * 1.05 WHERE category = 'Electronics';
        SELECT * FROM orders WHERE order_date > NOW() - INTERVAL '1 day';
        VACUUM ANALYZE products;
    " | tee -a "${LOG_FILE}"

    run_sql "
        -- 查看VACUUM/ANALYZE统计
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
            autoanalyze_count
        FROM pg_stat_user_tables
        WHERE tablename IN ('products', 'orders');
    " "VACUUM/ANALYZE 时间统计"
}

# 3. 新的排序和字符串功能
demo_string_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 3: 新的排序和字符串功能 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- PG_UNICODE_FAST 排序规则演示
        CREATE TABLE test_collation (
            text_data TEXT COLLATE \"PG_UNICODE_FAST\"
        );

        INSERT INTO test_collation VALUES
        ('café'), ('Café'), ('apple'), ('Apple'), ('éclair');

        -- 演示排序
        SELECT text_data, text_data COLLATE \"PG_UNICODE_FAST\" as sorted
        FROM test_collation
        ORDER BY text_data COLLATE \"PG_UNICODE_FAST\";
    " "PG_UNICODE_FAST 排序规则"

    run_sql "
        -- EXTRACT函数的新WEEK选项
        SELECT
            name,
            created_at,
            EXTRACT(WEEK FROM created_at) as week_of_year,
            EXTRACT(QUARTER FROM created_at) as quarter,
            EXTRACT(DOY FROM created_at) as day_of_year
        FROM products
        LIMIT 3;
    " "EXTRACT函数WEEK选项"

    run_sql "
        -- to_number函数的罗马数字支持
        SELECT
            to_number('MCMXCIV', 'RN') as roman_numeral_1994,
            to_number('MMXXIII', 'RN') as roman_numeral_2023,
            to_number('IV', 'RN') as roman_numeral_4;
    " "to_number罗马数字支持"

    run_sql "
        -- CRC32函数演示
        SELECT
            crc32('PostgreSQL 18') as crc32_value,
            crc32c('PostgreSQL 18') as crc32c_value,
            length('PostgreSQL 18') as string_length;
    " "CRC32和CRC32C函数"
}

# 4. 增强的pgcrypto功能
demo_pgcrypto_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 4: 增强的pgcrypto功能 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- 创建pgcrypto扩展
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    " "启用pgcrypto扩展"

    run_sql "
        -- SHA256crypt和SHA512crypt密码哈希
        SELECT
            crypt('mypassword', gen_salt('sha256')) as sha256_hash,
            crypt('mypassword', gen_salt('sha512')) as sha512_hash;
    " "SHA256/SHA512密码哈希"

    run_sql "
        -- 密码验证演示
        WITH passwords AS (
            SELECT
                crypt('user123', gen_salt('sha256')) as stored_hash,
                'user123' as input_password
        )
        SELECT
            stored_hash,
            input_password,
            crypt(input_password, stored_hash) = stored_hash as password_valid;
    " "密码验证功能"

    run_sql "
        -- CFB模式加密/解密
        SELECT
            encrypt('secret message', 'encryptionkey', 'aes-128-cfb') as encrypted_data,
            decrypt(encrypt('secret message', 'encryptionkey', 'aes-128-cfb'), 'encryptionkey', 'aes-128-cfb') as decrypted_data;
    " "CFB模式加密解密"

    run_sql "
        -- FIPS模式检查
        SELECT fips_mode() as fips_compliance_mode;
    " "FIPS合规模式检查"
}

# 5. 数组和复合类型的聚合函数
demo_aggregate_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 5: 数组和复合类型的聚合函数 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- 创建测试数据
        CREATE TABLE array_test (
            id INTEGER,
            data_array INTEGER[]
        );

        INSERT INTO array_test VALUES
        (1, ARRAY[1, 2, 3]),
        (2, ARRAY[2, 3, 4]),
        (3, ARRAY[1, 5, 6]),
        (4, ARRAY[2, 4, 8]);

        -- 演示数组MIN/MAX聚合
        SELECT
            MIN(data_array) as min_array,
            MAX(data_array) as max_array
        FROM array_test;
    " "数组类型的MIN/MAX聚合"

    run_sql "
        -- 复合类型聚合演示
        CREATE TYPE product_summary AS (
            total_products INTEGER,
            avg_price DECIMAL,
            max_price DECIMAL,
            min_price DECIMAL
        );

        SELECT
            ROW(
                COUNT(*),
                AVG(price),
                MAX(price),
                MIN(price)
            )::product_summary as summary
        FROM products;
    " "复合类型的聚合函数"
}

# 6. 分区表ONLY选项
demo_partition_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 6: 分区表的ONLY选项 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- 创建分区表示例
        CREATE TABLE sales (
            id SERIAL,
            sale_date DATE,
            amount DECIMAL(10,2),
            region TEXT
        ) PARTITION BY RANGE (sale_date);

        CREATE TABLE sales_2024_q1 PARTITION OF sales
            FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

        CREATE TABLE sales_2024_q2 PARTITION OF sales
            FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

        INSERT INTO sales (sale_date, amount, region) VALUES
        ('2024-01-15', 1000.00, 'North'),
        ('2024-02-20', 1500.00, 'South'),
        ('2024-05-10', 2000.00, 'East'),
        ('2024-06-15', 1200.00, 'West');

        -- 使用ONLY选项只处理父表
        VACUUM ONLY sales;
        ANALYZE ONLY sales;

        SELECT 'Partitioned table processed with ONLY option' as result;
    " "分区表的ONLY选项"
}

# 7. 新的连接和认证功能
demo_connection_features() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 新特性 7: 增强的连接和认证功能 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- 查看连接详细信息
        SELECT
            datname as database_name,
            usename as username,
            application_name,
            client_addr as client_address,
            state as connection_state,
            backend_start,
            query_start,
            state_change
        FROM pg_stat_activity
        WHERE state != 'idle'
        ORDER BY query_start DESC
        LIMIT 3;
    " "增强的连接信息查看"

    run_sql "
        -- 演示新的权限管理函数
        SELECT pg_get_acl('products'::regclass) as product_table_acl;
    " "权限查看函数"
}

# 8. 性能优化建议
demo_performance_tips() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== PostgreSQL 18 性能优化建议 ===" | tee -a "${LOG_FILE}"

    run_sql "
        -- 推荐的配置设置
        SELECT 'Recommended PostgreSQL 18 Settings:' as recommendation;

        SELECT 'track_wal_io_timing = on' as setting;
        SELECT 'track_cost_delay_timing = on' as setting;
        SELECT 'log_lock_failures = on' as setting;
        SELECT 'file_copy_method = preferred' as setting;
    " "推荐配置设置"

    run_sql "
        -- 查看当前系统资源使用
        SELECT
            'System Resources' as metric_type,
            'Max Connections' as metric,
            setting::INTEGER as current_value,
            CASE
                WHEN setting::INTEGER < 100 THEN 'Consider increasing'
                ELSE 'OK'
            END as recommendation
        FROM pg_settings WHERE name = 'max_connections'

        UNION ALL

        SELECT
            'Memory Settings' as metric_type,
            'Shared Buffers' as metric,
            setting as current_value,
            CASE
                WHEN setting ~ '^[0-9]+$' AND setting::INTEGER < 262144 THEN 'Consider increasing (256MB+ recommended)'
                ELSE 'OK'
            END as recommendation
        FROM pg_settings WHERE name = 'shared_buffers';
    " "系统资源使用评估"

    run_sql "
        -- 并行查询统计
        SELECT
            'Parallel Query Statistics' as info_type,
            parallel_workers_to_launch,
            parallel_workers_launched,
            CASE
                WHEN parallel_workers_launched > 0 THEN 'Parallel execution working'
                ELSE 'No parallel execution detected'
            END as status
        FROM pg_stat_database
        WHERE datname = current_database()
        LIMIT 1;
    " "并行查询统计"
}

# 9. 清理演示环境
cleanup_demo() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 清理演示环境 ===" | tee -a "${LOG_FILE}"

    sudo -u postgres psql -p "${PG_PORT}" -c "DROP DATABASE IF EXISTS ${DEMO_DB};" | tee -a "${LOG_FILE}"
    echo "✓ 演示环境清理完成" | tee -a "${LOG_FILE}"
}

# 主执行流程
main() {
    setup_demo
    demo_returning_syntax
    demo_monitoring_features
    demo_string_features
    demo_pgcrypto_features
    demo_aggregate_features
    demo_partition_features
    demo_connection_features
    demo_performance_tips
    cleanup_demo

    echo "" | tee -a "${LOG_FILE}"
    echo "=== PostgreSQL 18 新特性演示完成 ===" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "关键新特性总结:" | tee -a "${LOG_FILE}"
    echo "1. DML RETURNING old/new 语法 - 简化应用开发" | tee -a "${LOG_FILE}"
    echo "2. 增强的I/O和WAL统计 - 更好的监控能力" | tee -a "${LOG_FILE}"
    echo "3. PG_UNICODE_FAST排序规则 - 性能优化" | tee -a "${LOG_FILE}"
    echo "4. SHA256/512密码哈希 - 增强安全性" | tee -a "${LOG_FILE}"
    echo "5. 数组和复合类型聚合 - 更灵活的数据处理" | tee -a "${LOG_FILE}"
    echo "6. 分区表ONLY选项 - 更精确的维护控制" | tee -a "${LOG_FILE}"
    echo "7. 增强的连接信息 - 更好的诊断能力" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "建议在项目中逐步采用这些新特性以提升性能和开发效率。" | tee -a "${LOG_FILE}"
}

# 执行主函数
main "$@"