// 字段类型定义合同：Schema驱动运行时MVP
// 版本: 1.0.0
// 分支: 002-schema-driven-runtime-mvp

import { z } from 'zod';

// 字段类型枚举
export const FieldTypeSchema = z.enum([
  'text',
  'number',
  'email',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'date',
  'datetime',
  'file',
  'password'
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

// 选择项配置
export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
  description: z.string().optional()
});

export type SelectOption = z.infer<typeof SelectOptionSchema>;

// 字段条件配置
export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'in',
  'not_in',
  'empty',
  'not_empty'
]);

export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const FieldConditionSchema = z.object({
  fieldId: z.string(),
  operator: ConditionOperatorSchema,
  value: z.any(),
  logic: z.enum(['AND', 'OR']).optional(),
  conditions: z.array(z.lazy(() => FieldConditionSchema)).optional()
});

export type FieldCondition = z.infer<typeof FieldConditionSchema>;

// 自定义验证规则
export const CustomValidationRuleSchema = z.object({
  name: z.string(),
  validator: z.function(),
  message: z.string()
});

export type CustomValidationRule = z.infer<typeof CustomValidationRuleSchema>;

// 异步验证规则
export const AsyncValidationRuleSchema = z.object({
  name: z.string(),
  validator: z.function().returns(z.promise(z.boolean())),
  message: z.string()
});

export type AsyncValidationRule = z.infer<typeof AsyncValidationRuleSchema>;

// 字段验证配置
export const FieldValidationSchema = z.object({
  required: z.union([z.boolean(), z.string()]).optional(),
  minLength: z.union([z.number(), z.string()]).optional(),
  maxLength: z.union([z.number(), z.string()]).optional(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  pattern: z.union([z.instanceof(RegExp), z.string()]).optional(),
  custom: z.array(CustomValidationRuleSchema).optional(),
  async: z.array(AsyncValidationRuleSchema).optional()
});

export type FieldValidation = z.infer<typeof FieldValidationSchema>;

// 字段UI配置
export const FieldUIConfigSchema = z.object({
  width: z.union([z.string(), z.number()]).optional(),
  className: z.string().optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  showError: z.boolean().optional(),
  showSuccess: z.boolean().optional()
});

export type FieldUIConfig = z.infer<typeof FieldUIConfigSchema>;

// 字段定义
export const FormFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
  validation: FieldValidationSchema.optional(),
  ui: FieldUIConfigSchema.optional(),
  condition: FieldConditionSchema.optional(),
  options: z.array(SelectOptionSchema).optional()
});

export type FormField = z.infer<typeof FormFieldSchema>;

// 按钮配置
export const ButtonConfigSchema = z.object({
  text: z.string(),
  variant: z.enum(['default', 'primary', 'secondary', 'danger']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
  icon: z.string().optional()
});

export type ButtonConfig = z.infer<typeof ButtonConfigSchema>;

// 表单UI配置
export const FormUIConfigSchema = z.object({
  layout: z.enum(['vertical', 'horizontal', 'inline']).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  showLabels: z.boolean().optional(),
  showDescriptions: z.boolean().optional(),
  submitButton: ButtonConfigSchema.optional(),
  cancelButton: ButtonConfigSchema.optional()
});

export type FormUIConfig = z.infer<typeof FormUIConfigSchema>;

// 表单验证配置
export const FormValidationSchema = z.object({
  mode: z.enum(['onChange', 'onBlur', 'onSubmit']).optional(),
  revalidateMode: z.enum(['onChange', 'onBlur']).optional(),
  customRules: z.array(CustomValidationRuleSchema).optional()
});

export type FormValidation = z.infer<typeof FormValidationSchema>;

// 提交配置
export const SubmitTransformSchema = z.object({
  before: z.function().optional(),
  after: z.function().optional(),
  error: z.function().optional()
});

export type SubmitTransform = z.infer<typeof SubmitTransformSchema>;

export const SubmitConfigSchema = z.object({
  endpoint: z.string().optional(),
  method: z.enum(['POST', 'PUT', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  transform: SubmitTransformSchema.optional(),
  validate: z.boolean().optional(),
  onSuccess: z.function().optional(),
  onError: z.function().optional(),
  onFinally: z.function().optional()
});

export type SubmitConfig = z.infer<typeof SubmitConfigSchema>;

// 表单元数据
export const FormMetadataSchema = z.object({
  version: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema),
  validation: FormValidationSchema.optional(),
  ui: FormUIConfigSchema.optional(),
  submit: SubmitConfigSchema.optional()
});

export type FormMetadata = z.infer<typeof FormMetadataSchema>;

// 验证结果
export const ValidationErrorSchema = z.object({
  fieldId: z.string(),
  message: z.string(),
  code: z.string(),
  values: z.record(z.any()).optional()
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema).optional(),
  data: z.any().optional()
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Schema编译器接口
export interface SchemaCompiler {
  compile(metadata: FormMetadata): z.ZodSchema<any>;
  compileField(field: FormField): z.ZodTypeAny;
  validate(schema: z.ZodSchema<any>, data: any): ValidationResult;
  getDefaults(metadata: FormMetadata): Record<string, any>;
  clearCache(): void;
}

// 表单上下文
export interface FormContext {
  metadata: FormMetadata | null;
  values: Record<string, any>;
  validation: FormValidationState;
  submission: FormSubmissionState;
  loadMetadata: (metadata: FormMetadata) => void;
  updateFieldValue: (fieldId: string, value: any) => void;
  submitForm: (data?: Record<string, any>) => Promise<SubmitResult>;
  resetForm: () => void;
  validateForm: () => Promise<FormValidationResult>;
}

export interface FormValidationState {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string[]>;
  touchedFields: Set<string>;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  lastSubmitTime?: Date;
  lastSubmitResult?: SubmitResult;
}

export interface SubmitResult {
  success: boolean;
  data?: any;
  error?: any;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
}