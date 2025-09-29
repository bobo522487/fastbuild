# FastBuild 组件快速入门指南

## 概述

本指南将帮助您快速上手 FastBuild 组件系统，从环境设置到构建第一个表单应用。

## 前置条件

- Node.js >= 20
- pnpm 包管理器
- Docker 和 Docker Compose（用于数据库）

## 环境设置

### 1. 克隆项目
```bash
git clone <repository-url>
cd fastbuild
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 启动数据库
```bash
docker compose up -d
```

### 4. 运行数据库迁移
```bash
pnpm db:push
pnpm db:generate
```

### 5. 启动开发服务器
```bash
pnpm dev
```

访问 `http://localhost:3000` 查看应用。

## 项目结构

```
fastbuild/
├── apps/web/                 # Next.js 应用
│   ├── app/                  # App Router 页面
│   ├── components/           # 应用组件
│   └── lib/                  # 工具库
├── packages/
│   ├── ui/                   # Shadcn UI 组件
│   ├── database/             # 数据库工具
│   └── schema-compiler/      # 表单编译器
├── prisma/                   # 数据库模式
└── docs/                     # 文档
```

## 第一个组件

### 1. 基础按钮组件

```typescript
// pages/button-demo.tsx
'use client';

import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

export default function ButtonDemo() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">按钮组件演示</h1>

      <Card>
        <CardHeader>
          <CardTitle>按钮变体</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Button>默认按钮</Button>
          <Button variant="destructive">危险按钮</Button>
          <Button variant="outline">轮廓按钮</Button>
          <Button variant="secondary">次要按钮</Button>
          <Button variant="ghost">幽灵按钮</Button>
          <Button variant="link">链接按钮</Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>按钮尺寸</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-center">
          <Button size="sm">小按钮</Button>
          <Button size="default">中按钮</Button>
          <Button size="lg">大按钮</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. 基础表单组件

```typescript
// pages/simple-form.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';

const formSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
});

type FormData = z.infer<typeof formSchema>;

export default function SimpleForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('表单数据:', data);
    alert('表单提交成功！');
  };

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-2xl font-bold mb-6">简单表单</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>姓名</FormLabel>
                <FormControl>
                  <Input placeholder="请输入您的姓名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            提交
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

## 使用侧边栏布局

### 1. 创建带侧边栏的页面

```typescript
// pages/dashboard.tsx
'use client';

import { SimpleLayout } from '@/components/layout/SimpleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';

export default function Dashboard() {
  return (
    <SimpleLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">工作台</h1>
          <Button>创建新表单</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>总表单数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-sm text-gray-500">+20.1% 较上月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提交次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-sm text-gray-500">+15.3% 较上月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>活跃用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">456</div>
              <p className="text-sm text-gray-500">+8.7% 较上月</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">➕ 创建新表单</Button>
            <Button variant="outline" className="w-full">📊 查看统计</Button>
            <Button variant="outline" className="w-full">👥 管理用户</Button>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}
```

## 动态表单渲染

### 1. 使用 OptimizedFormRenderer

```typescript
// pages/dynamic-form.tsx
'use client';

import React from 'react';
import { OptimizedFormRenderer } from '@/components/forms/OptimizedFormRenderer';
import type { FormMetadata } from '@workspace/types';

// 定义表单元数据
const contactForm: FormMetadata = {
  version: '1.0.0',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '请输入您的姓名',
      required: true,
    },
    {
      id: 'email',
      name: 'email',
      type: 'text',
      label: '邮箱',
      placeholder: 'your@email.com',
      required: true,
    },
    {
      id: 'subject',
      name: 'subject',
      type: 'select',
      label: '主题',
      required: true,
      options: [
        { label: '技术咨询', value: 'tech' },
        { label: '产品反馈', value: 'feedback' },
        { label: '商务合作', value: 'business' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      id: 'message',
      name: 'message',
      type: 'textarea',
      label: '留言内容',
      placeholder: '请输入您的留言...',
      required: true,
    },
  ],
};

export default function DynamicForm() {
  const handleSubmit = React.useCallback(async (data: Record<string, any>) => {
    console.log('表单提交:', data);
    alert('表单提交成功！感谢您的留言。');
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">联系我们</h1>
      <p className="text-gray-600 mb-8">
        请填写以下表单，我们会尽快回复您。
      </p>

      <OptimizedFormRenderer
        metadata={contactForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

## 加载状态处理

### 1. 基础加载状态

```typescript
// pages/loading-demo.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import {
  LoadingStateIndicator,
  SmartLoading,
  FormSkeleton,
  PageSkeleton,
} from '@/components/ui/loading-states';

export default function LoadingDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const simulateSkeleton = () => {
    setShowSkeleton(true);
    setTimeout(() => setShowSkeleton(false), 3000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">加载状态演示</h1>

      <Card>
        <CardHeader>
          <CardTitle>加载指示器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <LoadingStateIndicator state="loading" message="加载中..." />
            <LoadingStateIndicator state="success" message="完成！" />
            <LoadingStateIndicator state="error" message="出错了" />
          </div>

          <Button onClick={simulateLoading} disabled={isLoading}>
            {isLoading ? '加载中...' : '模拟加载'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>骨架屏</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={simulateSkeleton} disabled={showSkeleton}>
            {showSkeleton ? '显示中...' : '显示骨架屏'}
          </Button>

          <SmartLoading isLoading={showSkeleton} type="form">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">表单内容</h3>
              <p>这里会显示实际的表单内容。</p>
            </div>
          </SmartLoading>

          <SmartLoading isLoading={showSkeleton} type="page">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">页面内容</h3>
              <Card>
                <CardHeader>
                  <CardTitle>数据卡片</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>这里显示一些数据...</p>
                </CardContent>
              </Card>
            </div>
          </SmartLoading>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 添加新组件

### 1. 使用 Shadcn CLI 添加组件

```bash
# 进入 web 应用目录
cd apps/web

# 添加新组件
pnpm dlx shadcn@latest add alert -c apps/web
pnpm dlx shadcn@latest add dialog -c apps/web
pnpm dlx shadcn@latest add toast -c apps/web
```

### 2. 使用新添加的组件

```typescript
// pages/new-components.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import { useToast } from '@workspace/ui/hooks/use-toast';

export default function NewComponentsDemo() {
  const [showAlert, setShowAlert] = useState(false);
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: "操作成功",
      description: "这是一个提示消息示例",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">新组件演示</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Alert 组件</h2>
        <div className="space-y-2">
          <Button onClick={() => setShowAlert(!showAlert)}>
            {showAlert ? '隐藏' : '显示'} Alert
          </Button>
          {showAlert && (
            <Alert>
              这是一个重要的提示信息
            </Alert>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Dialog 组件</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>对话框标题</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>这是对话框的内容区域。</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Toast 组件</h2>
        <Button onClick={showToast}>显示提示</Button>
      </div>
    </div>
  );
}
```

## 最佳实践

### 1. 组件导入规范

```typescript
// ✅ 正确的导入方式
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card } from '@workspace/ui/components/card';

// ✅ 应用特定组件
import { SimpleLayout } from '@/components/layout/SimpleLayout';
import { OptimizedFormRenderer } from '@/components/forms/OptimizedFormRenderer';

// ❌ 避免的导入方式
import { Button } from '../../../../packages/ui/src/components/button';
```

### 2. 样式规范

```typescript
// ✅ 使用 Tailwind CSS 类
<div className="p-6 bg-white rounded-lg shadow-sm">
  <h1 className="text-2xl font-bold text-gray-900">标题</h1>
</div>

// ❌ 避免内联样式
<div style={{ padding: '24px', backgroundColor: 'white' }}>
  <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>标题</h1>
</div>
```

### 3. 表单验证

```typescript
// ✅ 使用 Zod + React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

## 故障排除

### 1. 常见问题

**问题**: 组件样式不显示
```bash
# 确保 CSS 文件已导入
// apps/web/app/globals.css
@import "@workspace/ui/globals.css";
```

**问题**: TypeScript 类型错误
```bash
# 确保正确导入类型
import type { ComponentProps } from "@workspace/ui/components/button";
```

**问题**: 组件未找到
```bash
# 检查组件是否已正确导出
// packages/ui/src/index.ts
export { Button } from "./components/button";
```

### 2. 数据库连接问题

```bash
# 检查数据库容器状态
docker compose ps

# 重启数据库
docker compose restart

# 重新生成 Prisma 客户端
pnpm db:generate
```

## 下一步

1. 阅读 [组件设计系统文档](./COMPONENT_DESIGN_SYSTEM.md)
2. 查看 [组件使用示例](./COMPONENT_EXAMPLES.md)
3. 探索项目源代码了解更多高级功能
4. 开始构建您的第一个 FastBuild 应用！

---

这个快速入门指南涵盖了 FastBuild 组件系统的基本使用方法。如果您有任何问题或需要更详细的指导，请参考完整的文档或联系开发团队。