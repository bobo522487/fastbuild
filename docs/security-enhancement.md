# 安全性增强指南

## 已实现的安全措施

### 1. 输入验证和清理

#### 增强的输入清理
- **深度对象清理**: 递归清理所有输入数据，防止原型污染
- **XSS防护**: 移除恶意脚本标签和事件处理器
- **SQL注入检测**: 检测并阻止SQL注入攻击
- **NoSQL注入检测**: 检测NoSQL查询注入攻击
- **路径遍历检测**: 防止目录遍历攻击
- **命令注入检测**: 阻止操作系统命令注入

#### 常用验证器
```typescript
// 电子邮件验证
CommonValidators.email

// 用户名验证
CommonValidators.username

// 密码强度验证
CommonValidators.password

// URL验证
CommonValidators.url

// ID验证
CommonValidators.id

// 分页参数验证
CommonValidators.pagination

// 搜索参数验证
CommonValidators.search
```

### 2. 速率限制增强

#### 多层速率限制策略
- **认证路由**: 15分钟内最多5次尝试，失败后封禁1小时
- **表单路由**: 1分钟内最多20次提交，失败后封禁30分钟
- **API路由**: 1分钟内最多100次请求
- **健康检查**: 1分钟内最多1000次检查
- **文件上传**: 1分钟内最多10次上传，失败后封禁1小时
- **管理员操作**: 1分钟内最多30次操作

#### 高级速率限制特性
- **IP白名单**: 支持配置允许的IP地址
- **用户白名单**: 支持配置允许的用户ID
- **滑动窗口**: 更精确的速率控制
- **自适应限制**: 基于系统负载动态调整限制
- **封禁机制**: 超过限制后临时封禁访问

### 3. 安全中间件

#### 增强安全中间件
```typescript
// 应用到所有路由的安全检查
publicProcedure.use(enhancedSecurityMiddleware)

// 专门的安全路由
secureProcedure
```

#### 安全检查功能
- **用户代理分析**: 检测可疑的User-Agent模式
- **CSRF保护**: 验证跨站请求伪造令牌
- **输入深度清理**: 自动清理所有输入数据
- **自定义验证器**: 为特定路由配置验证规则

### 4. 错误处理和日志

#### 增强的错误处理
- **结构化错误响应**: 统一的错误格式
- **详细的错误日志**: 记录错误上下文和用户信息
- **错误分类**: 按错误类型和严重程度分类
- **性能监控**: 记录请求处理时间

### 5. 内容安全策略

#### HTTP安全头
- **Content-Security-Policy**: 防止XSS攻击
- **X-Content-Type-Options**: 防止MIME类型嗅探
- **X-Frame-Options**: 防止点击劫持
- **X-XSS-Protection**: 启用浏览器XSS保护
- **Referrer-Policy**: 控制引用信息泄露
- **Permissions-Policy**: 限制浏览器功能访问

## 配置和使用

### 1. 环境变量配置

```bash
# .env 文件配置
DATABASE_URL="postgresql://fastbuild_user:fastbuild_password@localhost:5432/fastbuild"
NEXTAUTH_SECRET="your-nextauth-secret-here"
CSRF_SECRET="your-csrf-secret-here"

# 安全配置
BLOCKED_IPS="192.168.1.100,10.0.0.50"
ALLOWED_IPS="127.0.0.1,192.168.1.1"
ALLOWED_USERS="admin-user-id,dev-user-id"

# 速率限制配置
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"
```

### 2. 使用安全中间件

```typescript
import {
  secureProcedure,
  createEnhancedSecurityMiddleware,
  CommonValidators
} from '@workspace/api';

// 使用预配置的安全路由
router({
  secureRoute: secureProcedure
    .input(CommonValidators.search)
    .query(({ input }) => {
      // 安全的处理逻辑
    }),

  // 自定义安全中间件
  customRoute: publicProcedure
    .use(createEnhancedSecurityMiddleware({
      enableInputValidation: true,
      enableSecurityScanning: true,
      enableUserAgentAnalysis: true,
      enableCSRFProtection: true,
      customValidators: {
        '/custom.route': z.object({
          data: z.string().min(1).max(1000),
        }),
      },
    }))
    .mutation(({ input }) => {
      // 自定义安全逻辑
    }),
});
```

### 3. 输入验证示例

```typescript
// 表单创建验证
const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  metadata: z.object({
    version: z.string(),
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
      label: z.string(),
      required: z.boolean().default(false),
    })),
  }),
});

// 用户注册验证
const registerSchema = z.object({
  email: CommonValidators.email,
  username: CommonValidators.username,
  password: CommonValidators.password,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

## 安全最佳实践

### 1. 后端安全

- **输入验证**: 始终验证和清理所有输入数据
- **参数化查询**: 使用参数化查询防止SQL注入
- **最小权限原则**: 限制数据库用户权限
- **会话管理**: 使用安全的会话管理机制
- **错误处理**: 不泄露敏感错误信息

### 2. 前端安全

- **HTTPS**: 强制使用HTTPS
- **内容安全策略**: 实施CSP头部
- **XSS防护**: 使用安全的模板和方法
- **CSRF保护**: 实现CSRF令牌
- **输入验证**: 客户端和服务器端双重验证

### 3. 数据库安全

- **连接加密**: 使用SSL/TLS加密数据库连接
- **访问控制**: 限制数据库访问权限
- **审计日志**: 记录数据库操作日志
- **定期备份**: 实施定期数据备份
- **监控**: 监控数据库异常活动

### 4. 监控和告警

- **异常检测**: 监控异常请求模式
- **速率限制告警**: 超过阈值时告警
- **安全事件**: 记录和分析安全事件
- **性能监控**: 监控系统性能指标
- **日志分析**: 定期分析安全日志

## 测试安全措施

### 1. 安全测试

```typescript
// 测试输入验证
describe('Security Tests', () => {
  it('should block SQL injection attempts', () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const result = EnhancedSecurityUtils.detectSQLInjection(maliciousInput);
    expect(result).toBe(true);
  });

  it('should sanitize XSS attempts', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = EnhancedSecurityUtils.sanitizeString(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });

  it('should detect suspicious User-Agent', () => {
    const suspiciousUA = 'sqlmap/1.0';
    const analysis = EnhancedSecurityUtils.analyzeUserAgent(suspiciousUA);
    expect(analysis.isSuspicious).toBe(true);
  });
});
```

### 2. 渗透测试

- **OWASP Top 10**: 测试常见Web应用漏洞
- **模糊测试**: 测试边界条件和异常输入
- **会话劫持**: 测试会话管理安全性
- **权限提升**: 测试访问控制机制

## 维护和更新

### 1. 定期维护

- **依赖更新**: 定期更新安全相关的依赖
- **安全补丁**: 及时应用安全补丁
- **配置审查**: 定期审查安全配置
- **日志清理**: 定期清理安全日志

### 2. 安全审计

- **代码审计**: 定期进行安全代码审计
- **渗透测试**: 定期进行渗透测试
- **配置审计**: 审查系统和服务配置
- **权限审计**: 审查用户权限和访问控制

### 3. 响应计划

- **事件响应**: 制定安全事件响应计划
- **备份恢复**: 确保数据备份和恢复机制
- **业务连续性**: 制定业务连续性计划
- **沟通机制**: 建立安全事件沟通机制

这些安全措施将显著提升FastBuild项目的安全性，保护用户数据和系统完整性。