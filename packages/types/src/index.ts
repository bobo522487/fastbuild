import type { ZodObject } from 'zod';

/**
 * 表单字段类型定义
 */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';

/**
 * 条件运算符
 */
export type ConditionOperator = 'equals' | 'not_equals';

/**
 * 表单字段条件配置
 */
export interface FieldCondition {
  /** 依赖字段的 ID */
  fieldId: string;
  /** 判断操作符 */
  operator: ConditionOperator;
  /** 触发条件的值 */
  value: any;
}

/**
 * 选择器选项
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * 表单字段定义
 */
export interface FormField {
  /** 字段的唯一ID，用于拖拽和 key */
  id: string;
  /** 字段的提交键名，也是 Zod Schema 的 key */
  name: string;
  /** 字段类型 */
  type: FieldType;
  /** 字段标签 */
  label: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否必填 */
  required?: boolean;
  /** 选择器选项（select 类型专用） */
  options?: SelectOption[];
  /** 条件显示逻辑 */
  condition?: FieldCondition;
  /** 默认值 */
  defaultValue?: any;
}

/**
 * 表单元数据定义
 */
export interface FormMetadata {
  /** 版本号，建议使用语义化版本 */
  version: string;
  /** 字段列表 */
  fields: FormField[];
}

/**
 * Schema 编译结果
 */
export interface CompilationResult {
  /** 编译是否成功 */
  success: boolean;
  /** 编译后的 Zod Schema */
  schema?: ZodObject<any>;
  /** 错误信息列表 */
  errors: CompilationError[];
}

/**
 * 编译错误信息
 */
export interface CompilationError {
  /** 错误字段 */
  field?: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: 'VALIDATION' | 'CIRCULAR_REFERENCE' | 'MISSING_OPTION' | 'UNKNOWN';
}

/**
 * 表单数据验证结果
 */
export interface ValidationResult {
  /** 验证是否成功 */
  success: boolean;
  /** 验证后的数据 */
  data?: Record<string, any>;
  /** 错误信息列表 */
  errors: ValidationError[];
}

/**
 * 验证错误信息
 */
export interface ValidationError {
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
}

/**
 * Zod Schema 验证错误
 */
export interface ZodValidationError {
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 期望值 */
  expected?: string;
  /** 接收值 */
  received?: string;
}

/**
 * 表单可见性映射
 */
export interface VisibilityMap {
  [fieldId: string]: boolean;
}

/**
 * 表单配置选项
 */
export interface SchemaCompilerOptions {
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存最大条目数 */
  cacheMaxSize?: number;
  /** 是否验证循环引用 */
  validateCircularReference?: boolean;
  /** 是否启用详细错误报告 */
  detailedErrors?: boolean;
}
