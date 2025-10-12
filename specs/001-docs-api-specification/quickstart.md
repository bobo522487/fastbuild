# 快速开始指南：系统基础设施层 API

**创建日期**: 2025-10-12
**目标受众**: 集成 FastBuild 系统基础设施层的开发者

## 概述

FastBuild 系统基础设施层 (`/sys/*`) 提供完整的用户认证、用户管理和系统监控功能。本指南将帮助您在 5 分钟内集成这些核心功能到您的应用中。

## 前置条件

- Node.js 18+ 环境
- 已获取 FastBuild API 访问密钥
- 基础的 HTTP 客户端 (fetch, axios, curl 等)

## 基础配置

### 1. 设置 API 基础 URL

```javascript
// JavaScript/TypeScript 示例
const API_BASE_URL = 'https://your-fastbuild-instance.com';
const SYS_API = `${API_BASE_URL}/sys`;

// 或使用环境变量
const API_BASE_URL = process.env.FASTBUILD_API_URL || 'http://localhost:3000';
```

### 2. 配置认证头

```javascript
// 设置请求头
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.FASTBUILD_API_KEY,
  // 认证成功后的 Bearer Token
  'Authorization': `Bearer ${accessToken}`
};
```

## 核心功能集成

### 1. 用户注册

```javascript
async function registerUser(userData) {
  try {
    const response = await fetch(`${SYS_API}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name,
        password: userData.password
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('注册成功:', result.user);
      return result;
    } else {
      console.error('注册失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 使用示例
const newUser = {
  email: 'developer@example.com',
  name: '张三',
  password: 'securePassword123!'
};

registerUser(newUser);
```

### 2. 用户登录

```javascript
async function loginUser(email, password) {
  try {
    const response = await fetch(`${SYS_API}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok) {
      // 保存令牌用于后续请求
      const { accessToken, refreshToken, user } = result;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      console.log('登录成功:', user);
      return { accessToken, refreshToken, user };
    } else {
      console.error('登录失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('登录网络错误:', error);
    throw error;
  }
}

// 使用示例
loginUser('developer@example.com', 'securePassword123!');
```

### 3. 获取当前用户信息

```javascript
async function getCurrentUser(accessToken) {
  try {
    const response = await fetch(`${SYS_API}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('用户信息:', result.user);
      return result.user;
    } else {
      console.error('获取用户信息失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 使用示例
const token = localStorage.getItem('accessToken');
getCurrentUser(token);
```

### 4. 令牌自动刷新

```javascript
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(`${SYS_API}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY
      },
      body: JSON.stringify({ refreshToken })
    });

    const result = await response.json();

    if (response.ok) {
      // 更新本地存储的令牌
      localStorage.setItem('accessToken', result.accessToken);
      if (result.refreshToken) {
        localStorage.setItem('refreshToken', result.refreshToken);
      }

      console.log('令牌刷新成功');
      return result.accessToken;
    } else {
      console.error('令牌刷新失败:', result.error);
      // 刷新失败，需要重新登录
      logout();
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('刷新令牌网络错误:', error);
    logout();
    throw error;
  }
}

// 自动刷新令牌的封装函数
async function makeAuthenticatedRequest(url, options = {}) {
  let accessToken = localStorage.getItem('accessToken');

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': process.env.FASTBUILD_API_KEY
      }
    });

    // 如果令牌过期，尝试刷新
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        accessToken = await refreshAccessToken(refreshToken);

        // 使用新令牌重试请求
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': process.env.FASTBUILD_API_KEY
          }
        });
      }
    }

    return response;
  } catch (error) {
    console.error('认证请求失败:', error);
    throw error;
  }
}
```

### 5. 用户登出

```javascript
async function logout() {
  try {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken) {
      await fetch(`${SYS_API}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.FASTBUILD_API_KEY,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch (error) {
    console.error('登出请求失败:', error);
  } finally {
    // 无论请求成功与否，都清除本地存储
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('已登出');
  }
}
```

## 高级功能

### 1. 密码重置流程

```javascript
// 第一步：请求密码重置
async function requestPasswordReset(email) {
  try {
    const response = await fetch(`${SYS_API}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY
      },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('密码重置邮件已发送');
      return result;
    } else {
      console.error('密码重置请求失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 第二步：使用重置令牌设置新密码
async function resetPassword(resetToken, newPassword) {
  try {
    const response = await fetch(`${SYS_API}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.FASTBUILD_API_KEY
      },
      body: JSON.stringify({
        token: resetToken,
        password: newPassword
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('密码重置成功');
      return result;
    } else {
      console.error('密码重置失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}
```

### 2. 更新用户资料

```javascript
async function updateUserProfile(accessToken, profileData) {
  try {
    const response = await makeAuthenticatedRequest(
      `${SYS_API}/users/profile`,
      {
        method: 'PUT',
        body: JSON.stringify(profileData)
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('资料更新成功:', result.user);
      return result.user;
    } else {
      console.error('资料更新失败:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('网络错误:', error);
    throw error;
  }
}

// 使用示例
updateUserProfile(localStorage.getItem('accessToken'), {
  name: '新的用户名',
  email: 'newemail@example.com'
});
```

### 3. 系统健康检查

```javascript
async function checkSystemHealth() {
  try {
    const response = await fetch(`${SYS_API}/health/basic`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.FASTBUILD_API_KEY
      }
    });

    const health = await response.json();

    if (response.ok && health.status === 'healthy') {
      console.log('系统状态正常');
      return true;
    } else {
      console.warn('系统状态异常:', health);
      return false;
    }
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
}

// 定期健康检查
setInterval(checkSystemHealth, 60000); // 每分钟检查一次
```

### 4. 权限检查和管理

FastBuild 采用硬编码的权限角色系统，支持四种角色：OWNER、ADMIN、EDITOR、VIEWER。

#### 4.1 单个权限检查

```javascript
// 检查用户是否有权限执行特定操作
async function checkPermission(accessToken, projectId, action, resourceId = null, resourceType = null) {
  try {
    const requestBody = {
      projectId,
      action,
      ...(resourceId && { resourceId }),
      ...(resourceType && { resourceType })
    };

    const response = await makeAuthenticatedRequest(
      `${SYS_API}/permissions/check`,
      {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`权限检查结果: ${result.data.hasPermission ? '有权限' : '无权限'}`);
      return result.data;
    } else {
      console.error('权限检查失败:', result.error);
      return { hasPermission: false, error: result.error };
    }
  } catch (error) {
    console.error('权限检查网络错误:', error);
    return { hasPermission: false, error: error.message };
  }
}

// 使用示例
const canWrite = await checkPermission(
  localStorage.getItem('accessToken'),
  'proj_123',
  'write',
  'model_456',
  'datamodel'
);

if (canWrite.hasPermission) {
  console.log('用户可以编辑该数据模型');
} else {
  console.log('用户权限不足，无法编辑');
}
```

#### 4.2 批量权限检查（性能优化）

```javascript
// 批量检查多个权限，减少网络请求
async function checkBatchPermissions(accessToken, permissionRequests) {
  try {
    const response = await makeAuthenticatedRequest(
      `${SYS_API}/permissions/check-batch`,
      {
        method: 'POST',
        body: JSON.stringify({ permissions: permissionRequests })
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`批量权限检查完成: ${result.data.summary.granted}/${result.data.summary.totalChecks} 权限通过`);
      return result.data.results;
    } else {
      console.error('批量权限检查失败:', result.error);
      return [];
    }
  } catch (error) {
    console.error('批量权限检查网络错误:', error);
    return [];
  }
}

// 使用示例：检查用户在多个项目中的权限
const batchRequests = [
  { projectId: 'proj_123', action: 'read', resourceType: 'project' },
  { projectId: 'proj_123', action: 'write', resourceType: 'datamodel', resourceId: 'model_456' },
  { projectId: 'proj_456', action: 'delete', resourceType: 'application', resourceId: 'app_789' }
];

const results = await checkBatchPermissions(localStorage.getItem('accessToken'), batchRequests);

results.forEach(result => {
  if (result.hasPermission) {
    console.log(`✅ ${result.projectId} - ${result.action}: 有权限`);
  } else {
    console.log(`❌ ${result.projectId} - ${result.action}: 无权限`);
  }
});
```

#### 4.3 跨项目权限检查

```javascript
// 检查用户在多个项目中是否有特定权限
async function checkCrossProjectPermissions(accessToken, projectIds, action) {
  try {
    const response = await makeAuthenticatedRequest(
      `${SYS_API}/permissions/check-cross-project`,
      {
        method: 'POST',
        body: JSON.stringify({ projectIds, action })
      }
    );

    const result = await response.json();

    if (response.ok) {
      const accessibleProjects = result.data.projectPermissions
        .filter(p => p.hasPermission)
        .map(p => p.projectId);

      console.log(`用户在 ${accessibleProjects.length}/${projectIds.length} 个项目中拥有 ${action} 权限`);
      return result.data;
    } else {
      console.error('跨项目权限检查失败:', result.error);
      return { projectPermissions: [] };
    }
  } catch (error) {
    console.error('跨项目权限检查网络错误:', error);
    return { projectPermissions: [] };
  }
}

// 使用示例
const projectIds = ['proj_123', 'proj_456', 'proj_789'];
const crossProjectResult = await checkCrossProjectPermissions(
  localStorage.getItem('accessToken'),
  projectIds,
  'read'
);

console.log('可访问的项目:', crossProjectResult.projectPermissions
  .filter(p => p.hasPermission)
  .map(p => p.projectId)
);
```

#### 4.4 权限缓存管理

```javascript
// 刷新权限缓存（当权限变更后）
async function refreshPermissionCache(accessToken, projectIds, reason = '权限已更新') {
  try {
    const response = await makeAuthenticatedRequest(
      `${SYS_API}/permissions/refresh-cache`,
      {
        method: 'POST',
        body: JSON.stringify({ projectIds, reason })
      }
    );

    const result = await response.json();

    if (response.ok) {
      // 更新本地存储的访问令牌
      localStorage.setItem('accessToken', result.data.newAccessToken);

      console.log(`权限缓存已刷新，影响 ${result.data.refreshedProjects.length} 个项目`);
      return result.data;
    } else {
      console.error('权限缓存刷新失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('权限缓存刷新网络错误:', error);
    return null;
  }
}

// 获取权限缓存状态
async function getPermissionCacheStatus(accessToken) {
  try {
    const response = await makeAuthenticatedRequest(
      `${SYS_API}/permissions/cache-status`,
      { method: 'GET' }
    );

    const result = await response.json();

    if (response.ok) {
      console.log(`缓存命中率: ${result.data.performance.cacheHitRate}`);
      console.log(`缓存项目数: ${result.data.cacheInfo.totalCachedProjects}`);
      return result.data;
    } else {
      console.error('获取缓存状态失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('获取缓存状态网络错误:', error);
    return null;
  }
}

// 使用示例
await refreshPermissionCache(
  localStorage.getItem('accessToken'),
  ['proj_123', 'proj_456'],
  '用户角色已从 EDITOR 提升为 ADMIN'
);

const cacheStatus = await getPermissionCacheStatus(localStorage.getItem('accessToken'));
```

#### 4.5 权限检查 Hook (React)

```javascript
import { useState, useEffect, useCallback } from 'react';

// 自定义 Hook 用于权限检查
export function usePermission(projectId, action, resourceId = null, resourceType = null) {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const accessToken = localStorage.getItem('accessToken');

  const checkPermission = useCallback(async () => {
    if (!projectId || !action || !accessToken) {
      setHasPermission(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        projectId,
        action,
        ...(resourceId && { resourceId }),
        ...(resourceType && { resourceType })
      };

      const response = await fetch(`${SYS_API}/permissions/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        setHasPermission(result.data.hasPermission);
      } else {
        setError(result.error);
        setHasPermission(false);
      }
    } catch (err) {
      setError(err.message);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }, [projectId, action, resourceId, resourceType, accessToken]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return { hasPermission, loading, error, refetch: checkPermission };
}

// 批量权限检查 Hook
export function useBatchPermissions(permissionRequests) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const accessToken = localStorage.getItem('accessToken');

  const checkPermissions = useCallback(async () => {
    if (!permissionRequests.length || !accessToken) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SYS_API}/permissions/check-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        },
        body: JSON.stringify({ permissions: permissionRequests }),
      });

      const result = await response.json();

      if (response.ok) {
        setResults(result.data.results);
      } else {
        setError(result.error);
        setResults([]);
      }
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [permissionRequests, accessToken]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return { results, loading, error, refetch: checkPermissions };
}

// React 组件中使用示例
function ProjectAction({ projectId, action, children }) {
  const { hasPermission, loading, error } = usePermission(projectId, action);

  if (loading) {
    return <div>正在检查权限...</div>;
  }

  if (error) {
    return <div>权限检查出错: {error}</div>;
  }

  if (!hasPermission) {
    return (
      <div className="permission-denied">
        <p>您没有权限执行此操作</p>
        <button onClick={() => alert('请联系项目所有者获取权限')}>
          请求权限
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// 使用示例
function DataModelEditor({ projectId, modelId }) {
  return (
    <ProjectAction projectId={projectId} action="write" resourceId={modelId} resourceType="datamodel">
      <div className="editor">
        <h2>数据模型编辑器</h2>
        {/* 编辑器内容 */}
      </div>
    </ProjectAction>
  );
}
```

#### 4.6 权限角色说明

| 角色 | 权限 | 说明 |
|------|------|------|
| **OWNER** | read, write, delete, manage, invite | 项目所有者，拥有所有权限 |
| **ADMIN** | read, write, delete, invite | 管理员，可以管理项目内容和成员 |
| **EDITOR** | read, write | 编辑者，可以创建和编辑内容 |
| **VIEWER** | read | 查看者，只能查看内容 |

## 错误处理

### 常见错误代码

| 错误代码 | 描述 | 处理方法 |
|---------|------|----------|
| 400 | 请求参数错误 | 检查请求体格式和必填字段 |
| 401 | 未授权访问 | 检查令牌是否有效或过期 |
| 403 | 权限不足 | 确认用户具有相应权限 |
| 404 | 资源不存在 | 检查 API 端点是否正确 |
| 429 | 请求频率限制 | 实现请求限流机制 |
| 500 | 服务器内部错误 | 稍后重试或联系技术支持 |

### 统一错误处理

```javascript
class FastBuildAPIError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'FastBuildAPIError';
    this.code = code;
    this.details = details;
  }
}

async function handleAPIResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new FastBuildAPIError(
      data.error || 'API 请求失败',
      response.status,
      data
    );
  }

  return data;
}

// 使用示例
try {
  const result = await handleAPIResponse(
    await makeAuthenticatedRequest(`${SYS_API}/users/profile`)
  );
  console.log('操作成功:', result);
} catch (error) {
  if (error instanceof FastBuildAPIError) {
    switch (error.code) {
      case 401:
        console.log('令牌过期，请重新登录');
        logout();
        break;
      case 403:
        console.log('权限不足');
        break;
      default:
        console.log('API 错误:', error.message);
    }
  } else {
    console.log('网络错误:', error.message);
  }
}
```

## 最佳实践

### 1. 安全性
- 永远不要在客户端存储敏感信息
- 使用 HTTPS 进行所有 API 通信
- 定期轮换 API 密钥
- 实现请求签名验证（可选）

### 2. 性能优化
- 实现请求缓存机制
- 使用连接池管理 HTTP 连接
- 实现请求去重和批处理
- 监控 API 调用频率和响应时间

### 3. 用户体验
- 实现加载状态指示
- 提供离线模式支持
- 实现乐观更新策略
- 提供详细的错误提示

### 4. 监控和日志
- 记录所有 API 调用和响应
- 监控错误率和响应时间
- 实现告警机制
- 定期分析使用模式

### 5. 权限管理最佳实践
- **权限检查优先**：在执行任何敏感操作前，始终先检查用户权限
- **批量权限检查**：对于需要检查多个权限的场景，使用批量API提高性能
- **缓存策略**：利用JWT中的项目角色缓存，减少不必要的数据库查询
- **优雅降级**：权限检查失败时，显示用户友好的错误信息而不是直接崩溃
- **最小权限原则**：始终授予用户完成任务所需的最小权限
- **定期审计**：定期审查权限分配，确保权限的合理性

## 完整示例

```javascript
class FastBuildClient {
  constructor(apiBaseUrl, apiKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.apiBaseUrl}/sys/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ email, password })
    });

    const result = await handleAPIResponse(response);
    this.accessToken = result.accessToken;
    this.refreshToken = result.refreshToken;
    return result.user;
  }

  async makeRequest(endpoint, options = {}) {
    let url = `${this.apiBaseUrl}${endpoint}`;

    if (!options.headers) {
      options.headers = {};
    }

    options.headers['X-API-Key'] = this.apiKey;

    if (this.accessToken) {
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, options);

    // 自动刷新令牌
    if (response.status === 401 && this.refreshToken) {
      await this.refreshToken();
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
      response = await fetch(url, options);
    }

    return handleAPIResponse(response);
  }

  async refreshToken() {
    const response = await fetch(`${this.apiBaseUrl}/sys/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const result = await handleAPIResponse(response);
    this.accessToken = result.accessToken;
    if (result.refreshToken) {
      this.refreshToken = result.refreshToken;
    }
  }

  async logout() {
    if (this.accessToken) {
      try {
        await this.makeRequest('/sys/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });
      } catch (error) {
        console.error('登出请求失败:', error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
  }

  async getCurrentUser() {
    return this.makeRequest('/sys/auth/me');
  }

  async updateProfile(data) {
    return this.makeRequest('/sys/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async checkHealth() {
    return this.makeRequest('/sys/health/basic');
  }
}

// 使用示例
const client = new FastBuildClient(
  'https://your-fastbuild-instance.com',
  process.env.FASTBUILD_API_KEY
);

// 完整的用户会话流程
async function userSession() {
  try {
    // 登录
    const user = await client.login('user@example.com', 'password123');
    console.log('登录成功:', user);

    // 获取用户信息
    const profile = await client.getCurrentUser();
    console.log('用户资料:', profile);

    // 更新资料
    const updated = await client.updateProfile({ name: '新名称' });
    console.log('更新成功:', updated);

    // 检查系统状态
    const health = await client.checkHealth();
    console.log('系统健康:', health);

    // 登出
    await client.logout();
    console.log('已登出');
  } catch (error) {
    console.error('会话出错:', error);
  }
}

userSession();
```

## 支持和资源

- **API 文档**: `/api/docs` - 完整的 OpenAPI 文档
- **错误代码参考**: 查看 API 文档中的错误代码章节
- **技术支持**: support@fastbuild.dev
- **开发者社区**: https://community.fastbuild.dev

通过本指南，您应该能够快速集成 FastBuild 系统基础设施层的所有核心功能。如需更详细的说明，请参考完整的 API 规格文档。