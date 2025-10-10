#!/bin/bash

# PostgreSQL 16 → 18 升级完整备份脚本
# 按照Linus的标准：简单、可靠、无废话

set -euo pipefail

# 配置参数
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/postgresql/backup_${TIMESTAMP}.log"

# PostgreSQL 16 配置（根据实际情况调整）
PG16_DATA="/var/lib/postgresql/16/main"
PG16_PORT="5432"
PG16_USER="postgres"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"
mkdir -p "$(dirname "${LOG_FILE}")"

echo "=== PostgreSQL 升级备份开始 $(date) ===" | tee "${LOG_FILE}"

# 函数：执行带日志的命令
log_exec() {
    echo "执行: $*" | tee -a "${LOG_FILE}"
    "$@" 2>&1 | tee -a "${LOG_FILE}"
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "错误: 命令执行失败，退出码: $exit_code" | tee -a "${LOG_FILE}"
        exit $exit_code
    fi
}

# 1. 检查PostgreSQL服务状态
echo "检查PostgreSQL 16服务状态..." | tee -a "${LOG_FILE}"
if ! systemctl is-active --quiet postgresql@16-main; then
    echo "警告: PostgreSQL 16服务未运行，尝试启动..." | tee -a "${LOG_FILE}"
    log_exec systemctl start postgresql@16-main
fi

# 2. 验证连接
echo "验证数据库连接..." | tee -a "${LOG_FILE}"
log_exec sudo -u postgres psql -p "${PG16_PORT}" -c "SELECT version();"

# 3. 创建完整逻辑备份 (pg_dumpall)
echo "创建完整逻辑备份..." | tee -a "${LOG_FILE}"
FULL_BACKUP="${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql"
log_exec sudo -u postgres pg_dumpall -p "${PG16_PORT}" > "${FULL_BACKUP}"

# 压缩备份文件
echo "压缩备份文件..." | tee -a "${LOG_FILE}"
gzip "${FULL_BACKUP}"
COMPRESSED_BACKUP="${FULL_BACKUP}.gz"

# 4. 创建物理备份（可选，用于快速恢复）
echo "创建物理备份..." | tee -a "${LOG_FILE}"
PHYSICAL_BACKUP="${BACKUP_DIR}/physical_backup_${TIMESTAMP}.tar.gz"
log_exec sudo -u postgres tar -czf "${PHYSICAL_BACKUP}" -C "$(dirname "${PG16_DATA}")" "$(basename "${PG16_DATA}")"

# 5. 备份配置文件
echo "备份配置文件..." | tee -a "${LOG_FILE}"
CONFIG_BACKUP="${BACKUP_DIR}/config_backup_${TIMESTAMP}.tar.gz"
log_exec sudo tar -czf "${CONFIG_BACKUP}" \
    /etc/postgresql/16/main/postgresql.conf \
    /etc/postgresql/16/main/pg_hba.conf \
    /etc/postgresql/16/main/pg_ident.conf \
    /var/lib/postgresql/16/main/postgresql.auto.conf

# 6. 收集数据库统计信息
echo "收集数据库统计信息..." | tee -a "${LOG_FILE}"
STATS_BACKUP="${BACKUP_DIR}/stats_backup_${TIMESTAMP}.sql"
sudo -u postgres psql -p "${PG16_PORT}" -Atc "SELECT 'SELECT pg_stat_reset();' FROM pg_database WHERE datname != 'template0';" > "${STATS_BACKUP}"

# 7. 验证备份完整性
echo "验证备份完整性..." | tee -a "${LOG_FILE}"
for backup in "${COMPRESSED_BACKUP}" "${PHYSICAL_BACKUP}" "${CONFIG_BACKUP}"; do
    if [ -f "$backup" ] && [ -s "$backup" ]; then
        local size=$(du -h "$backup" | cut -f1)
        echo "✓ $backup ($size)" | tee -a "${LOG_FILE}"
    else
        echo "✗ 备份失败: $backup" | tee -a "${LOG_FILE}"
        exit 1
    fi
done

# 8. 清理旧备份（保留最近5个）
echo "清理旧备份..." | tee -a "${LOG_FILE}"
cd "${BACKUP_DIR}"
ls -t full_backup_*.sql.gz | tail -n +6 | xargs -r rm
ls -t physical_backup_*.tar.gz | tail -n +6 | xargs -r rm
ls -t config_backup_*.tar.gz | tail -n +6 | xargs -r rm

# 9. 生成备份报告
echo "=== 备份完成报告 ===" | tee -a "${LOG_FILE}"
echo "时间戳: ${TIMESTAMP}" | tee -a "${LOG_FILE}"
echo "完整逻辑备份: ${COMPRESSED_BACKUP}" | tee -a "${LOG_FILE}"
echo "物理备份: ${PHYSICAL_BACKUP}" | tee -a "${LOG_FILE}"
echo "配置备份: ${CONFIG_BACKUP}" | tee -a "${LOG_FILE}"
echo "统计信息备份: ${STATS_BACKUP}" | tee -a "${LOG_FILE}"

# 计算总备份大小
TOTAL_SIZE=$(du -ch "${COMPRESSED_BACKUP}" "${PHYSICAL_BACKUP}" "${CONFIG_BACKUP}" | tail -1 | cut -f1)
echo "总备份大小: ${TOTAL_SIZE}" | tee -a "${LOG_FILE}"

echo "=== 备份完成 $(date) ===" | tee -a "${LOG_FILE}"

# 输出下一步操作提示
echo "" | tee -a "${LOG_FILE}"
echo "下一步操作:" | tee -a "${LOG_FILE}"
echo "1. 检查扩展兼容性: ./check_extensions.sh" | tee -a "${LOG_FILE}"
echo "2. 执行升级: ./upgrade_to_pg18.sh" | tee -a "${LOG_FILE}"
echo "3. 验证升级: ./verify_upgrade.sh" | tee -a "${LOG_FILE}"

exit 0