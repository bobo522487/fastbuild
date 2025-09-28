# 快速开始指南：Schema驱动运行时MVP

**版本**: 1.0.0
**创建日期**: 2025-09-28
**分支**: 002-schema-driven-runtime-mvp

## 🚀 快速开始

本指南将帮助您快速上手Schema驱动表单系统，从环境搭建到运行第一个表单示例。

## 📋 系统要求

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0
- **Docker**: >= 20.0.0 (可选，用于数据库)
- **Git**: >= 2.0.0

## 🔧 环境搭建

### 1. 克隆项目

```bash
git clone <repository-url>
cd fastbuild
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动数据库（可选）

如果需要使用数据库功能：

```bash
# 启动PostgreSQL容器
docker compose up -d

# 运行数据库迁移
pnpm db:push

# 生成Prisma客户端
pnpm db:generate
```

### 4. 启动开发服务器

```bash
# 启动所有开发服务器
pnpm dev

# 或单独启动web应用
cd apps/web && pnpm dev
```

访问 `http://localhost:3001/demo-simple` 查看演示。

## 🎯 第一个表单示例

### 1. 创建基本表单配置

创建 `src/examples/my-first-form.ts`:

```typescript
import { FormMetadata } from '@workspace/types';

export const myFirstForm: FormMetadata = {
  version: '1.0.0',
  title: '我的第一个表单',
  description: '一个简单的联系表单示例',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '请输入您的姓名',
      required: true,
      validation: {
        minLength: 2,
        maxLength: 50,
      },
    },
    {
      id: 'email',
      name: 'email',
      type: 'email',
      label: '邮箱',
      placeholder: '请输入您的邮箱',
      required: true,
    },
    {
      id: 'message',
      name: 'message',
      type: 'textarea',
      label: '消息',
      placeholder: '请输入您的消息',
      required: true,
      validation: {
        minLength: 10,
        maxLength: 500,
      },
    },
    {
      id: 'newsletter',
      name: 'newsletter',
      type: 'checkbox',
      label: '订阅新闻通讯',
      defaultValue: false,
    },
  ],
};
```

### 2. 使用DynamicFormRenderer

创建 `src/components/MyForm.tsx`:

```typescript
'use client';

import React from 'react';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import { myFirstForm } from '@/examples/my-first-form';

export function MyForm() {
  const handleSubmit = async (data: Record<string, any>) => {
    console.log('表单提交数据:', data);

    // 这里可以调用API提交到数据库
    // await fetch('/api/submissions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ formId: 'my-first-form', data }),
    // });

    alert('表单提交成功！请查看控制台输出。');
  };

  return (
    <DynamicFormRenderer
      metadata={myFirstForm}
      onSubmit={handleSubmit}
    />
  );
}
```

### 3. 添加到页面

在页面中使用您的表单：

```typescript
import { MyForm } from '@/components/MyForm';

export default function MyPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">我的表单页面</h1>
      <MyForm />
    </div>
  );
}
```

## 🔧 高级功能

### 1. 条件字段显示

```typescript
{
  id: 'company',
  name: 'company',
  type: 'text',
  label: '公司名称',
  condition: {
    fieldId: 'role',
    operator: 'equals',
    value: 'business',
  },
}
```

### 2. 自定义验证

```typescript
{
  id: 'phone',
  name: 'phone',
  type: 'text',
  label: '电话号码',
  validation: {
    custom: [
      {
        name: 'phone',
        validator: (value) => /^1[3-9]\d{9}$/.test(value),
        message: '请输入有效的手机号码',
      },
    ],
  },
}
```

### 3. 选择字段

```typescript
{
  id: 'country',
  name: 'country',
  type: 'select',
  label: '国家',
  options: [
    { value: 'cn', label: '中国' },
    { value: 'us', label: '美国' },
    { value: 'uk', label: '英国' },
  ],
  required: true,
}
```

### 4. 使用FormProvider进行状态管理

```typescript
'use client';

import React from 'react';
import { FormProvider, useFormMetadata } from '@/components/forms/DynamicFormRenderer';
import { myFirstForm } from '@/examples/my-first-form';

export function MyFormWithProvider() {
  const { loadMetadata, currentMetadata } = useFormMetadata();

  React.useEffect(() => {
    loadMetadata(myFirstForm);
  }, [loadMetadata]);

  const handleSubmit = async (data: Record<string, any>) => {
    console.log('表单提交:', data);
  };

  if (!currentMetadata) {
    return <div>加载中...</div>;
  }

  return (
    <FormProvider>
      <DynamicFormRenderer
        metadata={currentMetadata}
        onSubmit={handleSubmit}
      />
    </FormProvider>
  );
}
```

## 🧪 测试

### 1. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test packages/schema-compiler
pnpm test apps/web

# 运行测试覆盖率
pnpm test:coverage
```

### 2. 编写测试示例

```typescript
// tests/components/DynamicFormRenderer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import { simpleForm } from '@/examples/forms';

describe('DynamicFormRenderer', () => {
  it('应该渲染表单字段', () => {
    render(
      <DynamicFormRenderer
        metadata={simpleForm}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
  });

  it('应该处理表单提交', async () => {
    const mockSubmit = jest.fn();
    render(
      <DynamicFormRenderer
        metadata={simpleForm}
        onSubmit={mockSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '张三' },
    });
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'zhangsan@example.com' },
    });

    fireEvent.click(screen.getByText('提交表单'));

    await screen.findByText('提交中...');
    expect(mockSubmit).toHaveBeenCalledWith({
      name: '张三',
      email: 'zhangsan@example.com',
    });
  });
});
```

## 🔍 调试

### 1. 开发者工具

系统提供多种调试功能：

```typescript
// 启用调试模式
const debugForm: FormMetadata = {
  ...myFirstForm,
  debug: true, // 启用调试信息
};

// 在控制台查看验证结果
form.watch((data, { name, type }) => {
  console.log(`字段 ${name} ${type}:`, data);
});
```

### 2. 性能监控

```typescript
// 监控表单渲染性能
const perfMonitor = {
  onRenderStart: () => console.time('form-render'),
  onRenderEnd: () => console.timeEnd('form-render'),
  onValidationStart: () => console.time('validation'),
  onValidationEnd: () => console.timeEnd('validation'),
};
```

## 🚀 部署

### 1. 构建生产版本

```bash
# 构建所有包
pnpm build

# 构建特定应用
cd apps/web && pnpm build
```

### 2. 环境变量

创建 `.env.production`:

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@host:port/database"

# API配置
API_URL="https://api.example.com"
NEXT_PUBLIC_API_URL="https://api.example.com"

# 安全配置
JWT_SECRET="your-secret-key"
```

### 3. Docker部署

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN pnpm install

COPY . .
RUN pnpm build

EXPOSE 3001
CMD ["pnpm", "start"]
```

## 📚 常见问题

### Q: 如何添加自定义字段类型？

A: 通过插件系统扩展：

```typescript
import { FieldPlugin } from '@/lib/form-plugins';

const customFieldPlugin: FieldPlugin = {
  type: 'custom-type',
  component: CustomFieldComponent,
  validator: (value, rules) => { /* 自定义验证 */ },
};

formPluginRegistry.register(customFieldPlugin);
```

### Q: 如何处理国际化？

A: 系统支持多语言：

```typescript
const i18nForm: FormMetadata = {
  ...myFirstForm,
  i18n: {
    'zh-CN': {
      title: '我的表单',
      fields: {
        name: { label: '姓名' },
        email: { label: '邮箱' },
      },
    },
    'en-US': {
      title: 'My Form',
      fields: {
        name: { label: 'Name' },
        email: { label: 'Email' },
      },
    },
  },
};
```

### Q: 如何优化大型表单的性能？

A: 使用以下优化策略：

1. **虚拟滚动**: 对于长列表字段
2. **懒加载**: 按需加载字段组件
3. **记忆化**: 缓存计算结果
4. **代码分割**: 拆分大型表单

```typescript
// 使用React.memo优化字段组件
const OptimizedField = React.memo(FormField);

// 使用懒加载
const HeavyField = React.lazy(() => import('./HeavyField'));
```

## 🆘 获取帮助

- **文档**: 查看项目 `/docs` 目录
- **示例**: 参考 `/examples` 目录
- **问题**: 创建 GitHub Issue
- **讨论**: 加入社区讨论

---

**下一步**: 查看完整的 [API文档](./contracts/api-contracts.md) 或 [开发者指南](../docs/developer-guide.md)