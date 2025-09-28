# 任务：tRPC 基础设施

**输入**: 来自 `/specs/001-trpc/` 的设计文档
**前置条件**: plan.md（必需）、research.md、data-model.md、contracts/

## 执行流程 (主要步骤)
```
1. 从功能目录加载 plan.md
   → 如果未找到：错误 "未找到实施计划"
   → 提取：技术栈、库、结构
2. 加载可选的设计文档：
   → data-model.md: 提取实体 → 模型任务
   → contracts/: 每个文件 → 合约测试任务
   → research.md: 提取决策 → 设置任务
3. 按类别生成任务：
   → 设置：项目初始化、依赖、代码检查
   → 测试：合约测试、集成测试
   → 核心：模型、服务、CLI 命令
   → 集成：数据库、中间件、日志
   → 完善：单元测试、性能、文档
4. 应用任务规则：
   → 不同文件 = 标记 [P] 以并行执行
   → 相同文件 = 顺序执行（无 [P]）
   → 测试先于实现（TDD）
5. 按顺序编号任务（T001、T002...）
6. 生成依赖关系图
7. 创建并行执行示例
8. 验证任务完整性：
   → 所有合约都有测试？
   → 所有实体都有模型？
   → 所有端点都已实现？
9. 返回：成功（任务准备执行）
```

## 格式：`[ID] [P?] 描述`
- **[P]**：可以并行执行（不同文件，无依赖）
- 在描述中包含确切的文件路径

## 路径约定
- **Monorepo**: `packages/`、`apps/web/`，基于 plan.md 结构
- tRPC 服务端: `apps/web/server/trpc/`
- tRPC 客户端: `apps/web/trpc/`
- 测试：在仓库根目录的 `tests/`

## Phase 3.1: 设置
- [ ] T001 为 tRPC 基础设施创建 packages/api 目录结构
- [ ] T002 初始化 tRPC 依赖 (@trpc/server, @trpc/client, @trpc/react-query, superjson)
- [ ] T003 [P] 在 packages/typescript-config/ 中配置 tRPC 的 TypeScript 设置
- [ ] T004 [P] 设置 tRPC 测试依赖 (@trpc/tests, vitest)

## Phase 3.2: 测试优先 (TDD) ⚠️ 必须在 3.3 之前完成
**关键：这些测试必须编写并且必须失败，然后再进行任何实现**
- [ ] T005 [P] form-router 合约测试，位于 tests/contract/test-form-router.ts（使用现有）
- [ ] T006 [P] auth-router 合约测试，位于 tests/contract/test-auth-router.ts
- [ ] T007 [P] submission-router 合约测试，位于 tests/contract/test-submission-router.ts
- [ ] T008 [P] tRPC 上下文创建集成测试，位于 tests/integration/test-trpc-context.ts
- [ ] T009 [P] 认证流程集成测试，位于 tests/integration/test-auth-flow.ts
- [ ] T010 [P] tRPC 集成的模式编译测试，位于 tests/unit/test-schema-compiler.ts

## Phase 3.3: 核心实现（仅在测试失败后进行）
### 数据库模型
- [ ] T011 [P] 扩展 Prisma schema 的 User 模型，位于 prisma/schema.prisma
- [ ] T012 [P] 扩展 Prisma schema 的认证字段，位于 prisma/schema.prisma
- [ ] T013 创建 User 模型的数据库迁移

### tRPC 基础设施
- [ ] T014 创建 tRPC 实例配置，位于 apps/web/server/trpc/trpc.ts
- [ ] T015 创建带数据库连接的 tRPC 上下文，位于 apps/web/server/trpc/context.ts
- [ ] T016 创建主路由聚合器，位于 apps/web/server/trpc/routers/index.ts

### 路由器实现
- [ ] T017 [P] 实现 form-router，位于 apps/web/server/trpc/routers/form.ts
- [ ] T018 [P] 实现 auth-router，位于 apps/web/server/trpc/routers/auth.ts
- [ ] T019 [P] 实现 submission-router，位于 apps/web/server/trpc/routers/submission.ts

### 客户端集成
- [ ] T020 创建 tRPC React Provider，位于 apps/web/trpc/provider.tsx
- [ ] T021 [P] 创建 tRPC 客户端配置，位于 apps/web/trpc/client.ts
- [ ] T022 将 tRPC 与 Next.js API 路由集成，位于 apps/web/app/api/trpc/[trpc]/route.ts

## Phase 3.4: 集成
- [ ] T023 将 tRPC 路由器连接到 Prisma 数据库模型
- [ ] T024 在 tRPC 上下文中实现认证中间件
- [ ] T025 为 tRPC 程序添加错误处理和日志记录
- [ ] T026 为复杂数据类型配置 superjson 序列化
- [ ] T027 为客户端缓存设置 React Query 集成

## Phase 3.5: 完善
- [ ] T028 [P] tRPC 程序的单元测试，位于 tests/unit/test-trpc-procedures.ts
- [ ] T029 tRPC 端点的性能测试（响应时间 <200ms）
- [ ] T030 [P] 用实际实现详情更新 quickstart.md
- [ ] T031 [P] 更新代理特定的开发指南
- [ ] T032 运行完整测试套件并验证 quickstart 场景
- [ ] T033 清理和优化任何重复代码

## 依赖关系
- 测试（T005-T010）先于实现（T011-T022）
- T011、T012 阻塞 T013（数据库迁移）
- T014、T015 阻塞 T016-T019（tRPC 基础设施）
- T017-T019 阻塞 T023（路由器集成）
- 实现先于完善（T028-T033）

## 并行执行示例
```
# 一起启动合约测试（T005-T007）：
任务：form-router 合约测试，位于 tests/contract/test-form-router.ts
任务：auth-router 合约测试，位于 tests/contract/test-auth-router.ts
任务：submission-router 合约测试，位于 tests/contract/test-submission-router.ts

# 一起启动集成测试（T008-T010）：
任务：tRPC 上下文创建集成测试，位于 tests/integration/test-trpc-context.ts
任务：认证流程集成测试，位于 tests/integration/test-auth-flow.ts
任务：tRPC 集成的模式编译测试，位于 tests/unit/test-schema-compiler.ts

# 一起启动模型任务（T011-T012）：
任务：扩展 Prisma schema 的 User 模型，位于 prisma/schema.prisma
任务：扩展 Prisma schema 的认证字段，位于 prisma/schema.prisma

# 一起启动路由器实现（T017-T019）：
任务：实现 form-router，位于 apps/web/server/trpc/routers/form.ts
任务：实现 auth-router，位于 apps/web/server/trpc/routers/auth.ts
任务：实现 submission-router，位于 apps/web/server/trpc/routers/submission.ts
```

## 说明
- [P] 任务 = 不同文件，无依赖
- 在实现之前验证测试失败（TDD 原则）
- 每个任务后提交以保持干净的 git 历史
- 任务特定于 FastBuild monorepo 结构和 tRPC 集成
- 遵循宪法原则：类型安全、模式优先、测试驱动开发

## 任务生成规则
*在 main() 执行期间应用*

1. **来自合约**：
   - 每个合约文件（form-router.ts、auth-router.ts、submission-router.ts）→ 合约测试任务 [P]
   - 每个路由器 → 实现任务 [P]

2. **来自数据模型**：
   - 每个实体（User、Form、Submission）→ 模型创建任务 [P]
   - 关系 → 服务层任务

3. **来自用户故事**：
   - 每个故事 → 集成测试 [P]
   - Quickstart 场景 → 验证任务

4. **排序**：
   - 设置 → 测试 → 模型 → 基础设施 → 路由器 → 完善
   - 依赖关系阻塞并行执行

## 验证清单
*在返回之前由 main() 检查*

- [x] 所有合约都有对应测试
- [x] 所有实体都有模型任务
- [x] 所有测试都先于实现
- [x] 并行任务真正独立
- [x] 每个任务指定确切文件路径
- [x] 没有任务修改与另一个 [P] 任务相同的文件
- [x] 遵循 TDD 方法（测试先于实现）
- [x] 符合宪法原则
- [x] 包含性能和完善任务

## 宪法合规性
- **模式优先架构**：所有任务使用来自合约的 Zod 模式
- **类型安全非协商**：端到端 TypeScript 集成
- **Monorepo 优先**：任务按工作空间包组织
- **测试驱动开发**：实现前的合约测试
- **性能导向设计**：包含性能目标和优化任务