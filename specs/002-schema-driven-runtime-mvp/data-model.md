# 数据模型设计：Schema驱动运行时MVP

**版本**: 1.0.0
**创建日期**: 2025-09-28
**分支**: 002-schema-driven-runtime-mvp

## 📋 概述

本文档定义了Schema驱动表单系统的核心数据模型，包括FormMetadata结构、验证规则、提交数据格式等。设计遵循宪法原则，确保类型安全和Schema-First架构。

## 🏗️ 核心数据模型

### 1. FormMetadata（表单元数据）

表单元数据是系统的核心数据结构，定义了表单的完整配置信息。

```typescript
interface FormMetadata {
  version: string;                    // 表单版本号
  title?: string;                     // 表单标题
  description?: string;               // 表单描述
  fields: FormField[];                // 字段定义数组
  validation?: FormValidation;        // 表单级验证规则
  ui?: FormUIConfig;                  // UI配置
  submit?: SubmitConfig;              // 提交配置
}
```

### 2. FormField（字段定义）

每个表单字段的详细配置信息。

```typescript
interface FormField {
  id: string;                         // 唯一标识符
  name: string;                       // 字段名（作为数据键）
  type: FieldType;                     // 字段类型
  label: string;                       // 显示标签
  placeholder?: string;                // 占位符文本
  description?: string;                // 字段描述
  required?: boolean;                  // 是否必填
  defaultValue?: any;                 // 默认值
  validation?: FieldValidation;       // 字段级验证规则
  ui?: FieldUIConfig;                 // 字段UI配置
  condition?: FieldCondition;        // 条件显示逻辑
  options?: SelectOption[];           // 选择项（仅select类型）
}
```

### 3. FieldType（字段类型）

系统支持的字段类型枚举。

```typescript
type FieldType =
  | 'text'           // 单行文本
  | 'number'         // 数字输入
  | 'email'          // 邮箱地址
  | 'textarea'       // 多行文本
  | 'select'         // 下拉选择
  | 'checkbox'       // 复选框
  | 'radio'          // 单选按钮
  | 'date'           // 日期选择
  | 'datetime'       // 日期时间
  | 'file'           // 文件上传
  | 'password';      // 密码输入
```

### 4. SelectOption（选择项）

用于select、radio等类型的选项配置。

```typescript
interface SelectOption {
  value: string;                       // 选项值
  label: string;                       // 显示文本
  disabled?: boolean;                 // 是否禁用
  description?: string;               // 选项描述
}
```

## 🔍 验证规则模型

### 1. FormValidation（表单级验证）

```typescript
interface FormValidation {
  mode?: 'onChange' | 'onBlur' | 'onSubmit';  // 验证模式
  revalidateMode?: 'onChange' | 'onBlur';     // 重新验证模式
  customRules?: CustomValidationRule[];        // 自定义验证规则
}
```

### 2. FieldValidation（字段级验证）

```typescript
interface FieldValidation {
  required?: boolean | string;           // 必填验证，可提供错误消息
  minLength?: number | string;           // 最小长度
  maxLength?: number | string;           // 最大长度
  min?: number | string;                 // 最小值
  max?: number | string;                 // 最大值
  pattern?: RegExp | string;             // 正则表达式
  custom?: CustomValidationRule[];       // 自定义验证规则
  async?: AsyncValidationRule[];         // 异步验证规则
}
```

### 3. CustomValidationRule（自定义验证规则）

```typescript
interface CustomValidationRule {
  name: string;                         // 规则名称
  validator: (value: any) => boolean | Promise<boolean>;  // 验证函数
  message: string;                       // 错误消息
}
```

## 🎨 UI配置模型

### 1. FormUIConfig（表单UI配置）

```typescript
interface FormUIConfig {
  layout?: 'vertical' | 'horizontal' | 'inline';   // 布局方式
  theme?: 'light' | 'dark' | 'auto';                 // 主题
  size?: 'sm' | 'md' | 'lg';                         // 尺寸
  showLabels?: boolean;                               // 是否显示标签
  showDescriptions?: boolean;                         // 是否显示描述
  submitButton?: ButtonConfig;                         // 提交按钮配置
  cancelButton?: ButtonConfig;                         // 取消按钮配置
}
```

### 2. FieldUIConfig（字段UI配置）

```typescript
interface FieldUIConfig {
  width?: string | number;             // 字段宽度
  className?: string;                 // 自定义CSS类
  placeholder?: string;                // 占位符文本
  helpText?: string;                  // 帮助文本
  showError?: boolean;                // 是否显示错误信息
  showSuccess?: boolean;              // 是否显示成功状态
}
```

### 3. ButtonConfig（按钮配置）

```typescript
interface ButtonConfig {
  text: string;                        // 按钮文本
  variant?: 'default' | 'primary' | 'secondary' | 'danger';  // 按钮样式
  size?: 'sm' | 'md' | 'lg';          // 按钮尺寸
  disabled?: boolean;                 // 是否禁用
  loading?: boolean;                  // 加载状态
  icon?: string;                      // 图标
}
```

## 🔀 条件逻辑模型

### 1. FieldCondition（字段条件）

```typescript
interface FieldCondition {
  fieldId: string;                     // 依赖字段ID
  operator: ConditionOperator;        // 比较操作符
  value: any;                         // 比较值
  logic?: 'AND' | 'OR';               // 逻辑操作符（多条件时）
  conditions?: FieldCondition[];      // 嵌套条件
}
```

### 2. ConditionOperator（条件操作符）

```typescript
type ConditionOperator =
  | 'equals'          // 等于
  | 'not_equals'      // 不等于
  | 'contains'        // 包含
  | 'not_contains'    // 不包含
  | 'starts_with'     // 开头匹配
  | 'ends_with'       // 结尾匹配
  | 'greater_than'    // 大于
  | 'less_than'       // 小于
  | 'in'              // 在列表中
  | 'not_in'          // 不在列表中
  | 'empty'           // 为空
  | 'not_empty';      // 不为空
```

## 📤 提交配置模型

### 1. SubmitConfig（提交配置）

```typescript
interface SubmitConfig {
  endpoint?: string;                   // 提交端点
  method?: 'POST' | 'PUT' | 'PATCH';   // HTTP方法
  headers?: Record<string, string>;     // 请求头
  transform?: SubmitTransform;         // 数据转换函数
  validate?: boolean;                  // 提交前验证
  onSuccess?: SubmitHandler;           // 成功回调
  onError?: SubmitHandler;             // 错误回调
  onFinally?: SubmitHandler;           // 完成回调
}
```

### 2. SubmitTransform（数据转换）

```typescript
interface SubmitTransform {
  before?: (data: FormData) => any;     // 提交前转换
  after?: (response: any) => any;      // 响应后转换
  error?: (error: any) => any;         // 错误转换
}
```

### 3. SubmitHandler（提交处理器）

```typescript
type SubmitHandler = (data: any, context?: SubmitContext) => void | Promise<void>;

interface SubmitContext {
  form: FormMetadata;                  // 表单元数据
  values: Record<string, any>;        // 表单值
  timestamp: Date;                     // 提交时间
  validation: ValidationResult;        // 验证结果
}
```

## 📊 数据模型关系

### 核心实体关系图

```
FormMetadata (表单元数据)
├── fields: FormField[] (字段数组)
│   ├── type: FieldType (字段类型)
│   ├── validation: FieldValidation (验证规则)
│   ├── ui: FieldUIConfig (UI配置)
│   ├── condition: FieldCondition (条件逻辑)
│   └── options: SelectOption[] (选择项)
├── validation: FormValidation (表单验证)
├── ui: FormUIConfig (表单UI配置)
└── submit: SubmitConfig (提交配置)
```

### 数据流转换

```
FormMetadata → Zod Schema → React Hook Form → UI Components
     ↓
FormData (用户输入) → Validation → Submit → Database/API
```

## 🔐 类型安全保证

### 1. Schema编译类型

```typescript
// FormMetadata到Zod Schema的类型安全转换
interface SchemaCompiler {
  compile(metadata: FormMetadata): z.ZodSchema<any>;
  validate(schema: z.ZodSchema<any>, data: any): ValidationResult;
}

// 验证结果类型
interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  data?: any;
}

// 验证错误类型
interface ValidationError {
  fieldId: string;
  message: string;
  code: string;
  values?: Record<string, any>;
}
```

### 2. 运行时类型检查

```typescript
// 确保运行时数据符合预期类型
class TypeGuard {
  static isFormMetadata(obj: any): obj is FormMetadata {
    return (
      typeof obj === 'object' &&
      typeof obj.version === 'string' &&
      Array.isArray(obj.fields) &&
      obj.fields.every((field: any) => TypeGuard.isFormField(field))
    );
  }

  static isFormField(obj: any): obj is FormField {
    return (
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      this.isValidFieldType(obj.type)
    );
  }

  private static isValidFieldType(type: any): type is FieldType {
    const validTypes: FieldType[] = [
      'text', 'number', 'email', 'textarea', 'select',
      'checkbox', 'radio', 'date', 'datetime', 'file', 'password'
    ];
    return validTypes.includes(type);
  }
}
```

## 📈 扩展性设计

### 1. 插件系统

```typescript
interface FieldPlugin {
  type: FieldType;
  component: React.ComponentType<FieldComponentProps>;
  validator?: (value: any, rules: FieldValidation) => ValidationResult;
  serializer?: (value: any) => any;
  deserializer?: (value: any) => any;
}

interface FormPluginRegistry {
  register(plugin: FieldPlugin): void;
  get(type: FieldType): FieldPlugin | undefined;
  getAll(): FieldPlugin[];
}
```

### 2. 自定义字段类型

```typescript
// 支持扩展自定义字段类型
interface CustomFieldType {
  name: string;
  component: React.ComponentType<FieldComponentProps>;
  defaultValue?: any;
  validationRules?: string[];
  options?: {
    multiple?: boolean;
    searchable?: boolean;
    clearable?: boolean;
  };
}
```

## 🔄 版本兼容性

### 1. 向后兼容策略

- FormMetadata结构添加新字段时保持可选
- 删除字段时提供迁移路径
- 主要版本变更时提供兼容性检查

### 2. 迁移工具

```typescript
interface MigrationRule {
  from: string;
  to: string;
  transform: (metadata: any) => FormMetadata;
}

class MetadataMigrator {
  private rules: MigrationRule[] = [];

  addRule(rule: MigrationRule): void {
    this.rules.push(rule);
  }

  migrate(metadata: any, targetVersion: string): FormMetadata {
    // 执行迁移逻辑
  }
}
```

---

**文档状态**: 设计完成
**审核状态**: 待审核
**下一步**: 创建API合同规范