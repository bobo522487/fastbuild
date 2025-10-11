# FastBuild 安全指南 v4.0

**项目:** fastbuild
**日期:** 2025-10-11
**版本:** v4.0
**安全级别:** 企业级

---

## 概述

FastBuild v4.0 遵循**安全优先**的设计原则，通过分层架构、枚举化运算符和参数化查询等机制，确保系统在提供强大功能的同时保持零安全漏洞。

### 核心安全原则

1. **最小权限原则**：每个组件只拥有必要的最小权限
2. **深度防御策略**：多层安全验证和防护机制
3. **零信任架构**：所有输入都经过严格验证
4. **安全默认设置**：默认配置为最安全状态

---

## 架构安全

### 分层安全边界

```mermaid
graph TD
    subgraph "安全边界"
        A[API 网关层] --> B[认证授权层]
        B --> C[输入验证层]
        C --> D[业务逻辑层]
        D --> E[数据访问层]
    end

    subgraph "数据保护"
        E --> F[元数据 (Prisma)]
        E --> G[业务数据 (原生 SQL)]
        F --> H[加密存储]
        G --> H
    end
```

### API 分层安全

#### 元数据 API (Prisma 层)
- **路径前缀**: `/api/projects/*`, `/api/tables/*`
- **安全机制**: Prisma ORM 自动参数化查询
- **访问控制**: 项目级权限验证
- **威胁防护**: SQL 注入、越权访问

#### 业务数据 API (原生 SQL 层)
- **路径前缀**: `/api/data/*`
- **安全机制**: SecureViewBuilder + 参数化查询
- **访问控制**: 表级权限验证
- **威胁防护**: SQL 注入、标识符注入

---

## 认证与授权

### JWT 认证安全

#### JWT 结构
```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1640995200,
  "exp": 1640998800,
  "effectivePermissions": {
    "project_456": {
      "role": "OWNER",
      "inherited": ["read", "write", "delete", "manage"]
    }
  }
}
```

#### 安全措施
- **密钥管理**: 使用强随机密钥，定期轮换
- **令牌过期**: 短期有效期 (7天)
- **刷新机制**: 安全的令牌更新流程
- **撤销机制**: 支持令牌主动撤销

### 权限系统安全

#### 角色权限映射
```typescript
const ROLE_PERMISSIONS = {
  OWNER: ['read', 'write', 'delete', 'manage'],
  ADMIN: ['read', 'write', 'delete'],
  EDITOR: ['read', 'write'],
  VIEWER: ['read']
};
```

#### 权限检查
```typescript
async function hasPermission(userId: string, projectId: string, action: string): Promise<boolean> {
  const member = await db.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } }
  });

  if (!member) return false;

  const permissions = ROLE_PERMISSIONS[member.role] || [];
  return permissions.includes(action);
}
```

#### 安全特性
- **实时权限验证**: 每次请求都验证权限
- **最小权限原则**: 只授予必要的最小权限
- **权限继承**: 清晰的角色权限继承关系
- **审计日志**: 完整的权限操作审计

---

## SQL 注入防护

### SecureViewBuilder 安全机制

#### 枚举化运算符
```typescript
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

#### 参数化查询
```typescript
// 安全的过滤条件构建
const buildSafeFilter = (field: string, operator: ComparisonOp, value: any) => {
  const escapedField = escapeIdentifier(field);

  switch (operator) {
    case ComparisonOp.IN:
      const placeholders = value.map(() => '$' + paramIndex++).join(', ');
      return `"${escapedField}" ${operator} (${placeholders})`;

    case ComparisonOp.IS_NULL:
      return `"${escapedField}" IS NULL`;

    default:
      return `"${escapedField}" ${operator} $${paramIndex++}`;
  }
};
```

#### 标识符安全转义
```typescript
const escapeIdentifier = (name: string): string => {
  // 1. 验证标识符格式
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }

  // 2. PostgreSQL 标准转义
  return name.replace(/"/g, '""');
};
```

### 输入验证

#### 列名验证
```typescript
const validateColumnName = (name: string, allowedColumns: Set<string>) => {
  // 1. 检查是否在白名单中
  if (!allowedColumns.has(name)) {
    throw new Error(`Column ${name} not allowed`);
  }

  // 2. 检查格式规范
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(name)) {
    throw new Error(`Invalid column name format: ${name}`);
  }

  // 3. 检查保留字
  if (RESERVED_WORDS.has(name.toUpperCase())) {
    throw new Error(`Column name is reserved: ${name}`);
  }
};
```

#### 值验证
```typescript
const validateValue = (value: any, type: ColumnType) => {
  switch (type) {
    case ColumnType.STRING:
      if (typeof value !== 'string' || value.length > 255) {
        throw new Error('Invalid string value');
      }
      break;

    case ColumnType.NUMBER:
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error('Invalid number value');
      }
      break;

    // ... 其他类型验证
  }
};
```

---

## 数据保护

### 传输安全
- **HTTPS 强制**: 所有 API 通信必须使用 HTTPS
- **TLS 1.3**: 使用最新的 TLS 协议版本
- **HSTS**: 启用 HTTP 严格传输安全
- **证书管理**: 自动化证书更新和监控

### 存储安全
- **密码哈希**: 使用 bcrypt 进行密码哈希
- **敏感数据**: 加密存储敏感信息
- **备份加密**: 数据库备份文件加密
- **访问控制**: 数据库访问 IP 白名单

### 数据脱敏
```typescript
const sanitizeLogData = (data: any) => {
  return {
    ...data,
    password: '[REDACTED]',
    email: data.email ? data.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined,
    token: data.token ? '[REDACTED]' : undefined
  };
};
```

---

## 命名安全

### 命名规范

#### 表名规范
```typescript
const validateTableName = (name: string) => {
  // 1. 长度限制 (最大 50 字符)
  if (name.length > 50) {
    throw new Error('Table name too long (max 50 characters)');
  }

  // 2. 字符集限制
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('Table name must contain only lowercase letters, numbers, and underscores');
  }

  // 3. 保留字检查
  if (PG_RESERVED_WORDS.has(name.toUpperCase())) {
    throw new Error(`Table name is reserved: ${name}`);
  }

  // 4. 系统字段冲突检查
  const SYSTEM_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at'];
  if (SYSTEM_FIELDS.includes(name)) {
    throw new Error(`Table name conflicts with system field: ${name}`);
  }
};
```

#### 列名规范
```typescript
const validateColumnName = (name: string) => {
  // 1. 长度限制 (最大 63 字符，PostgreSQL 限制)
  if (name.length > 63) {
    throw new Error('Column name too long (max 63 characters)');
  }

  // 2. 字符集限制
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('Column name must contain only lowercase letters, numbers, and underscores');
  }

  // 3. 保留字检查
  if (PG_RESERVED_WORDS.has(name.toUpperCase())) {
    throw new Error(`Column name is reserved: ${name}`);
  }

  // 4. 系统字段保护
  const PROTECTED_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at'];
  if (PROTECTED_FIELDS.includes(name)) {
    throw new Error(`Column name is protected: ${name}`);
  }
};
```

### 冲突解决机制

#### 自动重命名
```typescript
const generateSafeName = (baseName: string, existingNames: Set<string>): string => {
  let safeName = baseName;
  let counter = 1;

  while (existingNames.has(safeName)) {
    safeName = `${baseName}_${counter}`;
    counter++;

    // 防止无限循环
    if (counter > 1000) {
      throw new Error('Unable to generate safe name');
    }
  }

  return safeName;
};
```

---

## 错误处理安全

### 安全错误响应
```typescript
const handleSecureError = (error: Error, context: string) => {
  // 记录详细错误到日志
  logger.error('Security error', {
    context,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // 返回安全的错误信息给用户
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  };
};
```

### 信息泄露防护
- **错误信息过滤**: 不向用户暴露敏感信息
- **堆栈跟踪隐藏**: 生产环境隐藏详细堆栈
- **数据库错误**: 通用化数据库错误信息
- **路径信息**: 隐藏服务器文件路径

---

## 审计与监控

### 安全审计
```typescript
const logSecurityEvent = (event: {
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'SQL_INJECTION_ATTEMPT';
  userId?: string;
  projectId?: string;
  action: string;
  details: any;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) => {
  await db.auditLog.create({
    data: {
      userId: event.userId,
      projectId: event.projectId,
      action: event.action,
      resourceType: 'SECURITY_EVENT',
      metadata: {
        type: event.type,
        details: event.details,
        risk: event.risk,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip
      }
    }
  });
};
```

### 监控指标
- **认证失败率**: 监控登录失败尝试
- **权限拒绝率**: 监控越权访问尝试
- **SQL 注入尝试**: 监控异常查询模式
- **输入验证失败**: 监控恶意输入
- **API 异常**: 监控异常请求模式

### 告警机制
- **实时告警**: 高风险事件立即通知
- **聚合告警**: 中等风险事件聚合报告
- **趋势分析**: 安全威胁趋势分析
- **自动响应**: 自动化安全响应机制

---

## 开发安全

### 安全编码规范

#### 输入处理
```typescript
// 安全的输入处理模式
const secureInputHandler = async (input: any, schema: ZodSchema) => {
  try {
    // 1. 结构验证
    const validated = schema.parse(input);

    // 2. 业务规则验证
    await validateBusinessRules(validated);

    // 3. 安全检查
    await performSecurityChecks(validated);

    return validated;
  } catch (error) {
    logSecurityEvent({
      type: 'VALIDATION',
      action: 'INPUT_VALIDATION_FAILED',
      details: { error: error.message, input: sanitizeLogData(input) },
      risk: 'MEDIUM'
    });

    throw error;
  }
};
```

#### 数据库操作
```typescript
// 安全的数据库操作模式
const secureDbOperation = async (query: string, params: any[]) => {
  // 1. 查询模式验证
  if (containsDestructivePatterns(query)) {
    throw new Error('Destructive query not allowed');
  }

  // 2. 参数验证
  if (params.length > 100) {
    throw new Error('Too many parameters');
  }

  // 3. 执行查询
  try {
    return await db.query(query, params);
  } catch (error) {
    logSecurityEvent({
      type: 'SQL_ERROR',
      action: 'DATABASE_QUERY_FAILED',
      details: { query: sanitizeQuery(query), error: error.message },
      risk: 'MEDIUM'
    });

    throw error;
  }
};
```

### 依赖安全
- **依赖扫描**: 定期扫描依赖漏洞
- **版本锁定**: 锁定安全版本
- **自动更新**: 安全补丁自动更新
- **供应链安全**: 验证依赖包完整性

---

## 部署安全

### 环境安全
- **网络隔离**: 生产环境网络隔离
- **防火墙配置**: 严格的防火墙规则
- **入侵检测**: IDS/IPS 系统部署
- **访问控制**: SSH 密钥认证 + IP 白名单

### 配置安全
```bash
# 环境变量安全配置
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-super-secure-random-secret-key
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### 运行时安全
- **容器安全**: 最小权限容器配置
- **进程隔离**: 应用进程隔离运行
- **资源限制**: CPU/内存使用限制
- **健康检查**: 定期健康状态检查

---

## 安全检查清单

### 开发阶段
- [ ] 代码安全审查
- [ ] 依赖漏洞扫描
- [ ] 单元安全测试
- [ ] 集成安全测试

### 部署阶段
- [ ] 环境安全配置
- [ ] SSL/TLS 证书验证
- [ ] 防火墙规则配置
- [ ] 访问控制验证

### 运行阶段
- [ ] 安全监控配置
- [ ] 日志收集配置
- [ ] 备份策略验证
- [ ] 应急响应计划

### 定期维护
- [ ] 安全补丁更新
- [ ] 依赖版本更新
- [ ] 安全策略审查
- [ ] 渗透测试

---

## 应急响应

### 安全事件响应流程
1. **检测**: 自动监控系统检测异常
2. **分析**: 安全团队分析威胁等级
3. **响应**: 执行相应的响应措施
4. **恢复**: 恢复系统正常运行
5. **总结**: 事件总结和改进措施

### 联系信息
- **安全团队**: security@fastbuild.com
- **紧急响应**: emergency@fastbuild.com
- **漏洞报告**: security-bugs@fastbuild.com

---

**FastBuild 安全指南 v4.0** - 企业级低代码平台安全防护体系。

*本文档随系统更新持续完善，最后更新时间：2025-10-11*