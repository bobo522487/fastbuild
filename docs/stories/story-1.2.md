# Story 1.2: 数据库连接和基础配置

Status: Draft

## Story

As a 开发者,
I want 能够连接到PostgreSQL数据库并验证连接,
so that 确保数据库连接稳定，提供健康检查和连接状态可视化.

## Acceptance Criteria

1. 支持PostgreSQL数据库连接
2. 提供连接测试功能
3. 实现基础的健康检查端点
4. 数据库连接状态可视化

## Tasks / Subtasks

- [ ] Task 1: 配置PostgreSQL数据库连接 (AC: #1)
  - [ ] Subtask 1.1: 配置Prisma客户端和数据库连接
  - [ ] Subtask 1.2: 设置环境变量和数据库URL
  - [ ] Subtask 1.3: 实现数据库连接池配置
- [ ] Task 2: 实现数据库连接测试 (AC: #2)
  - [ ] Subtask 2.1: 创建数据库连接测试API
  - [ ] Subtask 2.2: 实现连接健康检查功能
  - [ ] Subtask 2.3: 添加连接状态监控
- [ ] Task 3: 创建健康检查端点 (AC: #3)
  - [ ] Subtask 3.1: 实现 /api/health 端点
  - [ ] Subtask 3.2: 添加数据库连接状态检查
  - [ ] Subtask 3.3: 实现系统状态聚合
- [ ] Task 4: 数据库连接状态可视化 (AC: #4)
  - [ ] Subtask 4.1: 创建数据库状态显示组件
  - [ ] Subtask 4.2: 实现实时连接状态更新
  - [ ] Subtask 4.3: 添加连接错误处理和显示

## Dev Notes

### 架构模式和约束
基于 Epic 1 技术规格文档 [Source: docs/tech-spec-epic-1.md]，本故事需要遵循以下架构原则：
- **数据访问层**: 使用Prisma ORM 6.17.0实现类型安全的数据库访问
- **环境配置**: 通过环境变量管理数据库连接，支持Docker容器化部署
- **连接池管理**: 实现数据库连接池以提高性能和资源利用率
- **健康检查**: 提供标准化的健康检查端点，支持监控和运维

### 需要涉及的源代码组件
1. **数据库配置**:
   - `prisma/schema.prisma` - 数据模型定义和数据库连接配置
   - `src/lib/db.ts` - Prisma客户端配置和连接管理
   - `.env.local` - 数据库连接环境变量

2. **API端点**:
   - `src/app/api/health/route.ts` - 系统健康检查端点
   - `src/app/api/db/test/route.ts` - 数据库连接测试端点
   - `src/lib/api-response.ts` - 统一响应格式

3. **前端组件**:
   - `src/components/status/database-status.tsx` - 数据库连接状态显示
   - `src/components/ui/` - shadcn/ui基础组件（状态指示器、徽章等）
   - `src/components/health/health-dashboard.tsx` - 健康状态仪表板

4. **工具函数**:
   - `src/lib/health-checks.ts` - 健康检查工具函数
   - `src/lib/db-connection.ts` - 数据库连接管理工具

### 测试标准总结
遵循 Epic 1 中定义的测试策略：
- **单元测试**: 使用Vitest测试数据库连接逻辑和健康检查函数
- **集成测试**: 测试完整的数据库连接测试流程
- **API测试**: 使用Jest + Supertest测试健康检查和连接测试端点
- **端到端测试**: 验证从前端到数据库的完整连接流程

### Project Structure Notes

#### 与统一项目结构的对齐
根据解决方案架构 [Source: docs/solution-architecture.md]，本故事的文件组织遵循：
- **数据持久层**: 数据库连接和访问逻辑集中在基础设施层
- **API层**: 健康检查和数据库测试API遵循RESTful设计原则
- **监控集成**: 与现有监控和日志系统集成

#### 目录结构符合性
```
src/
├── app/
│   ├── api/
│   │   ├── health/route.ts       # 系统健康检查端点
│   │   └── db/test/route.ts       # 数据库连接测试端点
│   └── dashboard/                # 管理仪表板页面
├── components/
│   ├── status/                   # 状态显示组件
│   └── ui/                       # 基础UI组件
├── lib/
│   ├── db.ts                     # 数据库连接配置
│   ├── health-checks.ts          # 健康检查工具
│   └── api-response.ts           # API响应格式
└── prisma/
    ├── schema.prisma             # 数据模型
    └── migrations/               # 数据库迁移
```

### References

- [Source: docs/tech-spec-epic-1.md] - Epic 1 技术规格文档，详细描述了数据库设计原则和连接配置
- [Source: docs/epic-stories.md] - Epic故事分解，提供了本故事的验收标准和上下文
- [Source: docs/solution-architecture.md] - 解决方案架构，定义了数据持久层和基础设施设计
- [Source: docs/PRD.md] - 产品需求文档，提供了数据库连接功能的业务背景

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-10 | BMAD Scrum Master | 初始创建故事 |

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML/JSON will be added here by context workflow -->

### Agent Model Used

Claude Code (Anthropic)

### Debug Log References

### Completion Notes List

### File List

- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/app/api/health/route.ts`
- `src/app/api/db/test/route.ts`
- `src/lib/health-checks.ts`
- `src/components/status/database-status.tsx`
- `src/components/health/health-dashboard.tsx`