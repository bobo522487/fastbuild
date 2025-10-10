# FastBuild - 开源无代码开发平台

FastBuild 是一个基于 Next.js 15 全栈架构的开源无代码开发平台，支持企业和IT专业人员通过可视化拖拽界面快速构建内部业务应用程序。

## 🚀 核心特性

- **🎨 可视化设计器** - 拖拽式界面设计，无需编写代码
- **📊 数据模型管理** - 企业级数据库设计，支持关系定义和版本控制
- **🔄 应用版本管理** - 独立的应用和数据模型版本控制系统
- **🚀 多平台部署** - 一键部署到 Vercel、Netlify、AWS 等多种平台
- **👥 团队协作** - 基于角色的访问控制（RBAC）和项目管理
- **📱 响应式设计** - 自动适配各种设备和屏幕尺寸
- **🔒 企业级安全** - 数据隔离、权限管理、审计日志

## 🛠 技术栈

- **前端框架**: Next.js 15.5.4 (React 19.2.0)
- **类型系统**: TypeScript 5.9.3
- **API架构**: REST API + Swagger/OpenAPI 3.0
- **数据库**: PostgreSQL + Prisma ORM 6.17.0
- **认证系统**: NextAuth.js 5.0.0-beta.25
- **UI组件**: Radix UI + shadcn/ui
- **样式方案**: Tailwind CSS 4.1.14
- **代码质量**: Biome 1.9.4
- **包管理器**: pnpm 9.15.4

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

## 🏗 项目架构

FastBuild 采用分层架构设计，实现了数据模型、应用和部署的完全分离：

```
┌─────────────────────────────────────────────────────────┐
│                   用户界面层                              │
│  可视化设计器 → 应用预览 → 部署管理                        │
├─────────────────────────────────────────────────────────┤
│                   API 层                                 │
│  REST API → 认证中间件 → 请求验证 → 业务逻辑                   │
├─────────────────────────────────────────────────────────┤
│                 API 文档层                                │
│  Swagger/OpenAPI → 交互式文档 → 客户端 SDK                  │
├─────────────────────────────────────────────────────────┤
│                  核心引擎层                                │
│  数据模型引擎 → 应用编译器 → 部署管理器                      │
├─────────────────────────────────────────────────────────┤
│                 数据持久层                                │
│  PostgreSQL → 数据模型版本 → 应用版本 → 部署记录              │
└─────────────────────────────────────────────────────────┘
```

### 核心概念

- **项目 (Project)**: 多租户容器，包含数据模型和应用
- **数据模型版本 (DataModelVersion)**: 数据库结构的版本控制
- **应用版本 (AppVersion)**: 应用逻辑的版本控制，依赖特定的数据模型版本
- **部署 (AppDeployment)**: 应用在不同环境中的部署实例

## 📖 文档

- [解决方案架构](./docs/solution-architecture.md) - 详细的技术架构说明
- [数据模型定义](./docs/data-schema.md) - 数据库模型和关系定义
- [API 规范](./docs/api-specification.md) - REST API 接口文档
- [部署指南](./docs/deployment-guide.md) - 生产环境部署说明

## 🎯 开发路线图

### ✅ 已完成 (Epic 1-3)
- [x] 基础平台与项目初始化
- [x] 元数据管理引擎
- [x] 基础前端界面

### 🚧 开发中 (Epic 4-5)
- [ ] 可视化设计器
- [ ] 运行时引擎与部署管理

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
