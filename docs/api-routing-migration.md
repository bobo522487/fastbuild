# FastBuild API 路由迁移指南

## 概述

本文档描述了 FastBuild 系统基础设施层从旧的 `/api/*` 路由结构迁移到新的 `/sys/*` 标准化路由结构的变化。

**迁移原因**:
- 建立统一的系统基础设施层 API 标准
- 提供更清晰的 API 组织结构
- 符合 Linus Torvalds 的简洁性原则
- 实现更好的向后兼容性和渐进式迁移

## 路由映射表

### 认证管理 API

| 旧路由 | 新路由 | 状态 | 说明 |
|--------|--------|------|------|
| `POST /api/auth/register` | `POST /sys/auth/register` | ✅ 迁移完成 | 用户注册功能，包含邮箱验证和密码强度检查 |
| `POST /sys/auth/login` | - | 🆕 新增 | 用户登录功能，JWT令牌管理和自动刷新 |
| `POST /sys/auth/logout` | - | 🆕 新增 | 用户登出功能，支持单设备和全设备登出 |
| `POST /sys/auth/refresh` | - | 🆕 新增 | JWT令牌刷新功能，无缝会话延长 |
| `POST /sys/auth/reset-password` | - | 🆕 新增 | 密码重置功能，安全的邮箱验证流程 |

### 权限管理 API

| 旧路由 | 新路由 | 状态 | 说明 |
|--------|--------|------|------|
| - | `POST /sys/permissions/check` | 🆕 新增 | 单个权限检查，硬编码权限系统验证 |
| - | `POST /sys/permissions/check-batch` | 🆕 新增 | 批量权限检查，高性能优化 |
| - | `POST /sys/permissions/refresh-cache` | 🆕 新增 | 权限缓存刷新，JWT令牌更新 |
| - | `GET /sys/permissions/cache-status` | 🆕 计划中 | 权限缓存状态查询 |
| - | `GET /sys/permissions/audit-log` | 🆕 计划中 | 权限变更审计日志 |

### 系统监控 API

| 旧路由 | 新路由 | 状态 | 说明 |
|--------|--------|------|------|
| `GET /api/health` | `GET /sys/health/basic` | ✅ 迁移完成 | 基础健康检查，核心服务状态 |
| - | `GET /sys/health/detailed` | 🆕 新增 | 详细健康检查，性能指标和系统信息 |
| - | `GET /sys/health/resources` | 🆕 计划中 | 系统资源监控 |
| - | `GET /sys/health/metrics` | 🆕 计划中 | 性能指标收集 |

### 系统信息 API

| 旧路由 | 新路由 | 状态 | 说明 |
|--------|--------|------|------|
| - | `GET /sys/version` | 🆕 新增 | 系统版本信息和组件状态 |

## API 设计原则

### Linus Torvalds 式简洁性

1. **硬编码权限系统**: 使用 OWNER/ADMIN/EDITOR/VIEWER 角色映射，避免动态权限配置的复杂性
2. **JWT 权限缓存**: 在 JWT payload 中缓存用户项目角色，减少数据库查询
3. **批量权限检查**: 单次查询获取多个项目权限，优化性能
4. **统一响应格式**: 所有 API 使用标准的成功/错误响应格式

### 向后兼容性

1. **路由重定向**: 旧路由自动重定向到新路由，保持现有应用正常运行
2. **渐进式迁移**: 支持新旧路由并存，允许逐步迁移
3. **弃用警告**: 在响应头中包含弃用警告，引导开发者使用新路由

### 性能优化

1. **JWT 缓存优先**: 优先使用 JWT 中的权限缓存，减少数据库查询
2. **批量操作**: 支持批量权限检查，提升 API 性能
3. **健康检查优化**: 基础健康检查使用轻量级查询，避免性能影响

## 迁移时间表

### Phase 1: 核心功能迁移 (已完成)
- ✅ 健康检查 API: `/api/health` → `/sys/health/basic`
- ✅ 用户注册 API: `/api/auth/register` → `/sys/auth/register`
- ✅ 权限检查 API: 新增 `/sys/permissions/check`
- ✅ 批量权限检查: 新增 `/sys/permissions/check-batch`

### Phase 2: 高级功能 (进行中)
- 🔄 JWT 令牌管理: 新增 `/sys/auth/*` 系列API
- 🔄 权限缓存管理: 新增 `/sys/permissions/refresh-cache`
- 🔄 详细健康检查: 新增 `/sys/health/detailed`
- 🔄 系统版本信息: 新增 `/sys/version`

### Phase 3: 完善和优化 (计划中)
- 📋 权限审计日志: `/sys/permissions/audit-log`
- 📋 系统资源监控: `/sys/health/resources`
- 📋 性能指标收集: `/sys/health/metrics`
- 📋 缓存状态查询: `/sys/permissions/cache-status`

## 使用示例

### 旧代码 (将被重定向)
```javascript
// 旧的健康检查调用
const response = await fetch('/api/health');
```

### 新代码 (推荐使用)
```javascript
// 新的健康检查调用
const response = await fetch('/sys/health/basic');

// 获取详细健康状态
const detailedResponse = await fetch('/sys/health/detailed');

// 用户注册
const registerResponse = await fetch('/sys/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: '张三',
    acceptTerms: true
  })
});

// 权限检查
const permissionResponse = await fetch('/sys/permissions/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + accessToken
  },
  body: JSON.stringify({
    projectId: 'proj_123',
    action: 'write',
    resourceType: 'datamodel'
  })
});
```

## 测试验证

### 向后兼容性测试
```bash
# 测试旧路由是否正确重定向
curl -I http://localhost:3000/api/health
# 应该返回 301 重定向到 /sys/health/basic

curl -I http://localhost:3000/api/auth/register
# 应该返回 301 重定向到 /sys/auth/register
```

### 新功能测试
```bash
# 测试新的登录功能
curl -X POST http://localhost:3000/sys/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试权限检查功能
curl -X POST http://localhost:3000/sys/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"projectId":"proj_123","action":"read"}'

# 测试系统版本信息
curl http://localhost:3000/sys/version
```

## 弃用计划

### 短期 (3个月内)
- 保持旧路由的重定向功能
- 在响应头中添加弃用警告
- 提供迁移文档和工具

### 中期 (6个月内)
- 开始在弃用警告中设置时间限制
- 发布迁移指南和最佳实践
- 监控旧路由使用情况

### 长期 (12个月内)
- 计划移除旧路由重定向
- 完全切换到新的 `/sys/*` 路由结构
- 更新所有文档和示例代码

## 故障排除

### 常见问题

1. **重定向循环**: 确保没有在代理服务器中配置额外的重定向规则
2. **认证失败**: 新的路由可能需要更新 JWT 配置
3. **权限错误**: 检查硬编码权限映射是否正确配置
4. **性能问题**: 确保数据库连接池配置正确

### 调试工具

```bash
# 检查路由重定向
curl -v http://localhost:3000/api/health

# 检查响应头
curl -I http://localhost:3000/sys/health/basic

# 检查API版本信息
curl http://localhost:3000/sys/version
```

## 总结

这次路由迁移实现了以下目标：

1. **标准化**: 建立了统一的 `/sys/*` 系统基础设施层 API 标准
2. **性能优化**: 通过 JWT 缓存和批量操作显著提升了权限检查性能
3. **向后兼容**: 通过路由重定向确保现有应用继续正常运行
4. **可扩展性**: 为未来功能扩展奠定了良好的架构基础

新的 API 结构更符合 Linus Torvalds 的设计哲学：简洁、高效、解决实际问题。