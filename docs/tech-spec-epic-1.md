# Epic 1 技术规范：基础平台与项目初始化

**版本**: 1.0
**日期**: 2025-10-10
**作者**: BMAD 架构师
**状态**: 初稿

## 概述

### Epic 范围

Epic 1 "基础平台与项目初始化" 是 FastBuild 低代码开发平台的基础实施阶段，旨在建立完整的 Next.js 15 全栈应用基础设施。本 Epic 涵盖了从零开始构建一个可扩展、类型安全的单体架构应用所需的所有核心组件和技术栈集成。

### 核心目标

- ✅ **现代化技术栈**: 建立 Next.js 15.5.4 + React 19.2.0 + TypeScript 5.9.3 的现代化前端基础
- ✅ **REST API 架构**: 构建完整的 RESTful API 体系，配合 Swagger/OpenAPI 3.0 文档
- ✅ **数据库集成**: 实现 PostgreSQL + Prisma ORM 6.17.0 的数据持久化层
- ✅ **认证系统**: 集成 NextAuth.js 5.0.0-beta.25 多平台认证
- ✅ **企业级 UI**: 基于 shadcn/ui + Radix UI 的专业组件库
- ✅ **开发体验**: 配置 Biome 1.9.4 代码质量工具和 Turbo 构建优化

### 成功标准

- 所有开发环境能够一键启动并正常运行
- API 端点响应时间 < 500ms，数据库连接稳定
- 代码质量检查通过率 100%，TypeScript 编译零错误
- 用户能够通过 Google、GitHub 和邮箱密码三种方式注册登录
- 系统架构支持后续 Epic 的无缝扩展

## 架构对齐

### 整体架构一致性

Epic 1 严格遵循解决方案架构中定义的分层架构模式：

```
┌─────────────────────────────────────────────────────────┐
│                   用户界面层                              │
│  登录页面 → 项目管理 → 用户设置 → 开发者仪表板              │
├─────────────────────────────────────────────────────────┤
│                   API 层                                 │
│  REST API → 认证中间件 → 请求验证 → 业务逻辑                   │
├─────────────────────────────────────────────────────────┤
│                 API 文档层                                │
│  Swagger/OpenAPI → 交互式文档 → 客户端类型生成              │
├─────────────────────────────────────────────────────────┤
│                  核心引擎层                                │
│  用户管理 → 项目管理 → 权限控制 → 会话管理                   │
├─────────────────────────────────────────────────────────┤
│                 数据持久层                                │
│  PostgreSQL → 用户数据 → 项目数据 → 会话数据                 │
└─────────────────────────────────────────────────────────┘
```

### 技术栈实现

架构中定义的技术栈在 Epic 1 中的实现状态：

| 技术组件 | 架构要求 | Epic 1 实现状态 | 版本 |
|---------|----------|----------------|------|
| Next.js | 全栈框架 | ✅ App Router + API Routes | 15.5.4 |
| React | 前端框架 | ✅ Server Components | 19.2.0 |
| TypeScript | 类型系统 | ✅ 严格模式配置 | 5.9.3 |
| REST API | API 架构 | ✅ Next.js API Routes | - |
| Swagger | API 文档 | ✅ 自动生成 | 3.0.0 |
| PostgreSQL | 数据库 | ✅ Docker 容器化 | 16+ |
| Prisma | ORM | ✅ 类型安全查询 | 6.17.0 |
| NextAuth | 认证 | ✅ 多平台认证 | 5.0.0-beta.25 |
| shadcn/ui | UI 组件 | ✅ 完整组件库 | Latest |
| Tailwind | 样式 | ✅ 响应式设计 | 4.1.14 |
| Biome | 代码质量 | ✅ 格式化 + Linting | 1.9.4 |

### 数据库架构一致性

Epic 1 实现的数据库模型严格遵循解决方案架构中的核心实体设计：

#### 核心实体关系
```mermaid
erDiagram
    User ||--o{ Project : creates
    User ||--o{ Account : has
    User ||--o{ Session : maintains
    Project ||--o{ ProjectMember : includes
    User ||--o{ ProjectMember : participates

    User {
        string id PK
        string name
        string email UK
        string password
        datetime emailVerified
        string image
        datetime createdAt
        datetime updatedAt
    }

    Project {
        string id PK
        string name
        string slug UK
        string description
        string visibility
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string type
        string provider
        string providerAccountId
        string refresh_token
        string access_token
        datetime expires_at
        datetime token_type
        string scope
        string id_token
        string session_state
    }
```

## 详细设计

### 系统架构设计

#### 整体架构模式

Epic 1 采用**分层单体架构**，兼顾开发效率和维护便利性：

**架构原则**:
- **单一职责**: 每个层次专注特定功能
- **依赖倒置**: 上层依赖抽象，不依赖具体实现
- **开闭原则**: 对扩展开放，对修改封闭
- **接口隔离**: 客户端不应依赖不需要的接口

**分层设计**:
1. **表现层 (Presentation Layer)**
   - React Server Components 页面渲染
   - shadcn/ui 组件库集成
   - 响应式设计实现

2. **应用层 (Application Layer)**
   - Next.js API Routes 路由处理
   - 请求验证和响应格式化
   - 业务流程编排

3. **领域层 (Domain Layer)**
   - 核心业务逻辑实现
   - 数据模型和业务规则
   - 领域服务定义

4. **基础设施层 (Infrastructure Layer)**
   - 数据库访问和持久化
   - 外部服务集成
   - 技术横切关注点

#### 模块化设计

**目录结构设计原则**:
- **按功能模块组织**: 而非按技术层次组织
- **减少模块间耦合**: 通过清晰的接口定义
- **提高代码复用性**: 通用组件和服务抽离

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 认证相关路由组
│   │   ├── login/               # 登录页面
│   │   └── register/            # 注册页面
│   ├── dashboard/               # 用户仪表板
│   ├── projects/                # 项目管理
│   ├── api/                     # API 路由
│   │   ├── auth/               # 认证 API
│   │   ├── projects/           # 项目 API
│   │   └── users/              # 用户 API
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 首页
├── components/                  # React 组件
│   ├── ui/                     # 基础 UI 组件
│   ├── forms/                  # 表单组件
│   ├── layout/                 # 布局组件
│   └── features/               # 功能组件
├── lib/                        # 工具库
│   ├── auth.ts                 # 认证配置
│   ├── db.ts                   # 数据库连接
│   ├── utils.ts                # 工具函数
│   ├── validations.ts          # 数据验证
│   └── types.ts                # 类型定义
├── server/                     # 服务端代码
│   ├── auth/                   # 认证逻辑
│   ├── services/               # 业务服务
│   ├── repositories/           # 数据访问
│   └── middleware/             # 中间件
└── prisma/                     # 数据库配置
    ├── schema.prisma           # 数据模型
    ├── migrations/             # 数据库迁移
    └── seed.ts                 # 种子数据
```

### 核心组件设计

#### 认证系统

**设计原则**:
- **安全性优先**: 使用行业最佳安全实践
- **用户体验优化**: 简化认证流程，支持多种方式
- **可扩展性**: 易于添加新的认证提供商

**技术实现**:

```typescript
// lib/auth.ts - 认证配置核心
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 自定义认证逻辑
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // JWT 令牌定制
    },
    session: async ({ session, token }) => {
      // 会话数据定制
    }
  }
}
```

#### 数据库设计

**设计原则**:
- **类型安全**: 通过 Prisma 实现编译时类型检查
- **性能优化**: 合理的索引设计和查询优化
- **数据一致性**: 适当的外键约束和事务处理

**核心数据模型**:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // 用于邮箱密码认证
  accounts      Account[]
  sessions      Session[]
  projects      Project[] // 用户创建的项目
  memberships   ProjectMember[] // 用户参与的项目

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Project {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  visibility  String    @default("PRIVATE")
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members     ProjectMember[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String   @default("VIEWER")
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, userId])
}
```

#### API 设计

**设计原则**:
- **RESTful 规范**: 严格遵循 REST 架构风格
- **统一响应格式**: 标准化的成功和错误响应
- **类型安全**: 自动生成 TypeScript 类型定义
- **文档驱动**: Swagger/OpenAPI 自动文档生成

**API 架构设计**:

```typescript
// lib/api-response.ts - 统一响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any[]
  }
  meta: {
    timestamp: string
    requestId: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

**认证 API 实现**:

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { ApiResponse } from '@/lib/api-response'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // 检查用户是否已存在
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        } as ApiResponse,
        { status: 409 }
      )
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as ApiResponse,
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        } as ApiResponse,
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as ApiResponse,
      { status: 500 }
    )
  }
}
```

**项目 API 实现**:

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ApiResponse, PaginatedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        } as ApiResponse,
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const projects = await db.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: { userId: user.id }
            }
          }
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.project.count({
      where: {
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: { userId: user.id }
            }
          }
        ]
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as PaginatedResponse<typeof projects>,
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch projects'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as ApiResponse,
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        } as ApiResponse,
        { status: 401 }
      )
    }

    const body = await request.json()
    const createProjectSchema = z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(100),
      description: z.string().optional(),
      visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
    })

    const validatedData = createProjectSchema.parse(body)

    const project = await db.project.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        visibility: validatedData.visibility,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: project,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as ApiResponse,
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        } as ApiResponse,
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      } as ApiResponse,
      { status: 500 }
    )
  }
}
```

## 前端组件架构

### 核心组件结构
```
src/components/
├── auth/
│   ├── login-form.tsx
│   ├── register-form.tsx
│   └── auth-guard.tsx
├── project/
│   ├── project-list.tsx
│   ├── project-card.tsx
│   ├── project-form.tsx
│   └── project-settings.tsx
├── layout/
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    └── modal.tsx
```

### 认证组件
```typescript
// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/dashboard");
      } else {
        // 处理错误
        console.error("登录失败");
      }
    } catch (error) {
      console.error("登录错误:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>使用您的账户登录FastBuild</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("google")}
          >
            使用Google登录
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn("github")}
          >
            使用GitHub登录
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 项目管理组件
```typescript
// src/components/project/project-list.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedProjectsResponse {
  success: boolean;
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function ProjectList() {
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<PaginatedProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProjects = async (pageNum: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects?page=${pageNum}&limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch projects');
      }

      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: "获取项目失败",
        description: err instanceof Error ? err.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(page);
  }, [page]);

  const createProject = async (projectData: { name: string; slug: string; description?: string }) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create project');
      }

      toast({
        title: "项目创建成功",
        description: `项目 "${projectData.name}" 已创建`,
      });

      // 刷新项目列表
      await fetchProjects(page);
    } catch (err) {
      toast({
        title: "创建项目失败",
        description: err instanceof Error ? err.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!projects) return <div>暂无项目数据</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">我的项目</h1>
        <Button
          onClick={() => {
            // 打开创建项目对话框
            createProject({
              name: "新项目",
              slug: `new-project-${Date.now()}`,
              description: "通过API创建的新项目"
            });
          }}
        >
          创建新项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.data.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {project.description || "暂无描述"}
                  </CardDescription>
                </div>
                <Badge variant={project.visibility === 'PUBLIC' ? 'default' : 'secondary'}>
                  {project.visibility}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {project.members.length} 个成员
                </div>
                <Button variant="outline" size="sm">
                  查看详情
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页控件 */}
      <div className="flex justify-center space-x-2">
        <Button
          variant="outline"
          onClick={() => setPage(page - 1)}
          disabled={!projects.pagination.hasPrev}
        >
          上一页
        </Button>
        <span className="py-2 px-4">
          第 {page} 页，共 {projects.pagination.totalPages} 页
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={!projects.pagination.hasNext}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
```

## 环境配置

### 环境变量配置
```bash
# .env.local
# 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/fastbuild"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth提供者
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# 应用配置
NODE_ENV="development"
```

### NextAuth.js配置
```typescript
// src/server/auth/config.ts
import { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "~/server/db";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 实现密码验证逻辑
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        // 验证密码 (需要实现密码哈希)
        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.password || ""
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
  },
};
```

## 部署配置

### Vercel配置
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "GOOGLE_CLIENT_ID": "@google_client_id",
    "GOOGLE_CLIENT_SECRET": "@google_client_secret",
    "GITHUB_CLIENT_ID": "@github_client_id",
    "GITHUB_CLIENT_SECRET": "@github_client_secret"
  }
}
```

### 数据库迁移脚本
```bash
#!/bin/bash
# scripts/migrate.sh

echo "开始数据库迁移..."

# 生成Prisma客户端
pnpm prisma generate

# 推送数据库schema
pnpm prisma db push

# 运行种子数据 (可选)
pnpm prisma db seed

echo "数据库迁移完成!"
```

## 测试策略

### 单元测试
```typescript
// __tests__/project.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { projectRouter } from "~/server/api/routers/project";
import { createMockContext } from "~/test/utils";

describe("Project Router", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = createMockContext();
  });

  it("should create a project", async () => {
    const input = {
      title: "测试项目",
      description: "这是一个测试项目",
    };

    const result = await projectRouter.createProject({
      input,
      ctx: mockCtx,
    });

    expect(result.title).toBe(input.title);
    expect(result.description).toBe(input.description);
  });

  it("should get user projects", async () => {
    const result = await projectRouter.getProjects({
      input: { page: 1, limit: 10 },
      ctx: mockCtx,
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
```

### 集成测试
```typescript
// __tests__/auth.integration.test.ts
import { describe, it, expect } from "vitest";
import { signIn } from "next-auth/react";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "~/components/auth/login-form";

describe("Authentication Integration", () => {
  it("should sign in with valid credentials", async () => {
    // 测试登录流程
    const result = await signIn("credentials", {
      email: "test@example.com",
      password: "password",
      redirect: false,
    });

    expect(result?.ok).toBe(true);
  });

  it("should render login form", () => {
    render(<LoginForm />);

    expect(screen.getByText("登录")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("邮箱地址")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("密码")).toBeInTheDocument();
  });
});
```

## 性能优化

### 数据库查询优化
```typescript
// 使用include和select优化查询
const optimizedProjectQuery = await ctx.db.project.findMany({
  where: {
    members: {
      some: {
        userId: ctx.session.user.id,
      },
    },
  },
  select: {
    id: true,
    title: true,
    description: true,
    status: true,
    updatedAt: true,
    members: {
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: true,
      },
    },
    _count: {
      select: {
        versions: true,
      },
    },
  },
  orderBy: { updatedAt: 'desc' },
});
```

### 前端性能优化
```typescript
// 使用React.memo和useMemo优化组件渲染
import { memo, useMemo } from "react";

export const ProjectCard = memo(({ project }: { project: Project }) => {
  const formattedDate = useMemo(() => {
    return new Date(project.updatedAt).toLocaleDateString();
  }, [project.updatedAt]);

  return (
    <Card>
      {/* 组件内容 */}
    </Card>
  );
});

ProjectCard.displayName = "ProjectCard";
```

## 监控和日志

### 错误处理
```typescript
// src/lib/error-handler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const handleApiError = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // 记录未知错误
  console.error("Unknown error:", error);

  return {
    error: "内部服务器错误",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
};
```

### 性能监控
```typescript
// src/lib/performance.ts
export const measureApiCall = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    // 记录性能指标
    console.log(`API call ${name} took ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`API call ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};
```

## 安全考虑

### 数据验证
```typescript
// 使用Zod进行严格的数据验证
const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, "项目标题不能为空")
    .max(100, "项目标题不能超过100个字符")
    .regex(/^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/, "项目标题包含无效字符"),
  description: z
    .string()
    .max(500, "项目描述不能超过500个字符")
    .optional(),
});
```

### 权限控制
```typescript
// 实现基于角色的访问控制
export const checkProjectPermission = async (
  userId: string,
  projectId: string,
  requiredRole: ProjectRole
): Promise<boolean> => {
  const membership = await db.projectMember.findFirst({
    where: {
      userId,
      projectId,
    },
  });

  if (!membership) return false;

  const roleHierarchy = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4,
  };

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
};
```

## 发布检查清单

### 发布前检查
- [ ] 所有数据库迁移脚本已测试
- [ ] 环境变量已配置
- [ ] OAuth提供者已注册
- [ ] 单元测试通过率 > 90%
- [ ] 集成测试通过
- [ ] 性能测试满足要求
- [ ] 安全审查完成
- [ ] 文档已更新

### 部署验证
- [ ] 应用成功启动
- [ ] 数据库连接正常
- [ ] 认证流程工作正常
- [ ] 基础CRUD操作正常
- [ ] 页面加载时间 < 2秒
- [ ] API响应时间 < 500ms

---

**文档维护:** 本技术规格文档应在实施过程中持续更新，反映实际的技术决策和实现细节。

**下一步:** 完成本Epic的所有Story实现，并进行全面测试验证。