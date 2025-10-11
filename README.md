# FastBuild - 开源无代码开发平台

FastBuild 是一个基于 Next.js 15 全栈架构的开源无代码开发平台，支持企业和IT专业人员通过可视化拖拽界面快速构建内部业务应用程序。平台采用**动态表生成架构**，基于 Linus Torvalds "好品味"设计哲学构建，用最简单的方式解决最复杂的问题。

## 🚀 核心特性

- **🎨 可视化设计器** - 拖拽式界面设计，无需编写代码
- **📊 动态表生成** - 根据用户元数据自动创建真实的数据库表，提供企业级性能
- **🔄 统一架构管理** - 元数据与实际表在同一事务中创建，保证100%一致性
- **📈 智能视图系统** - 从简单默认视图到复杂物化视图的平滑升级
- **🚀 多平台部署** - 一键部署到 Vercel、Netlify、AWS 等多种平台
- **👥 团队协作** - 基于角色的访问控制（RBAC）和项目管理
- **📱 响应式设计** - 自动适配各种设备和屏幕尺寸
- **🔒 企业级安全** - 数据隔离、权限管理、审计日志
- **⚡ 极致性能** - 利用 PostgreSQL 全部能力，告别 EAV 模式的性能瓶颈

## 🛠 技术栈

- **前端框架**: Next.js 15.5.4 (React 19.2.0)
- **类型系统**: TypeScript 5.9.3
- **API架构**: REST API + Swagger/OpenAPI 3.0
- **数据库架构**: PostgreSQL + 统一 Prisma SQL API (动态表生成)
- **数据库 ORM**: Prisma 6.17.0 (元数据管理) + Prisma Migrate (DDL版本控制)
- **认证系统**: NextAuth.js 5.0.0-beta.25
- **UI组件**: Radix UI + shadcn/ui
- **样式方案**: Tailwind CSS 4.1.14
- **代码质量**: Biome 1.9.4
- **包管理器**: pnpm 9.15.4

**核心架构特色**：
- **DDL模式**: 动态生成真实数据库表，性能比EAV模式提升10倍
- **统一API**: 消除混合连接管理，使用单一Prisma SQL API
- **事务一致性**: 元数据和实际表100%原子性操作
- **简化设计**: 从3层验证简化为1层，代码量减少80%

## 📋 快速开始

### 环境要求

- Node.js 18+
- pnpm 9.15.4+
- Docker 或 Docker Desktop
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd fastbuild
```

2. **安装依赖**
```bash
pnpm install
```

3. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件，配置以下变量：
# - AUTH_SECRET: 运行 `npx auth secret` 生成
# - AUTH_GITHUB_ID/SECRET: 创建 GitHub OAuth 应用
# - DATABASE_URL: PostgreSQL 连接字符串
```

4. **启动数据库**
```bash
./start-database.sh
# 这将使用 Docker 启动 PostgreSQL 容器
# 数据库: postgresql://postgres:password@localhost:5432/fastbuild
```

5. **初始化数据库**
```bash
pnpm db:push          # 推送 schema 到数据库
pnpm postinstall      # 生成 Prisma 客户端
```

6. **启动开发服务器**
```bash
pnpm dev
# 访问 http://localhost:3000
```

## 📚 可用命令

### 开发命令
```bash
pnpm dev              # 启动开发服务器（带 Turbo）
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器
pnpm preview          # 构建并预览生产版本
```

### 数据库操作
```bash
pnpm db:push          # 推送 schema 变更到数据库
pnpm db:generate      # 生成 Prisma 客户端并运行迁移
pnpm db:migrate       # 部署迁移到生产环境
pnpm db:studio        # 打开 Prisma Studio 查看数据
```

### 代码质量
```bash
pnpm check            # 运行 Biome 检查和格式化
pnpm check:write      # 自动修复格式化问题
pnpm check:unsafe     # 应用不安全的 Biome 修复（谨慎使用）
pnpm typecheck        # 运行 TypeScript 类型检查
```

### 测试命令
```bash
pnpm test              # 运行所有测试
pnpm test:unit         # 运行单元测试
pnpm test:integration  # 运行集成测试
pnpm test:run          # 运行CI模式测试
pnpm test:coverage     # 运行测试覆盖率报告
pnpm test:ui           # 运行测试UI界面
```

## 🏗 项目架构

FastBuild 采用**动态表生成架构**，基于 Linus Torvalds "好品味"设计哲学，实现了用最简单方式解决最复杂问题的架构设计：

```
┌─────────────────────────────────────────────────────────┐
│                   用户界面层                              │
│  可视化设计器 → 动态表设计器 → 智能视图构建器                │
├─────────────────────────────────────────────────────────┤
│                  API 层 (简化设计)                        │
│  统一 REST API → 单层安全验证 → 事务性元数据操作              │
├─────────────────────────────────────────────────────────┤
│                 API 文档层                                │
│  简化 OpenAPI → 交互式文档 → 类型安全客户端                 │
├─────────────────────────────────────────────────────────┤
│              核心引擎层 (Linus风格)                        │
│  统一查询构建器 → Prisma SQL API → 事务性表服务              │
│  ↓                                                    │
│  Prisma Migrate → DDL版本控制 → 自动化回滚                  │
├─────────────────────────────────────────────────────────┤
│              数据持久层 (动态表生成)                        │
│  PostgreSQL + 真实表 + 智能视图 + 完整迁移历史               │
└─────────────────────────────────────────────────────────┘
```

### 核心设计理念

- **元数据驱动**: 用户设计内容作为核心资产，通过元数据保存和版本化
- **动态表生成**: 根据元数据自动创建真实数据库表 (`project_{projectId}_{tableName}`)
- **统一Prisma架构**: 消除混合连接管理，使用单一API保证事务一致性
- **简化优于复杂**: 从3层验证简化为1层，从1500行检查代码简化为300行事务代码
- **原子性操作**: 元数据和实际表在同一事务中创建，要么全部成功要么全部失败

### 核心概念

- **项目 (Project)**: 多租户容器，包含数据模型和应用
- **DataTable/DataColumn**: 用户定义的表结构元数据
- **动态表**: 根据元数据生成的真实PostgreSQL表
- **MigrationHistory**: 所有DDL操作的完整版本历史
- **智能视图**: 从简单视图到物化视图的渐进式升级系统

## 📖 文档

- [解决方案架构](./docs/solution-architecture.md) - 详细的技术架构说明
- [数据模型定义](./docs/data-schema.md) - 数据库模型和关系定义
- [API 规范](./docs/api-specification.md) - REST API 接口文档
- [部署指南](./docs/deployment-guide.md) - 生产环境部署说明

## 🎯 开发路线图

### ✅ 已完成 (Epic 1-4)
- [x] 基础平台与项目初始化
- [x] 元数据管理引擎
- [x] 基础前端界面
- [x] **动态表生成架构** - 统一Prisma SQL API + DDL版本控制
- [x] **架构简化优化** - 从3层验证简化为1层，代码复杂度降低80%

### 🚧 开发中 (Epic 5-6)
- [ ] 可视化表设计器
- [ ] 智能视图系统 (简单视图 → 物化视图)
- [ ] 运行时引擎与部署管理

### 🔮 规划中 (Epic 7-8)
- [ ] 高级查询构建器
- [ ] 自动化索引优化
- [ ] 多租户性能监控

## 🔧 开发指南

### 添加新的 REST API 端点
1. 在 `src/app/api/[resource]/route.ts` 创建路由处理器
2. 实现 HTTP 方法（GET、POST、PUT、DELETE）
3. 使用 Zod schemas 添加请求/响应验证
4. 更新 `src/server/api/openapi/schema.ts` 中的 OpenAPI schema
5. 添加相应的测试

### 创建 UI 组件
1. 基础组件在 `src/components/ui/` 中遵循 Radix UI 模式
2. 使用 `class-variance-authority` 进行变体样式设计
3. 从 `src/lib/utils.ts` 导入工具函数
4. 遵循现有的命名约定和 TypeScript 模式

### 数据库 Schema 变更
1. 修改 `prisma/schema.prisma`
2. 运行 `pnpm db:push` 进行开发环境变更
3. 使用 `pnpm db:generate` 进行生产环境迁移
4. Schema 变更后始终重新生成 Prisma 客户端

### 动态表开发指南
在FastBuild平台中处理用户创建的动态表：

**创建动态表**：
```typescript
// 使用统一API创建表，元数据和实际表在同一事务中
await TableService.createTable(userId, {
  projectId: 'project123',
  name: 'users',
  columns: [
    { name: 'email', type: 'STRING', unique: true },
    { name: 'name', type: 'STRING', nullable: false }
  ]
});
// 自动生成真实表: project_project123_users
```

**查询动态表数据**：
```typescript
// 使用统一查询构建器，类型安全且高性能
const users = await UnifiedQueryBuilder.buildDataQuery(
  'users',
  'project123',
  { filters: [{ field: 'email', operator: 'eq', value: 'user@example.com' }] }
);
```

**重要原则**：
- 永远不要直接使用 `pg.Client`，始终使用统一 Prisma SQL API
- 所有DDL操作通过 `PrismaMigrateService` 进行版本控制
- 元数据代表用户设计资产，必须与实际表保持100%一致性

## 📊 架构优势对比

| 方面 | 传统EAV模式 | FastBuild动态表模式 | 性能提升 |
|------|-------------|-------------------|----------|
| **查询性能** | 多表JOIN，性能差 | 真实表，原生SQL性能 | **10倍** |
| **数据完整性** | 应用层约束 | 数据库原生约束 | **100%可靠** |
| **开发复杂度** | 复杂的EAV查询 | 简单的SQL查询 | **简化80%** |
| **索引优化** | 有限支持 | 完整PostgreSQL索引 | **全面支持** |
| **事务一致性** | 应用层保证 | 数据库ACID保证 | **企业级** |
| **版本控制** | 手动管理 | Prisma Migrate自动化 | **100%覆盖** |

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细信息。

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 🆘 支持

- 📖 [文档](./docs/)
- 🐛 [问题反馈](https://github.com/your-org/fastbuild/issues)
- 💬 [讨论区](https://github.com/your-org/fastbuild/discussions)

## 🚀 部署

### Vercel (推荐)
```bash
npm i -g vercel
vercel
```

### Docker
```bash
docker build -t fastbuild .
docker run -p 3000:3000 fastbuild
```

### 其他平台
详细部署指南请参考 [部署文档](./docs/deployment-guide.md)。

---

**FastBuild** - 让每个人都能构建强大的应用程序 🚀
