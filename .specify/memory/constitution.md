<!--
Sync Impact Report:
- Version change: (none) → 1.0.0 (initial constitution)
- Modified principles: N/A (initial creation)
- Added sections: All sections (initial creation)
- Removed sections: N/A
- Templates requiring updates:
  ✅ plan-template.md - Constitution Check section compatible
  ✅ spec-template.md - User story format compatible
  ✅ tasks-template.md - Task organization compatible
- Follow-up TODOs: None
-->

# FastBuild Constitution

## Core Principles

### I. Dynamic Table Generation First
FastBuild的核心创新是根据用户元数据自动创建真实的数据库表，提供企业级性能。每个用户定义的表结构都会生成对应的PostgreSQL表，支持完整的数据库功能包括索引、约束和原生SQL查询。元数据是唯一真实来源，实际表从元数据生成，通过事务确保原子性操作。

### II. Unified Prisma SQL API Architecture
FastBuild采用统一的Prisma SQL API架构，消除混合连接管理复杂性。元数据管理和动态表操作使用统一的Prisma连接池和事务边界，确保100%事务一致性。Prisma Migrate提供完整的DDL版本控制，所有表结构变更都有自动化迁移历史。

### III. Test-First Development (NON-NEGOTIABLE)
TDD强制执行：测试编写 → 用户审批 → 测试失败 → 然后实现。严格遵循红-绿-重构循环，使用Vitest + React Testing Library + Playwright。测试分层：60%单元测试 + 30%集成测试 + 10%端到端测试。每个功能必须先有失败测试，然后才能实现。

### IV. Performance-First Design
FastBuild优先考虑真实数据库性能，使用PostgreSQL原生能力而非EAV模式。每个动态表自动生成性能索引，支持复杂查询和物化视图。查询性能比JSON存储快100-1000倍，支持数据库级别的并发控制和分片扩展。

### V. Linus Style Simplicity
遵循Linus Torvalds"好品味"设计哲学：数据结构正确，消除特殊情况，实用主义优先。从3层验证简化为1层，从1500行检查代码简化为300行事务代码。代码复杂度降低80-90%，用最简单的方式解决最复杂的问题。

## Technical Standards

### Architecture Constraints
- **Framework**: Next.js 15.5.4 with App Router (React 19.2.0)
- **Language**: TypeScript 5.9.3 with strict configuration
- **Database**: PostgreSQL 18 with Prisma ORM 6.17.0
- **API**: REST API with Next.js API Routes + Swagger/OpenAPI 3.1 documentation
- **API Testing**: Jest + Supertest for API contract testing
- **Styling**: Tailwind CSS 4.1.14 with custom components
- **UI Components**: shadcn/ui + Radix UI
- **Code Quality**: Biome 1.9.4 for linting and formatting
- **Package Manager**: pnpm 10.18.2

### Performance Requirements
- 查询响应时间 < 200ms (p95)
- 支持1000并发用户无性能降级
- 动态表创建时间 < 5秒
- 数据库查询使用真实表和索引，避免EAV模式
- 前端交互响应时间 < 100ms

### Security Standards
- JWT认证 + 项目级RBAC权限控制
- 所有数据库标识符必须通过安全验证和转义
- SQL注入防护：pg-format + 参数化查询
- 用户数据完全隔离，项目间数据不可互访
- 审计日志记录所有重要操作

## Development Workflow

### Code Quality Standards
- Biome 1.9.4 统一代码检查和格式化
- 任何PR必须通过所有类型检查和测试
- 代码审查重点关注架构简洁性和性能影响
- 函数复杂度限制：不超过3层缩进
- 强制要求：简洁胜过复杂，统一胜过分散

### Testing Strategy
- 测试驱动开发：先写失败测试，后实现功能
- 分层测试：单元测试(60%) + 集成测试(30%) + E2E测试(10%)
- 每个用户故事必须能独立测试和部署
- 测试覆盖率要求：核心功能 > 90%
- 性能测试：验证查询性能和并发能力

### Database Management
- 所有DDL操作通过Prisma Migrate进行版本控制
- 动态表和元数据在同一事务中创建，保证原子性
- 使用统一Prisma SQL API，避免混合连接管理
- 智能视图系统：从简单默认视图到复杂物化视图
- 索引策略：根据列类型自动生成性能索引

## Governance

### Amendment Process
本宪法优先于所有其他开发实践。修订需要文档记录、团队审批、迁移计划。所有PR和代码审查必须验证合规性。复杂度必须通过架构合理性论证。使用运行时开发指南文档指导具体实现。

### Versioning Policy
主版本号：向后不兼容的治理原则或原则重定义
次版本号：新原则或章节添加或重要指导扩展
修订号：澄清、措辞、拼写修复、非语义细化

### Compliance Review
- 每个功能开发前必须检查宪法合规性
- 代码审查必须验证架构原则遵循情况
- 定期审查：每季度评估宪法执行效果
- 例外处理：需要架构师书面论证和团队批准

**Version**: 1.0.0 | **Ratified**: 2025-10-12 | **Last Amended**: 2025-10-12