# FastBuild REST API 规范

## 概述

FastBuild REST API 遵循 REST 架构风格和 Level 2+ 成熟度模型，提供完整的低代码平台功能支持。

### 基础规范

- **Base URL**: `https://api.fastbuild.com/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (JWT)
- **Timezone**: UTC
- **Idempotency**: 支持幂等性键用于关键操作

### 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "requestId": "req_123456789"
  },
  "links": {
    "self": "/projects/123",
    "related": {}
  }
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "requestId": "req_123456789"
  }
}
```

#### 分页响应
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "requestId": "req_123456789"
  }
}
```

---

## 用户认证和授权

### 认证 (`/auth`)

#### 用户注册
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

#### 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### 刷新令牌
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>
```

#### 用户登出
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 用户信息 (`/users`)

#### 获取当前用户信息
```http
GET /users/me
Authorization: Bearer <access_token>
```

#### 更新用户信息
```http
PATCH /users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "displayName": "John Smith",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

---

## 项目管理

### 项目 (`/projects`)

#### 获取项目列表
```http
GET /projects?page=1&limit=20&status=ACTIVE&search=fastbuild
Authorization: Bearer <access_token>
```

#### 创建项目
```http
POST /projects
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "My Awesome Project",
  "slug": "awesome-project",
  "description": "A low-code application project",
  "visibility": "PRIVATE"
}
```

#### 获取项目详情
```http
GET /projects/{projectId}
Authorization: Bearer <access_token>
```

#### 更新项目
```http
PATCH /projects/{projectId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### 删除项目
```http
DELETE /projects/{projectId}
Authorization: Bearer <access_token>
```

### 项目成员 (`/projects/{projectId}/members`)

#### 获取项目成员
```http
GET /projects/{projectId}/members
Authorization: Bearer <access_token>
```

#### 添加项目成员
```http
POST /projects/{projectId}/members
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userEmail": "member@example.com",
  "role": "EDITOR"
}
```

#### 更新成员角色
```http
PATCH /projects/{projectId}/members/{memberId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "ADMIN"
}
```

#### 移除项目成员
```http
DELETE /projects/{projectId}/members/{memberId}
Authorization: Bearer <access_token>
```

---

## 数据模型管理

### 数据模型版本 (`/projects/{projectId}/data-models`)

#### 获取数据模型版本列表
```http
GET /projects/{projectId}/data-models?page=1&limit=20&status=PUBLISHED
Authorization: Bearer <access_token>
```

#### 创建数据模型版本
```http
POST /projects/{projectId}/data-models
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "semver": "1.0.0",
  "notes": "Initial data model version",
  "snapshot": {
    "tables": [],
    "relations": [],
    "views": []
  }
}
```

#### 获取数据模型版本详情
```http
GET /projects/{projectId}/data-models/{dataModelId}
Authorization: Bearer <access_token>
```

#### 发布数据模型版本
```http
POST /projects/{projectId}/data-models/{dataModelId}/publish
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "notes": "Production ready version"
}
```

### 数据表 (`/projects/{projectId}/data-models/{dataModelId}/tables`)

#### 获取数据表列表
```http
GET /projects/{projectId}/data-models/{dataModelId}/tables
Authorization: Bearer <access_token>
```

#### 创建数据表
```http
POST /projects/{projectId}/data-models/{dataModelId}/tables
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "logicalName": "customers",
  "label": "Customers",
  "options": {
    "description": "Customer information table"
  }
}
```

#### 获取数据表详情
```http
GET /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}
Authorization: Bearer <access_token>
```

#### 更新数据表
```http
PATCH /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "Customer Information",
  "options": {
    "description": "Detailed customer information"
  }
}
```

#### 删除数据表
```http
DELETE /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}
Authorization: Bearer <access_token>
```

### 数据列 (`/projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns`)

#### 获取数据列列表
```http
GET /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns
Authorization: Bearer <access_token>
```

#### 创建数据列
```http
POST /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "logicalName": "email",
  "label": "Email Address",
  "dataType": "STRING",
  "nullable": false,
  "validationExpr": "^[^@]+@[^@]+\\.[^@]+$",
  "ui": {
    "component": "input",
    "placeholder": "Enter email address"
  }
}
```

#### 获取数据列详情
```http
GET /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns/{columnId}
Authorization: Bearer <access_token>
```

#### 更新数据列
```http
PATCH /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns/{columnId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "Email",
  "nullable": true,
  "ui": {
    "placeholder": "customer@example.com"
  }
}
```

#### 删除数据列
```http
DELETE /projects/{projectId}/data-models/{dataModelId}/tables/{tableId}/columns/{columnId}
Authorization: Bearer <access_token>
```

### 数据关系 (`/projects/{projectId}/data-models/{dataModelId}/relations`)

#### 获取数据关系列表
```http
GET /projects/{projectId}/data-models/{dataModelId}/relations
Authorization: Bearer <access_token>
```

#### 创建数据关系
```http
POST /projects/{projectId}/data-models/{dataModelId}/relations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "srcTableId": "table_123",
  "srcColumnId": "column_456",
  "dstTableId": "table_789",
  "dstColumnId": "column_012",
  "cardinality": "ONE_TO_MANY",
  "options": {
    "onDelete": "CASCADE"
  }
}
```

#### 获取数据关系详情
```http
GET /projects/{projectId}/data-models/{dataModelId}/relations/{relationId}
Authorization: Bearer <access_token>
```

#### 更新数据关系
```http
PATCH /projects/{projectId}/data-models/{dataModelId}/relations/{relationId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cardinality": "MANY_TO_MANY",
  "options": {
    "onDelete": "SET_NULL"
  }
}
```

#### 删除数据关系
```http
DELETE /projects/{projectId}/data-models/{dataModelId}/relations/{relationId}
Authorization: Bearer <access_token>
```

### 数据视图 (`/projects/{projectId}/data-models/{dataModelId}/views`)

#### 获取数据视图列表
```http
GET /projects/{projectId}/data-models/{dataModelId}/views
Authorization: Bearer <access_token>
```

#### 创建数据视图
```http
POST /projects/{projectId}/data-models/{dataModelId}/views
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "logicalName": "active_customers",
  "label": "Active Customers",
  "contract": {
    "filters": [
      {
        "field": "status",
        "operator": "eq",
        "value": "active"
      }
    ],
    "sort": [
      {
        "field": "created_at",
        "direction": "desc"
      }
    ],
    "exposedColumns": ["id", "name", "email", "created_at"]
  }
}
```

#### 获取数据视图详情
```http
GET /projects/{projectId}/data-models/{dataModelId}/views/{viewId}
Authorization: Bearer <access_token>
```

#### 更新数据视图
```http
PATCH /projects/{projectId}/data-models/{dataModelId}/views/{viewId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "Active Customers View",
  "contract": {
    "filters": [
      {
        "field": "status",
        "operator": "eq",
        "value": "active"
      },
      {
        "field": "created_at",
        "operator": "gt",
        "value": "2024-01-01"
      }
    ]
  }
}
```

#### 删除数据视图
```http
DELETE /projects/{projectId}/data-models/{dataModelId}/views/{viewId}
Authorization: Bearer <access_token>
```

---

## 应用管理

### 应用 (`/projects/{projectId}/applications`)

#### 获取应用列表
```http
GET /projects/{projectId}/applications?page=1&limit=20&status=PUBLISHED
Authorization: Bearer <access_token>
```

#### 创建应用
```http
POST /projects/{projectId}/applications
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Customer Management",
  "slug": "customer-management",
  "description": "Customer relationship management application",
  "visibility": "PRIVATE"
}
```

#### 获取应用详情
```http
GET /projects/{projectId}/applications/{applicationId}
Authorization: Bearer <access_token>
```

#### 更新应用
```http
PATCH /projects/{projectId}/applications/{applicationId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Enhanced Customer Management",
  "description": "Advanced CRM with analytics features"
}
```

#### 删除应用
```http
DELETE /projects/{projectId}/applications/{applicationId}
Authorization: Bearer <access_token>
```

### 应用版本 (`/projects/{projectId}/applications/{applicationId}/versions`)

#### 获取应用版本列表
```http
GET /projects/{projectId}/applications/{applicationId}/versions?page=1&limit=20&status=PUBLISHED
Authorization: Bearer <access_token>
```

#### 创建应用版本
```http
POST /projects/{projectId}/applications/{applicationId}/versions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "semver": "1.0.0",
  "notes": "Initial release",
  "dependsOnDMVId": "datamodel_123",
  "snapshot": {
    "pages": [],
    "theme": {},
    "config": {}
  }
}
```

#### 获取应用版本详情
```http
GET /projects/{projectId}/applications/{applicationId}/versions/{versionId}
Authorization: Bearer <access_token>
```

#### 发布应用版本
```http
POST /projects/{projectId}/applications/{applicationId}/versions/{versionId}/publish
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "notes": "Production ready version 1.0.0"
}
```

### 应用页面 (`/projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages`)

#### 获取页面列表
```http
GET /projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages
Authorization: Bearer <access_token>
```

#### 创建页面
```http
POST /projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "logicalName": "customer_list",
  "label": "Customer List",
  "path": "/customers",
  "isHomePage": false,
  "layout": {
    "components": [],
    "dataBindings": []
  },
  "order": 1
}
```

#### 获取页面详情
```http
GET /projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages/{pageId}
Authorization: Bearer <access_token>
```

#### 更新页面
```http
PATCH /projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages/{pageId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "label": "Customer Dashboard",
  "layout": {
    "components": [
      {
        "type": "data-table",
        "props": {
          "dataSource": "customers_view"
        }
      }
    ]
  }
}
```

#### 删除页面
```http
DELETE /projects/{projectId}/applications/{applicationId}/versions/{versionId}/pages/{pageId}
Authorization: Bearer <access_token>
```

---

## 部署管理

### 数据源 (`/projects/{projectId}/data-sources`)

#### 获取数据源列表
```http
GET /projects/{projectId}/data-sources
Authorization: Bearer <access_token>
```

#### 创建数据源
```http
POST /projects/{projectId}/data-sources
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Production Database",
  "kind": "POSTGRES",
  "description": "Primary production database",
  "config": {
    "host": "db.example.com",
    "port": 5432,
    "database": "fastbuild_prod",
    "ssl": true
  }
}
```

#### 获取数据源详情
```http
GET /projects/{projectId}/data-sources/{dataSourceId}
Authorization: Bearer <access_token>
```

#### 更新数据源
```http
PATCH /projects/{projectId}/data-sources/{dataSourceId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "description": "Updated production database configuration",
  "config": {
    "host": "new-db.example.com"
  }
}
```

#### 删除数据源
```http
DELETE /projects/{projectId}/data-sources/{dataSourceId}
Authorization: Bearer <access_token>
```

### 应用部署 (`/projects/{projectId}/applications/{applicationId}/deployments`)

#### 获取部署列表
```http
GET /projects/{projectId}/applications/{applicationId}/deployments?page=1&limit=20&env=PROD
Authorization: Bearer <access_token>
```

#### 创建部署
```http
POST /projects/{projectId}/applications/{applicationId}/deployments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "versionId": "version_123",
  "dataSourceId": "datasource_456",
  "env": "PROD",
  "config": {
    "domain": "app.example.com",
    "environmentVariables": {
      "API_URL": "https://api.example.com"
    }
  }
}
```

#### 获取部署详情
```http
GET /projects/{projectId}/applications/{applicationId}/deployments/{deploymentId}
Authorization: Bearer <access_token>
```

#### 更新部署状态
```http
PATCH /projects/{projectId}/applications/{applicationId}/deployments/{deploymentId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "ACTIVE",
  "deployedAt": "2025-01-01T12:00:00Z"
}
```

#### 回滚部署
```http
POST /projects/{projectId}/applications/{applicationId}/deployments/{deploymentId}/rollback
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "targetVersionId": "version_122"
}
```

---

## 权限和角色

### 权限检查 (`/permissions`)

#### 检查项目权限
```http
POST /permissions/check
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resource": "project",
  "resourceId": "project_123",
  "action": "WRITE"
}
```

#### 获取用户权限
```http
GET /permissions/user/{userId}/project/{projectId}
Authorization: Bearer <access_token>
```

### 角色 (`/roles`)

#### 获取可用角色列表
```http
GET /roles
Authorization: Bearer <access_token>
```

#### 获取角色权限详情
```http
GET /roles/{roleName}
Authorization: Bearer <access_token>
```

---

## 通用操作

### 批量操作 (`/batch`)

#### 批量创建
```http
POST /batch/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resource": "columns",
  "items": [
    {
      "tableId": "table_123",
      "logicalName": "name",
      "dataType": "STRING"
    },
    {
      "tableId": "table_123",
      "logicalName": "email",
      "dataType": "STRING"
    }
  ]
}
```

#### 批量更新
```http
POST /batch/update
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resource": "columns",
  "updates": [
    {
      "id": "column_123",
      "patch": { "nullable": false }
    },
    {
      "id": "column_456",
      "patch": { "label": "Email Address" }
    }
  ]
}
```

#### 批量删除
```http
POST /batch/delete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resource": "columns",
  "ids": ["column_123", "column_456", "column_789"]
}
```

### 搜索 (`/search`)

#### 全局搜索
```http
GET /search?q=customer&type=projects,applications&page=1&limit=10
Authorization: Bearer <access_token>
```

#### 项目内搜索
```http
GET /projects/{projectId}/search?q=table&type=tables,views&page=1&limit=10
Authorization: Bearer <access_token>
```

---

## 错误码参考

### HTTP 状态码
- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `204 No Content` - 请求成功但无返回内容
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未授权
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `409 Conflict` - 资源冲突
- `422 Unprocessable Entity` - 请求格式正确但语义错误
- `429 Too Many Requests` - 请求频率限制
- `500 Internal Server Error` - 服务器内部错误

### 业务错误码
- `VALIDATION_ERROR` - 数据验证失败
- `PERMISSION_DENIED` - 权限不足
- `RESOURCE_NOT_FOUND` - 资源不存在
- `RESOURCE_CONFLICT` - 资源冲突
- `OPERATION_NOT_ALLOWED` - 操作不被允许
- `QUOTA_EXCEEDED` - 配额超限
- `DEPENDENCY_ERROR` - 依赖关系错误
- `DEPLOYMENT_FAILED` - 部署失败

---

## 版本控制

### API 版本策略
- 使用 URL 路径版本控制：`/v1/`, `/v2/`
- 向后兼容性保证：至少支持前一个主版本
- 废弃通知：提前 6 个月通知 API 废弃
- 破坏性变更：使用新的主版本号

### 变更日志
所有 API 变更都会记录在 [CHANGELOG.md](./CHANGELOG.md) 中，包括：
- 新增功能
- 改进优化
- 问题修复
- 破坏性变更
- 废弃通知

---

## 开发工具

### API 文档
- **Swagger UI**: `https://api.fastbuild.com/docs`
- **OpenAPI Spec**: `https://api.fastbuild.com/openapi.json`

### SDK 支持
- **JavaScript/TypeScript**: `@fastbuild/api-client`
- **Python**: `fastbuild-python`
- **Go**: `github.com/fastbuild/go-client`

### 开发环境
- **Sandbox**: `https://sandbox-api.fastbuild.com`
- **测试数据**: 提供完整的测试数据集
- **Webhook 测试**: 支持本地 Webhook 测试

---

## 限流和配额

### 请求限制
- **认证用户**: 1000 请求/小时
- **匿名用户**: 100 请求/小时
- **批量操作**: 100 项/请求

### 资源限制
- **项目数量**: 50 个/用户
- **应用数量**: 20 个/项目
- **数据表数量**: 100 个/数据模型
- **部署数量**: 10 个/应用/环境

### 速率限制头
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## 安全最佳实践

### 认证
- 使用 HTTPS 强制加密
- JWT 令牌有效期：访问令牌 1 小时，刷新令牌 30 天
- 支持多因素认证（MFA）

### 授权
- 基于角色的访问控制（RBAC）
- 最小权限原则
- 定期权限审查

### 数据保护
- 敏感数据加密存储
- 审计日志记录
- 数据备份和恢复

---

## 支持

### 技术支持
- **文档**: https://docs.fastbuild.com
- **社区论坛**: https://community.fastbuild.com
- **状态页面**: https://status.fastbuild.com

### 联系方式
- **技术支持**: support@fastbuild.com
- **安全问题**: security@fastbuild.com
- **商务合作**: business@fastbuild.com