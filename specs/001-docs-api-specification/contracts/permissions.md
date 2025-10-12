# 权限管理 API 契约示例

**创建日期**: 2025-10-12
**功能模块**: 权限管理 (/sys/permissions/*)

## 概述

FastBuild 权限管理系统采用硬编码的角色-权限映射模式，确保系统的稳定性和高性能。本文档提供完整的权限管理 API 契约，包括权限检查、批量权限验证和权限缓存管理等功能。

## 权限模型

### 角色定义

```typescript
enum ProjectRole {
  OWNER   // 项目所有者：所有权限
  ADMIN   // 管理员：读写删除权限
  EDITOR  // 编辑者：读写权限
  VIEWER  // 查看者：只读权限
}
```

### 权限映射表

```typescript
const ROLE_PERMISSIONS = {
  OWNER: ['read', 'write', 'delete', 'manage', 'invite'],
  ADMIN: ['read', 'write', 'delete', 'invite'],
  EDITOR: ['read', 'write'],
  VIEWER: ['read']
};
```

### 权限说明

- `read`: 读取项目和数据模型信息
- `write`: 创建和编辑项目内容（数据模型、应用等）
- `delete`: 删除项目资源
- `manage`: 项目设置和配置管理
- `invite`: 邀请其他成员加入项目

## 1. 单个权限检查

### 请求契约

```http
POST /sys/permissions/check
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "projectId": "proj_123",
  "action": "write",
  "resourceId": "model_456",
  "resourceType": "datamodel"
}
```

**请求参数说明**：
- `projectId`: 项目ID，必填
- `action`: 操作类型，必填，可选值：read, write, delete, manage, invite
- `resourceId`: 资源ID，可选，用于细粒度权限控制
- `resourceType`: 资源类型，可选，可选值：datamodel, application, project

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "权限检查完成",
  "data": {
    "hasPermission": true,
    "userRole": "OWNER",
    "permissions": ["read", "write", "delete", "manage", "invite"],
    "checkedPermission": "write",
    "projectId": "proj_123",
    "resourceId": "model_456",
    "resourceType": "datamodel",
    "checkedAt": "2025-10-12T10:30:00.000Z",
    "cacheHit": false
  }
}
```

### 权限不足响应 (403 Forbidden)

```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSION",
  "message": "权限不足",
  "data": {
    "hasPermission": false,
    "userRole": "VIEWER",
    "userPermissions": ["read"],
    "requiredPermission": "write",
    "requiredRole": "EDITOR",
    "projectId": "proj_123",
    "resourceId": "model_456",
    "resourceType": "datamodel",
    "checkedAt": "2025-10-12T10:30:00.000Z"
  }
}
```

### 用户不在项目中响应 (404 Not Found)

```json
{
  "success": false,
  "error": "USER_NOT_IN_PROJECT",
  "message": "用户不是该项目的成员",
  "data": {
    "hasPermission": false,
    "userRole": null,
    "projectId": "proj_123",
    "suggestedActions": [
      {
        "action": "REQUEST_INVITATION",
        "description": "请求项目所有者邀请您加入项目"
      },
      {
        "action": "CREATE_PROJECT",
        "description": "创建您自己的项目"
      }
    ]
  }
}
```

## 2. 批量权限检查

### 请求契约

```http
POST /sys/permissions/check-batch
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "permissions": [
    {
      "projectId": "proj_123",
      "action": "read",
      "resourceType": "project"
    },
    {
      "projectId": "proj_123",
      "action": "write",
      "resourceType": "datamodel",
      "resourceId": "model_456"
    },
    {
      "projectId": "proj_456",
      "action": "delete",
      "resourceType": "application",
      "resourceId": "app_789"
    }
  ]
}
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "批量权限检查完成",
  "data": {
    "results": [
      {
        "projectId": "proj_123",
        "action": "read",
        "resourceType": "project",
        "hasPermission": true,
        "userRole": "OWNER",
        "checkedAt": "2025-10-12T10:30:00.000Z"
      },
      {
        "projectId": "proj_123",
        "action": "write",
        "resourceType": "datamodel",
        "resourceId": "model_456",
        "hasPermission": true,
        "userRole": "OWNER",
        "checkedAt": "2025-10-12T10:30:00.000Z"
      },
      {
        "projectId": "proj_456",
        "action": "delete",
        "resourceType": "application",
        "resourceId": "app_789",
        "hasPermission": false,
        "userRole": "VIEWER",
        "checkedAt": "2025-10-12T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalChecks": 3,
      "granted": 2,
      "denied": 1,
      "projectsChecked": 2,
      "executionTime": "15ms"
    },
    "checkedAt": "2025-10-12T10:30:00.000Z"
  }
}
```

### 性能优化说明

批量权限检查通过以下方式优化性能：
- **单次数据库查询**：一次查询获取用户在所有相关项目中的角色
- **内存权限计算**：使用硬编码的权限映射表进行快速权限计算
- **并行处理**：多个权限检查并行执行，减少总体响应时间

## 3. 跨项目权限检查

### 请求契约

```http
POST /sys/permissions/check-cross-project
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "projectIds": ["proj_123", "proj_456", "proj_789"],
  "action": "read"
}
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "跨项目权限检查完成",
  "data": {
    "projectPermissions": [
      {
        "projectId": "proj_123",
        "hasPermission": true,
        "userRole": "OWNER",
        "permissions": ["read", "write", "delete", "manage", "invite"]
      },
      {
        "projectId": "proj_456",
        "hasPermission": true,
        "userRole": "EDITOR",
        "permissions": ["read", "write"]
      },
      {
        "projectId": "proj_789",
        "hasPermission": false,
        "userRole": null,
        "reason": "USER_NOT_IN_PROJECT"
      }
    ],
    "summary": {
      "totalProjects": 3,
      "accessibleProjects": 2,
      "inaccessibleProjects": 1,
      "checkedAction": "read"
    },
    "checkedAt": "2025-10-12T10:30:00.000Z"
  }
}
```

## 4. 权限缓存管理

### 4.1 刷新权限缓存

#### 请求契约

```http
POST /sys/permissions/refresh-cache
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "projectIds": ["proj_123", "proj_456"],
  "reason": "权限角色已更新"
}
```

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "权限缓存刷新成功",
  "data": {
    "refreshedProjects": [
      {
        "projectId": "proj_123",
        "previousRole": "EDITOR",
        "newRole": "ADMIN",
        "refreshedAt": "2025-10-12T10:30:00.000Z"
      },
      {
        "projectId": "proj_456",
        "previousRole": "VIEWER",
        "newRole": "VIEWER",
        "refreshedAt": "2025-10-12T10:30:00.000Z"
      }
    ],
    "newAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "cacheInvalidatedAt": "2025-10-12T10:30:00.000Z"
  }
}
```

### 4.2 获取缓存状态

#### 请求契约

```http
GET /sys/permissions/cache-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取缓存状态成功",
  "data": {
    "cacheInfo": {
      "totalCachedProjects": 5,
      "lastRefreshAt": "2025-10-12T09:00:00.000Z",
      "nextRefreshAt": "2025-10-12T10:00:00.000Z",
      "cacheVersion": "v1.2.3",
      "cacheSize": "2.1KB"
    },
    "cachedProjects": [
      {
        "projectId": "proj_123",
        "role": "OWNER",
        "permissions": ["read", "write", "delete", "manage", "invite"],
        "cachedAt": "2025-10-12T09:00:00.000Z",
        "expiresAt": "2025-10-12T10:00:00.000Z",
        "hitCount": 156,
        "lastAccessAt": "2025-10-12T10:25:00.000Z"
      }
    ],
    "performance": {
      "averageResponseTime": "3ms",
      "cacheHitRate": "94.2%",
      "totalRequests": 2847
    }
  }
}
```

## 5. 权限变更日志

### 请求契约

```http
GET /sys/permissions/audit-log?projectId=proj_123&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

**查询参数**：
- `projectId`: 可选，项目ID筛选
- `userId`: 可选，用户ID筛选
- `action`: 可选，操作类型筛选 (GRANT, REVOKE, CHECK, CACHE_REFRESH)
- `startDate`: 可选，开始日期 (ISO 8601)
- `endDate`: 可选，结束日期 (ISO 8601)
- `page`: 可选，页码，默认 1
- `limit`: 可选，每页记录数，默认 20

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取权限变更日志成功",
  "data": {
    "auditLogs": [
      {
        "id": "audit_123456789",
        "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
        "targetUserId": "clx1a2b3c4d5e6f7g8h9i0j2",
        "projectId": "proj_123",
        "action": "GRANT",
        "details": {
          "previousRole": "VIEWER",
          "newRole": "EDITOR",
          "grantedBy": "clx1a2b3c4d5e6f7g8h9i0j1",
          "reason": "提升权限以负责数据模型管理"
        },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "timestamp": "2025-10-12T10:30:00.000Z"
      },
      {
        "id": "audit_123456790",
        "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
        "projectId": "proj_123",
        "action": "CACHE_REFRESH",
        "details": {
          "reason": "权限角色已更新",
          "affectedPermissions": ["read", "write"]
        },
        "ipAddress": "192.168.1.100",
        "timestamp": "2025-10-12T10:25:00.000Z"
      }
    ],
    "summary": {
      "totalLogs": 45,
      "grantedActions": 12,
      "revokedActions": 3,
      "checkActions": 28,
      "cacheRefreshActions": 2
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 6. 权限统计分析

### 请求契约

```http
GET /sys/permissions/statistics?period=30d&groupBy=project
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

**查询参数**：
- `period`: 时间周期，可选值：7d, 30d, 90d, 1y，默认 30d
- `groupBy`: 分组方式，可选值：project, action, role, user，默认 project

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取权限统计成功",
  "data": {
    "period": "30d",
    "generatedAt": "2025-10-12T10:30:00.000Z",
    "overall": {
      "totalPermissionChecks": 15420,
      "averageDailyChecks": 514,
      "cacheHitRate": "94.2%",
      "averageResponseTime": "3.2ms"
    },
    "byProject": [
      {
        "projectId": "proj_123",
        "projectName": "我的项目",
        "totalChecks": 3420,
        "grantedChecks": 3210,
        "deniedChecks": 210,
        "grantRate": "93.9%",
        "topActions": [
          { "action": "read", "count": 1890 },
          { "action": "write", "count": 1230 },
          { "action": "delete", "count": 300 }
        ]
      }
    ],
    "byRole": [
      {
        "role": "OWNER",
        "userCount": 1,
        "totalChecks": 5670,
        "grantRate": "100.0%"
      },
      {
        "role": "EDITOR",
        "userCount": 3,
        "totalChecks": 4230,
        "grantRate": "89.5%"
      }
    ]
  }
}
```

## TypeScript 类型定义

```typescript
// 权限检查相关接口
interface PermissionCheckRequest {
  projectId: string;
  action: 'read' | 'write' | 'delete' | 'manage' | 'invite';
  resourceId?: string;
  resourceType?: 'project' | 'datamodel' | 'application';
}

interface PermissionCheckResponse {
  success: boolean;
  message: string;
  data: {
    hasPermission: boolean;
    userRole: ProjectRole | null;
    permissions?: string[];
    checkedPermission: string;
    projectId: string;
    resourceId?: string;
    resourceType?: string;
    checkedAt: string;
    cacheHit?: boolean;
    requiredRole?: string;
    requiredPermission?: string;
    suggestedActions?: Array<{
      action: string;
      description: string;
    }>;
  };
}

interface BatchPermissionRequest {
  permissions: PermissionCheckRequest[];
}

interface BatchPermissionResponse {
  success: boolean;
  message: string;
  data: {
    results: Array<{
      projectId: string;
      action: string;
      resourceType?: string;
      resourceId?: string;
      hasPermission: boolean;
      userRole: ProjectRole | null;
      checkedAt: string;
    }>;
    summary: {
      totalChecks: number;
      granted: number;
      denied: number;
      projectsChecked: number;
      executionTime: string;
    };
    checkedAt: string;
  };
}

interface CrossProjectPermissionRequest {
  projectIds: string[];
  action: 'read' | 'write' | 'delete' | 'manage' | 'invite';
}

interface CrossProjectPermissionResponse {
  success: boolean;
  message: string;
  data: {
    projectPermissions: Array<{
      projectId: string;
      hasPermission: boolean;
      userRole: ProjectRole | null;
      permissions?: string[];
      reason?: string;
    }>;
    summary: {
      totalProjects: number;
      accessibleProjects: number;
      inaccessibleProjects: number;
      checkedAction: string;
    };
    checkedAt: string;
  };
}

// 缓存管理接口
interface RefreshCacheRequest {
  projectIds: string[];
  reason?: string;
}

interface RefreshCacheResponse {
  success: boolean;
  message: string;
  data: {
    refreshedProjects: Array<{
      projectId: string;
      previousRole: ProjectRole;
      newRole: ProjectRole;
      refreshedAt: string;
    }>;
    newAccessToken: string;
    expiresIn: number;
    cacheInvalidatedAt: string;
  };
}

interface CacheStatusResponse {
  success: boolean;
  message: string;
  data: {
    cacheInfo: {
      totalCachedProjects: number;
      lastRefreshAt: string;
      nextRefreshAt: string;
      cacheVersion: string;
      cacheSize: string;
    };
    cachedProjects: Array<{
      projectId: string;
      role: ProjectRole;
      permissions: string[];
      cachedAt: string;
      expiresAt: string;
      hitCount: number;
      lastAccessAt: string;
    }>;
    performance: {
      averageResponseTime: string;
      cacheHitRate: string;
      totalRequests: number;
    };
  };
}

// 审计日志接口
interface AuditLogQuery {
  projectId?: string;
  userId?: string;
  action?: 'GRANT' | 'REVOKE' | 'CHECK' | 'CACHE_REFRESH';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface AuditLogResponse {
  success: boolean;
  message: string;
  data: {
    auditLogs: Array<{
      id: string;
      userId: string;
      targetUserId?: string;
      projectId: string;
      action: string;
      details: Record<string, any>;
      ipAddress: string;
      userAgent?: string;
      timestamp: string;
    }>;
    summary: {
      totalLogs: number;
      grantedActions: number;
      revokedActions: number;
      checkActions: number;
      cacheRefreshActions: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// React Hook 实现
export const usePermissions = () => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(async (request: PermissionCheckRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sys/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '权限检查失败');
      }

      return data.data.hasPermission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const checkBatchPermissions = useCallback(async (request: BatchPermissionRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sys/permissions/check-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '批量权限检查失败');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const refreshCache = useCallback(async (projectIds: string[], reason?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sys/permissions/refresh-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        },
        body: JSON.stringify({ projectIds, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '缓存刷新失败');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return {
    loading,
    error,
    checkPermission,
    checkBatchPermissions,
    refreshCache,
  };
};

// 权限检查 Hook 简化版
export const usePermission = (projectId: string, action: string) => {
  const { checkPermission, loading, error } = usePermissions();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await checkPermission({ projectId, action });
        setHasPermission(result);
      } catch (err) {
        setHasPermission(false);
      }
    };

    if (projectId && action) {
      check();
    }
  }, [projectId, action, checkPermission]);

  return { hasPermission, loading, error };
};
```

## 最佳实践

### 1. 性能优化建议

- **使用批量权限检查**：当需要检查多个权限时，优先使用批量API
- **合理使用缓存**：JWT中的项目角色缓存可以显著减少数据库查询
- **避免频繁检查**：在客户端适当缓存权限检查结果
- **预加载权限**：在用户登录时预加载常用项目的权限信息

### 2. 安全性建议

- **服务端验证**：客户端的权限检查结果不能替代服务端验证
- **最小权限原则**：始终授予用户完成任务所需的最小权限
- **定期审计**：定期审查权限分配和变更日志
- **权限回收**：及时回收不再需要的权限

### 3. 错误处理建议

- **优雅降级**：权限检查失败时，应显示用户友好的错误信息
- **权限提示**：当用户权限不足时，提供获取权限的途径
- **日志记录**：记录权限检查失败的情况，便于问题排查
- **用户反馈**：为权限被拒绝的用户提供明确的说明和帮助

这些契约示例提供了完整的权限管理功能接口规范，包括单个权限检查、批量权限验证、缓存管理和权限审计等功能。硬编码的权限映射确保了系统的稳定性和高性能，同时保持了足够的灵活性来满足复杂的业务需求。