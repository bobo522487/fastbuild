#!/bin/bash

# PostgreSQL 16 → 18 升级脚本 (Swap模式)
# Linus风格：用最聪明的方式解决问题，消除特殊情况

set -euo pipefail

# 配置参数 - 根据实际环境调整
PG16_DATA="/var/lib/postgresql/16/main"
PG18_DATA="/var/lib/postgresql/18/main"
PG16_BIN="/usr/lib/postgresql/16/bin"
PG18_BIN="/usr/lib/postgresql/18/bin"
PG16_PORT="5432"
PG18_PORT="5433"  # 临时端口，避免冲突
PG_USER="postgres"
LOG_FILE="/var/log/postgresql/upgrade_$(date +%Y%m%d_%H%M%S).log"
BACKUP_DIR="/var/backups/postgresql"
PARALLEL_JOBS=$(nproc)  # 使用所有CPU核心

# 创建日志目录
mkdir -p "$(dirname "${LOG_FILE}")"

echo "=== PostgreSQL 16 → 18 升级开始 $(date) ===" | tee "${LOG_FILE}"

# 函数：执行带日志的命令
log_exec() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 执行: $*" | tee -a "${LOG_FILE}"
    "$@" 2>&1 | tee -a "${LOG_FILE}"
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 错误: 命令执行失败，退出码: $exit_code" | tee -a "${LOG_FILE}"
        echo "升级失败！请检查日志: ${LOG_FILE}" | tee -a "${LOG_FILE}"
        exit $exit_code
    fi
}

# 函数：检查前置条件
check_prerequisites() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 检查前置条件 ===" | tee -a "${LOG_FILE}"

    # 1. 检查PostgreSQL 16是否运行
    if ! systemctl is-active --quiet postgresql@16-main; then
        echo "❌ PostgreSQL 16服务未运行" | tee -a "${LOG_FILE}"
        exit 1
    fi
    echo "✓ PostgreSQL 16服务正在运行" | tee -a "${LOG_FILE}"

    # 2. 检查PostgreSQL 18是否已安装
    if [ ! -f "${PG18_BIN}/postgres" ]; then
        echo "❌ PostgreSQL 18未安装或路径错误: ${PG18_BIN}" | tee -a "${LOG_FILE}"
        exit 1
    fi
    echo "✓ PostgreSQL 18二进制文件存在" | tee -a "${LOG_FILE}"

    # 3. 检查磁盘空间 (至少需要数据目录2倍的空间)
    local data_size=$(du -sb "${PG16_DATA}" | cut -f1)
    local available_space=$(df -BG "$(dirname "${PG16_DATA}")" | awk 'NR==2 {print $4*1024*1024*1024}')
    local required_space=$((data_size * 2))

    if [ "$available_space" -lt "$required_space" ]; then
        echo "❌ 磁盘空间不足。需要: $((required_space/1024/1024/1024))GB，可用: $((available_space/1024/1024/1024))GB" | tee -a "${LOG_FILE}"
        exit 1
    fi
    echo "✓ 磁盘空间充足" | tee -a "${LOG_FILE}"

    # 4. 检查备份文件
    local latest_backup=$(ls -t "${BACKUP_DIR}"/full_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$latest_backup" ]; then
        echo "❌ 未找到备份文件，请先运行 ./backup_pg16.sh" | tee -a "${LOG_FILE}"
        exit 1
    fi
    echo "✓ 找到备份文件: $(basename "$latest_backup")" | tee -a "${LOG_FILE}"

    # 5. 检查是否有活跃连接
    local active_connections=$(sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND pid != pg_backend_pid();")
    if [ "$active_connections" -gt 0 ]; then
        echo "⚠️  发现 $active_connections 个活跃连接，建议在维护窗口期间执行升级" | tee -a "${LOG_FILE}"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "升级已取消" | tee -a "${LOG_FILE}"
            exit 1
        fi
    fi
}

# 函数：停止PostgreSQL 16服务
stop_pg16() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 停止PostgreSQL 16服务 ===" | tee -a "${LOG_FILE}"
    log_exec systemctl stop postgresql@16-main
    echo "✓ PostgreSQL 16服务已停止" | tee -a "${LOG_FILE}"
}

# 函数：初始化PostgreSQL 18
init_pg18() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 初始化PostgreSQL 18 ===" | tee -a "${LOG_FILE}"

    # 创建PostgreSQL 18数据目录
    if [ ! -d "${PG18_DATA}" ]; then
        echo "创建PostgreSQL 18数据目录..." | tee -a "${LOG_FILE}"
        log_exec sudo -u postgres mkdir -p "${PG18_DATA}"
    fi

    # 如果数据目录为空，则初始化
    if [ -z "$(ls -A "${PG18_DATA}")" ]; then
        echo "初始化新的PostgreSQL 18集群..." | tee -a "${LOG_FILE}"
        log_exec sudo -u postgres "${PG18_BIN}/initdb" -D "${PG18_DATA}" --no-locale -E UTF8

        # 复制旧的配置文件作为基础
        echo "复制配置文件..." | tee -a "${LOG_FILE}"
        log_exec sudo -u postgres cp "${PG16_DATA}/postgresql.conf" "${PG18_DATA}/postgresql.conf.old"
        log_exec sudo -u postgres cp "${PG16_DATA}/pg_hba.conf" "${PG18_DATA}/pg_hba.conf.old"

        # 调整PostgreSQL 18配置以使用临时端口
        log_exec sudo -u postgres sed -i "s/port = 5432/port = ${PG18_PORT}/" "${PG18_DATA}/postgresql.conf"

        # 启动PostgreSQL 18以完成初始化
        log_exec sudo -u postgres "${PG18_BIN}/pg_ctl" -D "${PG18_DATA}" -l "${LOG_FILE}" start
        sleep 5

        # 停止PostgreSQL 18，准备升级
        log_exec sudo -u postgres "${PG18_BIN}/pg_ctl" -D "${PG18_DATA}" stop
    fi

    echo "✓ PostgreSQL 18初始化完成" | tee -a "${LOG_FILE}"
}

# 函数：执行pg_upgrade (使用swap模式)
perform_upgrade() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 执行pg_upgrade (Swap模式) ===" | tee -a "${LOG_FILE}"

    # 设置环境变量
    export PGBINOLD="${PG16_BIN}"
    export PGBINNEW="${PG18_BIN}"
    export PGDATAOLD="${PG16_DATA}"
    export PGDATANEW="${PG18_DATA}"
    export PGPORTOLD="${PG16_PORT}"
    export PGPORTNEW="${PG18_PORT}"
    export PGUSER="${PG_USER}"

    echo "升级参数:" | tee -a "${LOG_FILE}"
    echo "  旧数据目录: ${PGDATAOLD}" | tee -a "${LOG_FILE}"
    echo "  新数据目录: ${PGDATANEW}" | tee -a "${LOG_FILE}"
    echo "  旧二进制目录: ${PGBINOLD}" | tee -a "${LOG_FILE}"
    echo "  新二进制目录: ${PGBINNEW}" | tee -a "${LOG_FILE}"
    echo "  并行任务数: ${PARALLEL_JOBS}" | tee -a "${LOG_FILE}"
    echo "  使用swap模式: 是" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"

    # 执行pg_upgrade
    log_exec sudo -u postgres "${PG18_BIN}/pg_upgrade" \
        --old-datadir="${PGDATAOLD}" \
        --new-datadir="${PGDATANEW}" \
        --old-bindir="${PGBINOLD}" \
        --new-bindir="${PGBINNEW}" \
        --old-port="${PGPORTOLD}" \
        --new-port="${PGPORTNEW}" \
        --user="${PGUSER}" \
        --swap \
        --jobs="${PARALLEL_JOBS}" \
        --sync-method=fsync \
        --verbose

    echo "✓ pg_upgrade完成" | tee -a "${LOG_FILE}"
}

# 函数：更新配置文件
update_config() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 更新配置文件 ===" | tee -a "${LOG_FILE}"

    # 恢复原始端口设置
    log_exec sudo -u postgres sed -i "s/port = ${PG18_PORT}/port = 5432/" "${PG18_DATA}/postgresql.conf"

    # 更新PostgreSQL 18的新配置选项
    echo "启用PostgreSQL 18新特性..." | tee -a "${LOG_FILE}"

    # 启用WAL IO时间跟踪
    echo "track_wal_io_timing = on" | sudo -u postgres tee -a "${PG18_DATA}/postgresql.conf"

    # 启用锁失败日志
    echo "log_lock_failures = on" | sudo -u postgres tee -a "${PG18_DATA}/postgresql.conf"

    # 优化文件复制方法
    echo "file_copy_method = 'preferred'" | sudo -u postgres tee -a "${PG18_DATA}/postgresql.conf"

    # 启用成本延迟时间跟踪
    echo "track_cost_delay_timing = on" | sudo -u postgres tee -a "${PG18_DATA}/postgresql.conf"

    echo "✓ 配置文件更新完成" | tee -a "${LOG_FILE}"
}

# 函数：启动PostgreSQL 18服务
start_pg18() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 启动PostgreSQL 18服务 ===" | tee -a "${LOG_FILE}"

    # 禁用PostgreSQL 16服务，启用PostgreSQL 18服务
    log_exec systemctl disable postgresql@16-main
    log_exec systemctl enable postgresql@18-main

    # 启动PostgreSQL 18服务
    log_exec systemctl start postgresql@18-main

    # 等待服务启动
    sleep 10

    # 验证服务状态
    if systemctl is-active --quiet postgresql@18-main; then
        echo "✓ PostgreSQL 18服务启动成功" | tee -a "${LOG_FILE}"
    else
        echo "❌ PostgreSQL 18服务启动失败" | tee -a "${LOG_FILE}"
        exit 1
    fi
}

# 函数：验证升级结果
verify_upgrade() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 验证升级结果 ===" | tee -a "${LOG_FILE}"

    # 检查版本
    local version=$(sudo -u postgres psql -p 5432 -Atc "SELECT version();")
    echo "新版本: $version" | tee -a "${LOG_FILE}"

    # 检查数据库数量
    local db_count=$(sudo -u postgres psql -p 5432 -Atc "SELECT count(*) FROM pg_database WHERE datname NOT IN ('template0', 'template1');")
    echo "数据库数量: $db_count" | tee -a "${LOG_FILE}"

    # 检查表数量
    local table_count=$(sudo -u postgres psql -p 5432 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('information_schema', 'pg_catalog');")
    echo "用户表数量: $table_count" | tee -a "${LOG_FILE}"

    # 检查扩展状态
    local ext_count=$(sudo -u postgres psql -p 5432 -Atc "SELECT count(*) FROM pg_extension;")
    echo "扩展数量: $ext_count" | tee -a "${LOG_FILE}"

    echo "✓ 升级验证完成" | tee -a "${LOG_FILE}"
}

# 函数：清理旧文件
cleanup() {
    echo "" | tee -a "${LOG_FILE}"
    echo "=== 清理旧文件 ===" | tee -a "${LOG_FILE}"

    # 重命名旧数据目录
    if [ -d "${PG16_DATA}" ]; then
        log_exec mv "${PG16_DATA}" "${PG16_DATA}.old.$(date +%Y%m%d_%H%M%S)"
        echo "✓ 旧数据目录已重命名" | tee -a "${LOG_FILE}"
    fi

    echo "建议在确认升级成功后删除旧数据目录以释放磁盘空间" | tee -a "${LOG_FILE}"
}

# 函数：错误处理
handle_error() {
    echo "" | tee -a "${LOG_FILE}"
    echo "❌ 升级过程中发生错误！" | tee -a "${LOG_FILE}"
    echo "请检查日志文件: ${LOG_FILE}" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "恢复步骤:" | tee -a "${LOG_FILE}"
    echo "1. 停止所有PostgreSQL服务" | tee -a "${LOG_FILE}"
    echo "2. 恢复备份: gunzip -c ${BACKUP_DIR}/full_backup_*.sql.gz | psql" | tee -a "${LOG_FILE}"
    echo "3. 启动PostgreSQL 16服务" | tee -a "${LOG_FILE}"
    echo "4. 验证数据完整性" | tee -a "${LOG_FILE}"
    exit 1
}

# 设置错误处理
trap handle_error ERR

# 主执行流程
main() {
    check_prerequisites
    stop_pg16
    init_pg18
    perform_upgrade
    update_config
    start_pg18
    verify_upgrade
    cleanup

    echo "" | tee -a "${LOG_FILE}"
    echo "=== PostgreSQL升级成功完成 $(date) ===" | tee -a "${LOG_FILE}"
    echo "" | tee -a "${LOG_FILE}"
    echo "下一步操作:" | tee -a "${LOG_FILE}"
    echo "1. 运行验证脚本: ./verify_upgrade.sh" | tee -a "${LOG_FILE}"
    echo "2. 测试应用程序连接" | tee -a "${LOG_FILE}"
    echo "3. 查看新特性: ./new_features_demo.sh" | tee -a "${LOG_FILE}"
    echo "4. 确认无问题后删除旧数据目录" | tee -a "${LOG_FILE}"
}

# 执行主函数
main "$@"