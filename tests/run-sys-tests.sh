#!/bin/bash

# FastBuild /sys/* API 测试运行脚本
#
# 这个脚本运行所有与 /sys/* API 相关的测试

set -e

echo "🚀 开始运行 FastBuild 系统基础设施层 (/sys/*) API 测试..."
echo "================================================================"

# 检查数据库连接
echo "📋 检查数据库连接..."
if ! docker ps | grep -q postgres; then
    echo "❌ 数据库未运行，请先启动数据库"
    echo "运行: ./start-database.sh"
    exit 1
fi

echo "✅ 数据库连接正常"

# 运行单元测试
echo ""
echo "🧪 运行单元测试..."
echo "----------------------------------------------------------------"

# 登录 API 测试
echo "📱 测试登录 API..."
pnpm test src/app/api/sys/auth/login/route.test.ts || {
    echo "❌ 登录 API 测试失败"
    exit 1
}

# 权限检查 API 测试
echo "🔐 测试权限检查 API..."
pnpm test src/app/api/sys/permissions/check/route.test.ts || {
    echo "❌ 权限检查 API 测试失败"
    exit 1
}

# 健康检查 API 测试
echo "💓 测试健康检查 API..."
pnpm test src/app/api/sys/health/basic/route.test.ts || {
    echo "❌ 健康检查 API 测试失败"
    exit 1
}

# 版本信息 API 测试
echo "📋 测试版本信息 API..."
pnpm test src/app/api/sys/version/route.test.ts || {
    echo "❌ 版本信息 API 测试失败"
    exit 1
}

echo "✅ 所有单元测试通过"

# 运行集成测试
echo ""
echo "🔗 运行集成测试..."
echo "----------------------------------------------------------------"

# 认证系统集成测试
echo "🔐 测试认证系统集成..."
pnpm test tests/integration/api/sys/auth.test.ts || {
    echo "❌ 认证系统集成测试失败"
    exit 1
}

# 权限系统集成测试
echo "🔐 测试权限系统集成..."
pnpm test tests/integration/api/sys/permissions.test.ts || {
    echo "❌ 权限系统集成测试失败"
    exit 1
}

# 健康检查系统集成测试
echo "💓 测试健康检查系统集成..."
pnpm test tests/integration/api/sys/health.test.ts || {
    echo "❌ 健康检查系统集成测试失败"
    exit 1
}

echo "✅ 所有集成测试通过"

# 测试覆盖率
echo ""
echo "📊 生成测试覆盖率报告..."
echo "----------------------------------------------------------------"

pnpm test:coverage --reporter=text --reporter=html tests/integration/api/sys/ || {
    echo "❌ 测试覆盖率生成失败"
    exit 1
}

echo "✅ 测试覆盖率报告已生成"

# 总结
echo ""
echo "================================================================"
echo "🎉 所有 /sys/* API 测试完成！"
echo ""
echo "📊 测试统计:"
echo "   - 单元测试: 4 个文件"
echo "   - 集成测试: 3 个文件"
echo "   - 覆盖率报告: 查看 coverage/lcov-report/index.html"
echo ""
echo "📁 生成的文件:"
echo "   - 覆盖率报告: coverage/lcov-report/index.html"
echo "   - 测试日志: 控制台输出"
echo ""

exit 0