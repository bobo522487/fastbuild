# FastBuild 数据架构 v4.0

## 概述

FastBuild 数据架构 v4.0 遵循 Linus Torvalds 的"好品味"设计哲学：**真实数据表 + 智能视图系统**。

### 核心设计原则

- **动态表生成**：根据元数据自动创建真实的数据库表
- **智能视图系统**：每个表自动生成默认视图，支持复杂查询定制
- **性能优先**：利用 PostgreSQL 的全部能力（索引、约束、事务）
- **渐进复杂性**：从简单默认视图到复杂物化视图的平滑升级

---

## 数据库架构

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

// ================================ 核心枚举 ================================

enum Visibility {
  PUBLIC
  PRIVATE
}

enum MemberRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum ColumnType {
  STRING      // VARCHAR(255)
  TEXT        // TEXT
  NUMBER      // DECIMAL(20,8)
  BOOLEAN     // BOOLEAN
  DATE        // DATE
  TIMESTAMP   // TIMESTAMP
  JSON        // JSONB
}

// ============================== 发布系统 Enums ==============================

enum DeploymentEnv {
  PREVIEW     // 预览环境
  PRODUCTION  // 正式环境
}

enum DeploymentStatus {
  BUILDING    // 构建中
  DEPLOYED    // 已部署
  FAILED      // 构建失败
  ARCHIVED    // 已归档
}

// ============================== 用户系统 ==============================

model User {
  id            String    @id @default(generateShortId('user'))  // user_xxx格式
  email         String    @unique
  name          String?
  passwordHash  String    // 存储密码哈希
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联关系
  memberships   ProjectMember[]
  createdProjects    Project[]          @relation("ProjectCreator")
  createdApplications Application[]      @relation("ApplicationCreator")
  createdTables      DataTable[]         @relation("TableCreator")
  createdViews       TableView[]         @relation("ViewCreator")
  dataModelDeployments DataModelDeployment[] @relation("DataModelDeploymentCreator")
  appDeployments     AppDeployment[]     @relation("AppDeploymentCreator")
  auditLogs          AuditLog[]

  @@index([email])
}

// ============================== 项目系统 ==============================

model Project {
  id          String     @id @default(generateShortId('proj'))  // proj_xxx格式
  name        String
  slug        String     @unique
  description String?
  visibility  Visibility @default(PRIVATE)
  createdBy   String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  // 关联关系
  creator     User           @relation("ProjectCreator", fields: [createdBy], references: [id])
  members     ProjectMember[]
  applications Application[]
  tables      DataTable[]
  dataModelDeployments DataModelDeployment[]
  auditLogs   AuditLog[]

  @@index([slug])
  @@index([createdBy])
  @@index([deletedAt])
}

model ProjectMember {
  id        String     @id @default(generateShortId('mem'))  // mem_xxx格式
  projectId String
  userId    String
  role      MemberRole @default(VIEWER)
  createdAt DateTime   @default(now())

  // 关联关系
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

// ============================== 应用系统 ==============================

model Application {
  id          String     @id @default(generateShortId('app'))  // app_xxx格式
  projectId   String
  name        String
  slug        String
  description String?
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关联关系
  project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator   User         @relation("ApplicationCreator", fields: [createdBy], references: [id])
  pages     AppPage[]
  deployments AppDeployment[]

  @@unique([projectId, slug])
  @@index([projectId])
  @@index([createdBy])
}

model AppPage {
  id            String   @id @default(generateShortId('page'))  // page_xxx格式
  applicationId String
  name          String
  path          String
  layout        Json     // 页面布局配置
  isHomePage    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // 关联关系
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@unique([applicationId, path])
  @@index([applicationId])
}

// ============================== 动态表系统 ==============================

model DataTable {
  id          String   @id @default(generateShortId('tbl'))  // tbl_xxx格式
  projectId   String
  name        String   // 表名：project_{projectId}_{name}
  displayName String?  // 显示名称
  description String?

  // 表配置（不是字段定义！）
  options     Json?    // UI配置、权限设置等

  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // 关联关系
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator     User       @relation("TableCreator", fields: [createdBy], references: [id])
  columns     DataColumn[]
  views       TableView[]

  @@unique([projectId, name, deletedAt])
  @@index([projectId])
  @@index([deletedAt])
}

model DataColumn {
  id           String     @id @default(generateShortId('col'))  // col_xxx格式
  tableId      String
  name         String     // 实际列名
  displayName  String?    // 显示名称
  type         ColumnType
  nullable     Boolean    @default(true)
  defaultValue Json?
  unique       Boolean    @default(false)
  order        Int?

  // 列配置
  options      Json?      // 验证规则、UI设置等

  table        DataTable  @relation(fields: [tableId], references: [id], onDelete: Cascade)

  @@unique([tableId, name])
  @@index([tableId])
}

// ============================== 视图系统 ==============================

model TableView {
  id            String   @id @default(generateShortId('view'))  // view_xxx格式
  tableId       String
  name          String   // 视图名称
  description   String?

  // 安全的视图配置 - 结构化定义
  definition    Json     // SafeViewDefinition 结构化视图定义
  isDefault     Boolean  @default(false) // 是否为默认视图
  isMaterialized Boolean @default(false) // 是否物化视图
  refreshInterval Int?   // 刷新间隔（秒）

  // 元信息
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  table         DataTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  creator       User      @relation("ViewCreator", fields: [createdBy], references: [id])

  @@unique([tableId, name])
  @@index([tableId])
}

// ============================== 审计系统 ==============================

model AuditLog {
  id          String   @id @default(generateShortId('log'))  // log_xxx格式
  projectId   String?  // 关联项目ID（可选）
  userId      String?  // 操作用户ID（可选）
  action      String   // 操作类型：CREATE/UPDATE/DELETE/LOGIN/LOGOUT等
  resourceType String  // 资源类型：Project/Application/Table/View等
  resourceId  String?  // 资源ID（可选）
  oldValues   Json?    // 修改前的值
  newValues   Json?    // 修改后的值
  metadata    Json?    // 额外的元数据
  ipAddress   String?  // IP地址
  userAgent   String?  // 用户代理
  createdAt   DateTime @default(now())

  // 关联关系
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([projectId, createdAt])
  @@index([userId, createdAt])
  @@index([action])
  @@index([resourceType, resourceId])
}

// ============================== 发布系统 ==============================

// 数据模型发布记录
model DataModelDeployment {
  id           String   @id @default(generateShortId('dep'))  // dep_xxx格式
  projectId    String
  version      String   // 语义化版本号 (如 1.0.0, 1.0.1, 1.1.0)
  environment  DeploymentEnv  // PREVIEW | PRODUCTION
  status       DeploymentStatus // BUILDING | DEPLOYED | FAILED | ARCHIVED
  deployedAt   DateTime @default(now())
  deployedBy   String
  archivedAt   DateTime?

  // 发布的表结构快照
  tableSnapshots Json   // 所有表的结构定义（包含列、约束等）

  // Schema信息
  schemaName   String?  // 实际创建的数据库Schema名称

  // 元信息
  changeLog    Json?    // 变更日志
  metadata     Json?    // 额外的元数据

  // 关联关系
  project      Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  deployer     User    @relation("DataModelDeploymentCreator", fields: [deployedBy], references: [id])
  applications AppDeployment[]  // 一个数据模型可以支持多个应用

  @@unique([projectId, environment, version])
  @@index([projectId, environment])
  @@index([status])
  @@index([deployedAt])
}

// 应用发布记录
model AppDeployment {
  id           String   @id @default(generateShortId('dep'))  // dep_xxx格式
  applicationId String
  dataModelDeploymentId String?  // 关联的数据模型版本（可选，允许应用独立发布）
  version      String   // 语义化版本号
  environment  DeploymentEnv  // PREVIEW | PRODUCTION
  status       DeploymentStatus // BUILDING | DEPLOYED | FAILED | ARCHIVED
  buildUrl     String?  // 预览/正式版链接
  qrCode       String?  // 二维码数据
  deployedAt   DateTime @default(now())
  deployedBy   String
  archivedAt   DateTime?

  // 发布配置
  config       Json     // 发布配置（域名、主题、自定义设置等）

  // 构建信息
  buildLog     String?  // 构建日志
  buildTime    Int?     // 构建耗时（毫秒）

  // 访问统计
  viewCount    Int      @default(0)
  lastAccessedAt DateTime?

  // 关联关系
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  dataModelDeployment DataModelDeployment? @relation(fields: [dataModelDeploymentId], references: [id])
  deployer   User       @relation("AppDeploymentCreator", fields: [deployedBy], references: [id])

  @@unique([applicationId, environment, version])
  @@index([applicationId, environment])
  @@index([dataModelDeploymentId])
  @@index([status])
  @@index([deployedAt])
}
```

---

### 5. 视图系统（查询能力核心）

#### TableView 模型
- **用途**：管理动态表的视图定义
- **核心字段**：`definition`, `isDefault`, `isMaterialized`
- **安全视图**：使用结构化定义，零 SQL 注入风险

#### SafeViewDefinition 结构

视图定义采用严格的结构化格式，完全防止 SQL 注入：

```typescript
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

#### 默认视图自动生成

每个动态表都会自动生成一个默认视图，提供基础的查询能力：

```sql
-- 默认视图：包含所有用户定义的列，过滤已删除数据
CREATE OR REPLACE VIEW {projectId}_{tableName}_default AS
SELECT
  id,
  ${userDefinedColumns},
  created_at,
  updated_at
FROM {projectId}_{tableName}
WHERE deleted_at IS NULL;
```

#### 安全自定义视图示例

**基础过滤视图**：
```sql
-- 活跃客户视图（通过 SafeViewDefinition 生成）
CREATE OR REPLACE VIEW proj_a1b2c3d4_customers_active AS
SELECT
  "name" AS "customer_name",
  "email",
  "status",
  "priority"
FROM proj_a1b2c3d4_customers
WHERE "status" = $1 AND "priority" > $2
ORDER BY "priority" DESC
LIMIT 100;
```

**聚合分析视图**：
```sql
-- 客户统计视图（通过 SafeViewDefinition 生成）
CREATE MATERIALIZED VIEW proj_a1b2c3d4_customers_summary AS
SELECT
  "status",
  COUNT(*) AS "total_count",
  AVG("priority") AS "avg_priority"
FROM proj_a1b2c3d4_customers
WHERE "priority" >= $1
GROUP BY "status";
```

#### 安全验证机制

1. **列名白名单验证**：只允许表中存在的列
2. **运算符枚举限制**：只允许预定义的安全运算符
3. **聚合一致性检查**：使用聚合函数时必须指定 GROUP BY
4. **参数化 SQL 生成**：所有用户输入通过参数传递
5. **标识符安全转义**：严格的标识符转义处理

### 6. 审计系统

#### AuditLog 模型
- **用途**：记录系统操作日志
- **核心字段**：`action`, `resourceType`, `oldValues`, `newValues`
- **简化设计**：只记录关键信息，无过度复杂的审计规则

### 7. 发布系统（企业级核心功能）

#### 发布系统设计哲学
发布系统遵循 **"数据模型独立发布 + 应用灵活绑定"** 的设计原则：
- **数据模型发布**：独立管理数据结构的版本和部署
- **应用发布**：基于特定数据模型版本，支持环境隔离
- **环境分离**：PREVIEW 和 PRODUCTION 环境完全隔离

#### DataModelDeployment 模型
- **用途**：管理数据模型的发布版本和部署状态
- **核心字段**：`version`, `environment`, `status`, `tableSnapshots`, `schemaName`
- **创新设计**：一个数据模型可以支持多个应用发布
- **环境隔离**：每个环境创建独立的数据库 Schema

**Schema 隔离设计**：
```sql
-- 预览环境
CREATE SCHEMA IF NOT EXISTS proj_a1b2c3d4_preview_v1_0_0;
-- 正式环境
CREATE SCHEMA IF NOT EXISTS proj_a1b2c3d4_production_v1_0_0;

-- 在各自 Schema 中创建业务表
CREATE TABLE proj_a1b2c3d4_preview_v1_0_0.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  -- 其他业务字段...
);

CREATE TABLE proj_a1b2c3d4_production_v1_0_0.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  -- 其他业务字段...
);
```

#### AppDeployment 模型
- **用途**：管理应用的发布版本和部署状态
- **核心字段**：`version`, `environment`, `buildUrl`, `qrCode`, `dataModelDeploymentId`
- **灵活绑定**：可以关联到特定的数据模型版本，也可以独立发布
- **访问统计**：支持访问量统计和最后访问时间记录

**发布流程设计**：
```typescript
// 数据模型发布流程
1. 生成版本号 (语义化版本控制)
2. 创建数据库 Schema (project_{id}_{environment}_{version})
3. 根据 tableSnapshots 创建所有业务表
4. 创建必要的索引和约束
5. 更新发布状态为 DEPLOYED

// 应用发布流程
1. 选择数据模型版本 (可选)
2. 构建应用静态文件
3. 生成预览/正式 URL
4. 生成二维码
5. 创建部署记录
```

#### 表结构快照设计

`tableSnapshots` 字段存储完整的表结构定义，确保发布后的数据模型完全可控：

```json
{
  "tables": [
    {
      "name": "customers",
      "displayName": "客户管理",
      "columns": [
        {
          "name": "id",
          "type": "UUID",
          "nullable": false,
          "primaryKey": true,
          "defaultValue": { "type": "expression", "value": "gen_random_uuid()" }
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
      ],
      "indexes": [
        {
          "name": "idx_customers_email",
          "columns": ["email"],
          "unique": true
        }
      ]
    }
  ]
}
```

#### 环境隔离策略

**PREVIEW 环境**：
- 用于测试和演示
- 数据库 Schema: `project_{id}_preview_{version}`
- URL 格式: `https://preview-{app}.fastbuild.com`
- 支持快速发布和回滚

**PRODUCTION 环境**：
- 用于生产使用
- 数据库 Schema: `project_{id}_production_{version}`
- URL 格式: `https://{app}.fastbuild.com`
- 严格版本控制和发布流程

#### 多应用共享设计

一个数据模型版本可以支持多个应用：

```sql
-- 数据模型版本 v1.0.0
CREATE SCHEMA project_123_production_v1_0_0;

-- 应用 A 和应用 B 都使用相同的数据模型
-- 应用 A 的发布记录
INSERT INTO AppDeployment (applicationId, dataModelDeploymentId, version, environment)
VALUES ('app_a', 'data_model_deploy_001', '1.0.0', 'PRODUCTION');

-- 应用 B 的发布记录
INSERT INTO AppDeployment (applicationId, dataModelDeploymentId, version, environment)
VALUES ('app_b', 'data_model_deploy_001', '1.0.0', 'PRODUCTION');
```

---

## ID 系统设计

### 核心设计原则

FastBuild 采用**统一短ID主键系统**，所有实体使用 `{prefix}_{nanoID}` 格式的标识符。

### ID 生成策略

```typescript
// 短ID生成器
function generateShortId(prefix: string): string {
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
  return `${prefix}_${nanoid()}`;
}

// 示例输出
generateShortId('proj') // -> "proj_a1b2c3d4"
generateShortId('app')  // -> "app_xyz789uvw"
```

### 前缀规范表

| 实体类型 | 前缀 | 长度 | 示例 | 说明 |
|---------|------|------|------|------|
| 项目 | `proj_` | 4字符 | `proj_a1b2c3d4` | 项目标识 |
| 应用 | `app_` | 3字符 | `app_xyz789uvw` | 应用程序 |
| 用户 | `user_` | 4字符 | `user_def456rst` | 用户账户 |
| 数据表 | `tbl_` | 3字符 | `tbl_ghi789jkl` | 动态数据表 |
| 视图 | `view_` | 4字符 | `view_mno123pqr` | 表视图 |
| 列 | `col_` | 3字符 | `col_stu456vwx` | 数据列 |
| 成员 | `mem_` | 3字符 | `mem_yza789bcd` | 项目成员 |
| 页面 | `page_` | 4字符 | `page_efg123hij` | 应用页面 |
| 部署 | `dep_` | 3字符 | `dep_klm456nop` | 部署记录 |
| 日志 | `log_` | 3字符 | `log_qrs789tuv` | 审计日志 |

### ID 特性

- **长度**：总长度 12-13 字符（前缀 + 下划线 + 8字符nanoID）
- **冲突概率**：8字符nanoID ≈ 1/10亿，足够安全
- **字符集**：小写字母 + 数字，URL友好
- **性能**：比 cuid() 短 48%，更快的索引和查询
- **可读性**：前缀直接表明资源类型

### 验证规则

```typescript
// ID 格式验证
function validateShortId(id: string, expectedPrefix?: string): boolean {
  const pattern = expectedPrefix
    ? new RegExp(`^${expectedPrefix}_[a-z0-9]{8}$`)
    : /^[a-z]{3,4}_[a-z0-9]{8}$/;

  return pattern.test(id);
}

// 示例验证
validateShortId('proj_a1b2c3d4', 'proj') // true
validateShortId('app_xyz789uvw', 'app')   // true
validateShortId('invalid_id')            // false
```

### 数据库索引优化

```sql
-- 主键索引自动创建
-- 额外的复合索引针对前缀查询优化
CREATE INDEX idx_resource_type_prefix ON "Project" (substring(id, 1, 4));
CREATE INDEX idx_resource_type_prefix ON "Application" (substring(id, 1, 3));
```

---

## 数据库对象命名规范

### 核心设计原则

FastBuild 采用**层次化命名系统**，基于短ID主键系统建立完整的数据库对象命名标准。

### 业务表命名

#### 命名格式
```
{projectId}_{tableName}
```

#### 示例
```
proj_a1b2c3d4_customers      // 项目 a1b2c3d4 的客户表
app_xyz789uvw_settings       // 应用 xyz789uvw 的设置表
tbl_ghi789jkl_columns        // 表 ghi789jkl 的列定义表
```

#### 命名规则
- **前缀**：使用完整的短ID（包含前缀）
- **分隔符**：下划线 `_`
- **表名**：用户定义，遵循 snake_case 规则
- **长度限制**：总长度不超过63字符（PostgreSQL限制）
- **字符集**：小写字母、数字、下划线

#### 自动生成逻辑
```typescript
function generateTableName(projectId: string, userTableName: string): string {
  // 验证用户表名
  if (!/^[a-z][a-z0-9_]*$/.test(userTableName)) {
    throw new Error('Invalid table name format');
  }

  // 检查总长度
  const fullName = `${projectId}_${userTableName}`;
  if (fullName.length > 63) {
    const maxUserPart = 63 - `${projectId}_`.length;
    const trimmedName = userTableName.substring(0, maxUserPart);
    return `${projectId}_${trimmedName}`;
  }

  return fullName;
}
```

### 视图命名

#### 命名格式
```
{projectId}_{tableName}_{viewName}
```

#### 示例
```
proj_a1b2c3d4_customers_default     // 默认视图
proj_a1b2c3d4_customers_active      // 活跃客户视图
proj_a1b2c3d4_customers_vip_only    // VIP客户视图
app_xyz789uvw_orders_summary        // 订单汇总视图
```

#### 默认视图规则
每个动态表自动生成默认视图：
```
视图名：{projectId}_{tableName}_default
作用：包含所有用户定义的列，过滤已删除数据
```

### Schema命名

#### 命名格式
```
{projectId}_{environment}_{version}
```

#### 示例
```
proj_a1b2c3d4_preview_v1_0_0    // 预览环境 v1.0.0
proj_a1b2c3d4_production_v1_0_0  // 正式环境 v1.0.0
app_xyz789uvw_preview_v1_1_0     // 应用预览环境 v1.1.0
```

#### 环境标识
- `preview` - 预览环境
- `production` - 正式环境

### 索引命名

#### 主键索引
```
pk_{tableName}
```
示例：`pk_proj_a1b2c3d4_customers`

#### 唯一索引
```
uk_{tableName}_{columnNames}
```
示例：`uk_proj_a1b2c3d4_customers_email`

#### 普通索引
```
idx_{tableName}_{columnNames}
```
示例：`idx_proj_a1b2c3d4_customers_status`
     `idx_proj_a1b2c3d4_customers_created_at`

#### 复合索引
```
idx_{tableName}_{col1}_{col2}_{col3}
```
示例：`idx_proj_a1b2c3d4_orders_status_created_at`

### 约束命名

#### 主键约束
```
pk_{tableName}
```
示例：`pk_proj_a1b2c3d4_customers`

#### 外键约束
```
fk_{tableName}_{referencedTable}
```
示例：`fk_proj_a1b2c3d4_orders_proj_a1b2c3d4_customers`

#### 唯一约束
```
uk_{tableName}_{columnNames}
```
示例：`uk_proj_a1b2c3d4_users_email`

#### 检查约束
```
ck_{tableName}_{condition}
```
示例：`ck_proj_a1b2c3d4_customers_status_valid`

### 系统字段规范

#### 保留字段（系统自动管理）
```sql
id              -- 主键（短ID格式）
created_at      -- 创建时间
updated_at      -- 更新时间
deleted_at      -- 软删除时间
created_by      -- 创建者ID
updated_by      -- 更新者ID
project_id      -- 项目ID
tenant_id       -- 租户ID（预留）
status          -- 状态字段
version         -- 版本号
priority        -- 优先级
```

#### 业务字段（用户定义）
- **命名规则**：snake_case
- **字符集**：小写字母、数字、下划线
- **长度限制**：最大63字符
- **禁止使用**：保留字段名

#### 外键字段（关联字段）
```
{referencedTable}_id
```
示例：
```sql
user_id         -- 关联用户表
project_id      -- 关联项目表
table_id        -- 关联数据表
view_id         -- 关联视图
```

### 完整项目示例

#### 项目基础信息
```
项目ID: proj_a1b2c3d4
项目名: E-commerce Platform
```

#### 生成的数据库对象
```
-- 业务表
proj_a1b2c3d4_customers
proj_a1b2c3d4_products
proj_a1b2c3d4_orders

-- 视图
proj_a1b2c3d4_customers_default
proj_a1b2c3d4_customers_active
proj_a1b2c3d4_orders_summary

-- Schema（预览环境）
proj_a1b2c3d4_preview_v1_0_0

-- 索引
pk_proj_a1b2c3d4_customers
idx_proj_a1b2c3d4_customers_email
idx_proj_a1b2c3d4_customers_status
uk_proj_a1b2c3d4_users_email

-- 约束
pk_proj_a1b2c3d4_customers
fk_proj_a1b2c3d4_orders_proj_a1b2c3d4_customers
uk_proj_a1b2c3d4_customers_email
```

### 命名验证规则

#### 表名验证
```typescript
function validateTableName(tableName: string): boolean {
  const pattern = /^[a-z][a-z0-9_]*$/;
  return pattern.test(tableName) && tableName.length <= 63;
}
```

#### 视图名验证
```typescript
function validateViewName(viewName: string): boolean {
  const pattern = /^[a-z][a-z0-9_]*$/;
  return pattern.test(viewName) && viewName.length <= 63;
}
```

#### 列名验证
```typescript
function validateColumnName(columnName: string): boolean {
  const pattern = /^[a-z][a-z0-9_]*$/;
  return pattern.test(columnName) && columnName.length <= 63;
}
```

---

## 命名规范与安全约束

### 表名规范

#### 动态表命名约定
```typescript
// 表名格式：{projectId}_{tableName}
// 示例：proj_a1b2c3d4_customers

const validateTableName = (name: string) => {
  // 1. 长度限制 (最大 63 字符，PostgreSQL 标识符限制)
  if (name.length > 63) {
    throw new Error('Table name too long (max 63 characters)');
  }

  // 2. 字符集限制
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('Table name must contain only lowercase letters, numbers, and underscores');
  }

  // 3. 保留字检查
  const RESERVED_WORDS = new Set([
    'user', 'project', 'table', 'view', 'column', 'index',
    'select', 'insert', 'update', 'delete', 'create', 'drop',
    'order', 'group', 'by', 'where', 'from', 'into', 'join'
  ]);

  if (RESERVED_WORDS.has(name.toLowerCase())) {
    throw new Error(`Table name is reserved: ${name}`);
  }

  // 4. 系统字段保护
  const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at'];
  if (SYSTEM_FIELDS.includes(name)) {
    throw new Error(`Table name conflicts with system field: ${name}`);
  }
};
```

#### 实际表名生成
```typescript
const generateTableName = (projectId: string, userTableName: string): string => {
  // 验证用户输入
  if (!/^[a-z][a-z0-9_]*$/.test(userTableName)) {
    throw new Error('Invalid table name format');
  }

  // 检查总长度
  const fullName = `${projectId}_${userTableName}`;
  if (fullName.length > 63) {
    // PostgreSQL 标识符长度限制
    const maxUserPart = 63 - `${projectId}_`.length;
    const trimmedName = userTableName.substring(0, maxUserPart);
    return `${projectId}_${trimmedName}`;
  }

  return fullName;
};
```

### 列名规范

#### 列名验证
```typescript
const validateColumnName = (name: string) => {
  // 1. 长度限制 (PostgreSQL 63 字符限制)
  if (name.length > 63) {
    throw new Error('Column name too long (max 63 characters)');
  }

  // 2. 字符集限制
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('Column name must contain only lowercase letters, numbers, and underscores');
  }

  // 3. 保留字检查
  const RESERVED_WORDS = new Set([
    'id', 'created_at', 'updated_at', 'deleted_at',
    'user', 'project', 'table', 'view',
    'select', 'insert', 'update', 'delete'
  ]);

  if (RESERVED_WORDS.has(name)) {
    throw new Error(`Column name is reserved: ${name}`);
  }
};
```

#### 系统字段保护
系统自动为每个动态表添加以下字段，用户无法创建同名列：

```sql
CREATE TABLE project_{projectId}_{tableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 用户定义的列...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### 命名冲突解决

#### 自动冲突检测和解决
```typescript
const resolveNamingConflict = (
  baseName: string,
  existingNames: Set<string>
): string => {
  let resolvedName = baseName;
  let counter = 1;

  while (existingNames.has(resolvedName)) {
    resolvedName = `${baseName}_${counter}`;
    counter++;

    // 防止无限循环
    if (counter > 1000) {
      throw new Error('Unable to resolve naming conflict');
    }
  }

  return resolvedName;
};
```

---

## 权限系统 (简化版)

### 角色定义
```typescript
enum MemberRole {
  OWNER  = 'OWNER',  // 项目所有者：所有权限
  ADMIN  = 'ADMIN',  // 管理员：读写删除权限
  EDITOR = 'EDITOR', // 编辑者：读写权限
  VIEWER = 'VIEWER'  // 查看者：只读权限
}
```

### 权限检查逻辑
```typescript
// 简单的权限检查 - 实时数据库查询
async function hasPermission(userId: string, projectId: string, action: string): boolean {
  const member = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  if (!member) return false;

  const rolePermissions = {
    OWNER: ['read', 'write', 'delete', 'manage'],
    ADMIN: ['read', 'write', 'delete'],
    EDITOR: ['read', 'write'],
    VIEWER: ['read']
  };

  return rolePermissions[member.role].includes(action);
}
```


---

## 数据库索引策略

### 核心索引
```sql
-- 用户查询
CREATE INDEX idx_user_email ON "User"(email);

-- 项目查询
CREATE INDEX idx_project_slug ON "Project"(slug);
CREATE INDEX idx_project_creator ON "Project"(createdBy);
CREATE INDEX idx_project_deleted_at ON "Project"(deletedAt);

-- 成员关系查询
CREATE INDEX idx_project_member_project ON "ProjectMember"(projectId);
CREATE INDEX idx_project_member_user ON "ProjectMember"(userId);

-- 应用查询
CREATE INDEX idx_application_project ON "Application"(projectId);
CREATE INDEX idx_application_creator ON "Application"(createdBy);

-- 动态表元数据查询
CREATE INDEX idx_data_table_project ON "DataTable"(projectId);
CREATE INDEX idx_data_table_deleted_at ON "DataTable"(deletedAt);

-- 列定义查询
CREATE INDEX idx_data_column_table ON "DataColumn"(tableId);

-- 视图定义查询
CREATE INDEX idx_table_view_table ON "TableView"(tableId);

-- 审计日志查询
CREATE INDEX idx_audit_log_project_created ON "AuditLog"(projectId, createdAt);
CREATE INDEX idx_audit_log_user_created ON "AuditLog"(userId, createdAt);
CREATE INDEX idx_audit_log_action ON "AuditLog"(action);
CREATE INDEX idx_audit_log_resource ON "AuditLog"(resourceType, resourceId);

-- 发布系统查询
CREATE INDEX idx_data_model_deployment_project ON "DataModelDeployment"(projectId, environment);
CREATE INDEX idx_data_model_deployment_status ON "DataModelDeployment"(status);
CREATE INDEX idx_data_model_deployment_deployed ON "DataModelDeployment"(deployedAt);

CREATE INDEX idx_app_deployment_application ON "AppDeployment"(applicationId, environment);
CREATE INDEX idx_app_deployment_data_model ON "AppDeployment"(dataModelDeploymentId);
CREATE INDEX idx_app_deployment_status ON "AppDeployment"(status);
CREATE INDEX idx_app_deployment_deployed ON "AppDeployment"(deployedAt);
```

### 动态表索引（自动生成）
```sql
-- 为动态表的常用字段自动创建索引
CREATE INDEX idx_dynamic_table_status ON project_123_customers(status);
CREATE INDEX idx_dynamic_table_email ON project_123_customers(email);
CREATE INDEX idx_dynamic_table_created_at ON project_123_customers(created_at);
CREATE INDEX idx_dynamic_table_deleted_at ON project_123_customers(deleted_at);
```

### 唯一约束
```sql
-- 防止重复
CREATE UNIQUE INDEX idx_project_slug_unique ON "Project"(slug);
CREATE UNIQUE INDEX idx_project_member_unique ON "ProjectMember"(projectId, userId);
CREATE UNIQUE INDEX idx_application_unique ON "Application"(projectId, slug);
CREATE UNIQUE INDEX idx_app_page_unique ON "AppPage"(applicationId, path);
CREATE UNIQUE INDEX idx_data_table_unique ON "DataTable"(projectId, name);
CREATE UNIQUE INDEX idx_data_column_unique ON "DataColumn"(tableId, name);
CREATE UNIQUE INDEX idx_table_view_unique ON "TableView"(tableId, name);

-- 发布系统唯一约束
CREATE UNIQUE INDEX idx_data_model_deployment_unique ON "DataModelDeployment"(projectId, environment, version);
CREATE UNIQUE INDEX idx_app_deployment_unique ON "AppDeployment"(applicationId, environment, version);
```

---

**FastBuild 数据架构 v4.0** - 真正的数据库表 + 智能视图系统 + 企业级发布管理，简洁、实用、高性能的低代码平台数据模型。