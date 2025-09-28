<!--
Sync Impact Report:
- Version change: undefined → 1.0.0 (initial constitution)
- Modified principles: None (initial creation)
- Added sections:
  * Core Principles (5 principles)
  * Security Requirements (2 principles)
  * Development Workflow (3 principles)
  * Governance (3 sections)
- Removed sections: None
- Templates updated: ✅ .specify/templates/plan-template.md, ✅ .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->

# FastBuild Constitution
<!-- FastBuild 低代码表单平台宪法 -->

## Core Principles

### Schema-First Architecture
<!-- I. Schema 驱动架构 -->
Schema 是单一事实来源。所有表单定义使用 Zod Schema 作为权威规范，确保设计时与运行时的类型一致性。元数据到可执行 Schema 的转换必须是安全的，禁止任何形式的 eval() 或动态代码执行。

### Type Safety Non-Negotiable
<!-- II. 类型安全不可妥协 -->
端到端类型安全是平台的基石。从前端 UI 到数据库访问的每一层都必须通过 TypeScript + Zod + Prisma 实现编译时和运行时验证。类型错误必须在开发阶段被发现，绝不能到达生产环境。

### Monorepo First
<!-- III. Monorepo 优先 -->
所有代码必须组织在 pnpm workspace monorepo 中。每个包都有清晰的职责边界：UI 组件、数据库访问、Schema 编译、共享配置等。跨包依赖必须明确声明，避免循环依赖。

### Test-Driven Development
<!-- IV. 测试驱动开发（不可妥协） -->
TDD 是强制性的：先编写测试 → 用户确认 → 测试失败 → 然后实现。严格遵循 Red-Green-Refactor 循环。所有新功能必须先有失败的测试用例。

### Performance by Design
<!-- V. 设计时的性能考虑 -->
性能必须在架构层面考虑：Schema 编译器必须高效，表单渲染必须虚拟化长列表，API 必须支持批量操作，数据库查询必须优化。性能目标：表单渲染 <100ms，API 响应 <200ms，Schema 编译 <10ms。

## Security Requirements
<!-- 安全要求 -->

### Zero Trust Data Processing
<!-- 零信任数据处理 -->
所有用户输入都必须经过 Zod Schema 验证，永不信任客户端数据。Schema 编译器必须使用白名单机制，严格防止任意代码执行。所有 API 端点必须实施认证和授权。

### Data Validation First
<!-- 数据验证优先 -->
验证必须在数据流动的每个环节进行：前端表单验证 → Schema 编译验证 → 数据库约束验证。任何验证失败都必须立即终止处理并返回清晰的错误信息。

## Development Workflow
<!-- 开发工作流 -->

### Design-Time/Runtime Separation
<!-- 设计时与运行时分离 -->
表单设计器和表单渲染器必须完全分离。设计器生成元数据，运行时渲染器只消费元数据。元数据格式必须稳定且向后兼容。

### API Evolution Policy
<!-- API 演变策略 -->
所有公共 API 必须遵循语义化版本控制。破坏性变更只能在主版本号变更时引入，并且必须提供迁移指南。tRPC 端点必须保持向后兼容，废弃功能必须标记清楚。

### Code Quality Standards
<!-- 代码质量标准 -->
- ESLint 配置必须强制执行，不允许警告
- Prettier 必须格式化所有代码，确保一致性
- TypeScript 必须开启严格模式
- 所有函数必须有明确的类型注解
- 代码复杂度必须控制在可维护范围内

## Governance
<!-- 宪法优先于所有其他实践；修订需要文档化、批准和迁移计划 -->

### Amendment Process
<!-- 修订流程 -->
- 任何对核心原则的修改都需要全体架构师一致同意
- 技术栈变更需要充分的论证和原型验证
- 所有修订必须记录在案，包括理由和影响评估

### Compliance Review
<!-- 合规性审查 -->
- 所有 Pull Request 必须验证宪法合规性
- 复杂度增加必须有充分理由
- 代码审查必须检查类型安全和性能考虑
- 定期审计确保宪法原则得到遵循

### Versioning Policy
<!-- 版本控制策略 -->
- 主版本号：核心原则变更或架构重构
- 次版本号：新功能添加或非破坏性改进
- 补丁版本号：错误修复和文档更新

**Version**: 1.0.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-28