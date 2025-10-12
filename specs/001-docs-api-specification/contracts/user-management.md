# 用户管理 API 契约示例

**创建日期**: 2025-10-12
**功能模块**: 用户管理 (/sys/users/*)

## 1. 获取用户资料

### 请求契约

```http
GET /sys/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取用户资料成功",
  "data": {
    "user": {
      "id": "clx1a2b3c4d5e6f7g8h9i0j1",
      "email": "developer@example.com",
      "name": "张三",
      "avatar": "https://cdn.fastbuild.dev/avatars/user123.jpg",
      "role": "USER",
      "isActive": true,
      "emailVerified": "2025-10-10T08:15:30.000Z",
      "createdAt": "2025-10-09T14:20:00.000Z",
      "updatedAt": "2025-10-11T16:45:00.000Z",
      "lastLoginAt": "2025-10-12T10:30:00.000Z",
      "preferences": {
        "language": "zh-CN",
        "timezone": "Asia/Shanghai",
        "notifications": {
          "email": true,
          "push": false,
          "security": true
        }
      },
      "statistics": {
        "projectCount": 3,
        "totalLogins": 45,
        "failedLogins": 2,
        "lastActiveAt": "2025-10-12T10:30:00.000Z"
      }
    }
  }
}
```

### 错误响应契约

**用户未认证 (401 Unauthorized)**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "用户未认证或令牌已过期",
  "details": {
    "requiresLogin": true
  }
}
```

## 2. 更新用户资料

### 请求契约

```http
PUT /sys/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "name": "张三丰",
  "avatar": "https://cdn.fastbuild.dev/avatars/new-avatar.jpg",
  "preferences": {
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "notifications": {
      "email": true,
      "push": true,
      "security": true
    }
  }
}
```

**请求参数说明**:
- `name`: 可选，用户名称，长度 1-100 字符
- `avatar`: 可选，头像 URL，必须是有效的 HTTP/HTTPS URL
- `preferences.language`: 可选，语言代码，支持 zh-CN, en-US, ja-JP
- `preferences.timezone`: 可选，时区标识符
- `preferences.notifications`: 可选，通知偏好设置

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "用户资料更新成功",
  "data": {
    "user": {
      "id": "clx1a2b3c4d5e6f7g8h9i0j1",
      "email": "developer@example.com",
      "name": "张三丰",
      "avatar": "https://cdn.fastbuild.dev/avatars/new-avatar.jpg",
      "role": "USER",
      "isActive": true,
      "emailVerified": "2025-10-10T08:15:30.000Z",
      "updatedAt": "2025-10-12T11:20:00.000Z",
      "preferences": {
        "language": "zh-CN",
        "timezone": "Asia/Shanghai",
        "notifications": {
          "email": true,
          "push": true,
          "security": true
        }
      }
    }
  }
}
```

### 错误响应契约

**参数验证失败 (400 Bad Request)**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "请求参数验证失败",
  "details": {
    "errors": [
      {
        "field": "name",
        "message": "用户名长度不能超过100个字符"
      },
      {
        "field": "avatar",
        "message": "头像URL格式无效"
      }
    ]
  }
}
```

**头像上传失败 (400 Bad Request)**
```json
{
  "success": false,
  "error": "AVATAR_UPLOAD_FAILED",
  "message": "头像上传失败",
  "details": {
    "reason": "文件格式不支持",
    "supportedFormats": ["jpg", "jpeg", "png", "webp"],
    "maxFileSize": "5MB"
  }
}
```

## 3. 修改密码

### 请求契约

```http
PUT /sys/users/password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "currentPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**请求参数说明**:
- `currentPassword`: 必填，当前密码，用于验证身份
- `newPassword`: 必填，新密码，最少 8 字符，包含大小写字母、数字和特殊字符

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "密码修改成功",
  "data": {
    "passwordChangedAt": "2025-10-12T11:30:00.000Z",
    "sessionsRevoked": 2,
    "securityEvent": {
      "id": "evt_123456789",
      "type": "PASSWORD_CHANGED",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "timestamp": "2025-10-12T11:30:00.000Z"
    }
  }
}
```

### 错误响应契约

**当前密码错误 (401 Unauthorized)**
```json
{
  "success": false,
  "error": "CURRENT_PASSWORD_INCORRECT",
  "message": "当前密码不正确",
  "details": {
    "attemptsRemaining": 4,
    "lockoutThreshold": 5
  }
}
```

**新密码不符合要求 (400 Bad Request)**
```json
{
  "success": false,
  "error": "NEW_PASSWORD_INVALID",
  "message": "新密码不符合安全要求",
  "details": {
    "requirements": [
      "至少8个字符",
      "包含大写字母",
      "包含小写字母",
      "包含数字",
      "包含特殊字符"
    ],
    "commonPassword": false,
    "similarToOldPassword": false
  }
}
```

## 4. 删除用户账户

### 请求契约

```http
DELETE /sys/users/account
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "password": "SecurePass123!",
  "confirmation": "DELETE_MY_ACCOUNT",
  "reason": "不再使用此服务"
}
```

**请求参数说明**:
- `password`: 必填，用户密码，用于验证身份
- `confirmation`: 必填，必须是字符串 "DELETE_MY_ACCOUNT"
- `reason`: 可选，删除原因，用于改进服务

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "账户删除成功",
  "data": {
    "accountDeletedAt": "2025-10-12T11:45:00.000Z",
    "dataRetentionPeriod": 30,
    "recoveryPossible": false,
    "affectedResources": {
      "projectsTransferred": 0,
      "sessionsRevoked": 5,
      "dataAnonymized": true
    }
  }
}
```

### 错误响应契约

**密码验证失败 (401 Unauthorized)**
```json
{
  "success": false,
  "error": "PASSWORD_VERIFICATION_FAILED",
  "message": "密码验证失败，无法删除账户",
  "details": {
    "attemptsRemaining": 2
  }
}
```

**账户有重要资源 (409 Conflict)**
```json
{
  "success": false,
  "error": "ACCOUNT_HAS_RESOURCES",
  "message": "账户中仍有重要资源，无法直接删除",
  "details": {
    "resources": [
      {
        "type": "projects",
        "count": 3,
        "actionRequired": "transfer_or_delete"
      },
      {
        "type": "billing",
        "status": "active",
        "actionRequired": "cancel_subscription"
      }
    ],
    "transferOptions": [
      {
        "type": "transfer_to_user",
        "description": "转移给其他用户"
      },
      {
        "type": "delete_all",
        "description": "删除所有资源（不可恢复）"
      }
    ]
  }
}
```

## 5. 上传用户头像

### 请求契约 (Multipart Form Data)

```http
POST /sys/users/avatar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
X-API-Key: your-api-key-here

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="avatar"; filename="profile.jpg"
Content-Type: image/jpeg

[二进制图像数据]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**文件要求**:
- 文件格式: jpg, jpeg, png, webp
- 最大文件大小: 5MB
- 推荐尺寸: 200x200 像素
- 支持的 MIME 类型: image/jpeg, image/png, image/webp

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "头像上传成功",
  "data": {
    "avatar": {
      "url": "https://cdn.fastbuild.dev/avatars/clx1a2b3c4d5e6f7g8h9i0j1.jpg",
      "thumbnailUrl": "https://cdn.fastbuild.dev/avatars/clx1a2b3c4d5e6f7g8h9i0j1_thumb.jpg",
      "size": 245760,
      "dimensions": {
        "width": 200,
        "height": 200
      },
      "format": "jpeg",
      "uploadedAt": "2025-10-12T11:50:00.000Z"
    }
  }
}
```

### 错误响应契约

**文件格式不支持 (400 Bad Request)**
```json
{
  "success": false,
  "error": "UNSUPPORTED_FILE_FORMAT",
  "message": "不支持的文件格式",
  "details": {
    "providedFormat": "gif",
    "supportedFormats": ["jpg", "jpeg", "png", "webp"]
  }
}
```

**文件过大 (413 Payload Too Large)**
```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "文件大小超过限制",
  "details": {
    "providedSize": "8MB",
    "maxSize": "5MB"
  }
}
```

## 6. 获取用户活动历史

### 请求契约

```http
GET /sys/users/activity?page=1&limit=20&type=login
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

**查询参数**:
- `page`: 可选，页码，默认 1
- `limit`: 可选，每页记录数，默认 20，最大 100
- `type`: 可选，活动类型筛选 (login, logout, password_change, profile_update)
- `startDate`: 可选，开始日期 (ISO 8601)
- `endDate`: 可选，结束日期 (ISO 8601)

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取活动历史成功",
  "data": {
    "activities": [
      {
        "id": "act_123456789",
        "type": "login",
        "description": "用户登录",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "location": {
          "country": "中国",
          "region": "北京",
          "city": "北京"
        },
        "timestamp": "2025-10-12T10:30:00.000Z",
        "success": true
      },
      {
        "id": "act_123456790",
        "type": "password_change",
        "description": "密码修改",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "timestamp": "2025-10-12T11:30:00.000Z",
        "success": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalLogins": 89,
      "totalPasswordChanges": 3,
      "totalProfileUpdates": 12,
      "lastActivityAt": "2025-10-12T11:30:00.000Z"
    }
  }
}
```

## 完整的用户管理实现示例

### React Hook 实现

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from './auth-context';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  emailVerified: string | null;
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      security: boolean;
    };
  };
  statistics: {
    projectCount: number;
    totalLogins: number;
    failedLogins: number;
    lastActiveAt: string;
  };
}

interface UpdateProfileData {
  name?: string;
  avatar?: string;
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      security?: boolean;
    };
  };
}

export const useUserManagement = () => {
  const { accessToken, refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sys/users${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '请求失败');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const getProfile = useCallback(async (): Promise<UserProfile> => {
    const response = await apiRequest('/profile');
    return response.data.user;
  }, [apiRequest]);

  const updateProfile = useCallback(async (
    data: UpdateProfileData
  ): Promise<UserProfile> => {
    const response = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.user;
  }, [apiRequest]);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await apiRequest('/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  }, [apiRequest]);

  const uploadAvatar = useCallback(async (
    file: File
  ): Promise<{ url: string; thumbnailUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch('/api/sys/users/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '头像上传失败');
    }

    return data.data.avatar;
  }, [accessToken]);

  const deleteAccount = useCallback(async (
    password: string,
    reason?: string
  ): Promise<void> => {
    await apiRequest('/account', {
      method: 'DELETE',
      body: JSON.stringify({
        password,
        confirmation: 'DELETE_MY_ACCOUNT',
        reason,
      }),
    });
  }, [apiRequest]);

  const getActivityHistory = useCallback(async (
    page = 1,
    limit = 20,
    type?: string
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (type) {
      params.append('type', type);
    }

    const response = await apiRequest(`/activity?${params}`);
    return response.data;
  }, [apiRequest]);

  return {
    loading,
    error,
    getProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAccount,
    getActivityHistory,
  };
};

// React 组件示例
export const UserProfileComponent = () => {
  const {
    getProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    loading,
    error,
  } = useUserManagement();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error('加载用户资料失败:', err);
    }
  };

  const handleUpdateProfile = async (data: UpdateProfileData) => {
    try {
      const updatedProfile = await updateProfile(data);
      setProfile(updatedProfile);
      setEditing(false);
    } catch (err) {
      console.error('更新用户资料失败:', err);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const { url } = await uploadAvatar(file);
      await handleUpdateProfile({ avatar: url });
    } catch (err) {
      console.error('头像上传失败:', err);
    }
  };

  const handlePasswordChange = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      await changePassword(currentPassword, newPassword);
      alert('密码修改成功');
    } catch (err) {
      console.error('密码修改失败:', err);
      alert('密码修改失败');
    }
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!profile) return <div>未找到用户资料</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img
          src={profile.avatar || '/default-avatar.png'}
          alt="用户头像"
          className="avatar"
        />
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p>{profile.email}</p>
          <span className="role">{profile.role}</span>
        </div>
      </div>

      {editing ? (
        <ProfileEditForm
          profile={profile}
          onSave={handleUpdateProfile}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <ProfileView
          profile={profile}
          onEdit={() => setEditing(true)}
          onAvatarUpload={handleAvatarUpload}
          onPasswordChange={handlePasswordChange}
        />
      )}
    </div>
  );
};
```

### 后端验证规则 (Zod Schema)

```typescript
import { z } from 'zod';

// 更新用户资料的验证规则
export const updateProfileSchema = z.object({
  name: z.string()
    .min(1, '姓名不能为空')
    .max(100, '姓名不能超过100个字符')
    .optional(),
  avatar: z.string()
    .url('头像URL格式无效')
    .optional(),
  preferences: z.object({
    language: z.enum(['zh-CN', 'en-US', 'ja-JP'], {
      errorMap: () => ({ message: '不支持的语言' })
    }),
    timezone: z.string().min(1, '时区不能为空'),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      security: z.boolean(),
    }),
  }).optional(),
});

// 修改密码的验证规则
export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, '当前密码不能为空'),
  newPassword: z.string()
    .min(8, '密码至少需要8个字符')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '密码必须包含大小写字母、数字和特殊字符'),
});

// 删除账户的验证规则
export const deleteAccountSchema = z.object({
  password: z.string()
    .min(1, '密码不能为空'),
  confirmation: z.literal('DELETE_MY_ACCOUNT', {
    errorMap: () => ({ message: '确认文本必须为 DELETE_MY_ACCOUNT' })
  }),
  reason: z.string()
    .max(500, '删除原因不能超过500个字符')
    .optional(),
});

// 头像上传的验证规则
export const avatarUploadSchema = z.object({
  size: z.number()
    .max(5 * 1024 * 1024, '文件大小不能超过5MB'),
  mimetype: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: '只支持 JPG、PNG、WebP 格式的图片' })
  }),
  dimensions: z.object({
    width: z.number().min(1).max(1000),
    height: z.number().min(1).max(1000),
  }),
});
```

## 7. 项目成员角色管理

### 7.1 获取用户在项目中的角色

#### 请求契约

```http
GET /sys/users/projects/:projectId/role
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

**路径参数**：
- `projectId`: 项目ID，必填

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取项目角色成功",
  "data": {
    "userRole": {
      "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
      "projectId": "proj_123",
      "role": "OWNER",
      "joinedAt": "2025-10-09T14:20:00.000Z",
      "assignedBy": "clx1a2b3c4d5e6f7g8h9i0j1",
      "permissions": ["read", "write", "delete", "manage", "invite"]
    },
    "projectInfo": {
      "id": "proj_123",
      "name": "我的项目",
      "description": "项目描述",
      "memberCount": 5
    }
  }
}
```

#### 错误响应契约

**用户不在项目中 (404 Not Found)**
```json
{
  "success": false,
  "error": "USER_NOT_IN_PROJECT",
  "message": "用户不是该项目的成员",
  "details": {
    "projectId": "proj_123",
    "userId": "clx1a2b3c4d5e6f7g8h9i0j1"
  }
}
```

### 7.2 获取用户所有项目角色

#### 请求契约

```http
GET /sys/users/projects/roles
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-API-Key: your-api-key-here
```

**查询参数**：
- `page`: 可选，页码，默认 1
- `limit`: 可选，每页记录数，默认 20，最大 100
- `role`: 可选，角色筛选 (OWNER, ADMIN, EDITOR, VIEWER)

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取项目角色列表成功",
  "data": {
    "projectRoles": [
      {
        "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
        "projectId": "proj_123",
        "projectName": "我的项目",
        "role": "OWNER",
        "joinedAt": "2025-10-09T14:20:00.000Z",
        "lastActiveAt": "2025-10-12T10:30:00.000Z",
        "permissions": ["read", "write", "delete", "manage", "invite"],
        "memberCount": 5,
        "isOwner": true
      },
      {
        "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
        "projectId": "proj_456",
        "projectName": "团队项目",
        "role": "EDITOR",
        "joinedAt": "2025-10-10T09:15:00.000Z",
        "lastActiveAt": "2025-10-11T16:45:00.000Z",
        "permissions": ["read", "write"],
        "memberCount": 8,
        "isOwner": false
      }
    ],
    "summary": {
      "totalProjects": 2,
      "ownedProjects": 1,
      "adminProjects": 0,
      "editorProjects": 1,
      "viewerProjects": 0
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 7.3 离开项目 (删除项目成员关系)

#### 请求契约

```http
DELETE /sys/users/projects/:projectId/leave
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "confirmation": "LEAVE_PROJECT",
  "reason": "项目已结束"
}
```

**路径参数**：
- `projectId`: 项目ID，必填

**请求参数说明**：
- `confirmation`: 必填，必须是字符串 "LEAVE_PROJECT"
- `reason`: 可选，离开项目的原因

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "已成功离开项目",
  "data": {
    "leftAt": "2025-10-12T12:00:00.000Z",
    "projectName": "我的项目",
    "previousRole": "OWNER",
    "affectedResources": {
      "dataModelsCount": 3,
      "applicationsCount": 2,
      "transferredTo": "user_456"
    },
    "warning": "您是项目的唯一所有者，项目所有权已转移给指定用户"
  }
}
```

#### 错误响应契约

**项目所有者不能直接离开 (409 Conflict)**
```json
{
  "success": false,
  "error": "OWNER_CANNOT_LEAVE",
  "message": "项目所有者不能直接离开项目",
  "details": {
    "projectId": "proj_123",
    "currentRole": "OWNER",
    "memberCount": 1,
    "requiredActions": [
      {
        "action": "TRANSFER_OWNERSHIP",
        "description": "转移项目所有权给其他成员"
      },
      {
        "action": "DELETE_PROJECT",
        "description": "删除项目（如果确认不再需要）"
      }
    ]
  }
}
```

**用户不在项目中 (404 Not Found)**
```json
{
  "success": false,
  "error": "NOT_PROJECT_MEMBER",
  "message": "您不是该项目的成员",
  "details": {
    "projectId": "proj_123"
  }
}
```

### 7.4 更新项目成员角色 (项目所有者/管理员)

#### 请求契约

```http
PUT /sys/users/projects/:projectId/members/:userId/role
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-API-Key: your-api-key-here

{
  "newRole": "EDITOR",
  "reason": "提升权限以负责数据模型管理"
}
```

**路径参数**：
- `projectId`: 项目ID，必填
- `userId`: 目标用户ID，必填

**请求参数说明**：
- `newRole`: 必填，新角色 (OWNER, ADMIN, EDITOR, VIEWER)
- `reason`: 可选，角色变更原因

#### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "项目成员角色更新成功",
  "data": {
    "memberRole": {
      "userId": "clx1a2b3c4d5e6f7g8h9i0j1",
      "projectId": "proj_123",
      "previousRole": "VIEWER",
      "newRole": "EDITOR",
      "updatedAt": "2025-10-12T12:15:00.000Z",
      "updatedBy": "clx1a2b3c4d5e6f7g8h9i0j1",
      "reason": "提升权限以负责数据模型管理"
    },
    "permissionChanges": {
      "added": ["write"],
      "removed": [],
      "newPermissions": ["read", "write"]
    }
  }
}
```

#### 错误响应契约

**权限不足 (403 Forbidden)**
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSION",
  "message": "您没有权限修改该项目成员的角色",
  "details": {
    "requiredPermission": "manage",
    "userRole": "EDITOR",
    "targetUserId": "clx1a2b3c4d5e6f7g8h9i0j1"
  }
}
```

**目标用户不是项目成员 (404 Not Found)**
```json
{
  "success": false,
  "error": "TARGET_USER_NOT_MEMBER",
  "message": "目标用户不是该项目的成员",
  "details": {
    "targetUserId": "clx1a2b3c4d5e6f7g8h9i0j1",
    "projectId": "proj_123"
  }
}
```

## TypeScript 类型定义更新

```typescript
// 项目角色相关接口
interface ProjectRole {
  userId: string;
  projectId: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
  assignedBy?: string;
  lastActiveAt?: string;
}

interface ProjectRoleWithDetails extends ProjectRole {
  projectName: string;
  permissions: string[];
  memberCount: number;
  isOwner: boolean;
}

interface LeaveProjectRequest {
  confirmation: 'LEAVE_PROJECT';
  reason?: string;
}

interface UpdateMemberRoleRequest {
  newRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  reason?: string;
}

interface PermissionChanges {
  added: string[];
  removed: string[];
  newPermissions: string[];
}

// React Hook 扩展
export const useProjectRoles = () => {
  // ... 现有的用户管理逻辑

  const getProjectRole = useCallback(async (projectId: string) => {
    const response = await apiRequest(`/projects/${projectId}/role`);
    return response.data;
  }, [apiRequest]);

  const getAllProjectRoles = useCallback(async (params?: {
    page?: number;
    limit?: number;
    role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);

    const response = await apiRequest(`/projects/roles?${searchParams}`);
    return response.data;
  }, [apiRequest]);

  const leaveProject = useCallback(async (projectId: string, confirmation: string, reason?: string) => {
    const response = await apiRequest(`/projects/${projectId}/leave`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmation, reason }),
    });
    return response.data;
  }, [apiRequest]);

  const updateMemberRole = useCallback(async (
    projectId: string,
    userId: string,
    newRole: string,
    reason?: string
  ) => {
    const response = await apiRequest(`/projects/${projectId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ newRole, reason }),
    });
    return response.data;
  }, [apiRequest]);

  return {
    // ... 现有的返回值
    getProjectRole,
    getAllProjectRoles,
    leaveProject,
    updateMemberRole,
  };
};
```

这些契约示例提供了完整的项目成员角色管理功能接口规范，包括角色查询、项目离开和角色变更等功能。开发者可以根据这些契约快速集成 FastBuild 的项目权限管理功能。