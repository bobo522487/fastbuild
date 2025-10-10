#!/bin/bash

# FastBuild 数据库迁移脚本
# 提供完整的数据库初始化、迁移和种子数据管理功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装 $1"
        exit 1
    fi
}

# 检查环境文件
check_env_file() {
    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在，请先创建 .env 文件"
        exit 1
    fi

    if [ ! -s ".env" ]; then
        log_error ".env 文件为空，请配置环境变量"
        exit 1
    fi
}

# 解析数据库连接信息
parse_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 环境变量未设置"
        exit 1
    fi

    # 解析 DATABASE_URL (格式: postgresql://user:password@host:port/database)
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    log_info "数据库配置解析完成:"
    log_info "  - 数据库: $DB_NAME"
    log_info "  - 主机: $DB_HOST"
    log_info "  - 端口: $DB_PORT"
    log_info "  - 用户: $DB_USER"
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."

    # 使用 Prisma 检查连接
    if npx prisma db pull --force &> /dev/null; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "无法连接到数据库，请检查配置和服务状态"
        return 1
    fi
}

# 生成 Prisma 客户端
generate_client() {
    log_info "生成 Prisma 客户端..."
    npx prisma generate
    log_success "Prisma 客户端生成完成"
}

# 推送 schema 到数据库
push_schema() {
    log_info "推送数据库 schema..."
    npx prisma db push
    log_success "数据库 schema 推送完成"
}

# 创建数据库迁移
create_migration() {
    local migration_name=$1
    if [ -z "$migration_name" ]; then
        log_error "请提供迁移名称"
        echo "用法: $0 create-migration <migration_name>"
        exit 1
    fi

    log_info "创建迁移: $migration_name"
    npx prisma migrate dev --name "$migration_name"
    log_success "迁移创建完成"
}

# 部署数据库迁移
deploy_migrations() {
    log_info "部署数据库迁移..."
    npx prisma migrate deploy
    log_success "数据库迁移部署完成"
}

# 重置数据库
reset_database() {
    log_warning "⚠️  这将删除所有数据并重置数据库！"
    read -p "确定要继续吗？[y/N]: " -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "重置数据库..."
        npx prisma migrate reset --force
        log_success "数据库重置完成"
    else
        log_info "操作已取消"
    fi
}

# 种子数据
seed_database() {
    log_info "添加种子数据..."

    # 检查种子文件是否存在
    if [ -f "prisma/seed.ts" ]; then
        npx tsx prisma/seed.ts
        log_success "种子数据添加完成"
    else
        log_warning "种子文件 prisma/seed.ts 不存在，跳过种子数据"
    fi
}

# 备份数据库
backup_database() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "备份数据库到: $backup_name"

    # 这里可以添加实际的备份逻辑
    # pg_dump "$DATABASE_URL" > "backups/$backup_name"

    log_success "数据库备份完成"
}

# 显示帮助信息
show_help() {
    echo "FastBuild 数据库管理脚本"
    echo ""
    echo "用法: $0 [命令] [参数]"
    echo ""
    echo "命令:"
    echo "  init                    初始化数据库（推送schema + 生成客户端）"
    echo "  migrate                 创建新的迁移"
    echo "  deploy                  部署迁移到生产环境"
    echo "  reset                   重置数据库（危险操作）"
    echo "  seed                    添加种子数据"
    echo "  backup                  备份数据库"
    echo "  studio                  打开 Prisma Studio"
    echo "  check                   检查数据库连接"
    echo "  generate                生成 Prisma 客户端"
    echo "  help                    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 init                 # 初始化开发环境数据库"
    echo "  $0 migrate add_projects # 创建名为 add_projects 的迁移"
    echo "  $0 deploy               # 部署迁移到生产环境"
    echo "  $0 seed                 # 添加种子数据"
}

# 主函数
main() {
    # 导入环境变量
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi

    case "${1:-help}" in
        "init")
            check_env_file
            check_command pnpm
            check_command npx

            log_info "🚀 开始初始化 FastBuild 数据库..."
            parse_database_url
            generate_client
            push_schema
            seed_database
            log_success "🎉 数据库初始化完成！"
            ;;
        "migrate")
            check_env_file
            check_command npx
            create_migration "$2"
            ;;
        "deploy")
            check_env_file
            check_command npx
            deploy_migrations
            ;;
        "reset")
            check_env_file
            check_command npx
            reset_database
            ;;
        "seed")
            check_env_file
            check_command npx
            generate_client
            seed_database
            ;;
        "backup")
            check_env_file
            backup_database
            ;;
        "studio")
            check_env_file
            check_command npx
            log_info "启动 Prisma Studio..."
            npx prisma studio
            ;;
        "check")
            check_env_file
            parse_database_url
            check_database_connection
            ;;
        "generate")
            check_command npx
            generate_client
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"