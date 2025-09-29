  FastBuild 系统数据模型架构

  核心设计理念

  FastBuild 采用 Schema as Single Source of Truth 的设计理念，使用 Zod Schema 作为表单定义和验证的核心，确保端到端的类型安全。

  数据库模型结构

  1. 核心业务模型

  Form（表单）
  interface Form {
    id: string                    // 主键
    name: string                  // 表单名称
    description?: string           // 表单描述
    version: string               // 版本号
    metadata: FormMetadata         // 表单元数据（JSON）
    createdAt: Date
    updatedAt: Date
    createdById?: string           // 创建者ID
    createdBy?: User              // 关联创建者
    submissions: Submission[]      // 关联提交记录
  }

  Submission（表单提交）
  interface Submission {
    id: string                    // 主键
    formId: string                // 关联表单ID
    data: Record<string, any>      // 提交数据（JSON）
    submittedAt: Date             // 提交时间
    ipAddress?: string            // 提交者IP
    userAgent?: string            // 用户代理
    status: SubmissionStatus       // 提交状态
    submittedById?: string        // 提交用户ID
    submittedBy?: User             // 关联提交用户
    form: Form                    // 关联表单
  }

  User（用户）
  interface User {
    id: string                    // 主键
    name?: string                 // 用户名
    email: string                 // 邮箱（唯一）
    emailVerified?: Date          // 邮箱验证时间
    image?: string                // 头像URL
    passwordHash?: string         // 密码哈希
    role: UserRole                // 用户角色
    isActive: boolean             // 是否激活
    avatar?: string               // 头像别名
    createdAt: Date
    updatedAt: Date
    createdForms: Form[]          // 创建的表单
    submissions: Submission[]     // 提交的表单
    accounts: Account[]           // 第三方账户
    sessions: Session[]            // 登录会话
  }

  2. 监控和运维模型

  MonitoringEvent（监控事件）
  interface MonitoringEvent {
    id: string                    // 主键
    type: string                  // 事件类型
    timestamp: Date               // 事件时间
    userId?: string               // 关联用户
    sessionId: string             // 会话ID
    data: Record<string, any>      // 事件数据
    metadata?: Record<string, any> // 元数据
    createdAt: Date
    updatedAt: Date
  }

  ErrorLog（错误日志）
  interface ErrorLog {
    id: string                    // 主键
    eventId?: string              // 关联事件ID
    level: string                 // 错误级别
    message: string               // 错误消息
    stack?: string                // 错误堆栈
    component?: string             // 组件名称
    path: string                  // 错误路径
    userId?: string               // 关联用户
    sessionId: string             // 会话ID
    resolved: boolean             // 是否已解决
    resolvedAt?: Date             // 解决时间
    resolvedBy?: string           // 解决者
    createdAt: Date
    updatedAt: Date
  }

  PerformanceMetric（性能指标）
  interface PerformanceMetric {
    id: string                    // 主键
    name: string                  // 指标名称
    value: number                 // 指标值
    unit: string                  // 单位
    tags?: Record<string, any>     // 标签
    path: string                  // 页面路径
    userId?: string               // 关联用户
    sessionId: string             // 会话ID
    timestamp: Date               // 记录时间
    createdAt: Date
  }

  UserActivity（用户活动）
  interface UserActivity {
    id: string                    // 主键
    userId?: string               // 关联用户
    sessionId: string             // 会话ID
    action: string                // 用户操作
    element?: string              // 操作元素
    path: string                  // 页面路径
    metadata?: Record<string, any> // 元数据
    timestamp: Date               // 操作时间
    createdAt: Date
  }

  3. 认证和授权模型

  Account（第三方账户）
  interface Account {
    id: string                    // 主键
    userId: string                // 关联用户
    type: string                  // 账户类型
    provider: string              // 提供商
    providerAccountId: string     // 提供商账户ID
    refresh_token?: string       // 刷新令牌
    access_token?: string        // 访问令牌
    expires_at?: number           // 过期时间
    user: User                    // 关联用户
  }

  Session（会话）
  interface Session {
    sessionToken: string           // 会话令牌
    userId: string                // 关联用户
    expires: Date                 // 过期时间
    user: User                    // 关联用户
  }

  类型系统架构

  1. 表单相关类型

  FieldType（字段类型）
  type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea'

  FormField（表单字段）
  interface FormField {
    id: string                    // 字段唯一ID
    name: string                  // 提交键名
    type: FieldType               // 字段类型
    label: string                 // 字段标签
    placeholder?: string          // 占位符
    required?: boolean            // 是否必填
    options?: SelectOption[]      // 选项（select类型）
    condition?: FieldCondition    // 条件显示
    defaultValue?: any            // 默认值
  }

  FormMetadata（表单元数据）
  interface FormMetadata {
    version: string                // 版本号
    fields: FormField[]           // 字段列表
  }

  2. 枚举类型

  UserRole（用户角色）
  enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER'
  }

  SubmissionStatus（提交状态）
  enum SubmissionStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
  }

  API 数据流

  1. 表单创建和编辑流程

  FormMetadata → SchemaCompiler → Zod Schema → Database Storage

  2. 表单提交和验证流程

  User Input → Zod Schema Validation → Database Storage → Status Update

  3. 监控数据流

  User Activity → Monitoring Event → Error/Performance Metrics → Analytics

  性能优化特性

  1. 数据库索引策略

    - 复合索引优化查询性能
    - GIN 索引支持 JSON 字段查询
    - 时间序列索引优化监控查询
  2. 缓存机制

    - Schema 编译结果缓存
    - 查询结果缓存
    - 用户会话缓存
  3. 数据分区

    - 按时间分区监控数据
    - 按用户分区提交数据
    - 热点数据预加载

  安全特性

  1. 输入验证

    - Zod Schema 强类型验证
    - SQL 注入防护
    - XSS 攻击防护
  2. 访问控制

    - 基于角色的权限控制
    - 资源所有者验证
    - 会话管理
  3. 审计日志

    - 用户活动记录
    - 系统错误追踪
    - 性能指标监控

  这个数据模型设计体现了 FastBuild 作为一个现代化低代码表单平台的完整架构，包含了业务逻辑、监控运维、安全认证等各个方面的数据结构。