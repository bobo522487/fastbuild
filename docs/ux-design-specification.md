# FastBuild UX 设计规范

**项目**: fastbuild
**版本**: 1.0
**日期**: 2025-10-11
**作者**: UX设计团队

---

## 概述

FastBuild是一个开源无代码开发平台，本设计规范定义了平台的用户体验设计原则、组件库使用指南和交互模式，确保整个平台提供一致、直观且高效的用户体验。

### 设计目标

- **直观易用**: 降低学习成本，让用户快速上手
- **专业可信**: 体现企业级产品的专业性和可靠性
- **高效创作**: 支持快速应用构建和部署
- **一致性**: 确保跨平台、跨功能的一致体验

---

## 设计原则

### 1. 直接操纵 (Direct Manipulation)

用户应该能够直接与界面元素进行交互，而不需要通过复杂的对话框或菜单。

```typescript
// ✅ 好的设计：直接拖拽组件
<ComponentDragArea onDrop={handleComponentDrop}>
  <DraggableComponent id="button" />
</ComponentDragArea>

// ❌ 避免：复杂的添加组件流程
<AddComponentWizard steps={5} />
```

### 2. 实时反馈 (Real-time Feedback)

所有用户的操作都应该得到即时的视觉反馈，让用户清楚地了解操作结果。

```typescript
// ✅ 好的设计：实时预览
const [previewMode, setPreviewMode] = useState(false);
<ComponentEditor onChange={handleRealTimeUpdate} />
{previewMode && <LivePreview config={componentConfig} />}

// ❌ 避免：延迟反馈
<ComponentEditor onSave={handleSave} />
<Button onClick={() => setShowPreview(true)}>预览</Button>
```

### 3. 渐进式复杂度 (Progressive Complexity)

界面应该保持简洁，高级功能在需要时才显示，避免新手用户感到困惑。

```typescript
// ✅ 好的设计：渐进式暴露功能
<SimpleComponentEditor />
<AdvancedSettings collapsed={true} onToggle={showAdvanced} />

// ❌ 避免：一次性显示所有功能
<ComplexComponentEditor showAllOptions={true} />
```

### 4. 模块化组合 (Modular Composition)

用户应该像搭积木一样组合组件，每个组件都有明确的功能和边界。

```typescript
// ✅ 好的设计：清晰的组件边界
<ComponentLibrary>
  <ComponentCategory name="表单组件">
    <FormInput />
    <FormButton />
  </ComponentCategory>
</ComponentLibrary>

// ❌ 避免：混合功能组件
<MegaComponent form={true} table={true} chart={true} />
```

### 5. 简洁专业 (Clean & Professional)

设计应该简洁、现代，体现专业开发工具的特点，避免过度装饰。

---

## 视觉设计系统

### 色彩系统

#### 主色调
```css
/* 品牌主色 */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* 主品牌色 */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;

/* 辅助色 */
--secondary-50: #f8fafc;
--secondary-100: #f1f5f9;
--secondary-200: #e2e8f0;
--secondary-300: #cbd5e1;
--secondary-400: #94a3b8;
--secondary-500: #64748b;
--secondary-600: #475569;
--secondary-700: #334155;
--secondary-800: #1e293b;
--secondary-900: #0f172a;
```

#### 语义化色彩
```css
/* 成功 */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

/* 错误 */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-600: #dc2626;

/* 警告 */
--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

/* 信息 */
--info-50: #eff6ff;
--info-500: #3b82f6;
--info-600: #2563eb;
```

### 字体系统

#### 字体族
```css
/* 系统字体栈 */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

/* 等宽字体 */
--font-mono: "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", Menlo, Consolas, monospace;
```

#### 字体大小
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

#### 字重
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 间距系统

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 圆角系统

```css
--radius-none: 0;
--radius-sm: 0.125rem;    /* 2px */
--radius-base: 0.25rem;   /* 4px */
--radius-md: 0.375rem;    /* 6px */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 0.75rem;     /* 12px */
--radius-2xl: 1rem;       /* 16px */
--radius-full: 9999px;
```

---

## 组件设计规范

### 1. 按钮 (Buttons)

#### 主要按钮
```typescript
<PrimaryButton
  size="md"           // sm | md | lg
  variant="solid"     // solid | outline | ghost
  disabled={false}
  loading={false}
  leftIcon={<PlusIcon />}
  onClick={handleClick}
>
  创建项目
</PrimaryButton>
```

**设计规范:**
- 高度: 32px (sm) | 40px (md) | 48px (lg)
- 圆角: 6px
- 字重: 500 (medium)
- 内边距: 8px 16px (md)

#### 次要按钮
```typescript
<SecondaryButton
  size="md"
  variant="outline"
  onClick={handleCancel}
>
  取消
</SecondaryButton>
```

### 2. 表单组件 (Form Components)

#### 输入框
```typescript
<FormField
  label="项目名称"
  description="项目名称将在URL中使用，只能包含字母、数字和连字符"
  required
  error={errors.name}
>
  <Input
    type="text"
    placeholder="输入项目名称"
    value={value}
    onChange={onChange}
    invalid={!!errors.name}
  />
</FormField>
```

**设计规范:**
- 高度: 40px
- 边框: 1px solid var(--border-color)
- 聚焦状态: 蓝色边框 + 蓝色阴影
- 错误状态: 红色边框 + 错误信息

#### 选择器
```typescript
<Select
  value={selectedValue}
  onValueChange={setSelectedValue}
  placeholder="选择一个选项"
>
  <SelectItem value="option1">选项 1</SelectItem>
  <SelectItem value="option2">选项 2</SelectItem>
</Select>
```

### 3. 数据展示 (Data Display)

#### 表格
```typescript
<DataTable
  columns={columns}
  data={data}
  pagination={pagination}
  loading={loading}
  emptyState={<EmptyState message="暂无数据" />}
  onRowClick={handleRowClick}
  sortable
  filterable
/>
```

**设计规范:**
- 行高: 48px
- 边框: 1px solid var(--border-color)
- 悬停状态: 浅灰色背景
- 选中状态: 主色背景 + 白色文字

#### 卡片
```typescript
<Card
  className="hover:shadow-lg transition-shadow"
  padding="md"
  shadow="sm"
>
  <CardHeader>
    <CardTitle>项目名称</CardTitle>
    <CardDescription>项目描述</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 卡片内容 */}
  </CardContent>
  <CardFooter>
    <Button variant="outline">查看详情</Button>
  </CardFooter>
</Card>
```

### 4. 导航 (Navigation)

#### 侧边栏导航
```typescript
<Sidebar>
  <SidebarHeader>
    <Logo />
  </SidebarHeader>
  <SidebarContent>
    <SidebarNav>
      <SidebarNavItem href="/dashboard" icon={<DashboardIcon />}>
        仪表板
      </SidebarNavItem>
      <SidebarNavItem href="/projects" icon={<ProjectIcon />}>
        项目管理
      </SidebarNavItem>
    </SidebarNav>
  </SidebarContent>
  <SidebarFooter>
    <UserMenu />
  </SidebarFooter>
</Sidebar>
```

#### 面包屑导航
```typescript
<Breadcrumb>
  <BreadcrumbItem href="/dashboard">仪表板</BreadcrumbItem>
  <BreadcrumbItem href="/projects">项目</BreadcrumbItem>
  <BreadcrumbItem current>项目详情</BreadcrumbItem>
</Breadcrumb>
```

---

## 交互模式

### 1. 拖拽交互

#### 组件拖拽
```typescript
<DraggableComponent
  id={component.id}
  type={component.type}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <ComponentThumbnail component={component} />
</DraggableComponent>

<DropZone
  onDrop={handleDrop}
  onDragOver={handleDragOver}
  acceptTypes={['form', 'display', 'layout']}
>
  {isDragOver && <DropIndicator />}
</DropZone>
```

**视觉反馈:**
- 拖拽开始: 组件半透明 + 拖拽阴影
- 悬停目标: 蓝色边框 + 插入指示器
- 拖拽结束: 平滑过渡动画

### 2. 属性编辑

#### 属性面板
```typescript
<PropertyPanel>
  <PropertySection title="基础属性">
    <PropertyField label="标签">
      <Input value={properties.label} onChange={updateProperty} />
    </PropertyField>
    <PropertyField label="必需">
      <Switch checked={properties.required} onCheckedChange={updateProperty} />
    </PropertyField>
  </PropertySection>

  <PropertySection title="样式属性">
    <ColorPicker
      label="背景颜色"
      value={properties.backgroundColor}
      onChange={updateProperty}
    />
  </PropertySection>
</PropertyPanel>
```

**交互特性:**
- 实时预览: 属性更改立即反映在画布上
- 分组管理: 相关属性分组显示
- 智能提示: 根据组件类型显示相关属性

### 3. 状态管理

#### 加载状态
```typescript
{loading ? (
  <LoadingState>
    <Spinner />
    <Text>正在加载...</Text>
  </LoadingState>
) : (
  <ComponentContent />
)}
```

#### 错误状态
```typescript
{error ? (
  <ErrorState
    title="加载失败"
    description={error.message}
    action={
      <Button onClick={retry}>
        重试
      </Button>
    }
  />
) : (
  <ComponentContent />
)}
```

#### 空状态
```typescript
{data.length === 0 ? (
  <EmptyState
    icon={<FolderIcon />}
    title="暂无项目"
    description="创建您的第一个项目开始使用FastBuild"
    action={
      <Button onClick={createProject}>
        创建项目
      </Button>
    }
  />
) : (
  <ProjectList projects={data} />
)}
```

---

## 响应式设计

### 断点系统

```css
/* 移动端 */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .sidebar {
    transform: translateX(-100%);
  }
}

/* 平板 */
@media (min-width: 769px) and (max-width: 1024px) {
  .container {
    padding: 2rem;
  }
}

/* 桌面端 */
@media (min-width: 1025px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### 移动端适配

#### 触摸友好
- 最小点击区域: 44px × 44px
- 按钮间距: 至少8px
- 手势支持: 滑动、拖拽、捏合缩放

#### 布局调整
```typescript
<ResponsiveLayout>
  <MobileLayout>
    <MobileNavigation />
    <MobileContent />
  </MobileLayout>

  <DesktopLayout>
    <DesktopSidebar />
    <DesktopContent />
  </DesktopLayout>
</ResponsiveLayout>
```

---

## 可访问性 (Accessibility)

### 1. 键盘导航

```typescript
<Component
  tabIndex={0}
  onKeyDown={handleKeyDown}
  aria-label="组件描述"
>
  {/* 组件内容 */}
</Component>
```

**键盘快捷键:**
- `Tab`: 导航到下一个可聚焦元素
- `Shift + Tab`: 导航到上一个元素
- `Enter`: 激活按钮或链接
- `Space`: 激活按钮或复选框
- `Escape`: 关闭模态框或取消操作

### 2. 屏幕阅读器支持

```typescript
<button
  aria-label="删除项目"
  aria-describedby="delete-description"
  onClick={deleteProject}
>
  <TrashIcon aria-hidden="true" />
</button>
<div id="delete-description" className="sr-only">
  此操作不可撤销，请谨慎操作
</div>
```

### 3. 颜色对比度

确保所有文本和背景的对比度符合WCAG 2.1 AA标准:
- 正常文本: 至少4.5:1
- 大文本: 至少3:1
- 非文本元素: 至少3:1

---

## 动画和过渡

### 1. 过渡效果

```css
/* 标准过渡 */
.transition-standard {
  transition: all 0.2s ease-in-out;
}

/* 悬停效果 */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 焦点效果 */
.focus-ring:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### 2. 微交互

#### 按钮点击
```css
.button:active {
  transform: scale(0.98);
  transition: transform 0.1s ease-in-out;
}
```

#### 数据加载
```css
.skeleton {
  background: linear-gradient(90deg,
    var(--secondary-200) 25%,
    var(--secondary-100) 50%,
    var(--secondary-200) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 3. 页面转换

```typescript
<PageTransition>
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <PageContent />
  </motion.div>
</PageTransition>
```

---

## 内容策略

### 1. 文案风格

#### 语调
- **专业**: 使用准确的技术术语
- **友好**: 避免过于生硬的表达
- **简洁**: 用最少的文字传达信息
- **一致**: 保持统一的语调风格

#### 示例
```typescript
// ✅ 好的文案
<Button>创建新项目</Button>
<Text>项目创建成功！现在您可以开始构建应用了。</Text>

// ❌ 避免
<Button>执行项目初始化操作</Button>
<Text>系统已完成项目建立流程，请继续后续操作。</Text>
```

### 2. 错误信息

#### 友好的错误提示
```typescript
<ErrorAlert
  title="项目名称已存在"
  description="请选择一个不同的项目名称，或编辑现有项目。"
  action={
    <Button variant="outline" onClick={editExistingProject}>
      编辑现有项目
    </Button>
  }
/>
```

#### 帮助文档链接
```typescript
<FormField
  label="API密钥"
  description={
    <span>
      从您的API提供商获取密钥。
      <Link href="/docs/api-keys" target="_blank">
        了解如何获取API密钥 →
      </Link>
    </span>
  }
/>
```

---

## 性能优化

### 1. 图片优化

```typescript
<OptimizedImage
  src={imageUrl}
  alt="图片描述"
  width={300}
  height={200}
  placeholder="blur"
  loading="lazy"
/>
```

### 2. 代码分割

```typescript
// 懒加载重型组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### 3. 虚拟滚动

```typescript
<VirtualizedList
  height={400}
  itemCount={items.length}
  itemSize={50}
  renderItem={({ index, style }) => (
    <div style={style}>
      <ListItem item={items[index]} />
    </div>
  )}
/>
```

---

## 测试策略

### 1. 可视化回归测试

```typescript
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../theme';

// 组件快照测试
test('Button renders correctly', () => {
  render(
    <ThemeProvider>
      <Button>Click me</Button>
    </ThemeProvider>
  );

  expect(screen.getByRole('button')).toMatchSnapshot();
});
```

### 2. 可访问性测试

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

test('Button is accessible', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 3. 用户交互测试

```typescript
import userEvent from '@testing-library/user-event';

test('Button click triggers action', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  const button = screen.getByRole('button');
  await userEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

---

## 设计工具和资源

### 1. 设计工具
- **Figma**: 主要设计工具
- **Storybook**: 组件展示和测试
- **Chrome DevTools**: 性能分析和调试

### 2. 资源库
- **图标**: Lucide React
- **插图**: undraw.co, illustrations.co
- **照片**: Unsplash, Pexels

### 3. 协作流程

#### 设计评审
1. **设计稿评审**: 每周五进行设计评审会议
2. **代码评审**: 确保实现符合设计规范
3. **用户测试**: 定期进行用户可用性测试

#### 版本管理
- **设计版本**: Figma文件版本控制
- **组件版本**: Storybook版本管理
- **文档更新**: 及时更新设计文档

---

## 持续改进

### 1. 用户反馈收集

```typescript
<FeedbackWidget
  type="suggestion"
  onSubmit={handleFeedback}
  trigger={
    <Button variant="ghost" size="sm">
      建议改进
    </Button>
  }
/>
```

### 2. 使用数据分析

- **用户行为分析**: 热力图、点击流分析
- **性能监控**: 页面加载时间、交互响应时间
- **错误追踪**: 前端错误日志和分析

### 3. A/B测试

```typescript
<ABTest
  name="new-button-design"
  variants={[
    { name: 'control', weight: 0.5 },
    { name: 'variant', weight: 0.5 }
  ]}
>
  {variant => (
    <Button variant={variant === 'control' ? 'default' : 'new'}>
      点击我
    </Button>
  )}
</ABTest>
```

---

**文档维护**: 本设计规范应该随着产品发展持续更新，确保设计与产品演进保持同步。

**下次更新**: 2025-11-11
**责任人**: UX设计团队