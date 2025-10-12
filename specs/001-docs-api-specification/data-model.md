# 数据模型：系统基础设施层

**创建日期**: 2025-10-12
**基于**: Prisma Schema v6.17.0

## 核心数据模型概览

FastBuild 系统基础设施层围绕三个核心数据模型构建：**用户认证 (User)**、**项目权限 (ProjectMember)** 和 **审计日志 (AuditLog)**。这些模型通过 Prisma ORM 与 PostgreSQL 18 数据库进行交互，支持完整的用户生命周期管理和安全审计。

## 主要数据模型

### 1. User 模型 - 用户核心信息

```typescript
// 基于 Prisma Schema 的 User 模型
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  name                  String?
  password              String
  role                  UserRole  @default(USER)
  isActive              Boolean   @default(true)
  emailVerified         DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  lastLoginAt           DateTime?

  // 密码重置相关字段
  passwordResetToken    String?
  passwordResetExpires  DateTime?

  // 关系映射
  projectMemberships    ProjectMember[]
  auditLogs             AuditLog[]
  sessions              Session[]

  @@map("users")
}
```

**关键字段说明**：

- `id`: 用户唯一标识符，使用 CUID 格式
- `email`: 用户邮箱，作为登录名，全局唯一
- `password`: bcrypt 加密后的密码哈希
- `role`: 用户角色枚举 (USER/ADMIN/SUPER_ADMIN)
- `isActive`: 账户状态控制，支持软删除
- `emailVerified`: 邮箱验证时间戳，未验证为 null
- `passwordResetToken/passwordResetExpires`: 密码重置令牌和过期时间

**安全特性**：
- 密码使用 bcrypt 进行单向哈希
- 密码重置令牌具有时效性控制
- 支持账户启用/禁用状态管理

### 2. Session 模型 - 用户会话管理

```typescript
model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  refreshToken String?  @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastAccessAt DateTime @updatedAt()

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

**会话管理特性**：
- JWT 访问令牌和刷新令牌分离存储
- 自动过期时间管理
- 最后访问时间跟踪
- 用户删除时级联删除会话

### 3. ProjectMember 模型 - 项目级权限控制

```typescript
model ProjectMember {
  id        String           @id @default(cuid())
  userId    String
  projectId String
  role      ProjectRole      @default(MEMBER)
  joinedAt  DateTime         @default(now())

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([userId, projectId])
  @@map("project_members")
}
```

**权限控制特性**：
- 支持用户在多个项目中的不同角色
- 项目级权限隔离
- 用户-项目关系的唯一性约束
- 项目删除时自动清理成员关系

### 4. AuditLog 模型 - 安全审计日志

```typescript
model AuditLog {
  id          String       @id @default(cuid())
  userId      String?
  action      String
  resource    String
  resourceId  String?
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime     @default(now())

  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
}
```

**审计跟踪特性**：
- 记录所有重要操作的审计信息
- 支持结构化元数据存储
- IP 地址和用户代理跟踪
- 用户删除时保留审计记录

## 枚举类型定义

### UserRole - 用户角色

```typescript
enum UserRole {
  USER        // 普通用户
  ADMIN       // 系统管理员
  SUPER_ADMIN // 超级管理员
}
```

### ProjectRole - 项目角色

```typescript
enum ProjectRole {
  OWNER   // 项目所有者：所有权限
  ADMIN   // 管理员：读写删除权限
  EDITOR  // 编辑者：读写权限
  VIEWER  // 查看者：只读权限
}
```

### 权限映射表

硬编码的权限映射确保系统稳定性和性能：

```typescript
// 项目角色到具体权限的映射
const ROLE_PERMISSIONS = {
  OWNER: ['read', 'write', 'delete', 'manage', 'invite'],
  ADMIN: ['read', 'write', 'delete', 'invite'],
  EDITOR: ['read', 'write'],
  VIEWER: ['read']
};
```

**权限说明**：
- `read`: 读取项目和数据模型信息
- `write`: 创建和编辑项目内容（数据模型、应用等）
- `delete`: 删除项目资源
- `manage`: 项目设置和配置管理
- `invite`: 邀请其他成员加入项目

### AuditAction - 审计操作类型

```typescript
enum AuditAction {
  LOGIN            // 用户登录
  LOGOUT           // 用户登出
  REGISTER         // 用户注册
  PASSWORD_RESET   // 密码重置
  PROFILE_UPDATE   // 资料更新
  ACCOUNT_DELETE   // 账户删除
  TOKEN_REFRESH    // 令牌刷新
  PERMISSION_CHECK // 权限检查
}
```

## 数据关系图

```
User (1) ←→ (N) Session
  ↓
User (1) ←→ (N) ProjectMember → (1) Project
  ↓
User (1) ←→ (N) AuditLog
```

**关系说明**：
- 一个用户可以有多个活跃会话
- 一个用户可以属于多个项目
- 一个用户的所有操作都会产生审计日志

## API 端点与数据模型映射

### 认证管理 (/sys/auth/)

| 端点 | 操作的数据模型 | 主要字段 |
|------|---------------|----------|
| POST /login | User + Session | email, password, lastLoginAt |
| POST /register | User | email, name, password |
| POST /logout | Session | token 删除 |
| POST /refresh | Session | refreshToken 更新 |
| POST /forgot-password | User | passwordResetToken, passwordResetExpires |
| POST /reset-password | User | password 重置 |
| GET /me | User | 返回完整用户信息 |

### 用户管理 (/sys/users/)

| 端点 | 操作的数据模型 | 主要字段 |
|------|---------------|----------|
| GET /profile | User | 返回用户资料 |
| PUT /profile | User | name, email 等个人信息 |
| PUT /password | User | password 更新 |
| DELETE /account | User + Session | isActive = false, 清理会话 |

### 系统监控 (/sys/health/)

监控端点主要查询系统状态，不直接操作用户数据模型，但会触发 AuditLog 记录。

## 数据一致性保证

### 事务边界
- 用户创建和初始权限设置在同一事务中
- 密码重置的令牌生成和过期时间设置原子性操作
- 会话创建和用户最后登录时间同步更新

### 级联删除策略
- 用户删除时：级联删除会话、项目成员关系
- 项目删除时：级联删除项目成员关系
- 审计日志保留：用户删除时审计日志保留用于追溯

### 索引策略
```sql
-- 性能关键索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
```

## 安全考虑

### 数据访问控制
- 用户只能访问自己的数据 (WHERE userId = currentUserId())
- 管理员可以访问所有用户数据
- 项目成员只能访问项目内相关数据

### 敏感数据处理
- 密码永不在 API 响应中返回
- 密码重置令牌有时效性控制
- 审计日志中的敏感信息进行脱敏处理

### 数据备份策略
- 用户数据定期备份
- 审计日志长期保存用于合规性检查
- 会话数据不进行持久化备份

## 扩展性设计

### 水平扩展
- 用户数据可以按用户ID哈希分片
- 审计日志按时间分区存储
- 会话数据适合 Redis 分布式存储

## 权限系统优化

### JWT 权限缓存机制

为减少数据库查询频率，JWT 中包含用户的项目角色缓存：

```typescript
interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
  // 项目角色缓存 (可选，避免JWT过大)
  projectRoles?: Record<string, ProjectRole>; // projectId -> role
}
```

**缓存策略**：
- 只缓存常用项目的角色信息
- JWT 过期时自动刷新缓存
- 权限变更时生成新的JWT令牌

### 批量权限检查优化

```typescript
// 批量获取用户在多个项目中的角色
async function getUserProjectRoles(userId: string, projectIds: string[]): Promise<Map<string, ProjectRole>> {
  const members = await db.projectMember.findMany({
    where: {
      userId,
      projectId: { in: projectIds }
    }
  });

  return new Map(members.map(m => [m.projectId, m.role]));
}

// 批量权限检查
async function checkBatchPermissions(
  userId: string,
  projectActions: Array<{ projectId: string; action: string }>
): Promise<Array<{ projectId: string; action: string; hasPermission: boolean }>> {
  const projectIds = [...new Set(projectActions.map(pa => pa.projectId))];
  const userRoles = await getUserProjectRoles(userId, projectIds);

  return projectActions.map(({ projectId, action }) => {
    const role = userRoles.get(projectId);
    const hasPermission = role ? ROLE_PERMISSIONS[role].includes(action) : false;

    return { projectId, action, hasPermission };
  });
}
```

**性能收益**：
- 减少 N+1 查询问题
- 单次数据库查询获取多个项目权限
- 权限检查时间复杂度从 O(n) 降低到 O(1)

### 功能扩展
- 支持第三方登录 (OAuth) 集成
- 支持多因素认证 (MFA) 扩展
- 支持简单内存缓存机制
- 保持硬编码权限映射的稳定性

这个数据模型设计确保了系统基础设施层的安全性、可扩展性和性能，为 FastBuild 平台的用户管理和权限控制提供了坚实的基础。权限系统优化通过JWT缓存和批量查询显著提升了性能，同时保持了硬编码模式的简洁性和稳定性。