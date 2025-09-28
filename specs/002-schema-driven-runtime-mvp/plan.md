
# Implementation Plan: Schema-driven Runtime MVP

**Branch**: `002-schema-driven-runtime-mvp` | **Date**: 2025-09-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-schema-driven-runtime-mvp/spec.md`

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
基于现有Schema编译器基础设施，实现端到端的Schema驱动表单系统MVP。核心目标是串起"获取Schema → 生成Zod → 渲染表单 → 提交数据"的完整流程，优先支持text/number/select/checkbox字段类型，提交数据先console.log输出，可选调用submissionRouter.create入库。

## Technical Context
**Language/Version**: TypeScript 5.9.2, React 19.1.1, Next.js 15.4.5
**Primary Dependencies**: Zod 3.24.1, React Hook Form 7.54.2, tRPC 10.45.2, Prisma, shadcn/ui
**Storage**: PostgreSQL (Docker), Prisma ORM
**Testing**: Vitest, Testing Library, Playwright
**Target Platform**: Web browser (Next.js application)
**Project Type**: Full-stack web application with monorepo structure
**Performance Goals**: <100ms表单渲染时间, <50ms验证响应时间, <10ms Schema编译时间
**Constraints**: 类型安全优先，零eval()执行，Schema-First架构
**Scale/Scope**: MVP阶段支持基础字段类型，为后续扩展奠定基础

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Schema-First Architecture: Feature uses Zod Schema as single source of truth
- [x] Type Safety Non-Negotiable: End-to-end TypeScript + Zod validation implemented
- [x] Monorepo First: Code organized in appropriate workspace packages
- [ ] Test-Driven Development: Tests written before implementation (需要补充)
- [x] Performance by Design: Performance targets defined (<100ms form render, <200ms API)
- [x] Zero Trust Data Processing: All input validated through Zod schemas
- [x] Design-Time/Runtime Separation: Clear separation between design and runtime components

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
apps/web/                          # Next.js application
├── app/                           # App Router pages
│   ├── demo/                      # Demo pages
│   ├── api/                       # API routes (tRPC + REST)
│   └── examples/                  # Example forms
├── components/                    # App-specific components
│   ├── forms/                     # Dynamic form components
│   └── providers/                 # Context providers
└── examples/forms/                # Form metadata examples
    ├── contact-form.ts
    ├── user-registration.ts
    └── json/                      # JSON configurations

packages/                          # Monorepo packages
├── ui/                           # shadcn/ui component library
├── database/                     # Prisma client and utilities
├── schema-compiler/              # Core schema compilation engine
├── typescript-config/            # Shared TypeScript config
└── eslint-config/                # Shared ESLint config

prisma/                          # Database schema
├── schema.prisma
└── migrations/

tests/                           # Test suites
├── contract/                    # Contract tests
├── integration/                 # Integration tests
└── unit/                        # Unit tests
```

**Structure Decision**: 采用现有的monorepo结构，利用已实现的@workspace/schema-compiler包，在apps/web中实现动态表单渲染和提交功能

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
- 基于Phase 1设计文档（contracts, data-model.md, quickstart.md）生成任务
- 从research.md中识别的技术债务创建改进任务
- 优先解决测试覆盖不足的问题（满足宪法TDD要求）
- 完善错误处理和用户体验优化任务
- 性能监控和验证任务

**Ordering Strategy**:
- 质量优先：先补充测试，确保代码质量
- 稳定第一：完善错误处理，提升系统稳定性
- 依赖顺序：基础设施 → 核心功能 → 优化改进
- 并行执行：标记[P]的任务可并行开发

**关键任务类别**:
1. **测试补充任务** [高优先级] - 满足宪法TDD要求
2. **错误处理完善** [高优先级] - 提升用户体验
3. **性能验证** [中优先级] - 确保NFR达标
4. **类型安全改进** [中优先级] - 增强类型安全
5. **文档完善** [低优先级] - 提升可维护性

**Estimated Output**: 20-25个编号的、有序的任务在tasks.md中

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
| Test-Driven Development | 当前实现缺少测试用例，违反宪法TDD要求 | 快速原型验证已被现有实现覆盖，现在需要补充测试以确保质量 |
| 性能监控缺失 | 需要验证NFR性能目标是否达成 | 手动测试效率低，需要自动化监控确保性能达标 |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 已完成research.md
- [x] Phase 1: Design complete (/plan command) - 已完成所有设计文档和合同
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - 主要原则已满足
- [x] Post-Design Constitution Check: PASS - 设计完成，宪法合规性确认
- [x] All NEEDS CLARIFICATION resolved - 通过研究分析已解决
- [x] Complexity deviations documented - 已记录测试覆盖和性能监控需求

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
