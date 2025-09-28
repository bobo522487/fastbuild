
# Implementation Plan: tRPC 基础设施

**Branch**: `001-trpc` | **Date**: 2025-09-28 | **Spec**: `/specs/001-trpc/spec.md`
**Input**: Feature specification from `/specs/001-trpc/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
建立 FastBuild 平台的 tRPC 基础设施，提供端到端类型安全的 API 层。基于架构文档指导，实现表单管理和提交的完整 API 体系，确保从前端到数据库的类型一致性。

## Technical Context
**Language/Version**: TypeScript 5.7+
**Primary Dependencies**: tRPC, Zod, Prisma, Next.js 15, React Hook Form
**Storage**: PostgreSQL (via Prisma)
**Testing**: Jest + React Testing Library + tRPC testing utils
**Target Platform**: Node.js server (Next.js API routes) + Web browser
**Project Type**: Full-stack web application (monorepo)
**Performance Goals**: API response <200ms, Schema compilation <10ms
**Constraints**: Must follow Constitution principles, Type Safety Non-Negotiable
**Scale/Scope**: Initial MVP supporting forms and submissions, extensible architecture

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Schema-First Architecture: Feature uses Zod Schema as single source of truth
- [ ] Type Safety Non-Negotiable: End-to-end TypeScript + Zod validation implemented
- [ ] Monorepo First: Code organized in appropriate workspace packages
- [ ] Test-Driven Development: Tests written before implementation
- [ ] Performance by Design: Performance targets defined (<100ms form render, <200ms API)
- [ ] Zero Trust Data Processing: All input validated through Zod schemas
- [ ] Design-Time/Runtime Separation: Clear separation between design and runtime components

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
apps/web/
├── server/
│   ├── trpc/
│   │   ├── trpc.ts          # tRPC 实例配置
│   │   ├── routers/
│   │   │   ├── index.ts      # 路由聚合器
│   │   │   ├── form.ts       # 表单管理路由
│   │   │   ├── submission.ts # 提交管理路由
│   │   │   └── auth.ts       # 认证路由
│   │   └── context.ts       # tRPC 上下文
│   └── index.ts              # 服务端入口
├── trpc/
│   └── provider.tsx          # React tRPC Provider
└── components/
    └── forms/                # 表单相关组件

packages/
├── typescript-config/        # TypeScript 配置文件
│   ├── base.json            # 基础配置
│   ├── nextjs.json          # Next.js 配置
│   ├── react-library.json   # React 库配置
│   └── package.json         # 包配置
├── database/                # Prisma 客户端
└── schema-compiler/         # Schema 编译器

tests/
├── contract/                # 契约测试
├── integration/             # 集成测试
└── unit/                    # 单元测试
```

**Structure Decision**: 使用现有的 pnpm workspace monorepo 结构，在 apps/web/server/ 下添加 tRPC 服务端代码，在 apps/web/trpc/ 下添加客户端配置，遵循项目的 Schema-First 架构原则。

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---

## Phase 2: Implementation Approach

### 实施策略概述

基于宪法驱动的开发原则，我们将采用以下实施方法：

#### 1. **宪法合规实施路径**
- **Schema-First 架构**: 所有实现基于已定义的 Zod 合约
- **类型安全非协商**: 端到端 TypeScript 集成，无 any 类型
- **测试驱动开发**: 合约测试先行，确保实现符合预期
- **性能导向设计**: 从第一天开始考虑缓存和优化

#### 2. **分层实施方法**
```
Layer 1: 基础设施层 (tRPC + Prisma 集成)
Layer 2: 路由器层 (Form, Submission, Auth 路由器实现)
Layer 3: 业务逻辑层 (表单编译器、验证器)
Layer 4: 表现层 (React 组件集成)
```

#### 3. **增量开发策略**
- **垂直切片**: 每个功能完整实现从数据库到 UI
- **合约测试**: 每个 API 端点都有对应的合约测试
- **持续集成**: 每次提交都通过完整的测试套件

### 具体实施步骤

#### 步骤 1: 基础设施搭建
1. **tRPC 配置**
   - 创建 tRPC 实例和上下文
   - 配置 superjson 序列化
   - 设置错误处理格式

2. **数据库集成**
   - 扩展 Prisma schema 以支持用户认证
   - 创建数据库迁移
   - 配置连接池和事务管理

3. **项目结构**
   - 创建 `packages/api` 包结构
   - 设置路由器模块化架构
   - 配置构建和测试脚本

#### 步骤 2: 核心路由器实现
1. **表单路由器** (优先级: 高)
   - 实现 CRUD 操作
   - 集成表单编译器
   - 添加分页和搜索功能

2. **提交路由器** (优先级: 高)
   - 实现表单提交处理
   - 添加数据验证
   - 实现统计功能

3. **认证路由器** (优先级: 中)
   - 实现 JWT 认证
   - 添加用户管理
   - 配置权限中间件

#### 步骤 3: 前端集成
1. **tRPC 客户端设置**
   - 配置 React Query 集成
   - 设置类型安全的客户端
   - 实现错误处理

2. **组件重构**
   - 将现有 REST API 调用迁移到 tRPC
   - 更新表单组件以使用新的 API
   - 保持 UI 组件的兼容性

#### 步骤 4: 性能优化
1. **缓存策略**
   - 实现 Redis 缓存层
   - 配置查询缓存
   - 添加缓存失效机制

2. **数据库优化**
   - 添加必要的索引
   - 优化查询性能
   - 实现连接池管理

### 质量保证措施

#### 1. **测试策略**
- **单元测试**: 覆盖所有核心业务逻辑
- **集成测试**: 验证 API 端点行为
- **合约测试**: 确保符合 Zod schema 定义
- **E2E 测试**: 验证完整用户流程

#### 2. **代码质量**
- **TypeScript 严格模式**: 启用所有严格检查
- **ESLint 规则**: 自定义规则确保代码一致性
- **代码审查**: 所有变更需要审查
- **性能分析**: 定期性能测试和优化

#### 3. **安全考虑**
- **输入验证**: 所有输入通过 Zod 验证
- **认证授权**: JWT 令牌验证和角色检查
- **SQL 注入防护**: 使用 Prisma 参数化查询
- **XSS 防护**: React 自动转义输出

### 风险缓解

#### 技术风险
- **复杂性风险**: 通过模块化设计和增量开发控制
- **性能风险**: 通过早期性能测试和优化缓解
- **兼容性风险**: 通过合约测试确保向后兼容

#### 项目风险
- **时间风险**: 通过优先级排序和 MVP 方法管理
- **资源风险**: 通过自动化测试和部署减少人力需求
- **知识风险**: 通过详细文档和代码注释降低

### 成功标准

#### 功能标准
- [ ] 所有合约测试通过
- [ ] 完整的 CRUD 操作实现
- [ ] 认证和授权系统工作
- [ ] 前端完全集成

#### 性能标准
- [ ] API 响应时间 < 100ms
- [ ] 并发用户支持 > 1000
- [ ] 数据库查询优化完成
- [ ] 缓存命中率 > 80%

#### 质量标准
- [ ] 代码覆盖率 > 90%
- [ ] TypeScript 严格模式无错误
- [ ] 所有安全检查通过
- [ ] 文档完整且更新

### 下一步行动

Phase 2 完成后，将执行 `/tasks` 命令生成具体的任务列表，包括：
- 详细的任务分解
- 依赖关系图
- 时间估算
- 责任分配

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
