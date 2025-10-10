#!/bin/bash

# 数据库环境检查脚本
# 验证数据库连接、schema和数据完整性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查必需命令
check_dependencies() {
    log_info "检查依赖..."

    local missing_deps=()

    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    if ! command -v npx &> /dev/null; then
        missing_deps+=("npx")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必需的命令: ${missing_deps[*]}"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 检查环境文件
check_env_file() {
    log_info "检查环境配置..."

    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在"
        return 1
    fi

    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 环境变量未设置"
        return 1
    fi

    log_success "环境配置检查通过"
}

# 检查 Prisma 客户端
check_prisma_client() {
    log_info "检查 Prisma 客户端..."

    if [ ! -d "node_modules/.prisma/client" ]; then
        log_warning "Prisma 客户端未生成，正在生成..."
        npx prisma generate
    fi

    log_success "Prisma 客户端检查通过"
}

# 检查数据库连接
check_database_connection() {
    log_info "测试数据库连接..."

    if ! npx prisma db pull --force &> /dev/null; then
        log_error "数据库连接失败"
        return 1
    fi

    log_success "数据库连接正常"
}

# 检查数据库 schema
check_database_schema() {
    log_info "检查数据库 schema..."

    # 检查关键表是否存在
    local required_tables=("User" "Project" "ProjectMember" "Account" "Session")
    local missing_tables=()

    for table in "${required_tables[@]}"; do
        if ! npx prisma db pull --force 2>/dev/null | grep -q "model $table"; then
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -ne 0 ]; then
        log_warning "缺少表: ${missing_tables[*]}"
        log_info "建议运行: ./scripts/migrate.sh init"
        return 1
    fi

    log_success "数据库 schema 检查通过"
}

# 检查数据完整性
check_data_integrity() {
    log_info "检查数据完整性..."

    # 检查用户数据
    local user_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "User";
EOF
)

    if [ "$user_count" -eq 0 ]; then
        log_warning "数据库中没有用户数据"
        log_info "建议运行: ./scripts/migrate.sh seed"
    else
        log_success "发现 $user_count 个用户"
    fi

    # 检查项目数据
    local project_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "Project";
EOF
)

    if [ "$project_count" -eq 0 ]; then
        log_warning "数据库中没有项目数据"
        log_info "建议运行: ./scripts/migrate.sh seed"
    else
        log_success "发现 $project_count 个项目"
    fi
}

# 生成数据库报告
generate_database_report() {
    log_info "生成数据库报告..."

    echo ""
    echo "📊 FastBuild 数据库报告"
    echo "========================"

    # 用户统计
    local user_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "User";
EOF
)
    echo "👥 用户总数: $user_count"

    # 项目统计
    local project_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "Project";
EOF
)
    echo "📁 项目总数: $project_count"

    # 成员关系统计
    local member_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "ProjectMember";
EOF
)
    echo "🤝 成员关系: $member_count"

    # 按可见性分组的项目统计
    echo ""
    echo "📋 项目按可见性分组:"

    local public_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "Project" WHERE visibility = 'PUBLIC';
EOF
)
    echo "  🔓 公开项目: $public_count"

    local private_count=$(npx prisma db execute --stdin --raw 2>/dev/null <<EOF | grep -o '[0-9]\+' | head -1
SELECT COUNT(*) FROM "Project" WHERE visibility = 'PRIVATE';
EOF
)
    echo "  🔒 私有项目: $private_count"

    # 最新项目
    echo ""
    echo "📝 最新创建的项目:"
    npx prisma db execute --stdin --raw 2>/dev/null <<EOF | head -3
SELECT name, slug, "createdAt" FROM "Project" ORDER BY "createdAt" DESC LIMIT 3;
EOF
}

# 显示帮助信息
show_help() {
    echo "FastBuild 数据库检查脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --all           执行所有检查"
    echo "  --deps          检查依赖"
    echo "  --env           检查环境配置"
    echo "  --client        检查 Prisma 客户端"
    echo "  --connection    检查数据库连接"
    echo "  --schema        检查数据库 schema"
    echo "  --data          检查数据完整性"
    echo "  --report        生成数据库报告"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --all        # 执行所有检查"
    echo "  $0 --report     # 生成数据库报告"
}

# 主函数
main() {
    # 导入环境变量
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi

    case "${1:---all}" in
        "--all")
            log_info "🔍 开始完整的数据库检查..."
            check_dependencies
            check_env_file
            check_prisma_client
            check_database_connection
            check_database_schema
            check_data_integrity
            generate_database_report
            log_success "🎉 数据库检查完成！"
            ;;
        "--deps")
            check_dependencies
            ;;
        "--env")
            check_env_file
            ;;
        "--client")
            check_prisma_client
            ;;
        "--connection")
            check_database_connection
            ;;
        "--schema")
            check_database_schema
            ;;
        "--data")
            check_data_integrity
            ;;
        "--report")
            generate_database_report
            ;;
        "--help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"