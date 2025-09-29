# CLAUDE.md

**用中文回答！**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastBuild is a type-driven, high-performance, scalable low-code form platform built on Next.js. The core principle is **Schema as Single Source of Truth**, enabling end-to-end type safety with clear separation between design-time and runtime.

## Development Commands

### Root Level Commands
```bash
# Development
pnpm dev              # Start all development servers
pnpm build            # Build all packages and apps
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier

# Database Operations
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes to database
pnpm db:migrate       # Create database migration
pnpm db:studio        # Open Prisma Studio

# Docker Operations
docker compose up -d  # Start PostgreSQL database
docker compose down    # Stop database
docker compose logs -f # View database logs
```

### App-Specific Commands (apps/web)
```bash
cd apps/web
pnpm dev              # Start Next.js dev server with Turbopack
pnpm build            # Build Next.js application
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # Run TypeScript type checking
```

### Shadcn/UI Component Management
```bash
# Add new components to the UI library
pnpm dlx shadcn@latest add button -c apps/web

# Components are stored in packages/ui/src/components/
# Import from: @workspace/ui/components/button
```

## Architecture Overview

### Core Design Principle
The platform uses **Zod Schema as the single source of truth**. Form metadata is dynamically converted to executable Zod schemas, enabling type-safe form generation and validation without eval() or unsafe code execution.

### Monorepo Structure
```
fastbuild/
├── apps/web/                 # Next.js application
│   ├── app/                  # App Router pages
│   │   ├── page.tsx          # 工作台（首页仪表板）
│   │   ├── builder/          # 表单构建器
│   │   ├── forms/            # 表单管理
│   │   │   ├── page.tsx      # 表单列表
│   │   │   └── [id]/         # 表单详情和提交数据
│   │   ├── demo/             # 功能演示
│   │   ├── admin/monitoring/ # 系统监控
│   │   └── api/              # API routes (REST)
│   ├── components/           # App-specific components
│   │   ├── layout/           # 简化布局组件
│   │   └── forms/            # 表单组件
│   └── lib/                  # 工具库
├── packages/
│   ├── ui/                   # Shared shadcn/ui components
│   ├── database/             # Prisma client and utilities
│   ├── schema-compiler/      # Core form metadata → Zod conversion
│   ├── typescript-config/    # Shared TypeScript config
│   └── eslint-config/        # Shared ESLint config
├── prisma/                   # Database schema
└── docker-compose.yml        # PostgreSQL container
```

### Key Packages

#### `@workspace/ui`
- shadcn/ui component library with Tailwind CSS v4
- Exports components, styles, and utilities
- Configuration in `packages/ui/components.json`

#### `@workspace/database`
- Prisma client singleton instance
- Database utilities and connection management
- Type-safe database access

#### `@workspace/schema-compiler`
- Core engine: converts FormMetadata → Zod Schema
- Safe schema construction without eval()
- Supports field types: text, number, select, date, checkbox, textarea

### Data Flow

1. **Design Time**: Form designer creates FormMetadata (JSON)
2. **Compilation**: Schema compiler converts metadata → Zod Schema
3. **Runtime**: Dynamic form renderer uses schema + React Hook Form
4. **Persistence**: Forms stored in `Form` table, submissions in `Submission` table

### Database Schema

```prisma
model Form {
  id        String   @id @default(cuid())
  name      String
  metadata  Json     // FormMetadata structure
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  submissions Submission[]
}

model Submission {
  id        String   @id @default(cuid())
  formId    String
  data      Json     // Submitted form data
  createdAt DateTime @default(now())
  form      Form     @relation(fields: [formId], references: [id])
}
```

## Key Technical Dependencies

### Form Stack
- **Zod**: Schema validation and type definition
- **React Hook Form**: High-performance form state management
- **@hookform/resolvers**: Zod integration
- **dnd-kit**: Drag-and-drop form designer
- **@tanstack/react-query**: Server state management

### UI Stack
- **Next.js 15**: Full-stack framework with App Router
- **shadcn/ui**: Customizable component library
- **Tailwind CSS v4**: Modern styling with CSS variables
- **lucide-react**: Icon library

### Data Stack
- **PostgreSQL**: Primary database
- **Prisma**: Type-safe ORM
- **Docker**: Containerized development database

## Development Environment Setup

### Prerequisites
- Node.js >= 20
- pnpm package manager
- Docker and Docker Compose

### Initial Setup
```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d

# Run database migration
pnpm db:push

# Generate Prisma client
pnpm db:generate

# Start development server
pnpm dev
```

### Database Configuration
- PostgreSQL runs in Docker container
- Connection string in `.env`: `postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild`
- Database automatically created on first run

## Working with Forms

### FormMetadata Structure
```typescript
interface FormField {
  id: string;                    // Unique field ID
  name: string;                  // Form field name (Zod key)
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[]; // For select type
  condition?: {                  // Conditional logic
    fieldId: string;
    operator: 'equals' | 'not_equals';
    value: any;
  };
  defaultValue?: any;
}

interface FormMetadata {
  version: string;
  fields: FormField[];
}
```

### Schema Compilation
The `@workspace/schema-compiler` package safely converts FormMetadata to executable Zod schemas:
- Maps field types to appropriate Zod types
- Handles required/optional validation
- Supports default values
- No eval() or dynamic code execution

### API Routes
Current REST API endpoints:
- `GET/POST /api/forms` - Form CRUD operations
- `GET/PUT/DELETE /api/forms/[id]` - Individual form management
- `GET/POST /api/forms/[id]/submissions` - Form submissions

### Frontend Pages
**Core Application Pages**:
- `/` - 工作台（首页仪表板）：显示用户表单统计、快速操作、最近活动
- `/builder` - 表单构建器：可视化表单创建和设计界面
- `/forms` - 表单管理：表单列表、搜索、筛选、统计概览
- `/forms/[id]` - 表单详情：字段配置、预览、设置
- `/forms/[id]/submissions` - 表单提交数据：数据查看、分析、导出

**Supporting Pages**:
- `/demo` - 功能演示：展示表单渲染和验证功能
- `/admin/monitoring` - 系统监控：性能监控、错误追踪、系统状态

**Navigation Structure**:
- 核心功能：工作台、表单管理、表单构建器
- 演示与监控：功能演示、系统监控

## Code Patterns

### Import Patterns
```typescript
// UI Components
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

// Database
import { prisma } from "@workspace/database"

// Schema Compilation
import { buildZodSchema } from "@workspace/schema-compiler"
```

### Component Structure
- Container components handle business logic and state
- Presentation components handle UI rendering
- Form components use React Hook Form + Zod validation
- shadcn/ui components for consistent styling

### Type Safety
- All form data validated through Zod schemas
- Database access type-safe via Prisma
- Component props strongly typed
- API request/response validation

## Current Implementation Status

✅ **Completed**:
- Monorepo structure with pnpm workspace
- shadcn/ui component library setup
- Prisma database configuration with PostgreSQL
- Schema compiler package
- Basic REST API routes
- Docker containerization
- Frontend page structure reorganization
- Unified navigation system
- User dashboard (工作台)
- Form management pages
- Form builder landing page
- Form detail and submission views

🔄 **In Progress**:
- Visual form builder implementation
- Dynamic form renderer optimization
- Advanced field types and validation
- Conditional field logic
- Real-time form preview
- Data analytics and export features

📋 **Next Steps**:
- Complete drag-and-drop form designer
- Implement form template system
- Add comprehensive validation rules
- Real-time collaboration features
- Advanced analytics and reporting
- Form versioning and history tracking