# Story 1.3: 基础认证系统

Status: ContextReadyDraft

## Story

As a 用户,
I want 能够通过邮箱/密码和社交登录方式注册和登录,
so that 获得安全便捷的身份认证体验，支持多种登录方式.

## Acceptance Criteria

1. 实现邮箱/密码注册和登录
2. 集成GitHub OAuth登录
3. 基础的用户会话管理
4. 密码重置功能

## Tasks / Subtasks

- [ ] Task 1: 实现邮箱/密码认证 (AC: #1)
  - [ ] Subtask 1.1: 创建用户注册API端点
  - [ ] Subtask 1.2: 实现用户登录API端点
  - [ ] Subtask 1.3: 添加密码哈希和验证
  - [ ] Subtask 1.4: 实现邮箱验证功能
- [ ] Task 2: 集成社交登录 (AC: #2)
  - [ ] Subtask 2.1: 配置Google OAuth提供者
  - [ ] Subtask 2.2: 配置GitHub OAuth提供者
  - [ ] Subtask 2.3: 实现社交登录回调处理
  - [ ] Subtask 2.4: 创建社交登录绑定功能
- [ ] Task 3: 用户会话管理 (AC: #3)
  - [ ] Subtask 3.1: 配置NextAuth.js会话策略
  - [ ] Subtask 3.2: 实现JWT令牌管理
  - [ ] Subtask 3.3: 创建会话状态管理
  - [ ] Subtask 3.4: 实现自动登录和登出
- [ ] Task 4: 密码重置功能 (AC: #4)
  - [ ] Subtask 4.1: 创建密码重置请求API
  - [ ] Subtask 4.2: 实现邮件发送功能
  - [ ] Subtask 4.3: 创建密码重置确认API
  - [ ] Subtask 4.4: 实现密码重置前端界面

## Dev Notes

### 架构模式和约束
基于 Epic 1 技术规格文档 [Source: docs/tech-spec-epic-1.md]，本故事需要遵循以下架构原则：
- **认证系统**: 使用NextAuth.js 5.0.0-beta.25实现多平台认证
- **安全性优先**: 使用行业最佳安全实践，密码哈希、JWT令牌
- **用户体验优化**: 简化认证流程，支持多种登录方式
- **可扩展性**: 易于添加新的认证提供商

### 需要涉及的源代码组件
1. **认证配置**:
   - `src/server/auth/config.ts` - NextAuth.js配置核心
   - `src/lib/auth.ts` - 认证工具函数和辅助方法
   - `src/app/api/auth/` - 认证相关API路由

2. **数据库认证模型**:
   - `prisma/schema.prisma` - User、Account、Session、VerificationToken模型
   - `src/lib/db.ts` - Prisma客户端和数据库连接
   - PrismaAdapter集成和会话持久化

3. **前端认证组件**:
   - `src/components/auth/login-form.tsx` - 登录表单组件
   - `src/components/auth/register-form.tsx` - 注册表单组件
   - `src/components/auth/auth-guard.tsx` - 认证守卫组件
   - `src/components/auth/password-reset.tsx` - 密码重置组件

4. **API端点**:
   - `src/app/api/auth/register/route.ts` - 用户注册端点
   - `src/app/api/auth/login/route.ts` - 用户登录端点
   - `src/app/api/auth/reset-password/route.ts` - 密码重置端点

### 测试标准总结
遵循 Epic 1 中定义的测试策略：
- **单元测试**: 使用Vitest测试认证逻辑和密码验证
- **集成测试**: 测试完整的用户注册和登录流程
- **API测试**: 使用Jest + Supertest测试认证API端点
- **前端测试**: 使用React Testing Library测试认证组件交互
- **安全测试**: 测试密码哈希、JWT令牌和会话管理

### Project Structure Notes

#### 与统一项目结构的对齐
根据解决方案架构 [Source: docs/solution-architecture.md]，本故事的文件组织遵循：
- **认证层**: 认证相关功能集中在独立的auth模块
- **API设计**: 认证API遵循RESTful设计原则
- **前端组件**: 认证组件复用shadcn/ui基础组件库

#### 目录结构符合性
```
src/
├── app/
│   ├── (auth)/                   # 认证相关路由组
│   │   ├── login/               # 登录页面
│   │   ├── register/            # 注册页面
│   │   └── reset-password/      # 密码重置页面
│   └── api/
│       └── auth/                # 认证API路由
├── components/
│   ├── auth/                    # 认证相关组件
│   └── ui/                      # 基础UI组件
├── server/
│   └── auth/                    # 服务端认证逻辑
├── lib/
│   ├── auth.ts                  # 认证工具函数
│   └── validations.ts           # 数据验证
└── prisma/
    └── schema.prisma            # 数据模型
```

### References

- [Source: docs/tech-spec-epic-1.md] - Epic 1 技术规格文档，详细描述了NextAuth.js配置和认证API实现
- [Source: docs/epic-stories.md] - Epic故事分解，提供了本故事的验收标准和上下文
- [Source: docs/solution-architecture.md] - 解决方案架构，定义了认证层和用户数据模型
- [Source: docs/PRD.md] - 产品需求文档，提供了认证功能的业务背景

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-10 | BMAD Scrum Master | 初始创建故事 |

## Dev Agent Record

### Context Reference

- [story-context-1.1.3.xml](../story-context-1.1.3.xml) - 故事上下文XML文件，包含所有相关的文档、代码、依赖和测试信息

### Agent Model Used

Claude Code (Anthropic)

### Debug Log References

### Completion Notes List

### File List

- `src/server/auth/config.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/password-reset.tsx`
- `prisma/schema.prisma`