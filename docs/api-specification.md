# FastBuild REST API 规范 v1.0

## 概述

FastBuild REST API 遵循 **四层前缀分离架构**，提供低代码开发平台的完整功能支持。

### 核心设计原则

- **动态表生成**：根据元数据自动创建真实的数据库表
- **智能视图系统**：安全、高性能的数据查询层
- **性能优先**：充分利用 PostgreSQL 原生能力
- **渐进复杂性**：从简单到复杂的平滑升级路径
- **清晰分离**：通过 URL 前缀明确区分 API 职责

### API 架构分离

| 前缀      | 层级           | 用途                      | 认证要求 |
| --------- | -------------- | ------------------------- | -------- |
| `/sys/*`  | 系统基础设施层 | 认证、用户管理、系统监控  | 部分需要 |
| `/meta/*` | 设计时管理层   | 项目配置、数据模型定义    | 必需     |
| `/data/*` | 业务数据层     | 数据 CRUD、查询、导入导出 | 必需     |
| `/app/*`  | 应用访问层     | 已发布应用的运行时访问    | 必需     |

## 基础规范

- **Base URL**: `https://api.fastbuild.com`
- **API 版本**: `v1.0`
- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <jwt_token>`
- **Timezone**: UTC

### 版本控制

**推荐方式**:

```http
GET /sys/users/profile
API-Version: v1.0
Authorization: Bearer <jwt_token>
```

**替代方式**:

```http
GET /v1/sys/users/profile
Authorization: Bearer <jwt_token>
```

## 错误处理

### 标准错误响应格式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### 常见错误代码

| 状态码 | 错误代码         | 描述               |
| ------ | ---------------- | ------------------ |
| 400    | VALIDATION_ERROR | 请求参数验证失败   |
| 401    | UNAUTHORIZED     | 认证失败或令牌无效 |
| 403    | FORBIDDEN        | 权限不足           |
| 404    | NOT_FOUND        | 资源不存在         |
| 409    | CONFLICT         | 资源冲突           |
| 500    | INTERNAL_ERROR   | 服务器内部错误     |

---

## 系统基础设施层 (/sys/*)

### 认证管理

#### 端点概览

| 方法 | 端点                        | 描述     | 认证 |
| ---- | --------------------------- | -------- | ---- |
| POST | `/sys/auth/login`           | 用户登录 | ❌    |
| POST | `/sys/auth/register`        | 用户注册 | ❌    |
| POST | `/sys/auth/refresh`         | 刷新令牌 | ❌    |
| POST | `/sys/auth/logout`          | 用户登出 | ✅    |
| POST | `/sys/auth/forgot-password` | 忘记密码 | ❌    |
| POST | `/sys/auth/reset-password`  | 重置密码 | ❌    |

#### 请求示例

**用户登录**:

```json
POST /sys/auth/login
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
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_xyz789uvw"
  }
}
```

### 用户管理

#### 端点概览

| 方法  | 端点                  | 描述             |
| ----- | --------------------- | ---------------- |
| GET   | `/sys/users/profile`  | 获取当前用户信息 |
| PATCH | `/sys/users/profile`  | 更新用户信息     |
| PATCH | `/sys/users/password` | 修改密码         |

### 系统监控

#### 端点概览

| 方法 | 端点                   | 描述         | 认证 |
| ---- | ---------------------- | ------------ | ---- |
| GET  | `/sys/health`          | 基础健康检查 | ❌    |
| GET  | `/sys/health/detailed` | 详细健康检查 | ✅    |

---

## 设计时管理层 (/meta/*)

### 项目管理

#### 端点概览

| 方法   | 端点                         | 描述         |
| ------ | ---------------------------- | ------------ |
| GET    | `/meta/projects`             | 获取项目列表 |
| POST   | `/meta/projects`             | 创建项目     |
| GET    | `/meta/projects/{projectId}` | 获取项目详情 |
| PATCH  | `/meta/projects/{projectId}` | 更新项目     |
| DELETE | `/meta/projects/{projectId}` | 删除项目     |

#### 请求示例

**创建项目**:

```json
POST /meta/projects
{
  "name": "E-commerce Platform",
  "slug": "ecommerce-platform",
  "description": "Complete e-commerce solution"
}
```

### 数据模型管理

#### 动态表管理

| 方法   | 端点                                | 描述       |
| ------ | ----------------------------------- | ---------- |
| GET    | `/meta/projects/{projectId}/tables` | 获取表列表 |
| POST   | `/meta/projects/{projectId}/tables` | 创建动态表 |
| GET    | `/meta/tables/{tableId}`            | 获取表详情 |
| PATCH  | `/meta/tables/{tableId}`            | 更新表结构 |
| DELETE | `/meta/tables/{tableId}`            | 删除表     |

#### 创建动态表示例

```json
POST /meta/projects/{projectId}/tables
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
    }
  ]
}
```

### 视图管理

#### 安全视图定义

| 方法   | 端点                           | 描述         |
| ------ | ------------------------------ | ------------ |
| GET    | `/meta/tables/{tableId}/views` | 获取视图列表 |
| POST   | `/meta/tables/{tableId}/views` | 创建视图     |
| GET    | `/meta/views/{viewId}`         | 获取视图详情 |
| PATCH  | `/meta/views/{viewId}`         | 更新视图     |
| DELETE | `/meta/views/{viewId}`         | 删除视图     |
| POST   | `/meta/views/{viewId}/refresh` | 刷新物化视图 |

#### 视图定义结构

```json
{
  "name": "active_customers",
  "displayName": "活跃客户",
  "isMaterialized": false,
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

### 应用管理

#### 应用元数据

| 方法   | 端点                              | 描述         |
| ------ | --------------------------------- | ------------ |
| GET    | `/meta/projects/{projectId}/apps` | 获取应用列表 |
| POST   | `/meta/projects/{projectId}/apps` | 创建应用     |
| GET    | `/meta/apps/{appId}`              | 获取应用详情 |
| PATCH  | `/meta/apps/{appId}`              | 更新应用     |
| DELETE | `/meta/apps/{appId}`              | 删除应用     |
| POST   | `/meta/apps/{appId}/publish`      | 发布应用     |

### 数据模型发布

#### 发布端点

| 方法 | 端点                                             | 描述             |
| ---- | ------------------------------------------------ | ---------------- |
| POST | `/meta/projects/{projectId}/data-models/publish` | 发布数据模型版本 |

#### 发布请求示例

```json
POST /meta/projects/{projectId}/data-models/publish
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
  }
}
```

---

## 业务数据层 (/data/*)

### 动态表数据操作

#### 基础 CRUD

| 方法   | 端点                                  | 描述         |
| ------ | ------------------------------------- | ------------ |
| GET    | `/data/tables/{tableId}/rows`         | 获取数据列表 |
| POST   | `/data/tables/{tableId}/rows`         | 创建数据行   |
| GET    | `/data/tables/{tableId}/rows/{rowId}` | 获取单行数据 |
| PATCH  | `/data/tables/{tableId}/rows/{rowId}` | 更新数据行   |
| DELETE | `/data/tables/{tableId}/rows/{rowId}` | 删除数据行   |

#### 创建数据示例

```json
POST /data/tables/{tableId}/rows
{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active",
  "priority": 8.5
}
```

### 批量操作

#### 批量端点

| 方法   | 端点                                | 描述          |
| ------ | ----------------------------------- | ------------- |
| POST   | `/data/tables/{tableId}/rows/batch` | 批量创建/更新 |
| PATCH  | `/data/tables/{tableId}/rows/batch` | 批量更新      |
| DELETE | `/data/tables/{tableId}/rows/batch` | 批量删除      |

#### 批量创建示例

```json
POST /data/tables/{tableId}/rows/batch
{
  "rows": [
    {
      "name": "Alice Smith",
      "email": "alice@example.com",
      "status": "active"
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "status": "pending"
    }
  ],
  "options": {
    "continueOnError": true,
    "validateOnly": false
  }
}
```

### 搜索功能

#### 搜索端点

| 方法 | 端点                                     | 描述     |
| ---- | ---------------------------------------- | -------- |
| GET  | `/data/tables/{tableId}/search`          | 表内搜索 |
| POST | `/data/tables/{tableId}/search/advanced` | 高级搜索 |

#### 高级搜索示例

```json
POST /data/tables/{tableId}/search/advanced
{
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
  "pagination": {
    "page": 1,
    "limit": 20
  },
  "options": {
    "highlight": true,
    "includeScore": true
  }
}
```

### 数据导入导出

#### 导入导出端点

| 方法 | 端点                                        | 描述         |
| ---- | ------------------------------------------- | ------------ |
| GET  | `/data/tables/{tableId}/export`             | 导出数据     |
| POST | `/data/tables/{tableId}/export`             | 高级导出     |
| POST | `/data/tables/{tableId}/import`             | 导入数据     |
| GET  | `/data/tables/{tableId}/imports/{importId}` | 获取导入状态 |

#### 支持格式

- **CSV**: 逗号分隔值
- **XLSX**: Excel 格式
- **JSON**: 结构化数据

### 安全视图查询

#### 查询端点

| 方法 | 端点                          | 描述           |
| ---- | ----------------------------- | -------------- |
| GET  | `/data/tables/{tableId}/rows` | 查询默认视图   |
| GET  | `/data/views/{viewId}/rows`   | 查询自定义视图 |

#### 安全查询参数

**筛选参数**:

- `filter[field]=value` - 等于
- `filter[field][ne]=value` - 不等于
- `filter[field][gt]=value` - 大于
- `filter[field][gte]=value` - 大于等于
- `filter[field][lt]=value` - 小于
- `filter[field][lte]=value` - 小于等于
- `filter[field][in]=value1,value2` - 在列表中

**排序参数**:

- `sort[field]=asc` - 升序
- `sort[field]=desc` - 降序

**分页参数**:

- `page` - 页码（从1开始）
- `limit` - 每页数量（最大100）

---

## 应用访问层 (/app/*)

### 应用运行时访问

| 方法 | 端点                            | 描述          |
| ---- | ------------------------------- | ------------- |
| GET  | `/app/{appId}/pages/{pagePath}` | 访问应用页面  |
| GET  | `/app/{appId}/api/{endpoint}`   | 应用 API 端点 |

### 访问控制

- 仅限已发布应用
- 基于应用级别的访问权限
- 支持自定义域名配置

---

## 认证与权限

### JWT 令牌结构

```json
{
  "sub": "user_a1b2c3d4",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1640995200,
  "exp": 1640998800
}
```

### 权限级别

1. **系统级权限**：用户管理、系统监控
2. **项目级权限**：项目配置、数据模型设计
3. **数据级权限**：表数据访问、视图查询
4. **应用级权限**：已发布应用的运行时访问

### 安全特性

- **参数化查询**：防止 SQL 注入
- **列名白名单**：严格的字段验证
- **视图定义安全验证**：结构化的查询定义
- **权限后台验证**：基于资源的访问控制

---

## 最佳实践

### 开发建议

1. **使用适当的前缀**：根据操作类型选择正确的 API 前缀
2. **错误处理**：始终检查响应状态和错误代码
3. **分页查询**：大数据集使用分页参数
4. **批量操作**：多条数据操作使用批量端点
5. **视图优化**：复杂查询通过视图定义实现

### 性能优化

1. **索引利用**：合理使用过滤条件
2. **物化视图**：频繁的复杂查询使用物化视图
3. **批量操作**：减少网络往返次数
4. **字段选择**：只查询需要的字段

### 版本兼容性

- **向后兼容**：新版本保持对旧版本的兼容
- **弃用通知**：通过响应头提供弃用警告
- **平滑迁移**：提供充分的迁移时间窗口

---

## 附录

### 状态码参考

| 状态码 | 类别       | 描述         |
| ------ | ---------- | ------------ |
| 200    | 成功       | 请求成功     |
| 201    | 成功       | 资源创建成功 |
| 204    | 成功       | 资源删除成功 |
| 400    | 客户端错误 | 请求参数错误 |
| 401    | 客户端错误 | 认证失败     |
| 403    | 客户端错误 | 权限不足     |
| 404    | 客户端错误 | 资源不存在   |
| 409    | 客户端错误 | 资源冲突     |
| 500    | 服务器错误 | 内部错误     |

### 数据类型映射

| API 类型 | PostgreSQL 类型 | 描述       |
| -------- | --------------- | ---------- |
| STRING   | VARCHAR/TEXT    | 字符串     |
| NUMBER   | NUMERIC         | 数值       |
| BOOLEAN  | BOOLEAN         | 布尔值     |
| DATE     | TIMESTAMP       | 日期时间   |
| UUID     | UUID            | 唯一标识符 |
| JSON     | JSONB           | JSON 数据  |

### 更多资源

- **OpenAPI 规范**：完整的 API 定义文件
- **开发者文档**：详细的集成指南
- **示例代码**：常见使用场景的代码示例
- **支持团队**：api@fastbuild.com