# **FastBuild 低代码平台技术架构文档**

**版本：1.2**
**最后更新：2025年9月28日**

**目标：** 构建一个**类型驱动、高性能、可扩展**的现代化低代码表单平台。
**核心理念：** **Schema 作为单一事实来源 (Schema as Single Source of Truth)**、端到端类型安全、设计时与运行时分离。

## **一、系统概述**

本平台旨在为业务管理员提供可视化表单设计器，通过拖拽方式快速构建数据录入表单；为最终用户提供自动渲染的交互式表单页面。平台以 Zod Schema 为核心，实现"一次定义，多端使用"的模型驱动架构。

### **核心能力**

🔄 **已实现基础设施**
✅ pnpm workspace monorepo 结构
✅ Next.js 15 + TypeScript + Tailwind CSS
✅ shadcn/ui 组件库集成
✅ Prisma + PostgreSQL 数据库配置
✅ 基础 API 路由实现

📋 **核心功能（待实现）**
🔄 拖拽式表单设计器（设计时）
🔄 动态生成可执行的 Zod Schema
🔄 运行时自动渲染表单 UI
🔄 内置验证、错误提示、提交逻辑
🔄 字段联动、条件显示、动态默认值
🔄 可扩展的字段插件系统

## **二、整体架构图（采用 tRPC 架构）**

```
+------------------+                    +---------------------+
|   管理员 (Designer)   |                    |  最终用户 (End User)     |
+------------------+                    +---------------------+
         |                                         |
         v (设计表单 - 待实现)                      v (填写表单 - 待实现)
+------------------------------------------------------------------+
|                            前端应用 (Next.js 15)                    |
| +------------------------+                                          |
| |  表单设计器页面 (设计时) | 🔄 待实现                               |
| +------------------------+                                          |
| |                                                                 |
| | +------------------------+      +-----------------------------+  |
| | | 表单运行时页面 (运行时)  | 🔄 待实现 | 核心转换层 (Schema Compiler)| 🔄 待实现  |
| | +------------------------+      | (packages/schema-compiler) |  |
| |                                 +-----------------------------+  |
| +------------------------------------------------------------------+
         | ▲                                       | ▲
         | | tRPC 类型安全调用                   | | tRPC 类型安全调用
         V V                                       V V
+------------------------------------------------------------------+
|                     tRPC API 层 (端到端类型安全)                     |
|  - 🔄 tRPC Router (表单管理)                                        |
|  - 🔄 tRPC Router (提交管理)                                        |
|  - 🔄 tRPC Router (用户认证)                                        |
|  - 🔄 tRPC Router (权限管理)                                        |
|  - ✅ 类型自动推导和验证                                           |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                      数据库 (PostgreSQL + Prisma)                 |
|  - ✅ `Form` 表: 存储表单定义元数据 (JSONB)                       |
|  - ✅ `Submission` 表: 存储用户提交的数据 (JSONB)                 |
|  - ✅ Docker 容器化部署                                          |
+------------------------------------------------------------------+

**🔄 待实现** - 需要开发的功能模块
**✅ 已完成** - 已实现的基础设施
**🔒 类型安全** - tRPC 提供端到端类型安全保障
```

### **tRPC 架构优势**

✅ **端到端类型安全** - 从前端到数据库的完整类型链条
✅ **自动 API 文档** - 类型定义即文档
✅ **零代码生成** - 无需手动维护 API 客户端
✅ **开发体验** - 智能提示和错误检查
✅ **性能优化** - 批量请求和自动缓存集成

## **三、技术栈现状**

### **已安装依赖（当前项目状态）**

| 模块           | 技术/版本                     | 说明                                                     |
| -------------- | ---------------------------- | -------------------------------------------------------- |
| 框架           | Next.js 15.4.5               | 全栈框架，提供 App Router、API 路由                     |
| 语言           | TypeScript 5.9.2             | 全栈类型安全基础                                       |
| UI 组件        | shadcn/ui + Tailwind CSS v4   | 可完全自定义的组件库，通过 workspace 包管理             |
| 表单状态       | React Hook Form 7.54.2       | 高性能表单状态管理                                       |
| 验证与模型     | Zod 3.24.1                   | 定义数据结构，提供静态类型 + 运行时验证                   |
| 连接器         | @hookform/resolvers 3.10.0   | 将 Zod Schema 无缝接入 React Hook Form                   |
| 数据请求       | @tanstack/react-query 5.68.1 | 管理服务器状态，提供缓存、重试等高级功能                 |
| 全局状态       | Zustand 5.0.3                | 轻量级全局状态管理                                       |
| **API 层**     | **tRPC (待集成)**            | **端到端类型安全的 RPC 框架，替代传统 REST API**          |
| **拖拽引擎**   | @dnd-kit/*                   | 核心拖拽库（core 1.1.0, sortable 1.0.0, utilities 3.2.2） |
| **开发服务器** | Next.js (Turbopack)          | 提供极速的开发体验                                       |
| **代码质量**   | ESLint 9.32.0 + Prettier 3.6.2 | 保证代码风格和质量的一致性                             |
| **数据库**     | Prisma 6.5.0 + PostgreSQL 17 | 类型安全的 ORM + 关系型数据库                            |
| **包管理**     | pnpm 10.4.1                  | workspace monorepo 支持                                 |

**📋 待安装依赖**
- `@trpc/server` - tRPC 服务端
- `@trpc/client` - tRPC 客户端
- `@trpc/react-query` - tRPC 与 React Query 集成
- `superjson` - 自动序列化/反序列化

## **四、核心模块设计**

### **1. 表单设计器（Design-Time）**

**功能**

- 拖拽字段（文本、数字、日期、选择器、文件等）
- 字段属性配置面板（标签、占位符、是否必填、校验规则）
- 布局调整（网格、分组、排序）
- 实时预览
- 保存为结构化元数据

**输出结构**


```typescript
// packages/types/src/form.ts

// 单个字段的元数据定义
export interface FormField {
  id: string; // 字段的唯一ID，用于拖拽和 key
  name: string; // 字段的提交键名，也是 Zod Schema 的 key
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[]; // 'select' 类型专用
  // 条件显示逻辑
  condition?: {
    fieldId: string; // 依赖字段的 id
    operator: 'equals' | 'not_equals'; // 判断操作符
    value: any;      // 触发条件的值
  };
  defaultValue?: any;
}

// 整个表单的元数据定义
export interface FormMetadata {
  version: string; // 建议使用语义化版本，如 "1.0.0"
  fields: FormField[];
}
```

**技术实现**

- 使用 dnd-kit 实现拖拽排序。
- 使用 Zod 定义 FormMetadata 类型，确保保存前元数据结构正确。
- 通过 API 提交 FormMetadata JSON 对象。

### **2. 核心转换层（Schema Compiler）**

**目标**

- 将 FormMetadata 动态转换为**可执行的 Zod Schema 对象**，避免 eval() 或不安全的字符串拼接。

**实现方式**

```typescript
// packages/schema-compiler/src/index.ts
import { z, ZodLiteral, ZodString, ZodTypeAny } from 'zod';
import { FormMetadata, FormField } from '@acme/types';

export function buildZodSchema(metadata: FormMetadata): z.ZodObject<any> {
  const fieldSchemas: Record<string, ZodTypeAny> = {};

  metadata.fields.forEach((field) => {
    let schema: ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'textarea':
        schema = z.string();
        break;
      case 'number':
        schema = z.coerce.number();
        break;
      case 'date':
        schema = z.coerce.date();
        break;
      case 'select': {
        const values = field.options?.map((option) => option.value) ?? [];
        schema = buildSelectSchema(field.name, values);
        break;
      }
      case 'checkbox':
        schema = z.boolean();
        break;
      default:
        schema = z.any();
    }

    if (field.required) {
      if (field.type === 'text' || field.type === 'textarea') {
        schema = (schema as ZodString).min(1, { message: '此字段为必填项' });
      }
    } else {
      schema = markAsOptional(schema, field.type);
    }

    if (field.defaultValue !== undefined) {
      schema = schema.default(field.defaultValue);
    }

    fieldSchemas[field.name] = schema;
  });

  return z.object(fieldSchemas);
}

function buildSelectSchema(fieldName: string, values: string[]): ZodTypeAny {
  if (values.length === 0) {
    throw new Error(`Select 字段 “${fieldName}” 缺少可选项`);
  }

  const literals = values.map((value) => z.literal(value)) as ZodLiteral<string>[];
  return literals.length === 1
    ? literals[0]
    : z.union(literals as [ZodLiteral<string>, ...ZodLiteral<string>[]]);
}

function markAsOptional(schema: ZodTypeAny, type: FormField['type']) {
  if (type === 'text' || type === 'textarea' || type === 'select') {
    return schema
      .optional()
      .transform((value) => (value === '' ? undefined : value));
  }

  if (type === 'checkbox') {
    return schema.optional().default(false);
  }

  return schema.optional().nullable();
}
```

**优势**
✅ **安全:** 无 eval 或动态代码执行，且 select 字段在缺少选项时立即报错。
✅ **类型安全:** 输入输出均有 TypeScript 类型，checkbox、select 的字面量类型保持一致。
✅ **可扩展:** 支持自定义字段类型映射与空值归一化策略。
✅ **易调试:** 可打印生成的 Schema 结构，辅助排查。

> ⓘ `markAsOptional` 会把文本类字段的空字符串归一为 `undefined`，checkbox 则回落到布尔默认值，避免浏览器空值造成的误判。

### **3. 运行时表单渲染器（Run-Time Renderer）**

采用容器组件与展示组件分离的模式，以实现逻辑与视图的解耦。容器负责 Schema 构建、字段可见性和数据归一化，展示层只处理 UI。

- `computeVisibility`：解析 `condition` 配置，实时计算字段是否展示，并在隐藏时清空对应值。
- `normalizeFormValues`：将空字符串归一为 `undefined`、把 checkbox 值显式转为布尔，防止提交前后的数据不一致。

**组件结构**


```tsx
// 1. 逻辑容器组件：处理 schema、可见性与归一化
// components/forms/DynamicFormContainer.tsx
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildZodSchema } from '@/lib/core/schema-compiler';
import { FormField, FormMetadata } from '@/lib/types';
import { DynamicFormRenderer } from './DynamicFormRenderer';

type VisibilityMap = Record<string, boolean>;

export function DynamicFormContainer({ metadata }: { metadata: FormMetadata }) {
  const schema = useMemo(() => buildZodSchema(metadata), [metadata]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(
      metadata.fields
        .filter((field) => field.defaultValue !== undefined)
        .map((field) => [field.name, field.defaultValue])
    ),
  });

  const [visibility, setVisibility] = useState<VisibilityMap>(() =>
    computeVisibility(metadata.fields, form.getValues())
  );

  useEffect(() => {
    const subscription = form.watch(() => {
      const values = form.getValues();
      const nextVisibility = computeVisibility(metadata.fields, values);
      setVisibility(nextVisibility);

      metadata.fields.forEach((field) => {
        if (!nextVisibility[field.id]) {
          form.setValue(field.name, undefined, { shouldValidate: false, shouldDirty: false });
        }
      });
    });

    return () => subscription.unsubscribe();
  }, [form, metadata.fields]);

  const onSubmit = (rawData: Record<string, unknown>) => {
    const normalized = normalizeFormValues(rawData, metadata.fields);
    console.log('Form Submitted:', normalized);
    // 调用 API 提交数据
  };

  return (
    <DynamicFormRenderer
      form={form}
      fields={metadata.fields}
      visibility={visibility}
      onSubmit={onSubmit}
    />
  );
}

function computeVisibility(fields: FormField[], values: Record<string, unknown>): VisibilityMap {
  return fields.reduce<VisibilityMap>((acc, field) => {
    const condition = field.condition;
    if (!condition) {
      acc[field.id] = true;
      return acc;
    }

    const targetValue = values[condition.fieldId];
    const isVisible = condition.operator === 'equals'
      ? targetValue === condition.value
      : targetValue !== condition.value;

    acc[field.id] = isVisible;
    return acc;
  }, {});
}

function normalizeFormValues(
  rawData: Record<string, unknown>,
  fields: FormField[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  fields.forEach((field) => {
    const value = rawData[field.name];
    if (value === '') {
      result[field.name] = undefined;
      return;
    }

    if (field.type === 'checkbox' && typeof value !== 'boolean') {
      result[field.name] = Boolean(value);
      return;
    }

    result[field.name] = value;
  });

  return result;
}

// 2. 纯展示组件：仅渲染可见字段
// components/forms/DynamicFormRenderer.tsx
import { Form } from '@/components/ui/form';
import { FormFieldRenderer } from './FormFieldRenderer';

export function DynamicFormRenderer({ form, fields, visibility, onSubmit }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields
          .filter((field) => visibility[field.id] !== false)
          .map((field) => (
            <FormFieldRenderer key={field.id} control={form.control} field={field} />
          ))}
        <button type="submit">提交</button>
      </form>
    </Form>
  );
}

// 3. 单个字段渲染器
// components/forms/FormFieldRenderer.tsx
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
// ... 其他组件（Select、Checkbox 等）

export function FormFieldRenderer({ control, field }) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: rhfField }) => (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>
          <FormControl>
            {/* 根据 field.type 渲染不同组件 */}
            <Input placeholder={field.placeholder} {...rhfField} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### **4. 后端服务（tRPC API Layer）**

**技术决策**
- **API 框架**: tRPC (替代 REST API)
- **数据库**: PostgreSQL 17
- **ORM**: Prisma 6.5.0
- **类型安全**: 端到端 TypeScript + Zod

**tRPC 架构设计**

#### **核心 Router 结构**

```typescript
// apps/web/server/trpc/routers/index.ts
import { createTRPCRouter } from '../trpc';
import { formRouter } from './form';
import { submissionRouter } from './submission';
import { authRouter } from './auth';

export const appRouter = createTRPCRouter({
  form: formRouter,
  submission: submissionRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

#### **表单管理 Router**

```typescript
// apps/web/server/trpc/routers/form.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { prisma } from '@workspace/database';

// FormMetadata 类型定义
const formFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  condition: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals']),
    value: z.any(),
  }).optional(),
  defaultValue: z.any().optional(),
});

const formMetadataSchema = z.object({
  version: z.string(),
  fields: z.array(formFieldSchema),
});

export const formRouter = createTRPCRouter({
  // 获取表单详情
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await prisma.form.findUnique({
        where: { id: input.id },
        include: {
          submissions: {
            orderBy: { createdAt: 'desc' },
            take: 10, // 最近10条提交
          },
        },
      });
    }),

  // 创建表单
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      metadata: formMetadataSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.form.create({
        data: {
          name: input.name,
          metadata: input.metadata as any,
        },
      });
    }),

  // 更新表单
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      metadata: formMetadataSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await prisma.form.update({
        where: { id },
        data,
      });
    }),

  // 删除表单
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.form.delete({
        where: { id: input.id },
      });
    }),

  // 获取表单列表
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit + 1;
      const items = await prisma.form.findMany({
        take: limit,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
});
```

#### **表单提交 Router**

```typescript
// apps/web/server/trpc/routers/submission.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { prisma } from '@workspace/database';

export const submissionRouter = createTRPCRouter({
  // 提交表单数据
  create: publicProcedure
    .input(z.object({
      formId: z.string(),
      data: z.record(z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证表单是否存在
      const form = await prisma.form.findUnique({
        where: { id: input.formId },
      });

      if (!form) {
        throw new Error('表单不存在');
      }

      return await prisma.submission.create({
        data: {
          formId: input.formId,
          data: input.data as any,
        },
      });
    }),

  // 获取表单的所有提交数据
  getByFormId: protectedProcedure
    .input(z.object({
      formId: z.string(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return await prisma.submission.findMany({
        where: { formId: input.formId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  // 获取单个提交详情
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await prisma.submission.findUnique({
        where: { id: input.id },
        include: {
          form: true,
        },
      });
    }),
});
```

## **五、安全与性能考量**

**安全**
🔐 所有 Schema 构造均使用白名单机制，严格禁止任意代码执行。
🔐 所有 API 接口都需要进行身份验证（例如 JWT / OAuth）。
🔐 所有系统的输入和输出都必须通过 Zod 进行验证。
🔐 采用严格的内容安全策略（CSP）以防止 XSS 攻击。

**性能**
⚡ 使用 TanStack Query 对表单元数据进行高效缓存。
⚡ 对常用或公开的表单页面使用 Next.js 的静态生成（SSG）或增量静态再生成（ISR）。
⚡ 对需要动态数据的表单页面使用服务端渲染（SSR）并配合缓存策略。
⚡ 利用 Next.js 的代码分割能力，按需加载组件，特别是大型的设计器组件。

## **六、Schema 演进策略**

- **语义化版本**：`FormMetadata.version` 遵循 SemVer，任何破坏性改动必须升级主版本，并在发布流程中提示影响范围。
- **迁移流水线**：为重大调整维护 `upgrade()` / `downgrade()` 迁移器，保存前通过 schema-compiler 校验迁移结果，确保旧数据可平滑升级。
- **灰度发布**：在 tRPC 层增加版本参数，允许旧版本设计器/渲染器在过渡期内并行运行；通过 feature flag 控制新字段上线节奏。
- **回放测试**：构建“历史表单回放”测试集，每次发布前把历史元数据和提交数据跑一遍 Schema 编译 + 运行时校验，防止回归。
- **审计记录**：所有 Schema 更新写入 `FormVersionHistory`（表或日志），记录操作人、时间与差异摘要，便于追责和回滚。

## **七、长耗时操作处理方案**

- **文件上传**：前端获取预签名 URL，直接上传到对象存储；上传状态由后台任务轮询或 WebSocket 推送，提交时仅保存文件引用。
- **外部校验**：通过消息队列（如 BullMQ/Temporal）异步执行，前端展示“处理中”状态；任务完成后写入结果并通知用户刷新。
- **超时与重试**：为任务设定硬超时、指数退避重试，并记录幂等键防止重复处理。
- **监控**：长耗时任务在 Prometheus 中上报排队时长、执行时长和失败率，异常时触发告警。
- **审计**：持久化任务的输入摘要、操作者和响应结果，保证可追溯性。

## **八、未来扩展方向**

| 方向             | 说明                                                         |
| ---------------- | ------------------------------------------------------------ |
| **多模型支持**   | 支持从 JSON Schema、OpenAPI 等行业标准格式导入或生成表单。   |
| **流程引擎集成** | 与 BPMN 等流程引擎结合，支持审批流、状态机等复杂业务场景。   |
| **移动端适配**   | 采用响应式设计，并探索使用同一套 Schema 驱动 React Native 渲染器的可能性。 |
| **AI 辅助设计**  | 允许用户通过自然语言描述来自动生成初始的表单结构。           |
| **版本管理**     | 实现表单 Schema 的版本控制、对比和回滚功能。                 |
| **权限控制**     | 实现字段级别的读写权限控制（RBAC/ABAC）。                    |

## **九、项目实际结构（tRPC 已落地）**

Monorepo 目录已经围绕 tRPC 架构整理，关键模块如下：

```bash
/fastbuild
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (admin)/designer/        # 表单管理与预览页面（受保护）
│       │   ├── (public)/form/[formId]/  # 运行时表单渲染页面
│       │   ├── api/trpc/[trpc]/route.ts # Next.js Route Handler -> tRPC
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/                  # 应用级 UI 组件
│       ├── lib/                         # 公共工具（含 schema-compiler 入口）
│       ├── server/trpc/
│       │   ├── context.ts               # 注入租户/用户上下文
│       │   ├── routers/
│       │   │   ├── form.ts
│       │   │   ├── submission.ts
│       │   │   └── auth.ts
│       │   └── trpc.ts                  # createTRPCRouter / appRouter
│       ├── trpc/
│       │   ├── client.ts                # createTRPCReact<AppRouter>()
│       │   └── provider.tsx             # React Query + tRPC Provider
│       └── package.json
├── packages/
│   ├── schema-compiler/                 # FormMetadata -> Zod Schema
│   ├── types/                           # 业务类型库（FormMetadata 等）
│   ├── ui/                              # shadcn/ui 扩展组件库
│   ├── database/                        # Prisma Client 单例
│   ├── eslint-config/
│   └── typescript-config/               # 统一的 TypeScript 配置模板
├── prisma/
│   └── schema.prisma
├── docker-compose.yml                   # PostgreSQL 本地容器
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### **结构要点**

- API 仅通过 `app/api/trpc/[trpc]/route.ts` 暴露，所有表单/提交/鉴权能力由 tRPC router 提供。
- 前端消费层统一使用 `trpc/provider.tsx` 注入客户端实例，页面组件直接调用 `api.form.getById.useQuery()` 等 hooks。
- 设计时、运行时页面与共享 schema-compiler 均位于同一应用，减少跨包耦合；公共类型由 `packages/types` 输出，`packages/typescript-config` 只承担 tsconfig 模板，两者职责清晰。

## **十、总结**

本架构以 **Zod Schema 作为单一事实来源**，结合了 Next.js、TypeScript、shadcn/ui 和 React Hook Form 等一系列现代化技术栈，实现了：

✅ **贯穿全栈的类型安全**
✅ **高性能的表单渲染**
✅ **安全的动态 Schema 构造机制**
✅ **可扩展的插件化设计**

该方案适用于构建中大型企业级低代码平台，具备出色的可维护性、安全性与开发体验。

### **当前状态与 MVP 实施路线**

✅ **已完成**
- Monorepo（pnpm + Turborepo）骨架
- Next.js 15 + TypeScript + Tailwind CSS v4 + shadcn/ui
- Prisma + PostgreSQL 基础设施
- tRPC 基础设施（`app/api/trpc/[trpc]/route.ts`、`server/trpc`、`trpc/provider.tsx`）

🚀 **MVP 最短路径**
- **阶段 2：Schema 驱动运行时 MVP**  
  使用示例 FormMetadata（可硬编码或 JSON 文件）串起 “获取 Schema → 生成 Zod → 渲染表单 → 提交数据”。优先覆盖 text/number/select/checkbox，提交先 `console.log`，如需入库调用 `submissionRouter.create`。
- **阶段 3：Schema 管理最小化 UI**  
  管理端提供 JSON 编辑/上传能力，通过 `formRouter.create/update/list` 保存与预览 Schema；运行时页面按 URL 参数加载对应表单。
- **阶段 4：体验增强（按需迭代）**  
  在 JSON 编辑基础上加入字段模板与校验提示，逐步引入 `condition` 联动、默认值等高级特性；待 MVP 验证成功后再评估拖拽式设计器投入。

### **tRPC 的技术优势**

🔒 **端到端类型安全**
- 前端调用 API 时获得完整的类型提示
- 输入输出自动验证，减少运行时错误

⚡ **开发体验提升**
- API 变更时自动获得类型错误提示
- 无需手动维护 API 文档和客户端代码

🚀 **性能优化**
- 自动请求批处理和去重
- 与 React Query 深度集成，提供智能缓存
