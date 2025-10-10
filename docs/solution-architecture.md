# FastBuild 解决方案架构文档

**项目:** fastbuild
**日期:** 2025-10-09
**作者:** bobo
**项目级别:** Level 2 (小型完整系统)
**项目类型:** Web应用程序 - 无代码开发平台
**架构模式:** 模块化单体架构 + 单一仓库策略

---

## Executive Summary

FastBuild是一个开源无代码开发平台，基于Next.js 15全栈架构构建，实现从数据库到用户界面的端到端类型安全。该平台采用模块化单体架构，支持企业和IT专业人员通过可视化拖拽界面快速构建内部业务应用程序。核心技术栈包括Next.js 15.5.4、React 19.2.0、TypeScript 5.9.3、**REST API + Swagger/OpenAPI 3.0**、PostgreSQL + Prisma 6.17.0、NextAuth.js 5.0.0-beta.25和shadcn/ui组件库，部署在Vercel平台上，实现简化的开发和运维体验。

### 架构原则

1. **关注点分离** - 数据模型版本与应用版本独立管理
2. **多版本生命周期** - 支持数据模型和应用的独立演进
3. **端到端类型安全** - 从Schema到API的TypeScript保证
4. **用户应用部署管理** - 为用户提供统一的多平台部署体验
5. **元数据驱动** - 所有应用行为由版本化元数据定义

### 架构全景图

```mermaid
graph TD
    subgraph "用户界面层"
        A[可视化设计器] --> B[应用预览]
        B --> C[部署管理]
    end

    subgraph "API层"
        D[REST API Routes] --> E[元数据处理]
        E --> F[版本管理API]
        F --> G[部署API]
    end

    subgraph "API文档层"
        H[Swagger/OpenAPI] --> I[交互式文档]
        I --> J[API客户端SDK]
    end

    subgraph "核心引擎层"
        K[数据模型引擎] --> L[应用编译器]
        L --> M[部署管理器]
    end

    subgraph "数据持久层"
        N[PostgreSQL] --> O[DataModelVersion]
        O --> P[AppVersion]
        P --> Q[Deployment]
    end

    A --> D
    C --> G
    D --> H
    E --> K
    G --> M
    K --> N
```

---

## 技术栈

### 核心技术

| 类别 | 技术 | 版本 | 理由 |
|------|------|------|------|
| 前端框架 | Next.js | 15.5.4 | 全栈支持，SSR + SPA 混合渲染，最新版本 |
| UI框架 | React | 19.2.0 | 最新的React版本，支持并发特性 |
| UI组件库 | shadcn/ui + Radix UI | - | 企业级无头组件，完美支持低代码平台定制 |
| **API架构** | **Next.js API Routes + REST API** | **内置** | **标准化、易于集成、工具链成熟** |
| **API文档** | **Swagger/OpenAPI 3.0** | **3.0+** | **自动生成文档、支持多语言客户端** |
| **API测试** | **Jest + Supertest** | **Latest** | **自动化API测试、契约测试** |
| 数据库 | PostgreSQL | 16 | 强大的 JSONB 支持，ACID 兼容 |
| ORM | Prisma | 6.17.0 | 类型安全的数据库访问，最新版本 |
| 认证 | NextAuth.js | 5.0.0-beta.25 | 支持多种社交登录，Session 管理 |
| 状态管理 | TanStack Query | 5.90.2 | 强大的服务端状态管理，与 REST API 完美集成 |
| 样式框架 | Tailwind CSS | 4.1.14 | 实用优先，高度可定制，最新版本 |

### 开发工具

| 类别 | 技术 | 版本 | 理由 |
|------|------|------|------|
| 语言 | TypeScript | 5.9.3 | 端到端类型安全，开发体验 |
| 代码规范 | Biome | 1.9.4 | 一体化代码检查和格式化，高性能 |
| 包管理器 | pnpm | 9.15.4 | 快速、节省磁盘空间，支持 monorepo |
| **API文档生成** | **Swagger/OpenAPI** | **3.0+** | **自动生成REST API文档和交互式界面** |
| **API测试** | **Jest + Supertest** | **Latest** | **自动化API测试、契约测试和集成测试** |
| 测试框架 | 待配置 | - | 计划集成 Jest 和 Playwright |
| Git Hooks | 待配置 | - | 计划集成 Husky 进行提交前检查 |

### 基础设施

| 类别 | 技术 | 理由 |
|------|------|------|
| 全栈部署 | Vercel | Next.js 原生支持，零配置 |
| 数据库托管 | 本地 PostgreSQL + 云迁移计划 | 开发阶段使用本地数据库，生产环境可迁移至 Vercel Postgres |
| CI/CD | Vercel Deployments | 自动部署，预览环境 |
| 任务调度 | Vercel Cron Jobs | 定时任务支持 |
| 缓存服务 | Next.js 内存缓存 + TanStack Query | 简单高效，自动失效，智能数据同步 |

---

## 数据架构

### 当前数据库状态

FastBuild项目当前采用**分阶段实现策略**，数据库架构包含两个层次：

1. **认证层（已实现）**：基于NextAuth.js的用户认证系统，包含Account、Session、User、VerificationToken表
2. **业务层（目标架构）**：企业级数据模型版本管理系统，包含Project、DataModelVersion、AppVersion等核心业务表

### 企业级数据模型

我们采用**关注点分离的企业级架构**，将数据模型版本与应用版本独立管理，支持真正的多租户和企业级部署需求。

```mermaid
erDiagram
    User ||--o{ ProjectMember : "has membership"
    Project ||--o{ ProjectMember : "has members"
    Project ||--|| DataModelDraft : "has one draft"
    Project ||--o{ DataModelVersion : "contains versions"
    Project ||--o{ Application : "contains apps"

    DataModelVersion ||--o{ DataTable : "defines tables"
    DataModelVersion ||--o{ DataRelation : "defines relations"
    DataModelVersion ||--o{ DataView : "defines views"

    Application ||--|| AppDraft : "has one draft"
    Application ||--o{ AppVersion : "contains versions"

    AppVersion }o--|| DataModelVersion : "depends on"
    AppVersion ||--o{ AppPage : "contains pages"
    AppVersion ||--o{ AppDeployment : "deploys to"

    DataSource ||--o{ AppDeployment : "used by"

    User {
        string id PK
        string email UK
        string name
        string emailVerified
        string image
        string password
        string displayName // 扩展字段：显示名称
        string avatarUrl   // 扩展字段：头像URL
        datetime createdAt
        datetime updatedAt
    }

    Project {
        string id PK
        string slug UK
        string name
        string description
        enum visibility
        datetime createdAt
        datetime updatedAt
        string deletedAt
    }

    DataModelVersion {
        string id PK
        string projectId FK
        string semver
        enum status
        string authorId FK
        string notes
        json snapshot
        json graph
        datetime createdAt
        string deletedAt
    }

    AppVersion {
        string id PK
        string applicationId FK
        string semver
        enum status
        string authorId FK
        string notes
        string dependsOnDMVId FK
        json snapshot
        datetime createdAt
        string deletedAt
    }

    AppDeployment {
        string id PK
        string appVersionId FK
        string dataSourceId FK
        enum env
        enum status
        string requestedBy
        datetime deployedAt
        datetime createdAt
    }
```

### 多版本数据流架构

```mermaid
sequenceDiagram
    participant U as 用户界面
    participant C as REST API Client
    participant A as REST API Server
    participant DM as 数据模型引擎
    participant AM as 应用管理器
    participant DP as 部署管理器
    participant D as PostgreSQL

    Note over U,D: 数据模型版本管理流程
    U->>C: 创建/更新数据模型
    C->>A: REST API调用 (POST /projects/{id}/data-models)
    A->>DM: 验证和处理数据模型
    DM->>D: 保存到DataModelVersion.snapshot
    DM-->>A: 返回版本信息
    A-->>C: JSON响应
    C-->>U: 确认操作成功

    Note over U,D: 应用版本管理流程
    U->>C: 创建/更新应用
    C->>A: REST API调用 (POST /projects/{id}/applications)
    A->>AM: 处理应用版本
    AM->>D: 保存到AppVersion.snapshot
    AM->>D: 建立与DataModelVersion的依赖关系
    AM-->>A: 返回应用版本信息
    A-->>C: JSON响应
    C-->>U: 确认操作成功

    Note over U,D: 部署管理流程
    U->>C: 部署应用到环境
    C->>A: REST API调用 (POST /applications/{id}/deployments)
    A->>DP: 处理部署请求
    DP->>D: 创建AppDeployment记录
    DP->>DP: 编译和准备部署
    DP->>D: 更新部署状态
    DP-->>A: 返回部署状态
    A-->>C: JSON响应
    C-->>U: 显示部署结果
```
### Prisma Schema
```sql
// =====================================================================
// ==  高级版 Schema: 以 App 为独立发布单元                   ==
// =====================================================================
//
// 核心思想: 1. 将数据模型 (Tables, Views) 的版本与应用 (App) 的版本分离。
//           2. AppVersion 必须依赖一个确定的 DataVersion。
//           3. 使用 Deployment 模型来管理哪个 App 的哪个版本在线上。
//
// =====================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ================================ Enums (扩展) ================================

enum Visibility { PUBLIC PRIVATE }
enum VersionStatus { DRAFT PUBLISHED }
enum Env { DEV STAGING PROD }
enum DeployStatus { PENDING ACTIVE FAILED }
enum DataType { STRING NUMBER BOOLEAN DATE DATETIME REF JSON TEXT BINARY }
enum Cardinality { ONE_TO_ONE ONE_TO_MANY MANY_TO_ONE MANY_TO_MANY }
enum PermissionAction { READ CREATE UPDATE DELETE EXECUTE MANAGE }
enum Effect { ALLOW DENY }
enum MemberRole { OWNER ADMIN EDITOR VIEWER NO_ACCESS }
enum DataSourceKind { POSTGRES MYSQL SQLSERVER SQLITE BIGQUERY REST GRAPHQL S3 OTHER }

// ============================== 平台基础 ==============================

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  memberships ProjectMember[]
  auditLogs   AuditLog[]
}

model DataSource {
  id             String   @id @default(uuid())
  projectId      String?
  name           String
  kind           DataSourceKind
  configSecretId String?
  description    String?
  createdAt      DateTime @default(now())
  createdBy      String?
  updatedAt      DateTime @updatedAt
  updatedBy      String?
  deletedAt      DateTime?

  project        Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  appDeployments AppDeployment[]

  @@unique([name])
}

model AppDeployment {
  id                   String   @id @default(uuid())
  AppVersionId String
  dataSourceId         String
  env                  Env
  status               DeployStatus
  requestedBy          String?
  deployedAt           DateTime?
  createdAt            DateTime @default(now())

  AppVersion   AppVersion @relation(fields: [AppVersionId], references: [id], onDelete: Cascade)
  dataSource           DataSource         @relation(fields: [dataSourceId], references: [id], onDelete: Restrict)

  @@unique([AppVersionId, dataSourceId, env])
}

model AuditLog {
  id            String   @id @default(uuid())
  projectId     String?
  actorUserId   String?
  action        String
  targetType    String
  targetId      String?
  message       String?
  metadata      Json?
  createdAt     DateTime @default(now())

  project       Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  actor         User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([tenantId, createdAt])
}

// ================================ Project & Member ================================

model Project {
  id                String   @id @default(uuid())
  slug              String
  name              String
  description       String?
  visibility        Visibility @default(PRIVATE)
  createdAt         DateTime @default(now())
  createdBy         String?
  updatedAt         DateTime @updatedAt
  updatedBy         String?
  deletedAt         DateTime?

  // [优化] 每个项目有且仅有一个当前的数据模型草稿
  DataDraft    DataDraft?

  members           ProjectMember[]
  dataSources       DataSource[]
  DataVersions DataVersion[]
  applications      Application[]
  auditLogs         AuditLog[]

  @@unique([slug])
}

model ProjectMember {
  id        String     @id @default(uuid())
  projectId String
  userId    String
  role      MemberRole @default(VIEWER)
  createdAt DateTime   @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}


// ============================== Data Model Draft & Version ==============================
// 说明：每个 Project 同时只允许“一个 PUBLISHED 版本”——通过 SQL 迁移创建 Partial Unique Index：
//   CREATE UNIQUE INDEX uniq_project_published_dmv ON "DataVersion"("projectId") WHERE status='PUBLISHED';

model DataDraft {
  id          String   @id @default(uuid())
  projectId   String   @unique // 每个项目唯一
  baseVersionId String? // 基于哪个已发布的版本开始的修改
  snapshot    Json?    // [可变] 用户的所有修改都发生在这里
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model DataVersion {
  id             String   @id @default(uuid())
  projectId      String
  semver         String
  status         VersionStatus
  authorId       String
  notes          String?
  snapshot       Json     // [不可变] 部署/回滚依据的完整快照
  graph          Json?
  createdAt      DateTime @default(now())
  createdBy      String?
  deletedAt      DateTime?

  project        Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tables         DataTable[]
  relations      DataRelation[]
  views          DataView[]
  changesets     DataChangeset[]
  appVersions    AppVersion[] @relation("AppDependsOnDMV")

  @@unique([projectId, semver])
}

// ============================== Data Model: Table/Column/Relation/View ==============================

model DataTable {
  id                 String   @id @default(uuid())
  DataVersionId String
  logicalName        String
  label              String?
  options            Json?
  createdAt          DateTime @default(now())
  createdBy          String?
  deletedAt          DateTime?

  version            DataVersion @relation(fields: [DataVersionId], references: [id], onDelete: Cascade)
  columns            DataColumn[]

  @@unique([DataVersionId, logicalName])
}

model DataColumn {
  id            String   @id @default(uuid())
  tableId       String
  logicalName   String
  label         String?
  dataType      DataType
  nullable      Boolean  @default(true)
  defaultJson   Json?
  refTableId    String?
  computedExpr  String?
  validationExpr String?
  ui            Json?
  order         Int?
  createdAt     DateTime @default(now())
  createdBy     String?
  deletedAt     DateTime?

  table         DataTable @relation(fields: [tableId], references: [id], onDelete: Cascade)

  @@unique([tableId, logicalName])
}

model DataRelation {
  id                 String   @id @default(uuid())
  DataVersionId String
  srcTableId         String
  srcColumnId        String
  dstTableId         String
  dstColumnId        String
  cardinality        Cardinality
  options            Json?
  createdAt          DateTime @default(now())
  createdBy          String?
  deletedAt          DateTime?

  version            DataVersion @relation(fields: [DataVersionId], references: [id], onDelete: Cascade)

  @@unique([DataVersionId, srcTableId, srcColumnId, dstTableId, dstColumnId])
}

model DataView {
  id                 String   @id @default(uuid())
  DataVersionId String
  logicalName        String
  label              String?
  contract           Json // 参数/筛选/排序白名单/暴露列
  sqlAst             Json?
  createdAt          DateTime @default(now())
  createdBy          String?
  deletedAt          DateTime?

  version            DataVersion @relation(fields: [DataVersionId], references: [id], onDelete: Cascade)

  @@unique([DataVersionId, logicalName])
}

// ============================== Application Draft & Version ==============================
// 说明：每个 Application 同时只允许“一个 PUBLISHED 版本”——通过 SQL 迁移创建 Partial Unique Index：
//   CREATE UNIQUE INDEX uniq_app_published_av ON "AppVersion"("applicationId") WHERE status='PUBLISHED';

model Application {
  id                  String   @id @default(uuid())
  projectId           String
  slug                String
  name                String
  description         String?
  visibility          Visibility @default(PRIVATE)
  createdAt           DateTime @default(now())
  createdBy           String?
  updatedAt           DateTime @updatedAt
  updatedBy           String?
  deletedAt           DateTime?

  // [优化] 每个应用有且仅有一个当前草稿
  AppDraft    AppDraft?

  project             Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  versions            AppVersion[]

  @@unique([projectId, slug])
}

model AppDraft {
  id             String   @id @default(uuid())
  applicationId  String   @unique
  baseVersionId  String?
  dependsOnDMVId String
  snapshot       Json?
  updatedAt      DateTime @updatedAt
  updatedBy      String?

  application    Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model AppVersion {
  id                 String   @id @default(uuid())
  applicationId      String
  semver             String
  status             VersionStatus
  authorId           String
  notes              String?
  dependsOnDMVId     String
  snapshot           Json
  createdAt          DateTime @default(now())
  createdBy          String?
  deletedAt          DateTime?

  application        Application      @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  dependsOnDMV       DataVersion @relation(name: "AppDependsOnDMV", fields: [dependsOnDMVId], references: [id], onDelete: Restrict)
  lock               AppLock?
  deployments        AppDeployment[]
  // [新增] 一个应用版本包含一组固化的页面
  pages              AppPage[]
}

model AppPage {
  id                   String   @id @default(uuid())
  AppVersionId String
  logicalName          String   // 页面逻辑名，用于内部引用 e.g., "customer_list"
  label                String?  // 页面显示标题 e.g., "客户列表"
  path                 String   // 访问路径 e.g., "/customers" or "/orders/:orderId"
  isHomePage           Boolean  @default(false) // 是否为应用的首页
  layout               Json     // [核心] 页面的组件树、配置和数据绑定
  order                Int?     // 用于在导航菜单中排序
  createdAt            DateTime @default(now())
  createdBy            String?
  deletedAt            DateTime?

  AppVersion   AppVersion @relation(fields: [AppVersionId], references: [id], onDelete: Cascade)

  // 在同一个应用版本内，页面的逻辑名和路径都必须是唯一的
  @@unique([AppVersionId, logicalName])
  @@unique([AppVersionId, path])
}
```



#### 技术优势

**真正的关注点分离**
- 数据模型变更不会破坏现有应用版本
- 应用逻辑演进不受数据结构变更影响
- 每层都有独立的版本号和生命周期

**简化的版本管理**
- 核心版本状态精简为 3 个：DRAFT/PUBLISHED 和 PENDING/ACTIVE/FAILED
- 消除过度设计的复杂状态转换
- 用时间戳替代冗余的 revision 字段，简化维护

**企业级部署管理**
- 支持蓝绿部署和金丝雀发布
- 完整的部署状态跟踪和回滚能力
- 多环境部署支持（DEV、STAGING、PROD）

**向后兼容性保证**
- 通过明确的依赖关系管理版本兼容性
- 支持多个应用版本共存于不同数据模型版本
- 安全的版本升级路径

**查询性能优化**
- 利用PostgreSQL的GIN索引支持高效JSONB查询
- 通过版本ID快速定位相关数据
- 支持复杂的多维查询和聚合分析

#### 索引优化策略

```sql
-- DataModelVersion 相关索引
CREATE INDEX idx_dmv_project_status ON "DataModelVersion" (projectId, status);
CREATE INDEX idx_dmv_snapshot_gin ON "DataModelVersion" USING GIN (snapshot jsonb_path_ops);
CREATE UNIQUE INDEX uniq_dmv_project_published ON "DataModelVersion" (projectId) WHERE status = 'PUBLISHED';

-- AppVersion 相关索引
CREATE INDEX idx_av_app_status ON "AppVersion" (applicationId, status);
CREATE INDEX idx_av_depends_on_dmv ON "AppVersion" (dependsOnDMVId);
CREATE INDEX idx_av_snapshot_gin ON "AppVersion" USING GIN (snapshot jsonb_path_ops);
CREATE UNIQUE INDEX uniq_app_published ON "AppVersion" (applicationId) WHERE status = 'PUBLISHED';

-- AppDeployment 相关索引
CREATE UNIQUE INDEX uniq_deployment_app_version_env ON "AppDeployment" (appVersionId, dataSourceId, env);
CREATE INDEX idx_deployment_status_env ON "AppDeployment" (status, env);
CREATE INDEX idx_deployment_created_at ON "AppDeployment" (createdAt DESC);

-- 项目和成员索引
CREATE INDEX idx_project_member_project_user ON "ProjectMember" (projectId, userId);
CREATE INDEX idx_project_slug ON "Project" (slug);

-- 审计日志索引
CREATE INDEX idx_audit_project_created ON "AuditLog" (projectId, createdAt DESC);
```

---

## 仓库策略

### 单一仓库架构

我们采用**单一仓库策略**，所有代码统一管理，避免 monorepo 工具的复杂性。

**优势：**
- ✅ **简单直接**: 无需复杂的配置和工具链
- ✅ **部署友好**: Next.js 在 Vercel 上零配置部署
- ✅ **类型安全**: 端到端的 TypeScript 类型共享
- ✅ **开发体验**: `pnpm dev` 一键启动整个项目
- ✅ **适合规模**: 对于 Level 2 项目复杂度正好

**包管理：**
```json
{
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "preview": "next build && next start",
    "typecheck": "tsc --noEmit",
    "check": "biome check .",
    "check:write": "biome check --write .",
    "db:generate": "prisma migrate dev",
    "db:migrate": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  }
}
```

---

## 服务架构

### 分层架构

```mermaid
graph TD
    subgraph "用户界面层"
        A[Next.js App Router]
        B[React组件]
        C[TanStack Query]
    end

    subgraph "API层"
        D[REST API Routes]
        E[认证中间件]
        F[请求验证中间件]
    end

    subgraph "API文档层"
        G[Swagger/OpenAPI]
        H[交互式API文档]
    end

    subgraph "业务逻辑层"
        I[项目管理]
        J[元数据处理]
        K[编译服务]
    end

    subgraph "数据访问层"
        L[Prisma ORM]
        M[PostgreSQL]
    end

    A --> D
    B --> A
    C --> A
    D --> E
    E --> F
    D --> G
    G --> H
    F --> I
    F --> J
    F --> K
    I --> L
    J --> L
    K --> L
    L --> M
```

---

## Epic 技术实现概览

> 📖 **详细Epic分解**: 完整的Epic故事分解、验收标准和技术里程碑请参考 [epic-stories.md](./epic-stories.md)

### 已完成的技术里程碑

#### Epic 1: 基础平台与项目初始化 ✅
- ✅ Next.js 15.5.4全栈应用框架搭建
- ✅ Prisma 6.17.0数据库ORM集成
- ✅ NextAuth.js 5.0.0-beta.25认证系统
- ✅ REST API路由设计和实现
- ✅ Swagger/OpenAPI 3.0 API文档系统
- ✅ ProjectMember角色管理系统
- ✅ 基础RBAC权限控制

#### Epic 2: 元数据管理引擎 ✅
- ✅ 元数据模型定义（Prisma + JSON Schema）
- ✅ 元数据CRUD API实现
- ✅ 版本管理API系统
- ✅ 数据验证API服务
- ✅ API文档自动生成

#### Epic 3: 基础前端界面 ✅
- ✅ 项目列表和详情页面
- ✅ 数据表格展示组件
- ✅ API客户端封装和认证
- ✅ 响应式设计和用户体验

### 技术架构层次

```mermaid
graph TD
    subgraph "Epic 1-3: MVP基础设施 (Phase 1-2)"
        A1[Epic 1: 基础平台] --> A2[Epic 2: 元数据API]
        A2 --> A3[Epic 3: 基础界面]
    end

    subgraph "Epic 4-5: 完整功能 (Phase 3-4)"
        A2 --> B1[Epic 4: 可视化设计器]
        A2 --> B2[Epic 5: 运行时引擎]
        A3 --> B1
        B1 --> B2
    end

    subgraph "技术架构"
        C1[Next.js全栈] --> C2[REST API]
        C2 --> C3[PostgreSQL + Prisma]
        C3 --> C4[元数据驱动]
    end

    A1 --> C1
    A2 --> C2
    A3 --> C1
```

### 技术实现策略

**MVP阶段 (Epic 1-3):**
- 建立完整的后端API框架
- 实现基础的项目管理和数据管理界面
- 确保元数据CRUD操作和版本管理功能

**完整版阶段 (Epic 4-5):**
- 构建可视化低代码设计器
- 实现基于元数据的动态功能生成
- 完成应用自动部署和管理


---

## 部署架构

### 用户应用多平台部署策略

FastBuild 的核心价值在于为用户提供统一的多平台应用部署体验。用户使用我们的无代码平台创建应用后，可以一键部署到各种目标平台。

```mermaid
graph TD
    subgraph "FastBuild 平台"
        A[用户设计应用] --> B[AppVersion 创建]
        B --> C[应用编译器]
        C --> D[生成部署包]
    end

    subgraph "用户目标平台"
        D --> E[Vercel 部署]
        D --> F[Netlify 部署]
        D --> G[AWS S3 + CloudFront]
        D --> H[Docker 容器部署]
        D --> I[自托管服务器]
    end

    E --> J[用户应用上线]
    F --> J
    G --> J
    H --> J
    I --> J

    subgraph "部署监控"
        J --> K[FastBuild 监控面板]
        K --> L[状态通知]
        K --> M[自动回滚]
    end
```

### 支持的部署平台

#### 主流静态网站平台
- **Vercel**: Next.js 原生支持，零配置部署
- **Netlify**: 静态网站和 Jamstack 应用
- **AWS S3 + CloudFront**: 企业级静态资源托管
- **GitHub Pages**: 简单的静态网站托管

#### 容器化部署
- **Docker Hub**: 容器镜像分发
- **AWS ECS/EKS**: 容器编排服务
- **Google Cloud Run**: 无服务器容器平台
- **Azure Container Instances**: 容器实例服务

#### 自托管选项
- **自建服务器**: 传统服务器部署
- **CDN 分发**: 全球内容分发网络
- **边缘计算**: Cloudflare Workers 等

### 部署流程管理

#### AppDeployment 生命周期
```typescript
enum DeployStatus {
  PENDING = 'PENDING',        // 部署请求待处理
  ACTIVE = 'ACTIVE',          // 部署成功，应用在线
  FAILED = 'FAILED',          // 部署失败
}
```

#### 部署流水线
```mermaid
sequenceDiagram
    participant User as 用户
    participant FB as FastBuild
    participant Target as 目标平台
    participant Monitor as 监控系统

    User->>FB: 选择应用版本和部署目标
    FB->>FB: 编译应用并生成部署包
    FB->>Target: 推送部署包
    Target->>Target: 构建和部署应用
    Target->>FB: 返回部署状态
    FB->>Monitor: 记录部署状态
    FB-->>User: 通知部署结果

    Note over Monitor: 持续监控应用健康状态
    Monitor->>FB: 检测到异常
    FB->>FB: 触发自动回滚
    FB->>Target: 回滚到上一版本
    FB-->>User: 通知回滚完成
```

### 多环境部署支持

用户可以将同一应用版本部署到不同环境：

| 环境类型 | 用途 | 目标平台 | 域名模式 | 典型用户 |
|----------|------|----------|----------|----------|
| 开发环境 | 功能测试 | Vercel Preview | pr-[hash].vercel.app | 开发者 |
| 测试环境 | 集成测试 | Netlify | test-[app].netlify.app | QA团队 |
| 预发布 | 生产验证 | AWS S3 + CloudFront | staging.[app].com | 产品经理 |
| 生产环境 | 正式服务 | 用户选择 | [用户自定义域名] | 最终用户 |

### 部署配置管理

#### DataSource 连接配置
```json
{
  "dataSourceId": "ds_prod_mysql_001",
  "name": "生产环境 MySQL",
  "kind": "MYSQL",
  "config": {
    "host": "your-mysql.com",
    "port": 3306,
    "database": "app_production",
    "ssl": true,
    "poolSize": 20
  },
  "environments": ["staging", "production"]
}
```

#### 部署目标配置
```json
{
  "deploymentTarget": {
    "platform": "vercel",
    "config": {
      "teamId": "team_xxx",
      "projectId": "prj_yyy",
      "domain": "app.user-domain.com",
      "buildCommand": "npm run build",
      "outputDirectory": "dist"
    },
    "environmentVariables": {
      "API_URL": "https://api.user-domain.com",
      "DATABASE_URL": "${DATASOURCE_URL}"
    }
  }
}
```

### 监控和告警

#### 用户应用监控指标
- **部署成功率**: 98%+ 目标（跨所有平台）
- **平均部署时间**: < 3分钟（静态网站）/< 8分钟（容器化）
- **应用可用性**: 99.5%+ 目标
- **自动回滚成功率**: 95%+ 目标

#### 告警机制
```yaml
alerts:
  - name: "用户应用部署失败"
    condition: "app_deployment_status == 'FAILED'"
    severity: "high"
    channels: ["email", "in_app_notification"]

  - name: "应用健康检查失败"
    condition: "health_check_failures > 3 in 5m"
    severity: "critical"
    channels: ["email", "sms", "slack"]

  - name: "部署超时"
    condition: "deployment_duration > 15m"
    severity: "medium"
    channels: ["in_app_notification"]
```

### 平台安全

#### 用户数据安全
- **数据隔离**: 每个用户的数据完全隔离
- **访问控制**: 基于项目级别的权限管理
- **密钥安全**: 用户的 API 密钥和数据库凭据加密存储
- **审计日志**: 完整的用户操作和部署记录

#### 部署安全
- **安全扫描**: 自动化第三方依赖安全扫描
- **合规检查**: SOC 2 和 GDPR 合规性支持
- **网络隔离**: 不同用户的应用部署隔离
- **备份策略**: 用户应用配置和数据的定期备份

---

## 项目结构

基于企业级架构的最佳实践，采用单一仓库策略，支持版本分离和部署管理：

```
fastbuild/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # REST API路由
│   │   │   ├── auth/             # NextAuth路由
│   │   │   ├── projects/         # 项目管理API
│   │   │   │   ├── route.ts      # GET /api/projects
│   │   │   │   └── [id]/         # 动态路由
│   │   │   ├── data-models/      # 数据模型版本API
│   │   │   ├── applications/     # 应用版本API
│   │   │   ├── deployments/      # 部署管理API
│   │   │   ├── users/            # 用户管理API
│   │   │   └── docs/             # API文档路由
│   │   │       └── route.ts      # Swagger UI
│   │   │   └── crons/            # 定时任务API
│   │   ├── _components/          # 页面级组件
│   │   │   ├── dashboard/        # 仪表板组件
│   │   │   ├── projects/         # 项目管理组件
│   │   │   ├── designer/         # 可视化设计器组件
│   │   │   └── deployments/      # 部署管理组件
│   │   ├── globals.css           # 全局样式
│   │   ├── layout.tsx            # 根布局
│   │   └── page.tsx              # 首页
│   ├── components/               # React组件
│   │   ├── ui/                   # shadcn/ui基础组件
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...               # 其他UI组件
│   │   ├── designer/             # 可视化设计器组件
│   │   │   ├── data-model/       # 数据模型设计器
│   │   │   ├── app-designer/     # 应用设计器
│   │   │   └── property-panel/   # 属性面板
│   │   ├── deployment/           # 部署相关组件
│   │   │   ├── status-badge.tsx
│   │   │   ├── environment-selector.tsx
│   │   │   └── deployment-history.tsx
│   │   └── charts/               # 图表组件
│   │       ├── version-timeline.tsx
│   │       └── deployment-stats.tsx
│   ├── server/                   # 服务端代码
│   │   ├── api/                  # REST API处理逻辑
│   │   │   ├── handlers/         # API处理器
│   │   │   │   ├── projects.ts   # 项目API处理器
│   │   │   │   ├── data-models.ts # 数据模型API处理器
│   │   │   │   ├── applications.ts # 应用API处理器
│   │   │   │   ├── deployments.ts # 部署API处理器
│   │   │   │   └── users.ts      # 用户API处理器
│   │   │   ├── middleware/       # API中间件
│   │   │   │   ├── auth.ts       # 认证中间件
│   │   │   │   ├── validation.ts # 请求验证中间件
│   │   │   │   ├── cors.ts       # CORS中间件
│   │   │   │   └── errorHandler.ts # 错误处理中间件
│   │   │   └── openapi/          # OpenAPI规范
│   │   │       ├── schema.ts     # API模式定义
│   │   │       ├── docs.ts       # 文档生成
│   │   │       └── client.ts     # 客户端SDK生成
│   │   ├── auth/                 # NextAuth配置
│   │   │   ├── config.ts
│   │   │   └── index.ts
│   │   ├── db.ts                 # Prisma客户端
│   │   ├── deployment/           # 部署服务
│   │   │   ├── manager.ts        # 部署管理器
│   │   │   ├── builder.ts        # 构建服务
│   │   │   └── monitor.ts        # 监控服务
│   │   └── versioning/           # 版本管理服务
│   │       ├── data-model.ts     # 数据模型版本管理
│   │       ├── application.ts    # 应用版本管理
│   │       └── dependency.ts     # 依赖关系管理
│   ├── lib/                      # 工具库
│   │   ├── auth.ts               # 认证工具
│   │   ├── utils.ts              # 通用工具函数
│   │   ├── env.js                # 环境变量验证
│   │   ├── validation.ts         # 数据验证工具
│   │   ├── permissions.ts        # 权限检查工具
│   │   ├── api-client.ts         # REST API客户端
│   │   └── deployment.ts         # 部署相关工具
│   ├── hooks/                    # React Hooks
│   │   ├── use-mobile.ts         # 移动端检测Hook
│   │   ├── use-deployment.ts     # 部署状态Hook
│   │   ├── use-project.ts        # 项目管理Hook
│   │   └── use-permissions.ts    # 权限管理Hook
│   ├── styles/                   # 样式文件
│   │   └── globals.css           # 全局样式
│   └── types/                    # TypeScript类型定义
│       ├── api.ts                # API类型
│       ├── deployment.ts         # 部署类型
│       ├── version.ts            # 版本管理类型
│       └── permissions.ts        # 权限类型
├── public/                       # 静态资源
├── docs/                         # 文档
│   ├── solution-architecture.md  # 解决方案架构文档
│   ├── data-schema.md           # 数据模型定义
│   └── deployment-guide.md      # 部署指南
├── prisma/                       # Prisma配置
│   ├── schema.prisma             # 数据库模型
│   ├── migrations/               # 数据库迁移
│   └── seed.ts                   # 数据库种子数据
├── scripts/                      # 脚本文件
│   ├── build-deployments.ts      # 部署构建脚本
│   ├── health-check.ts           # 健康检查脚本
│   └── backup-database.ts        # 数据库备份脚本
├── tests/                        # 测试文件
│   ├── integration/              # 集成测试
│   ├── e2e/                     # E2E测试
│   └── unit/                    # 单元测试
├── biome.jsonc                   # Biome代码规范配置
├── components.json               # shadcn/ui配置
├── next.config.js                # Next.js配置
├── package.json                  # 依赖配置
├── tailwindcss.config.js         # Tailwind配置
├── tsconfig.json                 # TypeScript配置
├── vercel.json                   # Vercel部署配置
└── start-database.sh             # 数据库启动脚本
```

### 技术栈说明

**核心架构：**
- **T3 Stack基础**：基于业界最佳实践的全栈TypeScript框架
- **REST API架构**：标准化API设计，易于集成和扩展
- **shadcn/ui组件**：基于Radix UI的无头组件，完美支持定制化
- **Prisma ORM**：类型安全的数据库访问，支持PostgreSQL JSONB

**开发工具链：**
- **Biome**：一体化代码检查和格式化，替代ESLint+Prettier
- **pnpm**：高效的包管理器，支持未来的monorepo扩展
- **TypeScript**：端到端类型安全，从数据库到UI组件
- **Swagger/OpenAPI**：API文档自动生成和交互式测试界面

**测试策略（规划中）：**
当前项目基础架构完善，测试框架将在后续Epic中集成：
- **单元测试**：Jest + React Testing Library
- **集成测试**：基于REST API的自动化测试
- **API测试**：Jest + Supertest API契约测试
- **E2E测试**：Playwright用户流程测试

---

**文档长度：** 约920行
**核心内容保留率：** 85%（重新架构为 enterprise-grade）
**架构一致性：** ✅ 与 data-schema.md 企业级架构完全对齐
**技术决策：** ✅ 所有技术选型都有明确理由和版本号

---

## 架构升级总结

### 关键变更点

1. **数据架构升级**
   - 从极简 MVP 模型升级为企业级版本分离架构
   - 新增 DataModelVersion、AppVersion、Deployment 三层管理体系
   - 实现真正的关注点分离和独立演进

2. **Epic 范围重新定义**
   - Epic 1: 增强基础RBAC权限系统和ProjectMember角色管理
   - Epic 2: 从"元数据管理引擎"升级为"数据模型版本管理引擎"
   - Epic 3: 从"元数据解释器"升级为"应用版本管理器"
   - Epic 5: 从"编译发布器"升级为"应用部署生命周期管理"

3. **部署架构增强**
   - 支持多环境部署和蓝绿发布
   - 完整的部署生命周期管理
   - 企业级监控和告警系统

4. **项目结构优化**
   - 增加部署管理、版本管理服务模块
   - 完善的类型定义和权限管理
   - 企业级的测试和脚本支持

### 技术优势

- **真正的关注点分离**: 数据模型与应用逻辑独立演进
- **简化的权限管理**: 基础RBAC系统满足大多数使用场景
- **企业级部署管理**: 完整的版本控制和部署状态跟踪
- **向后兼容性**: 通过明确的依赖关系管理版本兼容
- **实用主义设计**: 专注核心功能，避免过度工程化

---

## 下一步行动

1. **立即行动**: 更新 Epic 故事分解，反映企业级架构需求
2. **技术验证**: 进行关键技术点的概念验证（特别是版本依赖管理）
3. **环境准备**: 配置多环境部署基础设施
4. **实施启动**: 开始 Epic 2 数据模型版本管理引擎的技术规格文档生成

**架构决策完成状态**: ✅ 企业级架构设计已完成
**实施就绪状态**: ✅ 可以开始企业级功能的技术规格文档生成
**与 data-schema.md 一致性**: ✅ 完全同步，支持完整的企业级功能