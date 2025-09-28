// UI类型定义合同：Schema驱动运行时MVP
// 版本: 1.0.0
// 分支: 002-schema-driven-runtime-mvp

import { z } from 'zod';

// 布局配置
export const LayoutConfigSchema = z.object({
  type: z.enum(['vertical', 'horizontal', 'grid', 'inline']),
  spacing: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('md'),
  columns: z.number().optional(),
  gap: z.number().optional(),
  alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justifyContent: z.enum(['start', 'center', 'end', 'between', 'around']).optional()
});

export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

// 主题配置
export const ThemeConfigSchema = z.object({
  mode: z.enum(['light', 'dark', 'auto']).default('light'),
  primaryColor: z.string().default('#3b82f6'),
  secondaryColor: z.string().default('#6b7280'),
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#111827'),
  borderColor: z.string().default('#e5e7eb'),
  borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'full']).default('md'),
  fontSize: z.enum(['xs', 'sm', 'base', 'lg', 'xl']).default('base')
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

// 尺寸变体
export const SizeVariantSchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl']);

export type SizeVariant = z.infer<typeof SizeVariantSchema>;

// 样式变体
export const StyleVariantSchema = z.enum([
  'default',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'ghost',
  'link'
]);

export type StyleVariant = z.infer<typeof StyleVariantSchema>;

// 基础UI组件配置
export const BaseUIComponentConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  disabled: z.boolean().default(false),
  readonly: z.boolean().default(false),
  hidden: z.boolean().default(false),
  size: SizeVariantSchema.default('md'),
  variant: StyleVariantSchema.default('default'),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
  testId: z.string().optional()
});

export type BaseUIComponentConfig = z.infer<typeof BaseUIComponentConfigSchema>;

// 输入组件配置
export const InputComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.enum(['text', 'number', 'email', 'password', 'tel', 'url']),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  pattern: z.string().optional(),
  autoComplete: z.string().optional(),
  autoFocus: z.boolean().default(false),
  prefix: z.string().optional(),
  suffix: z.string().optional()
});

export type InputComponentConfig = z.infer<typeof InputComponentConfigSchema>;

// 文本域组件配置
export const TextareaComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.literal('textarea'),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  rows: z.number().default(4),
  resize: z.enum(['none', 'both', 'horizontal', 'vertical']).default('vertical'),
  autoComplete: z.string().optional()
});

export type TextareaComponentConfig = z.infer<typeof TextareaComponentConfigSchema>;

// 选择组件配置
export const SelectComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.enum(['select', 'multiselect']),
  placeholder: z.string().optional(),
  defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    disabled: z.boolean().default(false),
    group: z.string().optional()
  })),
  searchable: z.boolean().default(false),
  clearable: z.boolean().default(false),
  multiple: z.boolean().default(false),
  loading: z.boolean().default(false)
});

export type SelectComponentConfig = z.infer<typeof SelectComponentConfigSchema>;

// 复选框组件配置
export const CheckboxComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.enum(['checkbox', 'switch']),
  checked: z.boolean().default(false),
  indeterminate: z.boolean().default(false),
  required: z.boolean().default(false),
  description: z.string().optional()
});

export type CheckboxComponentConfig = z.infer<typeof CheckboxComponentConfigSchema>;

// 单选框组件配置
export const RadioComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.literal('radio'),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    disabled: z.boolean().default(false)
  })),
  defaultValue: z.string().optional()
});

export type RadioComponentConfig = z.infer<typeof RadioComponentConfigSchema>;

// 日期组件配置
export const DateComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.enum(['date', 'datetime', 'time']),
  defaultValue: z.date().optional(),
  minDate: z.date().optional(),
  maxDate: z.date().optional(),
  disabledDates: z.array(z.date()).optional(),
  format: z.string().optional(),
  placeholder: z.string().optional(),
  showTime: z.boolean().default(false),
  disabled: z.boolean().default(false)
});

export type DateComponentConfig = z.infer<typeof DateComponentConfigSchema>;

// 文件上传组件配置
export const FileComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.literal('file'),
  accept: z.string().optional(),
  multiple: z.boolean().default(false),
  maxSize: z.number().optional(),
  minSize: z.number().optional(),
  maxFiles: z.number().optional(),
  placeholder: z.string().optional(),
  showPreview: z.boolean().default(false)
});

export type FileComponentConfig = z.infer<typeof FileComponentConfigSchema>;

// 按钮组件配置
export const ButtonComponentConfigSchema = BaseUIComponentConfigSchema.extend({
  type: z.enum(['button', 'submit', 'reset']),
  text: z.string(),
  icon: z.string().optional(),
  iconPosition: z.enum(['left', 'right']).default('left'),
  loading: z.boolean().default(false),
  fullWidth: z.boolean().default(false),
  onClick: z.function().optional()
});

export type ButtonComponentConfig = z.infer<typeof ButtonComponentConfigSchema>;

// 表单UI配置
export const FormUIConfigSchema = z.object({
  layout: LayoutConfigSchema.default({ type: 'vertical' }),
  theme: ThemeConfigSchema.default({}),
  showLabels: z.boolean().default(true),
  showDescriptions: z.boolean().default(true),
  showValidation: z.boolean().default(true),
  submitButton: ButtonComponentConfigSchema.optional(),
  cancelButton: ButtonComponentConfigSchema.optional(),
  resetButton: ButtonComponentConfigSchema.optional(),
  fieldsets: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(z.string()),
    collapsible: z.boolean().default(false)
  })).optional()
});

export type FormUIConfig = z.infer<typeof FormUIConfigSchema>;

// UI组件联合类型
export const FormUIComponentSchema = z.discriminatedUnion('type', [
  InputComponentConfigSchema,
  TextareaComponentConfigSchema,
  SelectComponentConfigSchema,
  CheckboxComponentConfigSchema,
  RadioComponentConfigSchema,
  DateComponentConfigSchema,
  FileComponentConfigSchema,
  ButtonComponentConfigSchema
]);

export type FormUIComponent = z.infer<typeof FormUIComponentSchema>;

// UI状态
export const UIStateSchema = z.object({
  isLoading: z.boolean().default(false),
  isSubmitting: z.boolean().default(false),
  isValid: z.boolean().default(true),
  isDirty: z.boolean().default(false),
  touched: z.array(z.string()).default([]),
  errors: z.record(z.array(z.string())).default({}),
  warnings: z.record(z.array(z.string())).default({})
});

export type UIState = z.infer<typeof UIStateSchema>;

// UI事件
export const UIEventTypeSchema = z.enum([
  'focus',
  'blur',
  'change',
  'submit',
  'reset',
  'error',
  'warning',
  'success'
]);

export type UIEventType = z.infer<typeof UIEventTypeSchema>;

export const UIEventSchema = z.object({
  type: UIEventTypeSchema,
  componentId: z.string(),
  timestamp: z.date(),
  data: z.any().optional()
});

export type UIEvent = z.infer<typeof UIEventSchema>;

// UI事件处理器
export interface UIEventHandler {
  handle(event: UIEvent): Promise<void>;
}

// UI组件渲染器
export interface UIComponentRenderer {
  render(config: FormUIComponent): React.ReactNode;
  canRender(type: string): boolean;
}

// UI主题提供者
export interface UIThemeProvider {
  getTheme(): ThemeConfig;
  setTheme(theme: ThemeConfig): void;
  addVariant(name: string, styles: any): void;
  removeVariant(name: string): void;
}

// UI响应式配置
export const ResponsiveConfigSchema = z.object({
  breakpoints: z.record(z.number()).default({
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
  }),
  container: z.object({
    maxWidth: z.record(z.string()).default({
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px'
    })
  })
});

export type ResponsiveConfig = z.infer<typeof ResponsiveConfigSchema>;

// UI可访问性配置
export const AccessibilityConfigSchema = z.object({
  ariaLabels: z.record(z.string()).optional(),
  roles: z.record(z.string()).optional(),
  descriptions: z.record(z.string()).optional(),
  keyboardNavigation: z.boolean().default(true),
  screenReaderSupport: z.boolean().default(true),
  highContrastMode: z.boolean().default(false)
});

export type AccessibilityConfig = z.infer<typeof AccessibilityConfigSchema>;

// UI动画配置
export const AnimationConfigSchema = z.object({
  duration: z.number().default(200),
  easing: z.string().default('ease-in-out'),
  enabled: z.boolean().default(true),
  animations: z.record(z.object({
    duration: z.number().optional(),
    easing: z.string().optional(),
    delay: z.number().default(0)
  })).optional()
});

export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;

// 完整的UI配置
export const CompleteUIConfigSchema = FormUIConfigSchema.extend({
  responsive: ResponsiveConfigSchema.default({}),
  accessibility: AccessibilityConfigSchema.default({}),
  animations: AnimationConfigSchema.default({})
});

export type CompleteUIConfig = z.infer<typeof CompleteUIConfigSchema>;