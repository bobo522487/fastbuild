# FastBuild 组件设计系统

## 概述

FastBuild 组件设计系统基于 Shadcn/UI 构建，提供了一致、可访问且高度可定制的 React 组件库。本系统遵循现代设计原则，确保在整个应用中提供统一的用户体验。

## 核心原则

### 1. 一致性 (Consistency)
- 统一的视觉语言和交互模式
- 一致的间距、颜色和排版系统
- 标准化的组件 API 设计

### 2. 可访问性 (Accessibility)
- 遵循 WCAG 2.1 标准
- 键盘导航支持
- 屏幕阅读器兼容性
- 高对比度支持

### 3. 可定制性 (Customizability)
- 基于 CSS 变量的主题系统
- 灵活的组件配置
- 易于扩展和定制

### 4. 性能优化 (Performance)
- 组件懒加载
- 优化的重新渲染
- 轻量级实现

## 组件架构

### 1. 基础组件层 (Foundation Layer)

#### 颜色系统
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  /* 更多颜色变量... */
}
```

#### 间距系统
```css
:root {
  --spacing: 0.5rem; /* 8px */
  --spacing-xs: calc(var(--spacing) * 0.5);  /* 4px */
  --spacing-sm: calc(var(--spacing) * 0.75); /* 6px */
  --spacing-md: var(--spacing);              /* 8px */
  --spacing-lg: calc(var(--spacing) * 1.5);  /* 12px */
  --spacing-xl: calc(var(--spacing) * 2);    /* 16px */
  --spacing-2xl: calc(var(--spacing) * 3);   /* 24px */
}
```

#### 排版系统
```css
:root {
  --font-family-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
}
```

### 2. 通用组件层 (Component Layer)

#### 按钮组件 (Button)
```typescript
import { Button } from "@workspace/ui/components/button"

// 基础用法
<Button>点击我</Button>

// 变体
<Button variant="default">默认</Button>
<Button variant="destructive">危险</Button>
<Button variant="outline">轮廓</Button>
<Button variant="secondary">次要</Button>
<Button variant="ghost">幽灵</Button>
<Button variant="link">链接</Button>

// 尺寸
<Button size="sm">小</Button>
<Button size="default">中</Button>
<Button size="lg">大</Button>
```

#### 输入组件 (Input)
```typescript
import { Input } from "@workspace/ui/components/input"

// 基础用法
<Input placeholder="请输入内容" />

// 带标签
<Label htmlFor="email">邮箱</Label>
<Input id="email" type="email" placeholder="your@email.com" />

// 带错误状态
<Input
  type="text"
  placeholder="请输入内容"
  className="border-red-500 focus:ring-red-500"
/>
```

#### 表单组件 (Form)
```typescript
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form"

const form = useForm({
  resolver: zodResolver(yourSchema),
});

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>邮箱</FormLabel>
      <FormControl>
        <Input placeholder="your@email.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3. 复合组件层 (Composite Layer)

#### 表单字段工厂 (FormFieldFactory)
```typescript
import { FormFieldFactory } from "@/components/forms/fields/FormFieldFactory"

// 动态渲染不同类型的字段
<FormFieldFactory
  field={textField}
  form={form}
/>

<FormFieldFactory
  field={selectField}
  form={form}
/>

<FormFieldFactory
  field={dateField}
  form={form}
/>
```

#### 简化布局 (SimpleLayout)
```typescript
import { SimpleLayout } from "@/components/layout/SimpleLayout"

<SimpleLayout>
  <div className="p-6">
    <h1>主内容区域</h1>
    <p>这里放置您的应用内容</p>
  </div>
</SimpleLayout>
```

### 4. 系统组件层 (System Layer)

#### 加载状态系统 (Loading States)
```typescript
import {
  LoadingStateIndicator,
  SmartLoading,
  FormSkeleton,
  PageSkeleton
} from "@/components/ui/loading-states"

// 基础加载指示器
<LoadingStateIndicator state="loading" message="加载中..." />

// 智能加载 - 自动选择合适的骨架屏
<SmartLoading
  isLoading={isLoading}
  type="form"
  skeletonProps={{ fieldCount: 3 }}
>
  <YourComponent />
</SmartLoading>

// 特定骨架屏
<FormSkeleton fieldCount={3} />
<PageSkeleton />
```

## 组件使用指南

### 1. 安装新组件

#### 方法一：使用 shadcn CLI (推荐)
```bash
cd apps/web
pnpm dlx shadcn@latest add button -c apps/web
```

#### 方法二：手动创建
1. 在 `packages/ui/src/components/` 创建组件文件
2. 在 `packages/ui/src/index.ts` 导出组件
3. 更新 `packages/ui/package.json` 依赖

### 2. 导入模式

#### 标准导入
```typescript
// UI 基础组件
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Card } from "@workspace/ui/components/card"

// 表单组件
import { Form, FormField, FormItem, FormLabel, FormControl } from "@workspace/ui/components/form"

// 应用特定组件
import { SimpleLayout } from "@/components/layout/SimpleLayout"
import { OptimizedFormRenderer } from "@/components/forms/OptimizedFormRenderer"
```

### 3. 组件最佳实践

#### 可访问性
```typescript
// ✅ 良好的可访问性实践
<button
  aria-label="关闭弹窗"
  aria-expanded={isOpen}
  aria-controls="modal-content"
>
  <XIcon className="h-4 w-4" />
</button>

// ❌ 避免
<button>
  <XIcon className="h-4 w-4" />
</button>
```

#### 状态管理
```typescript
// ✅ 使用 React Hook Form 进行表单状态管理
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});

// ❌ 避免手动管理表单状态
const [formData, setFormData] = useState({});
```

#### 样式定制
```typescript
// ✅ 使用 CSS 变量和 className 属性
<Button className="bg-primary hover:bg-primary/90" />

// ❌ 避免内联样式
<Button style={{ backgroundColor: '#3b82f6' }} />
```

### 4. 性能优化

#### 组件懒加载
```typescript
// 大型组件使用动态导入
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// 在路由中使用
const DashboardPage = () => (
  <React.Suspense fallback={<DashboardSkeleton />}>
    <HeavyComponent />
  </React.Suspense>
);
```

#### 避免不必要的重新渲染
```typescript
// ✅ 使用 React.memo
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* 复杂渲染逻辑 */}</div>;
});

// ✅ 使用 useMemo 和 useCallback
const processedData = useMemo(() => {
  return expensiveOperation(data);
}, [data]);
```

## 主题定制

### 1. 自定义颜色
```css
/* apps/web/app/globals.css */
:root {
  /* 覆盖默认颜色 */
  --primary: 210 40% 8%;        /* 深蓝色主题 */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 210 40% 8%;
}
```

### 2. 响应式设计
```typescript
// 使用 Tailwind CSS 的响应式工具
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>
```

### 3. 暗色模式支持
```typescript
// 使用 next-themes 管理主题
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </Button>
  );
};
```

## 组件清单

### 基础组件
- [x] Button - 按钮组件
- [x] Input - 输入框组件
- [x] Label - 标签组件
- [x] Card - 卡片组件
- [x] Badge - 徽章组件
- [x] Skeleton - 骨架屏组件

### 表单组件
- [x] Form - 表单容器
- [x] FormField - 表单字段
- [x] FormItem - 表单项
- [x] FormLabel - 表单标签
- [x] FormControl - 表单控制器
- [x] FormMessage - 表单消息

### 布局组件
- [x] Sidebar - 侧边栏组件
- [x] Collapsible - 可折叠组件
- [x] ScrollArea - 滚动区域组件
- [x] Separator - 分隔符组件

### 数据展示组件
- [x] Table - 表格组件
- [x] Calendar - 日历组件
- [x] Progress - 进度条组件
- [x] Badge - 徽章组件

### 反馈组件
- [x] Alert - 警告组件
- [x] Toast - 提示组件
- [x] Loading states - 加载状态组件
- [x] Command - 命令面板组件

### 导航组件
- [x] Navigation Menu - 导航菜单
- [x] Breadcrumb - 面包屑导航
- [x] Tabs - 选项卡组件

### 叠层组件
- [x] Dialog - 对话框组件
- [x] Popover - 弹出层组件
- [x] Tooltip - 提示框组件
- [x] Hover Card - 悬停卡片组件

## 迁移指南

### 从自定义组件迁移到 Shadcn 组件

#### 1. 按钮组件迁移
```typescript
// 之前 (自定义组件)
<CustomButton
  variant="primary"
  size="large"
  loading={isLoading}
  onClick={handleClick}
>
  提交
</CustomButton>

// 之后 (Shadcn 组件)
<Button
  size="lg"
  disabled={isLoading}
  onClick={handleClick}
>
  {isLoading ? (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>提交中...</span>
    </div>
  ) : (
    '提交'
  )}
</Button>
```

#### 2. 加载状态迁移
```typescript
// 之前 (自定义 LoadingIndicator)
<LoadingIndicator
  status={{ state: 'loading', message: '加载中...' }}
  size="md"
/>

// 之后 (Shadcn loading states)
<LoadingStateIndicator
  state="loading"
  message="加载中..."
  size="md"
/>

// 或者使用智能加载
<SmartLoading isLoading={isLoading} type="page">
  <YourContent />
</SmartLoading>
```

#### 3. 表单组件迁移
```typescript
// 之前 (自定义表单字段)
<TextField
  label="邮箱"
  placeholder="your@email.com"
  required={true}
  value={value}
  onChange={onChange}
  error={error}
/>

// 之后 (Shadcn + React Hook Form)
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>邮箱</FormLabel>
      <FormControl>
        <Input placeholder="your@email.com" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## 故障排除

### 常见问题

#### 1. 组件样式不显示
确保导入了必要的 CSS 文件：
```css
/* apps/web/app/globals.css */
@import "@workspace/ui/globals.css";
```

#### 2. TypeScript 类型错误
确保正确导入了类型：
```typescript
import type { ComponentProps } from "@workspace/ui/components/button";
```

#### 3. 组件未找到
检查组件是否已正确安装和导出：
```typescript
// packages/ui/src/index.ts
export { Button } from "./components/button";
```

## 贡献指南

### 添加新组件
1. 遵循现有组件的结构和命名约定
2. 确保组件是可访问的
3. 编写单元测试
4. 更新文档

### 报告问题
使用 GitHub Issues 报告 bug 或请求新功能。

## 版本历史

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 核心组件库完成
- 统一的设计系统建立
- 完整的文档和使用指南

---

本文档将随着组件库的发展持续更新。如需更多信息，请参考项目代码或联系开发团队。