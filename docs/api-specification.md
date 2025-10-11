# FastBuild REST API 规范 v4.0

## 架构概览

**四层前缀分离架构** - 系统基础设施层 + 设计时管理层 + 业务数据层 + 应用访问层

## 概述

FastBuild REST API 遵循 Linus Torvalds 的"好品味"设计哲学：**动态表生成 + 智能视图系统 + 四层前缀分离架构**。

### 核心设计原则

- **动态表生成**：根据元数据自动创建真实的数据库表
- **智能视图系统**：每个表自动生成默认视图，支持复杂查询定制
- **性能优先**：利用 PostgreSQL 的全部能力（索引、约束、事务）
- **渐进复杂性**：从简单默认视图到复杂物化视图的平滑升级
- **四层前缀分离架构**：通过URL前缀明确区分API类型和职责

### API架构分离

FastBuild API采用四层分离架构：

- **`/sys/*`** - 系统基础设施层：认证、用户管理、系统级功能
- **`/meta/*`** - 设计时管理层：项目配置、数据模型定义、应用设计
- **`/data/*`** - 业务数据层：动态数据CRUD、查询、业务逻辑
- **`/app/*`** - 应用访问层：已发布应用的运行时访问

这种设计确保了清晰的职责分离、零重叠的边界和更好的开发者体验。

### 基础规范

- **Base URL**: `https://api.fastbuild.com`
- **API前缀**: `/sys/*`, `/meta/*`, `/data/*`, `/app/*`
- **API版本**: `v4.0`
- **版本控制**: 通过HTTP头 `API-Version: v4.0` 或URL路径 `/v4/` 指定版本
- **Content-Type**: `application/json`
- **Authentication**: `authorization: Bearer <jwt_token>`
- **Timezone**: UTC

### 版本控制

#### 版本策略
- **主版本**: 破坏性变更，不兼容的API变更
- **次版本**: 向后兼容的功能增加
- **修订版本**: 向后兼容的问题修复

#### 版本指定方式
**推荐方式 - HTTP头**:
```http
GET /sys/users/profile
API-Version: v4.0
authorization: Bearer <jwt_token>
```

**替代方式 - URL路径**:
```http
GET /v4/sys/users/profile
authorization: Bearer <jwt_token>
```

**默认版本**: 未指定版本时使用v4.0

### API访问模式

FastBuild API 采用混合路径模式，结合了资源直接访问和层级关系的优势：

```http
# 系统基础设施层 - 认证和用户管理
https://api.fastbuild.com/sys/auth/login

# 设计时管理层 - 元数据管理
# 项目操作保持层级关系
https://api.fastbuild.com/meta/projects/proj_a1b2c3d4
https://api.fastbuild.com/meta/projects/proj_a1b2c3d4/tables

# 资源直接访问（推荐）
https://api.fastbuild.com/meta/tables/tbl_a1b2c3d4
https://api.fastbuild.com/meta/views/view_ghi789jkl
https://api.fastbuild.com/meta/apps/app_xyz789uvw

# 业务数据层 - 数据操作
https://api.fastbuild.com/data/tables/tbl_ghi789jkl/rows
https://api.fastbuild.com/data/views/view_ghi789jkl/rows

# 应用访问层 - 前端应用
https://api.fastbuild.com/app/app_xyz789uvw/pages/home
```

### URL 路径设计原则

**混合路径模式特点**：

1. **创建操作保持层级**：创建子资源时保持父子关系的语义性
   ```http
   POST /meta/projects/{projectId}/tables     # 在项目中创建表
   POST /meta/tables/{tableId}/views         # 在表中创建视图
   POST /meta/apps/{appId}/pages             # 在应用中创建页面
   ```

2. **资源访问直接简洁**：通过唯一ID直接访问资源，权限在后台验证
   ```http
   GET /meta/tables/{tableId}               # 直接访问表
   GET /meta/views/{viewId}                 # 直接访问视图
   GET /meta/apps/{appId}                   # 直接访问应用
   ```

3. **权限验证后台化**：所有访问权限都在后台验证，不依赖URL路径结构
   ```typescript
   // 示例：访问表时后台自动验证项目权限
   async function validateTableAccess(userId: string, tableId: string) {
     const table = await db.table.findUnique({ where: { id: tableId } });
     return await checkProjectPermission(userId, table.projectId, 'read');
   }
   ```

4. **RESTful一致性**：资源标识符简洁，符合REST设计原则

### 权限控制矩阵

| 前缀 | 认证要求 | 权限范围 | 访问模式说明 |
|------|----------|----------|--------------|
| `/sys/*` | 部分需要 | 全局/用户级 | 认证端点（登录、注册等）无需认证 |
| `/meta/*` | 必需 | 项目级 | 需要项目成员权限，支持层级和直接访问 |
| `/data/*` | 必需 | 数据级 | 需要数据访问权限，基于表/视图权限 |
| `/app/*` | 必需 | 应用级 | 需要应用访问权限，仅限已发布应用 |

**混合路径权限验证**：
- **层级访问**：创建操作保持父子关系，如 `POST /meta/projects/{projectId}/tables`
- **直接访问**：资源操作支持直接访问，如 `GET /meta/tables/{tableId}`
- **后台验证**：所有权限都在后台验证，URL路径不影响权限检查

### 权限验证设计

#### 权限验证架构

FastBuild采用统一的权限验证架构，确保所有API访问都经过严格的权限检查：

```typescript
// 统一权限验证中间件
interface PermissionValidationMiddleware {
  async validate(request: Request, response: Response, next: NextFunction): Promise<void>;
}

// 权限验证实现
class PermissionValidator {
  async validateAccess(
    context: PermissionContext
  ): Promise<PermissionResult> {
    // 1. 验证JWT令牌
    const jwtPayload = await this.validateJWT(context.token);
    if (!jwtPayload) {
      return { granted: false, reason: 'INVALID_TOKEN' };
    }

    // 2. 根据API层级选择验证策略
    switch (context.layer) {
      case 'sys': return this.validateSystemAccess(context, jwtPayload);
      case 'meta': return this.validateMetaAccess(context, jwtPayload);
      case 'data': return this.validateDataAccess(context, jwtPayload);
      case 'app': return this.validateAppAccess(context, jwtPayload);
      default: return { granted: false, reason: 'INVALID_LAYER' };
    }
  }
}
```

#### 混合路径权限验证示例

**层级访问权限验证**：
```typescript
// 创建表 - 需要项目级权限
app.post('/meta/projects/proj_xyz789uvw/tables', {
  headers: { 'authorization': 'Bearer <jwt_token>' },
  body: { name: 'customers' }
});

// 直接访问表 - 后台自动验证项目权限
app.get('/meta/tables/tbl_a1b2c3d4', {
  headers: { 'authorization': 'Bearer <jwt_token>' }
});

// 内部实现
async function validateMetaAccess(
  request: Request,
  jwtPayload: JWTPayload
): Promise<PermissionResult> {
  const tableId = request.params.tableId;
  const table = await db.table.findUnique({ where: { id: tableId } });

  if (!table) {
    return { granted: false, reason: 'TABLE_NOT_FOUND' };
  }

  // 验证项目成员身份
  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: jwtPayload.sub,
        projectId: table.projectId
      }
    }
  });

  if (!membership) {
    return { granted: false, reason: 'NOT_PROJECT_MEMBER' };
  }

  // 验证具体操作权限
  const hasPermission = await checkRolePermission(membership.role, request.method, 'create');
  return { granted: hasPermission };
}
```

#### 权限验证错误响应

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "权限不足，拒绝访问",
    "details": {
      "reason": "NOT_PROJECT_MEMBER",
      "resource": "/meta/tables/tbl_a1b2c3d4",
      "action": "read",
      "userId": "user_xyz789uvw"
    },
    "suggestion": "联系项目管理员获取权限"
  }
}
```

#### 直接访问权限验证优势

1. **URL简洁性**：用户无需记忆复杂的层级路径结构
2. **性能优化**：减少不必要的数据库查询
3. **开发体验**：API调用更加直观和易用
4. **安全一致性**：所有访问都经过相同的安全检查流程

### 通用响应格式

#### 成功响应
```json
{
  "data": {}
}
```

#### 错误响应
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data"
  }
}
```

---

## 系统基础设施层 (/sys/*)

系统基础设施层提供认证、用户管理和系统级功能。这些端点具有全局性，不依赖具体的业务上下文。

### 认证管理

#### 用户登录
```http
POST /sys/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "data": {
    "user": {
      "id": "user_a1b2c3d4",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_xyz789uvw"
  }
}
```

#### 用户注册
```http
POST /sys/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "Jane Doe"
}
```

**响应**:
```json
{
  "data": {
    "user": {
      "id": "user_b2c3d4e5",
      "email": "newuser@example.com",
      "name": "Jane Doe",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_abc123def"
  }
}
```

#### 刷新令牌
```http
POST /sys/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_xyz789uvw"
}
```

**响应**:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_new456stu"
  }
}
```

#### 用户登出
```http
POST /sys/auth/logout
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "refreshToken": "refresh_token_xyz789uvw"
}
```

#### 密码重置请求
```http
POST /sys/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 密码重置确认
```http
POST /sys/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_abc123def",
  "newPassword": "newpassword456"
}
```

### 用户管理

#### 获取当前用户信息
```http
GET /sys/users/profile
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "user": {
      "id": "user_a1b2c3d4",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 更新用户信息
```http
PATCH /sys/users/profile
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

#### 修改密码
```http
PATCH /sys/users/password
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### 系统监控

#### 系统健康检查
```http
GET /sys/health
```

**基础响应**:
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "4.0.0"
  }
}
```

#### 详细健康检查 (需认证)
```http
GET /sys/health/detailed
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "4.0.0",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "storage": "healthy"
    },
    "metrics": {
      "uptime": 86400,
      "memoryUsage": "45%",
      "cpuUsage": "12%"
    },
    "rateLimits": {
      "remaining": 998,
      "resetTime": "2024-01-01T01:00:00Z"
    }
  }
}
```

### JWT 结构 (简化版)
```json
{
  "sub": "user_a1b2c3d4",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1640995200,
  "exp": 1640998800
}
```

### 认证说明
- **无需认证端点**：`/sys/auth/login`, `/sys/auth/register`, `/sys/auth/forgot-password`, `/sys/auth/reset-password`, `/sys/health`
- **需要认证端点**：所有其他 `/sys/*` 端点都需要有效的JWT令牌
- **令牌过期**：访问令牌有效期1小时，刷新令牌有效期30天
- **并发限制**：同一用户最多5个活跃会话

---

## 设计时管理层 (/meta/*)

设计时管理层用于项目配置、数据模型定义、应用设计等。这些API主要在开发和设计阶段使用，需要认证和项目级权限。

### 项目元数据管理

#### 项目 (`/meta/projects`)

**用途**：管理项目的基础信息和配置

#### 获取项目列表
```http
GET /meta/projects?page=1&limit=20
authorization: Bearer <jwt_token>
```

#### 创建项目
```http
POST /meta/projects
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "E-commerce Platform",
  "slug": "ecommerce-platform",
  "description": "Complete e-commerce solution"
}
```

#### 获取项目详情
```http
GET /meta/projects/proj_a1b2c3d4
authorization: Bearer <jwt_token>
```

#### 更新项目
```http
PATCH /meta/projects/proj_a1b2c3d4
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Enhanced E-commerce Platform"
}
```

#### 删除项目
```http
DELETE /meta/projects/proj_a1b2c3d4
authorization: Bearer <jwt_token>
```

### 项目成员管理

#### 项目成员 (`/meta/projects/{projectId}/members`)

### 应用元数据管理

#### 应用 (`/meta/projects/{projectId}/apps`)

**用途**：管理应用的基础信息和页面配置

#### 获取应用列表
```http
GET /meta/projects/proj_a1b2c3d4/apps
authorization: Bearer <jwt_token>
```

#### 创建应用
```http
POST /meta/projects/proj_a1b2c3d4/apps
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Customer Management",
  "slug": "customer-management",
  "description": "Customer relationship management"
}
```

#### 获取应用详情
```http
GET /meta/apps/{appId}
authorization: Bearer <jwt_token>
```

#### 更新应用
```http
PATCH /meta/apps/{appId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Enhanced Customer Management"
}
```

#### 删除应用
```http
DELETE /meta/apps/{appId}
authorization: Bearer <jwt_token>
```

#### 发布数据模型
```http
POST /meta/projects/{projectId}/data-models/publish
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "version": "1.0.0",
  "environment": "PREVIEW",
  "changeLog": {
    "description": "初始数据模型版本",
    "tables": ["customers", "products", "orders"],
    "changes": [
      {
        "type": "CREATE_TABLE",
        "tableName": "customers",
        "description": "创建客户表"
      }
    ]
  },
  "metadata": {
    "notes": "初始发布版本",
    "buildNumber": "build-001"
  }
}
```

**成功响应**:
```json
{
  "data": {
    "deployment": {
      "id": "dep_a1b2c3d4",
      "version": "1.0.0",
      "environment": "PREVIEW",
      "status": "DEPLOYED",
      "deployedAt": "2024-01-01T00:00:00Z",
      "schemaName": "project_a1b2c3d4_preview_v1_0_0",
      "buildUrl": "https://preview-proj-a1b2c3d4.fastbuild.com",
      "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "buildLog": "Build completed successfully\nDatabase schema created",
      "buildTime": 45000,
      "tableCount": 3,
      "deployer": {
        "id": "user_a1b2c3d4",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "tableSnapshots": [
        {
          "tableName": "customers",
          "displayName": "客户管理",
          "columns": [
            {
              "name": "id",
              "type": "UUID",
              "nullable": false,
              "primaryKey": true
            },
            {
              "name": "name",
              "type": "STRING",
              "nullable": false,
              "maxLength": 255
            },
            {
              "name": "email",
              "type": "STRING",
              "nullable": false,
              "unique": true,
              "maxLength": 255
            }
          ]
        }
      ]
    }
  }
}
```

**构建中响应**:
```json
{
  "data": {
    "deployment": {
      "id": "dep_a1b2c3d4",
      "version": "1.0.0",
      "environment": "PREVIEW",
      "status": "BUILDING",
      "progress": 75,
      "estimatedTimeRemaining": 30000,
      "currentStep": "Creating database schema",
      "deployedAt": "2024-01-01T00:00:00Z",
      "deployer": {
        "name": "John Doe"
      }
    }
  }
}
```

**失败响应**:
```json
{
  "error": {
    "code": "SCHEMA_DEPLOYMENT_FAILED",
    "message": "数据模型发布失败",
    "status": "FAILED",
    "details": {
      "buildLog": "Error: Schema validation failed\nColumn 'name' already exists in table 'customers'",
      "errorType": "SCHEMA_ERROR",
      "step": "Database schema creation",
      "suggestion": "检查表结构定义，确保列名唯一性",
      "retryable": false
    },
    "deployment": {
      "id": "dep_a1b2c3d4",
      "version": "1.0.0",
      "environment": "PREVIEW",
      "failedAt": "2024-01-01T00:00:00Z",
      "buildTime": 12000,
      "deployer": {
        "name": "John Doe"
      }
    }
  }
}
```

**发布说明**:
- **Schema 隔离**: 每个环境创建独立的数据库 Schema
- **环境类型**: `PREVIEW` (预览环境) | `PRODUCTION` (正式环境)
- **响应状态**: `BUILDING` (构建中) | `DEPLOYED` (已部署) | `FAILED` (失败)
- **表结构快照**: 完整记录发布的表结构定义

### 数据模型元数据管理

#### 动态表 (`/meta/projects/{projectId}/tables`)

#### 获取表列表
```http
GET /meta/projects/{projectId}/tables
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "tables": [
      {
        "id": "tbl_a1b2c3d4",
        "name": "customers",
        "displayName": "客户管理",
        "description": "客户信息管理表",
        "columnCount": 5,
        "rowCount": 150,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 创建动态表
```http
POST /meta/projects/{projectId}/tables
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "customers",
  "displayName": "客户管理",
  "description": "客户信息管理表",
  "columns": [
    {
      "name": "name",
      "displayName": "姓名",
      "type": "STRING",
      "nullable": false,
      "order": 1
    },
    {
      "name": "email",
      "displayName": "邮箱",
      "type": "STRING",
      "nullable": false,
      "unique": true,
      "order": 2
    },
    {
      "name": "phone",
      "displayName": "电话",
      "type": "STRING",
      "nullable": true,
      "order": 3
    },
    {
      "name": "status",
      "displayName": "状态",
      "type": "STRING",
      "nullable": true,
      "defaultValue": "active",
      "order": 4
    },
    {
      "name": "priority",
      "displayName": "优先级",
      "type": "NUMBER",
      "nullable": true,
      "defaultValue": 5.0,
      "order": 5
    }
  ]
}
```

**响应**:
```json
{
  "data": {
    "table": {
      "id": "tbl_a1b2c3d4",
      "name": "customers",
      "displayName": "客户管理",
      "description": "客户信息管理表",
      "tableName": "project_a1b2c3d4_customers",
      "columns": [
        {
          "id": "col_xyz789uv",
          "name": "name",
          "displayName": "姓名",
          "type": "STRING",
          "nullable": false,
          "order": 1
        }
      ],
      "defaultView": {
        "id": "view_def456rs",
        "name": "default",
        "isDefault": true,
        "isMaterialized": false
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 获取表详情
```http
GET /meta/tables/{tableId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "table": {
      "id": "tbl_a1b2c3d4",
      "name": "customers",
      "displayName": "客户管理",
      "description": "客户信息管理表",
      "projectId": "proj_a1b2c3d4",
      "tableName": "project_a1b2c3d4_customers",
      "columns": [
        {
          "id": "col_xyz789uv",
          "name": "name",
          "displayName": "姓名",
          "type": "STRING",
          "nullable": false,
          "order": 1
        }
      ],
      "defaultView": {
        "id": "view_def456rs",
        "name": "default",
        "isDefault": true,
        "isMaterialized": false
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 更新表结构
```http
PATCH /meta/tables/{tableId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "displayName": "客户信息管理",
  "description": "更新后的描述",
  "columns": [
    {
      "id": "col_xyz789uv",
      "name": "name",
      "displayName": "客户姓名",
      "type": "STRING",
      "nullable": false,
      "order": 1
    },
    {
      "name": "age",
      "displayName": "年龄",
      "type": "NUMBER",
      "nullable": true,
      "order": 6
    }
  ]
}
```

**响应**:
```json
{
  "data": {
    "table": {
      "id": "tbl_a1b2c3d4",
      "name": "customers",
      "displayName": "客户信息管理",
      "description": "更新后的描述",
      "projectId": "proj_a1b2c3d4",
      "tableName": "project_a1b2c3d4_customers",
      "columns": [
        {
          "id": "col_xyz789uv",
          "name": "name",
          "displayName": "客户姓名",
          "type": "STRING",
          "nullable": false,
          "order": 1
        },
        {
          "name": "age",
          "displayName": "年龄",
          "type": "NUMBER",
          "nullable": true,
          "order": 6
        }
      ],
      "defaultView": {
        "id": "view_def456rs",
        "name": "default",
        "isDefault": true,
        "isMaterialized": false
      },
      "updatedAt": "2024-01-01T01:00:00Z"
    }
  }
}
```

#### 删除表
```http
DELETE /meta/tables/{tableId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "deleted": true,
    "tableId": "tbl_a1b2c3d4"
  }
}
```

#### 视图管理

##### 视图 (`/meta/tables/{tableId}/views`)

#### 获取视图列表
```http
GET /meta/tables/{tableId}/views
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "views": [
      {
        "id": "view_def456rs",
        "name": "default",
        "displayName": "默认视图",
        "description": "自动生成的默认视图",
        "isDefault": true,
        "isMaterialized": false,
        "columnCount": 5,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "view_ghi789jk",
        "name": "high_value_customers",
        "displayName": "高价值客户",
        "description": "优先级大于8的客户视图",
        "isDefault": false,
        "isMaterialized": true,
        "refreshInterval": 3600,
        "columnCount": 3,
        "createdAt": "2024-01-01T01:00:00Z"
      }
    ]
  }
}
```

#### 创建安全视图定义
```http
POST /meta/tables/{tableId}/views
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "active_customers",
  "displayName": "活跃客户",
  "description": "状态为活跃的客户",
  "isMaterialized": false,
  "definition": {
    "columns": [
      {
        "source": "name",
        "alias": "customer_name"
      },
      {
        "source": "email"
      },
      {
        "source": "status"
      },
      {
        "source": "priority",
        "aggregate": "AVG",
        "alias": "avg_priority"
      }
    ],
    "filters": [
      {
        "field": "status",
        "operator": "=",
        "value": "active"
      },
      {
        "field": "priority",
        "operator": ">",
        "value": 5
      }
    ],
    "groups": ["status"],
    "orders": [
      {
        "field": "priority",
        "direction": "desc"
      }
    ],
    "limit": 100
  }
}
```

**响应**:
```json
{
  "data": {
    "view": {
      "id": "view_mno123pq",
      "name": "active_customers",
      "displayName": "活跃客户",
      "description": "状态为活跃的客户",
      "isDefault": false,
      "isMaterialized": false,
      "definition": {
        "columns": [
          {
            "source": "name",
            "alias": "customer_name"
          },
          {
            "source": "email"
          },
          {
            "source": "status"
          },
          {
            "source": "priority",
            "aggregate": "AVG",
            "alias": "avg_priority"
          }
        ],
        "filters": [
          {
            "field": "status",
            "operator": "=",
            "value": "active"
          },
          {
            "field": "priority",
            "operator": ">",
            "value": 5
          }
        ],
        "groups": ["status"],
        "orders": [
          {
            "field": "priority",
            "direction": "desc"
          }
        ],
        "limit": 100
      },
      "viewName": "view_project_a1b2c3d4_customers_active_customers",
      "createdAt": "2024-01-01T02:00:00Z"
    }
  }
}
```

#### 创建物化视图
```http
POST /meta/tables/{tableId}/views
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "customer_summary",
  "displayName": "客户统计",
  "description": "按状态分组的客户统计",
  "isMaterialized": true,
  "refreshInterval": 3600,
  "definition": {
    "columns": [
      {
        "source": "status",
        "alias": "customer_status"
      },
      {
        "source": "id",
        "aggregate": "COUNT",
        "alias": "total_count"
      },
      {
        "source": "priority",
        "aggregate": "AVG",
        "alias": "avg_priority"
      }
    ],
    "filters": [
      {
        "field": "priority",
        "operator": ">=",
        "value": 5
      }
    ],
    "groups": ["status"]
  }
}
```

#### 视图定义安全验证

所有视图定义都必须通过严格的安全验证：

```typescript
// 安全的视图定义结构
interface SafeViewDefinition {
  // 列定义（必填）
  columns: Array<{
    source: string;           // 源列名（必须存在于表中）
    alias?: string;           // 别名
    aggregate?: AggregateOp;  // 聚合函数（可选）
  }>;

  // 过滤条件（可选）
  filters?: Array<{
    field: string;            // 列名
    operator: ComparisonOp;   // 比较运算符
    value: any;              // 过滤值
  }>;

  // 分组字段（可选）
  groups?: string[];

  // 排序规则（可选）
  orders?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;

  // 结果限制（可选）
  limit?: number;
  offset?: number;
}

// 枚举化的聚合运算符
enum AggregateOp {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX'
}

// 枚举化的比较运算符
enum ComparisonOp {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_EQUAL = '<=',
  LIKE = 'LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL'
}
```

#### 获取视图详情
```http
GET /meta/views/{viewId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "view": {
      "id": "view_mno123pq",
      "name": "active_customers",
      "displayName": "活跃客户",
      "description": "状态为活跃的客户",
      "isDefault": false,
      "isMaterialized": false,
      "projectId": "proj_a1b2c3d4",
      "tableId": "tbl_a1b2c3d4",
      "definition": {
        "columns": [
          {
            "source": "name",
            "alias": "customer_name"
          },
          {
            "source": "status"
          },
          {
            "source": "priority",
            "aggregate": "AVG",
            "alias": "avg_priority"
          }
        ],
        "filters": [
          {
            "field": "status",
            "operator": "=",
            "value": "active"
          },
          {
            "field": "priority",
            "operator": ">",
            "value": 5
          }
        ],
        "groups": ["status"],
        "orders": [
          {
            "field": "priority",
            "direction": "desc"
          }
        ],
        "limit": 100
      },
      "viewName": "view_project_a1b2c3d4_customers_active_customers",
      "createdAt": "2024-01-01T02:00:00Z",
      "updatedAt": "2024-01-01T02:00:00Z"
    }
  }
}
```

#### 更新视图
```http
PATCH /meta/views/{viewId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "displayName": "更新后的视图名称",
  "definition": {
    "columns": [
      {
        "source": "name",
        "alias": "customer_name"
      },
      {
        "source": "status"
      },
      {
        "source": "priority",
        "aggregate": "AVG",
        "alias": "avg_priority"
      }
    ],
    "filters": [
      {
        "field": "status",
        "operator": "=",
        "value": "active"
      },
      {
        "field": "priority",
        "operator": ">=",
        "value": 7
      }
    ]
  }
}
```

**响应**:
```json
{
  "data": {
    "view": {
      "id": "view_mno123pq",
      "name": "active_customers",
      "displayName": "更新后的视图名称",
      "description": "状态为活跃的客户",
      "isDefault": false,
      "isMaterialized": false,
      "projectId": "proj_a1b2c3d4",
      "tableId": "tbl_a1b2c3d4",
      "definition": {
        "columns": [
          {
            "source": "name",
            "alias": "customer_name"
          },
          {
            "source": "status"
          },
          {
            "source": "priority",
            "aggregate": "AVG",
            "alias": "avg_priority"
          }
        ],
        "filters": [
          {
            "field": "status",
            "operator": "=",
            "value": "active"
          },
          {
            "field": "priority",
            "operator": ">=",
            "value": 7
          }
        ]
      },
      "updatedAt": "2024-01-01T03:00:00Z"
    }
  }
}
```

#### 删除视图
```http
DELETE /meta/views/{viewId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "deleted": true,
    "viewId": "view_mno123pq"
  }
}
```

#### 刷新物化视图
```http
POST /meta/views/{viewId}/refresh
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "view": {
      "id": "view_mno123pq",
      "name": "active_customers",
      "displayName": "活跃客户",
      "status": "refreshing",
      "lastRefreshedAt": "2024-01-01T02:00:00Z",
      "refreshStartedAt": "2024-01-01T03:00:00Z"
    }
  }
}
```

#### 安全验证错误响应

如果视图定义不符合安全规范，将返回详细的验证错误：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid view definition",
    "details": [
      {
        "path": "definition.columns.0.source",
        "message": "Column 'invalid_column' does not exist in table",
        "code": "INVALID_COLUMN"
      },
      {
        "path": "definition.filters.0.operator",
        "message": "Operator 'DANGEROUS_OP' is not allowed",
        "code": "INVALID_OPERATOR"
      },
      {
        "path": "definition",
        "message": "When using aggregate functions with multiple columns, GROUP BY must be specified",
        "code": "AGGREGATE_CONSISTENCY"
      }
    ]
  }
}
```

---

## 业务数据层 (/data/*)

业务数据层提供动态数据的CRUD操作、查询和业务逻辑处理。这些API操作真实的业务数据，需要认证和数据级权限。

### 动态表数据操作

#### 创建数据行
```http
POST /data/tables/{tableId}/rows
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "status": "active",
  "priority": 8.5
}
```

**响应**:
```json
{
  "data": {
    "id": "row_rst456uv",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "status": "active",
    "priority": 8.5,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 获取单行数据
```http
GET /data/tables/{tableId}/rows/{rowId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "id": "row_rst456uv",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "status": "active",
    "priority": 8.5,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 更新数据行
```http
PATCH /data/tables/{tableId}/rows/{rowId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "premium",
  "priority": 9.0
}
```

**响应**:
```json
{
  "data": {
    "id": "row_rst456uv",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "123-456-7890",
    "status": "premium",
    "priority": 9.0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T01:00:00Z"
  }
}
```

#### 删除数据行
```http
DELETE /data/tables/{tableId}/rows/{rowId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "deleted": true,
    "id": "row_rst456uv"
  }
}
```

#### 批量操作

##### 批量创建数据行
```http
POST /data/tables/{tableId}/rows/batch
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "rows": [
    {
      "name": "Alice Smith",
      "email": "alice@example.com",
      "phone": "123-456-7890",
      "status": "active",
      "priority": 7.5
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "phone": "098-765-4321",
      "status": "pending",
      "priority": 6.0
    }
  ],
  "options": {
    "continueOnError": true,
    "validateOnly": false
  }
}
```

**响应**:
```json
{
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "id": "row_abc123def",
        "data": {
          "id": "row_abc123def",
          "name": "Alice Smith",
          "email": "alice@example.com",
          "created_at": "2024-01-01T00:00:00Z"
        }
      },
      {
        "index": 1,
        "success": true,
        "id": "row_def456ghi",
        "data": {
          "id": "row_def456ghi",
          "name": "Bob Johnson",
          "email": "bob@example.com",
          "created_at": "2024-01-01T00:00:01Z"
        }
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "errors": []
    }
  }
}
```

##### 批量更新数据行
```http
PATCH /data/tables/{tableId}/rows/batch
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "updates": [
    {
      "id": "row_abc123def",
      "data": {
        "status": "premium",
        "priority": 8.0
      }
    },
    {
      "id": "row_def456ghi",
      "data": {
        "status": "active"
      }
    }
  ],
  "options": {
    "continueOnError": true
  }
}
```

**响应**:
```json
{
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "id": "row_abc123def",
        "updatedData": {
          "status": "premium",
          "priority": 8.0,
          "updated_at": "2024-01-01T01:00:00Z"
        }
      },
      {
        "index": 1,
        "success": true,
        "id": "row_def456ghi",
        "updatedData": {
          "status": "active",
          "updated_at": "2024-01-01T01:00:01Z"
        }
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "errors": []
    }
  }
}
```

##### 批量删除数据行
```http
DELETE /data/tables/{tableId}/rows/batch
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "ids": ["row_abc123def", "row_def456ghi", "row_ghi789jkl"],
  "options": {
    "continueOnError": true
  }
}
```

**响应**:
```json
{
  "data": {
    "results": [
      {
        "index": 0,
        "success": true,
        "id": "row_abc123def",
        "deleted": true
      },
      {
        "index": 1,
        "success": true,
        "id": "row_def456ghi",
        "deleted": true
      },
      {
        "index": 2,
        "success": false,
        "id": "row_ghi789jkl",
        "error": {
          "code": "ROW_NOT_FOUND",
          "message": "Row not found"
        }
      }
    ],
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1,
      "errors": [
        {
          "index": 2,
          "id": "row_ghi789jkl",
          "code": "ROW_NOT_FOUND",
          "message": "Row not found"
        }
      ]
    }
  }
}
```

#### 全文搜索

##### 表内搜索
```http
GET /data/tables/{tableId}/search?q=John&fields=name,email&page=1&limit=20
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "query": {
      "text": "John",
      "fields": ["name", "email"],
      "tableId": "tbl_a1b2c3d4"
    },
    "results": [
      {
        "id": "row_rst456uv",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "active",
        "priority": 8.5,
        "highlights": {
          "name": "<mark>John</mark> Doe",
          "email": "<mark>john</mark>@example.com"
        },
        "score": 0.95
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    },
    "searchMeta": {
      "searchTime": 0.045,
      "totalDocuments": 150,
      "searchedDocuments": 150
    }
  }
}
```

##### 高级搜索
```http
POST /data/tables/{tableId}/search/advanced
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "query": {
    "text": "customer",
    "fields": ["name", "description"],
    "filters": [
      {
        "field": "status",
        "operator": "=",
        "value": "active"
      },
      {
        "field": "priority",
        "operator": ">=",
        "value": 7
      }
    ],
    "sort": [
      {
        "field": "priority",
        "direction": "desc"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "options": {
    "highlight": true,
    "snippetLength": 150,
    "includeScore": true
  }
}
```

**响应**:
```json
{
  "data": {
    "query": {
      "text": "customer",
      "fields": ["name", "description"],
      "filters": [
        {
          "field": "status",
          "operator": "=",
          "value": "active"
        }
      ],
      "sort": [
        {
          "field": "priority",
          "direction": "desc"
        }
      ]
    },
    "results": [
      {
        "id": "row_rst456uv",
        "name": "Premium Customer",
        "description": "High value customer with priority support",
        "status": "active",
        "priority": 9.0,
        "highlights": {
          "name": "Premium <mark>Customer</mark>",
          "description": "High value <mark>customer</mark> with priority support"
        },
        "score": 0.98
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    },
    "searchMeta": {
      "searchTime": 0.067,
      "totalDocuments": 150,
      "searchedDocuments": 45,
      "matchingDocuments": 1
    }
  }
}
```

#### 数据导入导出

##### 导出数据
```http
GET /data/tables/{tableId}/export?format=csv&fields=name,email,status&filter[status]=active
authorization: Bearer <jwt_token>
```

**支持的格式**: `csv`, `xlsx`, `json`

**响应**:
```http
Content-Type: text/csv
Content-Disposition: attachment; filename="customers_2024-01-01.csv"

id,name,email,status,priority,created_at
row_rst456uv,John Doe,john@example.com,active,8.5,2024-01-01T00:00:00Z
row_abc123def,Alice Smith,alice@example.com,active,7.5,2024-01-01T00:00:01Z
```

##### 高级导出
```http
POST /data/tables/{tableId}/export
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "format": "xlsx",
  "fields": ["name", "email", "status", "priority"],
  "filters": [
    {
      "field": "status",
      "operator": "=",
      "value": "active"
    },
    {
      "field": "priority",
      "operator": ">=",
      "value": 7
    }
  ],
  "sort": [
    {
      "field": "name",
      "direction": "asc"
    }
  ],
  "options": {
    "includeHeaders": true,
    "dateFormat": "YYYY-MM-DD HH:mm:ss",
    "timezone": "UTC"
  }
}
```

**响应**:
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="customers_2024-01-01.xlsx"

[Excel文件二进制数据]
```

##### 导入数据
```http
POST /data/tables/{tableId}/import
authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: [CSV/XLSX/JSON文件]
options: {
  "format": "csv",
  "mapping": {
    "Name": "name",
    "Email": "email",
    "Status": "status",
    "Priority": "priority"
  },
  "validation": {
    "skipInvalidRows": true,
    "stopOnError": false
  },
  "updateStrategy": "create_only"
}
```

**响应**:
```json
{
  "data": {
    "importId": "imp_abc123def",
    "status": "completed",
    "summary": {
      "totalRows": 100,
      "successfulRows": 95,
      "failedRows": 5,
      "skippedRows": 0,
      "duplicateRows": 0
    },
    "results": [
      {
        "rowNumber": 1,
        "success": true,
        "id": "row_new123abc",
        "data": {
          "name": "New Customer",
          "email": "new@example.com",
          "status": "active",
          "priority": 5.0
        }
      },
      {
        "rowNumber": 2,
        "success": false,
        "error": {
          "code": "VALIDATION_ERROR",
          "message": "Invalid email format",
          "field": "email"
        }
      }
    ],
    "errors": [
      {
        "rowNumber": 2,
        "code": "VALIDATION_ERROR",
        "message": "Invalid email format",
        "field": "email",
        "value": "invalid-email"
      }
    ]
  }
}
```

##### 获取导入状态
```http
GET /data/tables/{tableId}/imports/{importId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "import": {
      "id": "imp_abc123def",
      "status": "processing",
      "progress": {
        "total": 1000,
        "processed": 650,
        "percentage": 65
      },
      "summary": {
        "totalRows": 1000,
        "successfulRows": 620,
        "failedRows": 30,
        "skippedRows": 0,
        "duplicateRows": 0
      },
      "startedAt": "2024-01-01T10:00:00Z",
      "estimatedCompletion": "2024-01-01T10:05:00Z",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

#### 数据操作说明

**批量操作限制**:
- 单次批量操作最多1000条记录
- 批量操作超时时间为60秒
- 支持事务性操作，失败时自动回滚

**搜索功能特性**:
- 支持全文索引搜索
- 支持字段权重配置
- 支持搜索结果高亮
- 支持模糊匹配和同义词扩展

**导入导出格式**:
- **CSV**: 逗号分隔值，支持自定义分隔符
- **XLSX**: Excel格式，支持多工作表
- **JSON**: 结构化数据，支持嵌套对象

**数据验证**:
- 导入时自动进行字段类型验证
- 支持自定义验证规则
- 提供详细的错误报告和修复建议

---

## 安全视图查询 (结构化定义)

### 查询默认视图
```http
GET /data/tables/{tableId}/rows?page=1&limit=20&sort[name]=asc&filter[status]=active
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "rows": [
      {
        "id": "row_rst456uv",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "active",
        "priority": 8.5,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "displayName": "ID"
      },
      {
        "name": "name",
        "type": "STRING",
        "displayName": "姓名"
      }
    ]
  }
}
```

### 创建安全视图定义
```http
POST /meta/projects/{projectId}/tables/{tableId}/views
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "active_customers",
  "displayName": "活跃客户",
  "description": "状态为活跃的客户视图",
  "isMaterialized": false,
  "definition": {
    "columns": [
      {
        "source": "name",
        "alias": "customer_name"
      },
      {
        "source": "email"
      },
      {
        "source": "status"
      },
      {
        "source": "priority",
        "aggregate": "AVG",
        "alias": "avg_priority"
      }
    ],
    "filters": [
      {
        "field": "status",
        "operator": "=",
        "value": "active"
      },
      {
        "field": "priority",
        "operator": ">",
        "value": 5
      }
    ],
    "groups": ["status"],
    "orders": [
      {
        "field": "priority",
        "direction": "desc"
      }
    ],
    "limit": 100
  }
}
```

### 查询自定义视图
```http
GET /data/views/{viewId}/rows?page=1&limit=20
authorization: Bearer <jwt_token>
```

### 视图定义数据结构
```typescript
interface SafeViewDefinition {
  // 列定义
  columns: Array<{
    source: string;           // 源列名（必须存在于表中）
    alias?: string;           // 别名
    aggregate?: AggregateOp;  // 聚合函数（可选）
  }>;

  // 过滤条件
  filters?: Array<{
    field: string;            // 列名
    operator: ComparisonOp;   // 比较运算符
    value: any;              // 过滤值
  }>;

  // 分组字段
  groups?: string[];

  // 排序规则
  orders?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;

  // 结果限制
  limit?: number;
  offset?: number;
}

// 枚举化的聚合运算符
enum AggregateOp {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX'
}

// 枚举化的比较运算符
enum ComparisonOp {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_EQUAL = '<=',
  LIKE = 'LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL'
}
```

### 安全查询参数说明

#### 默认视图筛选 (仅支持基础操作)
- `filter[field]=value` - 等于
- `filter[field][ne]=value` - 不等于
- `filter[field][gt]=value` - 大于
- `filter[field][gte]=value` - 大于等于
- `filter[field][lt]=value` - 小于
- `filter[field][lte]=value` - 小于等于
- `filter[field][in]=value1,value2` - 在列表中
- `filter[field][nin]=value1,value2` - 不在列表中

#### 排序参数
- `sort[field]=asc` - 升序
- `sort[field]=desc` - 降序

#### 分页参数
- `page` - 页码（从1开始）
- `limit` - 每页数量（最大100）

#### 安全限制
- **复杂查询必须通过视图定义**：聚合、分组、复杂过滤需要创建视图定义
- **列名白名单验证**：只允许表中存在的列
- **参数化查询**：所有筛选值通过参数传递，防止 SQL 注入
- **标识符转义**：列名和表名自动转义处理

### 应用元数据管理

#### 应用 (`/meta/projects/{projectId}/apps`)

**用途**：管理应用的基础信息和页面配置

#### 获取应用列表
```http
GET /meta/projects/{projectId}/apps
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "apps": [
      {
        "id": "app_xyz789uvw",
        "name": "Customer Management",
        "slug": "customer-management",
        "description": "Customer relationship management",
        "status": "draft",
        "pageCount": 5,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 创建应用
```http
POST /meta/projects/{projectId}/apps
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Customer Management",
  "slug": "customer-management",
  "description": "Customer relationship management"
}
```

#### 获取应用详情
```http
GET /meta/apps/{appId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "app": {
      "id": "app_xyz789uvw",
      "name": "Customer Management",
      "slug": "customer-management",
      "description": "Customer relationship management",
      "status": "draft",
      "projectId": "proj_a1b2c3d4",
      "pageCount": 5,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 更新应用
```http
PATCH /meta/apps/{appId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Enhanced Customer Management"
}
```

#### 删除应用
```http
DELETE /meta/apps/{appId}
authorization: Bearer <jwt_token>
```

#### 发布应用
```http
POST /meta/apps/{appId}/publish
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "version": "1.0.0",
  "environment": "PREVIEW",
  "dataModelVersion": "1.0.0",
  "config": {
    "domain": "myapp.fastbuild.com",
    "theme": "dark",
    "customSettings": {
      "logo": "https://example.com/logo.png",
      "brandColor": "#3b82f6"
    }
  }
}
```

**发布说明**:
- **环境类型**: `PREVIEW` (预览环境) | `PRODUCTION` (正式环境)
- **响应状态**: `BUILDING` (构建中) | `DEPLOYED` (已部署) | `FAILED` (失败)
- **二维码**: 成功发布时自动生成 Base64 编码的 PNG 图片
- **访问统计**: 应用访问量自动更新，无需额外 API 调用

---

## 页面管理

### 页面元数据管理

#### 页面 (`/meta/apps/{appId}/pages`)

**用途**：管理应用的页面结构和布局配置

#### 获取页面列表
```http
GET /meta/apps/{appId}/pages
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "pages": [
      {
        "id": "page_abc123def",
        "name": "customer_list",
        "path": "/customers",
        "title": "客户列表",
        "description": "显示所有客户信息的列表页面",
        "componentCount": 3,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### 创建页面
```http
POST /meta/apps/{appId}/pages
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "customer_list",
  "path": "/customers",
  "title": "客户列表",
  "description": "显示所有客户信息的列表页面",
  "layout": {
    "components": [
      {
        "type": "table",
        "props": {
          "dataSource": "customers"
        }
      }
    ]
  }
}
```

**响应**:
```json
{
  "data": {
    "page": {
      "id": "page_abc123def",
      "name": "customer_list",
      "path": "/customers",
      "title": "客户列表",
      "description": "显示所有客户信息的列表页面",
      "appId": "app_xyz789uvw",
      "layout": {
        "components": [
          {
            "type": "table",
            "props": {
              "dataSource": "customers"
            }
          }
        ]
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### 获取页面详情
```http
GET /meta/pages/{pageId}
authorization: Bearer <jwt_token>
```

#### 更新页面
```http
PATCH /meta/pages/{pageId}
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Customer Dashboard",
  "title": "客户仪表板",
  "layout": {
    "components": [
      {
        "type": "dashboard",
        "props": {
          "metrics": ["total_customers", "active_customers"]
        }
      }
    ]
  }
}
```

#### 删除页面
```http
DELETE /meta/pages/{pageId}
authorization: Bearer <jwt_token>
```

---

## 权限系统 (企业级)

### 权限架构设计

FastBuild采用分层权限控制架构，确保安全性和灵活性：

```typescript
// 权限检查架构
interface PermissionContext {
  userId: string;           // 用户ID
  layer: 'sys' | 'meta' | 'data' | 'app';  // API层级
  resourceId?: string;      // 资源ID (项目/应用/表)
  action: string;           // 操作类型
  context?: any;           // 额外上下文
}

// 分层权限检查
async function checkPermission(context: PermissionContext): Promise<boolean> {
  switch (context.layer) {
    case 'sys': return checkSystemPermission(context);
    case 'meta': return checkMetaPermission(context);
    case 'data': return checkDataPermission(context);
    case 'app': return checkAppPermission(context);
  }
}
```

### 系统级权限 (/sys/*)

#### 公开端点 - 无需认证
```typescript
const publicEndpoints = [
  '/sys/auth/login',
  '/sys/auth/register',
  '/sys/auth/forgot-password',
  '/sys/auth/reset-password',
  '/sys/health'
];
```

#### 用户级权限 - 需要认证
```typescript
async function checkSystemPermission(context: PermissionContext): boolean {
  // 检查JWT有效性
  if (!await validateJWT(context.userId)) return false;

  // 用户只能访问自己的资源
  if (context.action === 'profile_update') {
    return context.resourceId === context.userId;
  }

  return true;
}
```

### 项目级权限 (/meta/*)

#### 角色权限矩阵
| 角色 | 读取 | 创建 | 更新 | 删除 | 管理 | 发布 |
|------|------|------|------|------|------|------|
| OWNER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| EDITOR | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### 权限检查逻辑
```typescript
async function checkMetaPermission(context: PermissionContext): Promise<boolean> {
  // 1. 检查JWT有效性
  if (!await validateJWT(context.userId)) return false;

  // 2. 检查项目成员身份
  const membership = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: context.userId,
        projectId: context.resourceId
      }
    }
  });

  if (!membership) return false;

  // 3. 检查角色权限
  const rolePermissions = {
    OWNER: ['read', 'create', 'update', 'delete', 'manage', 'publish'],
    ADMIN: ['read', 'create', 'update', 'delete', 'publish'],
    EDITOR: ['read', 'create', 'update'],
    VIEWER: ['read']
  };

  return rolePermissions[membership.role].includes(context.action);
}
```

### 数据级权限 (/data/*)

#### 数据访问控制模型
```typescript
interface DataPermissionRule {
  tableId: string;
  userId: string;
  permissions: {
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    rowLevelFilter?: string;  // 行级过滤条件
    columnLevelMask?: string[]; // 列级掩码
  };
}
```

#### 权限检查实现
```typescript
async function checkDataPermission(context: PermissionContext): Promise<boolean> {
  // 1. 检查项目级权限
  const table = await db.table.findUnique({
    where: { id: context.resourceId },
    include: { project: true }
  });

  if (!table) return false;

  const hasProjectPermission = await checkMetaPermission({
    ...context,
    resourceId: table.projectId,
    action: 'read'
  });

  if (!hasProjectPermission) return false;

  // 2. 检查数据级权限
  const dataPermission = await db.dataPermission.findUnique({
    where: {
      tableId_userId: {
        tableId: context.resourceId,
        userId: context.userId
      }
    }
  });

  if (!dataPermission) return false;

  // 3. 检查具体操作权限
  switch (context.action) {
    case 'read': return dataPermission.canRead;
    case 'create': return dataPermission.canCreate;
    case 'update': return dataPermission.canUpdate;
    case 'delete': return dataPermission.canDelete;
    default: return false;
  }
}
```

### 应用级权限 (/app/*)

#### 应用访问控制
```typescript
interface AppPermission {
  appId: string;
  userId: string;
  accessLevel: 'admin' | 'user' | 'readonly';
  allowedActions: string[];
  restrictions: {
    ipWhitelist?: string[];
    timeRestrictions?: {
      startHour: number;
      endHour: number;
    };
    dataFilters?: Record<string, any>;
  };
}
```

#### 权限检查实现
```typescript
async function checkAppPermission(context: PermissionContext): Promise<boolean> {
  // 1. 检查应用是否已发布
  const app = await db.app.findUnique({
    where: { id: context.resourceId },
    include: { deployments: true }
  });

  if (!app || app.status !== 'published') return false;

  // 2. 检查应用访问权限
  const appPermission = await db.appPermission.findUnique({
    where: {
      appId_userId: {
        appId: context.resourceId,
        userId: context.userId
      }
    }
  });

  if (!appPermission) return false;

  // 3. 检查访问限制
  if (appPermission.restrictions.ipWhitelist) {
    const clientIP = getClientIP(context.request);
    if (!appPermission.restrictions.ipWhitelist.includes(clientIP)) {
      return false;
    }
  }

  // 4. 检查操作权限
  return appPermission.allowedActions.includes(context.action);
}
```

### 权限继承链

```
系统权限 (基础)
    ↓
项目权限 (继承系统权限)
    ↓
数据权限 (继承项目权限)
    ↓
应用权限 (继承数据权限)
```

### 权限缓存策略

```typescript
// 权限缓存实现
class PermissionCache {
  private cache = new Map<string, { permission: boolean; expires: number }>();

  async get(context: PermissionContext): Promise<boolean | null> {
    const key = this.generateKey(context);
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.permission;
    }

    return null;
  }

  async set(context: PermissionContext, permission: boolean): Promise<void> {
    const key = this.generateKey(context);
    this.cache.set(key, {
      permission,
      expires: Date.now() + 5 * 60 * 1000 // 5分钟缓存
    });
  }
}
```

### 审计日志

```typescript
// 权限检查审计
async function auditPermissionCheck(
  context: PermissionContext,
  result: boolean
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: context.userId,
      action: context.action,
      resource: context.resourceId,
      layer: context.layer,
      result: result ? 'GRANTED' : 'DENIED',
      timestamp: new Date(),
      ipAddress: getClientIP(context.request),
      userAgent: getUserAgent(context.request)
    }
  });
}
```

### 权限最佳实践

1. **最小权限原则**：用户只获得完成任务所需的最小权限
2. **权限继承**：上级权限自动包含下级权限
3. **动态权限**：支持运行时权限调整和临时权限授予
4. **权限审计**：记录所有权限检查和变更操作
5. **缓存优化**：权限检查结果缓存，提升性能
6. **安全第一**：权限检查失败时默认拒绝访问

---

## 错误处理 (简化版)

### HTTP 状态码
- `200 OK` - 请求成功
- `201 Created` - 资源创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 认证失败
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器内部错误

### 错误响应格式
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Email is required"
    }
  }
}
```

### 表操作特定错误
```json
{
  "error": {
    "code": "TABLE_CREATION_FAILED",
    "message": "Failed to create dynamic table",
    "details": {
      "sqlError": "Column name already exists",
      "suggestion": "Use a different column name"
    }
  }
}
```

### 视图操作特定错误
```json
{
  "error": {
    "code": "VIEW_CREATION_FAILED",
    "message": "Failed to create view",
    "details": {
      "sqlError": "Invalid column reference",
      "suggestion": "Check column names in view definition"
    }
  }
}
```

---

### 发布系统参考

详细的应用发布流程和数据模型发布信息请参考前面的章节。

---

## 发布系统统一说明

### 发布环境管理

#### 环境类型
- `PREVIEW`: 预览环境，用于测试和演示
- `PRODUCTION`: 正式环境，用于生产使用

#### 发布状态
- `BUILDING`: 构建中（包含进度和预计完成时间）
- `DEPLOYED`: 已部署（包含访问 URL 和二维码）
- `FAILED`: 构建失败（包含详细错误信息和修复建议）

#### 统一错误响应格式

所有发布相关的错误都遵循统一格式：

```json
{
  "error": {
    "code": "DEPLOYMENT_ERROR_CODE",
    "message": "用户友好的错误描述",
    "status": "FAILED",
    "details": {
      "buildLog": "详细的构建日志",
      "errorType": "SCHEMA_ERROR | BUILD_ERROR | NETWORK_ERROR",
      "step": "失败的具体步骤",
      "suggestion": "修复建议",
      "retryable": true | false
    },
    "deployment": {
      "id": "deployment_id",
      "version": "1.0.0",
      "environment": "PREVIEW",
      "failedAt": "2024-01-01T00:00:00Z",
      "buildTime": 12000
    }
  }
}
```

#### 常见错误类型

**数据模型发布错误**:
- `SCHEMA_DEPLOYMENT_FAILED`: 数据结构发布失败
- `TABLE_CREATION_FAILED`: 表创建失败
- `SCHEMA_VALIDATION_ERROR`: 结构验证错误

**应用发布错误**:
- `APP_DEPLOYMENT_FAILED`: 应用发布失败
- `BUILD_ERROR`: 构建错误
- `DATAMODEL_CONFLICT`: 数据模型版本冲突
- `RESOURCE_LIMIT_EXCEEDED`: 资源限制超出

#### 二维码说明

二维码自动包含在发布成功响应中，无需单独调用 API：
- **格式**: Base64 编码的 PNG 图片
- **内容**: 应用的访问 URL（预览或正式环境）
- **用途**: 方便移动端扫码访问

---

## 应用访问层 (/app/*)

应用访问层提供已发布应用的运行时访问功能，面向最终用户。这些API处理页面渲染、组件调用和用户交互，需要应用级权限。

### 应用访问

#### 获取应用信息
```http
GET /app/{appId}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "app": {
      "id": "app_xyz789uvw",
      "name": "Customer Management",
      "slug": "customer-management",
      "title": "客户管理系统",
      "description": "全面的客户关系管理解决方案",
      "version": "1.0.0",
      "status": "published",
      "config": {
        "theme": "dark",
        "brandColor": "#3b82f6",
        "logo": "https://example.com/logo.png"
      },
      "publishedAt": "2024-01-01T00:00:00Z",
      "lastAccessedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

#### 获取应用导航结构
```http
GET /app/{appId}/navigation
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "navigation": [
      {
        "id": "page_home",
        "name": "home",
        "path": "/",
        "title": "首页",
        "icon": "home",
        "order": 1
      },
      {
        "id": "page_customers",
        "name": "customers",
        "path": "/customers",
        "title": "客户管理",
        "icon": "users",
        "order": 2
      }
    ]
  }
}
```

### 页面访问

#### 渲染页面
```http
GET /app/{appId}/pages/{pageName}
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "page": {
      "id": "page_abc123def",
      "name": "customers",
      "path": "/customers",
      "title": "客户列表",
      "description": "查看和管理所有客户信息",
      "layout": {
        "components": [
          {
            "id": "comp_table_001",
            "type": "table",
            "props": {
              "dataSource": "customers",
              "columns": ["name", "email", "status"],
              "pageSize": 20,
              "sortable": true
            }
          },
          {
            "id": "comp_button_001",
            "type": "button",
            "props": {
              "text": "添加客户",
              "action": "create",
              "target": "/customers/new"
            }
          }
        ]
      },
      "metadata": {
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "renderTime": 150
      }
    }
  }
}
```

#### 获取页面静态资源
```http
GET /app/{appId}/assets/{assetPath}
authorization: Bearer <jwt_token>
```

**支持资源类型**:
- `/app/{appId}/assets/css/*` - 样式文件
- `/app/{appId}/assets/js/*` - JavaScript文件
- `/app/{appId}/assets/images/*` - 图片资源
- `/app/{appId}/assets/fonts/*` - 字体文件

### 组件交互

#### 调用组件API
```http
POST /app/{appId}/components/{componentId}/invoke
authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "search",
  "params": {
    "query": "John",
    "filters": {
      "status": "active"
    }
  }
}
```

**响应**:
```json
{
  "data": {
    "result": [
      {
        "id": "row_rst456uv",
        "name": "John Doe",
        "email": "john@example.com",
        "status": "active"
      }
    ],
    "total": 1,
    "executionTime": 45
  }
}
```

#### 获取组件状态
```http
GET /app/{appId}/components/{componentId}/state
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "state": {
      "currentPage": 1,
      "pageSize": 20,
      "filters": {
        "status": "active"
      },
      "sort": {
        "field": "name",
        "direction": "asc"
      }
    }
  }
}
```

### 应用配置

#### 获取应用配置
```http
GET /app/{appId}/config
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "config": {
      "theme": {
        "primaryColor": "#3b82f6",
        "backgroundColor": "#ffffff",
        "textColor": "#1f2937"
      },
      "features": {
        "exportEnabled": true,
        "searchEnabled": true,
        "filtersEnabled": true
      },
      "permissions": {
        "canCreate": true,
        "canEdit": true,
        "canDelete": false
      }
    }
  }
}
```

### 应用分析

#### 获取应用使用统计
```http
GET /app/{appId}/analytics?period=7d
authorization: Bearer <jwt_token>
```

**响应**:
```json
{
  "data": {
    "analytics": {
      "period": "7d",
      "totalViews": 1250,
      "uniqueUsers": 85,
      "avgSessionDuration": 450,
      "popularPages": [
        {
          "pageName": "customers",
          "views": 450,
          "percentage": 36
        },
        {
          "pageName": "dashboard",
          "views": 320,
          "percentage": 26
        }
      ],
      "userActions": [
        {
          "action": "create_customer",
          "count": 23
        },
        {
          "action": "search_customers",
          "count": 156
        }
      ]
    }
  }
}
```

### 应用访问说明
- **权限验证**：所有应用访问都需要有效的JWT令牌和应用访问权限
- **缓存策略**：页面和组件响应支持CDN缓存，提升性能
- **实时更新**：支持WebSocket连接，实现实时数据更新
- **离线支持**：关键页面支持Service Worker离线缓存
- **安全限制**：组件调用受到严格的权限和数据访问限制

---


## 开发者体验增强

### OpenAPI 3.0 规范

#### 完整的API文档
FastBuild API 提供完整的 OpenAPI 3.0 规范，可通过交互式 Swagger UI 访问：

```http
https://api.fastbuild.com/api/docs
```

#### OpenAPI 特性
- **自动生成**: 所有 API 端点自动生成 OpenAPI 规范
- **交互式文档**: Swagger UI 提供完整的 API 测试界面
- **客户端 SDK**: 支持多种编程语言的客户端库自动生成
- **版本同步**: OpenAPI 版本与 API 版本保持同步

#### 请求示例 (使用 curl)
```bash
# 获取项目列表
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/projects

# 创建新项目
curl -X POST \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Project", "slug": "new-project", "description": "A new project"}' \
  https://api.fastbuild.com/meta/projects

# 获取项目详情
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/projects/proj_a1b2c3d4

# 获取表详情（直接访问）
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/tables/tbl_a1b2c3d4

# 获取视图详情（直接访问）
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/views/view_ghi789jkl

# 获取应用详情（直接访问）
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/apps/app_xyz789uvw

# 获取页面详情（直接访问）
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/meta/pages/page_abc123def

# 创建数据表（层级访问）
curl -X POST \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "customers", "displayName": "客户管理"}' \
  https://api.fastbuild.com/meta/projects/proj_a1b2c3d4/tables

# 查询业务数据（保持项目上下文）
curl -X POST \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"status": "active"}, "pagination": {"page": 1, "limit": 20}}' \
  https://api.fastbuild.com/data/tables/tbl_a1b2c3d4/rows

# 预览应用（应用访问层）
curl -X GET \
  -H "API-Version: v4.0" \
  -H "authorization: Bearer <jwt_token>" \
  https://api.fastbuild.com/app/apps/app_xyz789uvw/preview
```

### 参数验证规则

#### 输入验证
所有 API 端点都进行严格的输入验证：

```typescript
// 参数验证示例
const createTableSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  columns: z.array(z.object({
    name: z.string().min(1).max(50),
    type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'UUID', 'JSON']),
    nullable: z.boolean().default(false),
    order: z.number().min(1).max(100)
  })).min(1).max(50)
});

// 批量操作验证
const batchUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: z.record(z.any())
  })).min(1).max(1000),
  options: z.object({
    continueOnError: z.boolean().default(false)
  })
});
```

#### 错误验证详细信息
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "name",
        "message": "名称字段为必填项",
        "code": "REQUIRED_FIELD"
      },
      {
        "field": "columns.0.type",
        "message": "无效的字段类型",
        "code": "INVALID_ENUM",
        "allowedValues": ["STRING", "NUMBER", "BOOLEAN", "DATE", "UUID", "JSON"]
      }
    ]
  }
}
```

### 实用工具和示例

#### JavaScript/TypeScript 客户端示例
```typescript
class FastBuildAPI {
  constructor(private baseUrl: string, private token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // 获取项目列表
  async getProjects(page = 1, limit = 20) {
    const response = await fetch(
      `${this.baseUrl}/meta/projects?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        }
      }
    );

    const data = await response.json();
    return data.data.projects;
  }

  // 创建项目
  async createProject(projectData: CreateProjectRequest) {
    const response = await fetch(
      `${this.baseUrl}/meta/projects`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(projectData)
      }
    );

    const data = await response.json();
    return data.data.app;
  }

  // 批量操作
  async batchCreateRows(tableId: string, rows: RowData[]) {
    const response = await fetch(
      `${this.baseUrl}/data/tables/${tableId}/rows/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ rows, options: { continueOnError: false } })
      }
    );

    const data = await response.json();
    return data.data;
  }

  // 直接访问资源示例
  async getTable(tableId: string) {
    const response = await fetch(
      `${this.baseUrl}/meta/tables/${tableId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        }
      }
    );

    const data = await response.json();
    return data.data.table;
  }

  async getApp(appId: string) {
    const response = await fetch(
      `${this.baseUrl}/meta/apps/${appId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        }
      }
    );

    const data = await response.json();
    return data.data.app;
  }

  async getView(viewId: string) {
    const response = await fetch(
      `${this.baseUrl}/meta/views/${viewId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        }
      }
    );

    const data = await response.json();
    return data.data.view;
  }

  // 层级创建操作示例
  async createTable(projectId: string, tableData: CreateTableRequest) {
    const response = await fetch(
      `${this.baseUrl}/meta/projects/${projectId}/tables`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Version': 'v4.0',
          'authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(tableData)
      }
    );

    const data = await response.json();
    return data.data.table;
  }
}

// 使用示例
const api = new FastBuildAPI('https://api.fastbuild.com', '<jwt_token>');

// 获取项目列表
const projects = await api.getProjects(1, 20);

// 创建项目
const newProject = await api.createProject({
  name: "Customer Management",
  slug: "customer-management",
  description: "Customer management system"
});

// 直接访问资源（推荐方式）
const table = await api.getTable('tbl_a1b2c3d4');
const app = await api.getApp('app_xyz789uvw');
const view = await api.getView('view_ghi789jkl');

// 层级创建操作
const newTable = await api.createTable('proj_a1b2c3d4', {
  name: "customers",
  displayName: "客户管理",
  description: "客户信息表",
  columns: [
    {
      name: "name",
      displayName: "姓名",
      type: "STRING",
      nullable: false
    },
    {
      name: "email",
      displayName: "邮箱",
      type: "STRING",
      nullable: false,
      unique: true
    }
  ]
});

// 批量创建数据行
const createdRows = await api.batchCreateRows('tbl_a1b2c3d4', [
  { name: "张三", email: "zhangsan@example.com" },
  { name: "李四", email: "lisi@example.com" }
]);
```

#### Python 客户端示例
```python
import requests

class FastBuildAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'API-Version': 'v4.0',
            'authorization': f'Bearer {token}'
        }

    def get_projects(self, page=1, limit=20):
        response = requests.get(
            f"{self.base_url}/meta/projects",
            headers=self.headers,
            params={'page': page, 'limit': limit}
        )
        response.raise_for_status()
        return response.json()['data']['projects']

    def create_project(self, project_data):
        response = requests.post(
            f"{self.base_url}/meta/projects",
            headers=self.headers,
            json=project_data
        )
        response.raise_for_status()
        return response.json()['data']['project']

    # 直接访问资源方法
    def get_table(self, table_id):
        response = requests.get(
            f"{self.base_url}/meta/tables/{table_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']['table']

    def get_app(self, app_id):
        response = requests.get(
            f"{self.base_url}/meta/apps/{app_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']['app']

    def get_view(self, view_id):
        response = requests.get(
            f"{self.base_url}/meta/views/{view_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()['data']['view']

    # 层级创建操作
    def create_table(self, project_id, table_data):
        response = requests.post(
            f"{self.base_url}/meta/projects/{project_id}/tables",
            headers=self.headers,
            json=table_data
        )
        response.raise_for_status()
        return response.json()['data']['table']

# 使用示例
api = FastBuildAPI('https://api.fastbuild.com', '<jwt_token>')

# 获取项目列表
projects = api.get_projects(1, 20)

# 创建项目
new_project = api.create_project({
  'name': 'E-commerce Platform',
  'slug': 'ecommerce-platform',
  'description': 'Complete e-commerce solution'
})

# 直接访问资源（推荐方式）
table = api.get_table('tbl_a1b2c3d4')
app = api.get_app('app_xyz789uvw')
view = api.get_view('view_ghi789jkl')

# 层级创建操作
new_table = api.create_table('proj_a1b2c3d4', {
  'name': 'products',
  'display_name': '产品管理',
  'description': '产品信息表',
  'columns': [
    {
      'name': 'name',
      'display_name': '产品名称',
      'type': 'STRING',
      'nullable': False
    },
    {
      'name': 'price',
      'display_name': '价格',
      'type': 'NUMBER',
      'nullable': False
    }
  ]
})
```

#### Go 客户端示例
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
)

type FastBuildAPI struct {
    BaseURL    string
    Token     string
    Client    *http.Client
}

func NewFastBuildAPI(baseURL, token string) *FastBuildAPI {
    return &FastBuildAPI{
        BaseURL: strings.TrimSuffix(baseURL, "/"),
        Token: token,
        Client: http.DefaultClient{},
    }
}

func (api *FastBuildAPI) GetProjects(page, limit int) ([]Project, error) {
    req, err := http.NewRequest("GET", fmt.Sprintf("%s/meta/projects?page=%d&limit=%d", api.BaseURL, page, limit), nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("API-Version", "v4.0")
    req.Header.Set("authorization", "Bearer "+api.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := api.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var projects []Project
    if err := json.NewDecoder(resp.Body).Decode(&projects); err != nil {
        return nil, err
    }

    return projects.Data.Projects, nil
}

func (api *FastBuildAPI) CreateProject(projectData CreateProjectRequest) (*Project, error) {
    jsonData, err := json.Marshal(projectData)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("POST", fmt.Sprintf("%s/meta/projects", api.BaseURL), bytes.NewReader(jsonData))
    if err != nil {
        return nil, err
    }

    req.Header.Set("API-Version", "v4.0")
    req.Header.Set("authorization", "Bearer "+api.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := api.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var project Project
    if err := json.NewDecoder(resp.Body).Decode(&project); err != nil {
        return nil, err
    }

    return project.Data.Project, nil
}

// 直接访问资源方法
func (api *FastBuildAPI) GetTable(tableId string) (*Table, error) {
    req, err := http.NewRequest("GET", fmt.Sprintf("%s/meta/tables/%s", api.BaseURL, tableId), nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("API-Version", "v4.0")
    req.Header.Set("authorization", "Bearer "+api.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := api.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var table Table
    if err := json.NewDecoder(resp.Body).Decode(&table); err != nil {
        return nil, err
    }

    return table.Data.Table, nil
}

func (api *FastBuildAPI) GetApp(appId string) (*App, error) {
    req, err := http.NewRequest("GET", fmt.Sprintf("%s/meta/apps/%s", api.BaseURL, appId), nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("API-Version", "v4.0")
    req.Header.Set("authorization", "Bearer "+api.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := api.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var app App
    if err := json.NewDecoder(resp.Body).Decode(&app); err != nil {
        return nil, err
    }

    return app.Data.App, nil
}

// 层级创建操作
func (api *FastBuildAPI) CreateTable(projectId string, tableData CreateTableRequest) (*Table, error) {
    jsonData, err := json.Marshal(tableData)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("POST", fmt.Sprintf("%s/meta/projects/%s/tables", api.BaseURL, projectId), bytes.NewReader(jsonData))
    if err != nil {
        return nil, err
    }

    req.Header.Set("API-Version", "v4.0")
    req.Header.Set("authorization", "Bearer "+api.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := api.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var table Table
    if err := json.NewDecoder(resp.Body).Decode(&table); err != nil {
        return nil, err
    }

    return table.Data.Table, nil
}
```

### 开发者最佳实践

#### 错误处理
```typescript
// 推荐的错误处理模式
try {
  const data = await api.getProjects(1, 20);
  console.log('获取项目列表成功:', data);
} catch (error) {
  if (error.response) {
    console.error(`API错误 ${error.response.status}: ${error.response.statusText}`);
    console.error('错误详情:', error.response.data);
  } else {
    console.error('网络错误或未知错误:', error.message);
  }
}
```

#### 请求重试策略
```typescript
// 自动重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

async function apiRequestWithRetry(requestFn) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }
      console.warn(`请求失败，${attempt}/${MAX_RETRIES} 次重试中 (${RETRY_DELAY}ms) 延迟后重试...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}
```

#### 缓存策略
```typescript
// 简单的内存缓存
const cache = new Map();

function getCachedData(key: string, fetchFn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }

  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

// 使用示例
const projects = await getCachedData('projects', () => api.getProjects(1, 20));
```

#### 版本控制集成
```typescript
// 版本控制客户端
class VersionedAPI {
  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'API-Version': 'v4.0',
      'authorization': `Bearer ${this.token}`,
      ...options.headers
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 性能优化建议

#### 请求优化
```typescript
// 并行请求示例
const [projects, tables, apps] = await Promise.all([
  api.getProjects(1, 20),
  api.getTablesByProject('proj_a1b2c3d4'), // 获取项目下的表列表
  api.getAppsByProject('proj_a1b2c3d4')   // 获取项目下的应用列表
]);

// 直接访问多个资源
const resources = await Promise.all([
  api.getTable('tbl_a1b2c3d4'),
  api.getApp('app_xyz789uvw'),
  api.getView('view_ghi789jkl'),
  api.getPage('page_abc123def')
]);

// 批量请求示例
const rows = [];
for (let i = 0; i < 10; i++) {
  rows.push(api.createRow(tableId, rowData[i]));
}
const createdRows = await Promise.all(rows);
```

#### 连接复用
```typescript
// HTTP连接复用
class FastBuildAPI {
  private httpClient: http.Agent;

  constructor(baseURL: string, token: string) {
    this.httpClient = new http.Agent({
      baseURL: baseURL,
      headers: {
        'API-Version': 'v4.0',
        'authorization': `Bearer ${token}`
      }
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}) {
    const response = await this.httpClient.request({
      method: options.method || 'GET',
      ...options,
      url: `${this.baseURL}${endpoint}`
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

## 运维优化

### 缓存策略

#### 多层缓存架构

FastBuild API 采用多层缓存策略，确保高性能和低延迟：

```typescript
// 缓存层次结构
interface CacheArchitecture {
  // L1: 应用内存缓存 (最快)
  applicationCache: {
    userSessions: Map<string, Session>;
    projectMetadata: Map<string, ProjectMetadata>;
    tableSchemas: Map<string, TableSchema>;
    ttl: 5 * 60 * 1000; // 5分钟
  };

  // L2: Redis 分布式缓存 (中等)
  distributedCache: {
    apiResponses: Map<string, CachedResponse>;
    queryResults: Map<string, QueryResult>;
    permissions: Map<string, Permission>;
    ttl: 15 * 60 * 1000; // 15分钟
  };

  // L3: 数据库查询缓存 (持久)
  databaseCache: {
    materializedViews: Map<string, ViewRefreshTime>;
    queryPlans: Map<string, OptimizedPlan>;
    indexes: Map<string, IndexStats>;
    ttl: 60 * 60 * 1000; // 1小时
  };
}
```

#### 缓存配置建议

**Redis 缓存配置**:
```yaml
# Redis 配置示例
redis:
  cluster:
    enabled: true
    nodes: 6
    replicas: 2

  memory:
    maxmemory: 4GB
    policy: allkeys-lru

  persistence:
    rdb:
      enabled: true
      save: 900 1 300 10 60 10000
    aof:
      enabled: true
      appendonly: true

  performance:
    tcp-keepalive: 300
    timeout: 0
    maxclients: 10000
```

**应用缓存配置**:
```typescript
// Node.js 应用缓存配置
const cacheConfig = {
  // 用户会话缓存
  sessions: {
    maxSize: 10000,
    ttl: 5 * 60 * 1000, // 5分钟
    strategy: 'LRU'
  },

  // API 响应缓存
  apiResponses: {
    maxSize: 50000,
    ttl: 15 * 60 * 1000, // 15分钟
    compression: true,
    varyHeaders: ['authorization', 'api-version']
  },

  // 数据库查询缓存
  queryResults: {
    maxSize: 100000,
    ttl: 30 * 60 * 1000, // 30分钟
    keyPrefix: 'query:',
    invalidationStrategy: 'TAG_BASED'
  }
};
```

#### 缓存失效策略

**智能缓存失效**:
```typescript
// 缓存失效管理器
class CacheInvalidationManager {
  private invalidationRules: Map<string, InvalidationRule>;

  // 数据变更时自动失效相关缓存
  async invalidateRelatedCaches(event: DataChangeEvent) {
    const rules = this.invalidationRules.get(event.tableName);

    for (const rule of rules) {
      if (rule.matches(event)) {
        await this.invalidateCache(rule.cacheKeys);
      }
    }
  }

  // 标签基础失效
  async invalidateByTag(tag: string) {
    const keys = await this.redis.keys(`cache:*:${tag}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 批量失效
  async invalidateBatch(invalidations: InvalidationRequest[]) {
    const pipeline = this.redis.pipeline();

    for (const invalidation of invalidations) {
      switch (invalidation.type) {
        case 'KEY':
          pipeline.del(invalidation.value);
          break;
        case 'PATTERN':
          const keys = await this.redis.keys(invalidation.value);
          if (keys.length > 0) pipeline.del(...keys);
          break;
        case 'TAG':
          await this.invalidateByTag(invalidation.value);
          break;
      }
    }

    await pipeline.exec();
  }
}
```

### 监控和日志

#### 应用性能监控 (APM)

**性能指标收集**:
```typescript
// 性能监控中间件
interface PerformanceMetrics {
  request: {
    duration: number;
    path: string;
    method: string;
    statusCode: number;
    userAgent: string;
    clientIP: string;
  };

  database: {
    queryDuration: number;
    queryType: string;
    tableName: string;
    affectedRows: number;
    indexUsed: string;
  };

  cache: {
    hitRate: number;
    missRate: number;
    size: number;
    evictionCount: number;
  };

  system: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    queueLength: number;
  };
}

// 性能监控实现
class PerformanceMonitor {
  async recordRequestMetrics(req: Request, res: Response, duration: number) {
    const metrics = {
      timestamp: new Date(),
      duration,
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'],
      clientIP: req.ip,
      apiVersion: req.headers['api-version']
    };

    // 发送到监控系统
    await this.sendMetrics('api.request', metrics);

    // 检查性能阈值
    if (duration > 1000) { // 超过1秒
      await this.alertSlowRequest(metrics);
    }
  }

  async recordDatabaseMetrics(query: DatabaseQuery) {
    const metrics = {
      timestamp: new Date(),
      queryDuration: query.duration,
      queryType: query.type,
      tableName: query.tableName,
      affectedRows: query.affectedRows,
      indexUsed: query.indexUsed
    };

    await this.sendMetrics('db.query', metrics);

    // 慢查询告警
    if (query.duration > 500) { // 超过500ms
      await this.alertSlowQuery(metrics);
    }
  }
}
```

#### 系统健康监控

**健康检查端点增强**:
```typescript
// 详细健康检查
async function detailedHealthCheck(): Promise<HealthStatus> {
  const checks = await Promise.allSettled([
    // 数据库连接检查
    checkDatabaseHealth(),

    // Redis 缓存检查
    checkCacheHealth(),

    // 外部服务检查
    checkExternalServices(),

    // 系统资源检查
    checkSystemResources(),

    // 业务指标检查
    checkBusinessMetrics()
  ]);

  const status = {
    overall: 'healthy',
    timestamp: new Date(),
    checks: {},
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    buildNumber: process.env.BUILD_NUMBER
  };

  let failedChecks = 0;
  checks.forEach((check, index) => {
    const checkName = ['database', 'cache', 'external', 'system', 'resources'][index];

    if (check.status === 'fulfilled') {
      status.checks[checkName] = check.value;
      if (check.value.status !== 'healthy') failedChecks++;
    } else {
      status.checks[checkName] = {
        status: 'unhealthy',
        error: check.reason.message
      };
      failedChecks++;
    }
  });

  status.overall = failedChecks === 0 ? 'healthy' :
                  failedChecks <= 2 ? 'degraded' : 'unhealthy';

  return status;
}

// 数据库健康检查
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();

  try {
    // 执行简单查询
    await db.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;

    // 检查连接池状态
    const poolStatus = await getDatabasePoolStatus();

    // 检查数据库大小和表数量
    const dbStats = await getDatabaseStats();

    return {
      status: queryTime < 100 ? 'healthy' : 'degraded',
      queryTime,
      connectionPool: poolStatus,
      database: dbStats,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    };
  }
}
```

#### 日志记录策略

**结构化日志记录**:
```typescript
// 日志配置
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10
    })
  ]
});

// 请求日志中间件
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      clientIP: req.ip,
      userId: req.user?.id,
      apiVersion: req.headers['api-version']
    });
  });

  next();
}

// 安全事件日志
function logSecurityEvent(event: SecurityEvent) {
  logger.warn('Security Event', {
    type: event.type,
    severity: event.severity,
    userId: event.userId,
    clientIP: event.clientIP,
    userAgent: event.userAgent,
    details: event.details,
    timestamp: new Date()
  });
}
```

### 性能优化建议

#### 数据库优化

**查询优化策略**:
```sql
-- 添加复合索引优化常用查询
CREATE INDEX CONCURRENTLY idx_projects_owner_created
ON projects (owner_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_tables_project_name
ON tables (project_id, name)
WHERE deleted_at IS NULL;

-- 分区表优化大数据量查询
CREATE TABLE table_data_2024 PARTITION OF table_data
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 物化视图优化复杂查询
CREATE MATERIALIZED VIEW project_stats AS
SELECT
  p.id,
  p.name,
  COUNT(t.id) as table_count,
  COUNT(r.id) as row_count,
  MAX(r.created_at) as last_activity
FROM projects p
LEFT JOIN tables t ON p.id = t.project_id AND t.deleted_at IS NULL
LEFT JOIN table_rows r ON t.id = r.table_id AND r.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name
WITH DATA;

-- 创建唯一索引
CREATE UNIQUE INDEX idx_project_stats_unique
ON project_stats (id);
```

**连接池优化**:
```typescript
// PostgreSQL 连接池配置
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // 连接池设置
  max: 20,                    // 最大连接数
  min: 5,                     // 最小连接数
  idle: 10000,               // 空闲超时 10秒
  acquire: 60000,            // 获取连接超时 60秒
  evict: 1000,               // 检查间隔 1秒

  // 性能优化
  statement_timeout: 30000,  // 查询超时 30秒
  query_timeout: 60000,      // 总超时 60秒
  application_name: 'fastbuild-api',

  // 连接重试
  retries: 3,
  retryDelay: 2000
};
```

#### API 性能优化

**响应优化**:
```typescript
// 响应压缩中间件
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// 分页优化
function optimizedPagination(req: Request, res: Response, next: NextFunction) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  // 使用游标分页提高大数据量查询性能
  if (req.query.cursor) {
    req.pagination = {
      type: 'cursor',
      cursor: req.query.cursor,
      limit
    };
  } else {
    req.pagination = {
      type: 'offset',
      page,
      limit,
      offset: (page - 1) * limit
    };
  }

  next();
}

// 响应缓存
function responseCache(ttl: number = 300) { // 5分钟默认缓存
  return function(req: Request, res: Response, next: NextFunction) {
    const cacheKey = `response:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    // 检查缓存
    redis.get(cacheKey).then(cached => {
      if (cached) {
        const response = JSON.parse(cached);
        res.set(response.headers);
        return res.json(response.data);
      }

      // 拦截响应
      const originalJson = res.json;
      res.json = function(data) {
        const response = {
          headers: res.getHeaders(),
          data: data,
          timestamp: new Date()
        };

        // 缓存响应
        redis.setex(cacheKey, ttl, JSON.stringify(response));

        return originalJson.call(this, data);
      };

      next();
    });
  };
}
```

**并发控制**:
```typescript
// 请求限流和并发控制
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// 全局限流
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000,               // 每个IP最多1000个请求
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: '15 minutes'
      }
    });
  }
});

// 慢速保护
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,         // 100个请求后开始延迟
  delayMs: 500,           // 每个请求延迟500ms
  maxDelayMs: 20000       // 最大延迟20秒
});

// API特定限流
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1分钟
  max: 100,                // 每个API最多100个请求
  keyGenerator: (req) => `${req.ip}:${req.path}`
});
```

#### 前端性能优化

**CDN 和静态资源优化**:
```typescript
// 静态资源服务优化
app.use('/static', express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// HTTP/2 推送
app.get('/app/:appId', (req, res) => {
  // 推送关键资源
  res.push('/static/css/app.css');
  res.push('/static/js/app.js');
  res.push('/static/fonts/inter.woff2');

  // 返回主页面
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

### 容器化和部署优化

#### Docker 优化

**多阶段构建 Dockerfile**:
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装构建依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:18-alpine AS production

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# 安装运行时依赖
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动应用
USER nextjs
CMD ["pnpm", "start"]
```

#### Kubernetes 部署优化

**Deployment 配置**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastbuild-api
  labels:
    app: fastbuild-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: fastbuild-api
  template:
    metadata:
      labels:
        app: fastbuild-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/metrics"
    spec:
      containers:
      - name: fastbuild-api
        image: fastbuild/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fastbuild-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
```

**HPA (水平Pod自动扩缩容)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fastbuild-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fastbuild-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 监控和告警

#### Prometheus 和 Grafana

**Prometheus 配置**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'fastbuild-api'
    static_configs:
      - targets: ['fastbuild-api:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**告警规则**:
```yaml
groups:
- name: fastbuild-api-alerts
  rules:
  # API响应时间告警
  - alert: HighAPIResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "API响应时间过高"
      description: "95%的请求响应时间超过1秒，当前值: {{ $value }}秒"

  # 错误率告警
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "API错误率过高"
      description: "5xx错误率超过5%，当前值: {{ $value | humanizePercentage }}"

  # 数据库连接池告警
  - alert: DatabaseConnectionPoolExhausted
    expr: db_pool_active_connections / db_pool_max_connections > 0.9
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "数据库连接池接近满载"
      description: "数据库连接池使用率超过90%，当前值: {{ $value | humanizePercentage }}"

  # 缓存命中率告警
  - alert: LowCacheHitRate
    expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "缓存命中率过低"
      description: "缓存命中率低于80%，当前值: {{ $value | humanizePercentage }}"
```

### 安全运维

#### 安全监控

**安全事件监控**:
```typescript
// 安全事件监控
class SecurityMonitor {
  async detectAnomalies(req: Request) {
    const patterns = [
      // 检测异常请求频率
      await this.checkRequestFrequency(req.ip),

      // 检测异常用户代理
      await this.checkSuspiciousUserAgent(req.headers['user-agent']),

      // 检测异常请求模式
      await this.checkAbnormalPatterns(req),

      // 检测地理位置异常
      await this.checkGeolocation(req.ip)
    ];

    const anomalies = patterns.filter(Boolean);

    if (anomalies.length > 0) {
      await this.reportSecurityEvent({
        type: 'ANOMALY_DETECTED',
        severity: anomalies.length > 2 ? 'HIGH' : 'MEDIUM',
        clientIP: req.ip,
        anomalies: anomalies,
        timestamp: new Date()
      });
    }
  }

  async checkRequestFrequency(clientIP: string): Promise<Anomaly | null> {
    const key = `req_freq:${clientIP}`;
    const count = await redis.incr(key);
    await redis.expire(key, 60); // 1分钟窗口

    // 每分钟超过200个请求视为异常
    if (count > 200) {
      return {
        type: 'HIGH_FREQUENCY_REQUESTS',
        value: count,
        threshold: 200
      };
    }

    return null;
  }
}
```

**日志审计**:
```typescript
// 安全审计日志
function auditSecurityEvent(event: SecurityAuditEvent) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    eventId: generateEventId(),
    eventType: event.type,
    severity: event.severity,
    userId: event.userId,
    clientIP: event.clientIP,
    userAgent: event.userAgent,
    resource: event.resource,
    action: event.action,
    result: event.result,
    details: event.details,
    sessionId: event.sessionId,
    correlationId: event.correlationId
  };

  // 写入安全日志
  logger.warn('Security Audit', auditLog);

  // 发送到SIEM系统
  if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
    this.sendToSIEM(auditLog);
  }

  // 实时告警
  if (event.severity === 'CRITICAL') {
    this.sendRealTimeAlert(auditLog);
  }
}
```

### 运维最佳实践

#### 1. 监控和告警策略
- **分层监控**: 应用层、数据库层、基础设施层全方位监控
- **智能告警**: 基于机器学习的异常检测，减少误报
- **分级响应**: 根据严重程度制定不同的响应策略
- **自动化恢复**: 对常见问题实施自动修复机制

#### 2. 容量规划和扩容
- **资源监控**: 实时监控CPU、内存、磁盘、网络使用情况
- **预测扩容**: 基于历史数据预测资源需求
- **弹性扩容**: 自动化水平扩缩容策略
- **成本优化**: 根据业务负载优化资源配置

#### 3. 备份和恢复
- **数据备份**: 自动化数据库备份和恢复流程
- **配置备份**: 版本控制系统存储所有配置文件
- **灾难恢复**: 制定完整的灾难恢复计划
- **定期演练**: 定期进行备份恢复和故障切换演练

#### 4. 安全运维
- **访问控制**: 最小权限原则，定期审查访问权限
- **漏洞扫描**: 定期进行安全漏洞扫描和修复
- **入侵检测**: 实时监控和检测安全威胁
- **合规审计**: 确保系统符合相关法规要求

---

**FastBuild API v4.0** - 动态表生成 + 智能视图系统 + 四层前缀分离架构，简洁、实用、可维护的企业级低代码平台 API。