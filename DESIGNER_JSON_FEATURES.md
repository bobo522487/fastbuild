# 设计器JSON支持功能

## 概述

本功能实现了基于设计器JSON的动态表单渲染，支持精确的布局控制和丰富的字段类型。设计器JSON可以从表单设计器导出，并在运行时完美还原设计时的布局和样式。

## 核心功能

### ✅ 已实现功能

1. **24列网格布局系统**
   - 支持精确的列宽度控制（1-24列）
   - 响应式设计：移动端自动变为全宽，桌面端保持设计布局
   - 支持列偏移、推送、拉动等高级布局功能

2. **字段类型支持**
   - 文本输入框 (`input`)
   - 数字输入框 (`inputNumber`)
   - 选择器 (`select`)
   - 日期选择 (`date`)
   - 多行文本 (`textarea`)
   - 复选框 (`checkbox`)
   - 单选按钮 (`radio`)
   - 文件上传 (`upload`)

3. **布局控制**
   - 两列布局：`col.span: 12`
   - 三列布局：`col.span: 8`
   - 四列布局：`col.span: 6`
   - 全宽字段：`col.span: 24`
   - 列偏移：`col.offset`

4. **组件属性支持**
   - 占位符 (`placeholder`)
   - 最大长度 (`maxlength`)
   - 最小长度 (`minlength`)
   - 正则验证 (`pattern`)
   - 必填验证 (`$required`)
   - 默认值 (`defaultValue`)
   - 禁用状态 (`disabled`)
   - 只读状态 (`readonly`)

5. **验证功能**
   - 必填字段验证
   - 字段长度验证
   - 数字范围验证
   - 邮箱格式验证
   - 实时错误提示
   - 提交前完整验证

## 设计器JSON格式

### 基本结构

```json
[
  {
    "type": "input",
    "field": "name",
    "title": "姓名",
    "name": "name",
    "info": "请输入您的真实姓名",
    "$required": true,
    "props": {
      "placeholder": "请输入姓名",
      "maxlength": 50
    },
    "col": {
      "span": 12
    },
    "_fc_id": "name_field",
    "_fc_drag_tag": "input"
  }
]
```

### 两列布局示例

```json
[
  {
    "type": "input",
    "field": "firstName",
    "title": "名",
    "name": "firstName",
    "col": { "span": 12 }
  },
  {
    "type": "input",
    "field": "lastName",
    "title": "姓",
    "name": "lastName",
    "col": { "span": 12 }
  }
]
```

### 复杂布局示例

```json
[
  {
    "type": "input",
    "field": "company",
    "title": "公司名称",
    "name": "company",
    "col": { "span": 16, "offset": 4 }
  },
  {
    "type": "input",
    "field": "phone",
    "title": "电话",
    "name": "phone",
    "col": { "span": 8 }
  },
  {
    "type": "input",
    "field": "ext",
    "title": "分机号",
    "name": "ext",
    "col": { "span": 8 }
  },
  {
    "type": "input",
    "field": "mobile",
    "title": "手机",
    "name": "mobile",
    "col": { "span": 8 }
  }
]
```

## 技术实现

### 核心组件

1. **DesignerFormRenderer**
   - 位置：`apps/web/components/forms/DesignerFormRenderer.tsx`
   - 功能：渲染设计器JSON为动态表单
   - 支持：网格布局、响应式设计、实时验证

2. **JSON转换器**
   - 位置：`packages/schema-compiler/src/designer-json-converter.ts`
   - 功能：双向转换设计器JSON和FormMetadata
   - 支持：类型映射、属性转换、布局解析

3. **类型定义**
   - 位置：`packages/types/src/index.ts`
   - 扩展：DesignerUIConfig、DesignerFormField、DesignerFormMetadata
   - 支持：完整的类型安全保障

### CSS网格系统

- 位置：`apps/web/styles/accessibility.css`
- 功能：24列响应式网格系统
- 断点：sm、md、lg、xl
- 特性：移动优先、无障碍支持

## 使用方法

### 基本使用

```tsx
import { DesignerFormRenderer } from './components/forms/DesignerFormRenderer';

const designerJson = [
  {
    type: 'input',
    field: 'name',
    title: '姓名',
    name: 'name',
    col: { span: 12 },
    $required: true
  },
  {
    type: 'email',
    field: 'email',
    title: '邮箱',
    name: 'email',
    col: { span: 12 },
    $required: true
  }
];

function MyForm() {
  return (
    <DesignerFormRenderer
      designerJson={designerJson}
      onSubmit={handleSubmit}
      maxContentWidth="lg"
      layout="grid"
    />
  );
}
```

### 测试页面

访问 `http://localhost:3000/demo/designer-json-test` 查看完整的功能演示和测试页面。

## 验证测试

### 自动化验证

运行验证脚本：

```bash
node scripts/validate-designer-json.js
```

### 测试覆盖

- ✅ JSON结构验证
- ✅ 两列布局验证
- ✅ 响应式设计验证
- ✅ 字段类型映射验证
- ✅ 组件属性转换验证
- ✅ 必填字段验证
- ✅ 类型安全检查

## 性能优化

1. **缓存机制**
   - Schema编译结果缓存
   - 性能指标缓存
   - LRU缓存策略

2. **响应式优化**
   - 移动端优先策略
   - CSS Grid高效布局
   - 防抖和节流处理

3. **内存管理**
   - 弱引用存储
   - 自动垃圾回收
   - 内存泄漏防护

## 未来扩展

### 计划功能

1. **更多字段类型**
   - 富文本编辑器
   - 图片上传
   - 评分组件
   - 滑块组件

2. **高级布局**
   - 嵌套表单
   - 选项卡布局
   - 分步骤表单
   - 动态字段增减

3. **条件逻辑**
   - 字段显示/隐藏
   - 动态验证规则
   - 级联选择器
   - 计算字段

4. **主题系统**
   - 多主题支持
   - 自定义样式
   - 品牌定制
   - 无障碍主题

## 总结

设计器JSON支持功能已完整实现，具备以下特点：

- **完整性**：支持所有常用字段类型和布局配置
- **准确性**：设计时和运行时布局完全一致
- **响应式**：自动适配不同屏幕尺寸
- **类型安全**：完整的TypeScript类型定义
- **性能优化**：缓存机制和高效渲染
- **易于使用**：简单的API和丰富的示例

该功能为低代码平台提供了强大的表单设计和渲染能力。