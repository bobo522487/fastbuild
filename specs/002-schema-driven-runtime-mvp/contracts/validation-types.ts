// 验证类型定义合同：Schema驱动运行时MVP
// 版本: 1.0.0
// 分支: 002-schema-driven-runtime-mvp

import { z } from 'zod';

// 验证规则基类
export const ValidationRuleSchema = z.object({
  name: z.string(),
  params: z.record(z.any()),
  message: z.string()
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// 字段验证规则
export const FieldValidationRuleSchema = ValidationRuleSchema.extend({
  fieldId: z.string(),
  type: z.string()
});

export type FieldValidationRule = z.infer<typeof FieldValidationRuleSchema>;

// 表单验证规则
export const FormValidationRuleSchema = ValidationRuleSchema.extend({
  formId: z.string(),
  dependencies: z.array(z.string()).optional()
});

export type FormValidationRule = z.infer<typeof FormValidationRuleSchema>;

// 验证上下文
export const ValidationContextSchema = z.object({
  formId: z.string(),
  fieldId: z.string().optional(),
  values: z.record(z.any()),
  metadata: z.any(),
  timestamp: z.date()
});

export type ValidationContext = z.infer<typeof ValidationContextSchema>;

// 验证错误详情
export const ValidationErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.array(z.string()),
  expected: z.any().optional(),
  received: z.any().optional(),
  context: z.record(z.any()).optional()
});

export type ValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;

// 验证错误
export const ValidationErrorSchema = z.object({
  id: z.string(),
  type: z.enum(['field', 'form', 'system']),
  fieldId: z.string().optional(),
  details: ValidationErrorDetailSchema,
  timestamp: z.date(),
  resolved: z.boolean().default(false)
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// 验证结果
export const ValidationSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  validatedAt: z.date()
});

export type ValidationSuccess = z.infer<typeof ValidationSuccessSchema>;

export const ValidationFailureSchema = z.object({
  success: z.literal(false),
  errors: z.array(ValidationErrorSchema),
  validatedAt: z.date()
});

export type ValidationFailure = z.infer<typeof ValidationFailureSchema>;

export const ValidationResultSchema = z.discriminatedUnion('success', [
  ValidationSuccessSchema,
  ValidationFailureSchema
]);

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// 验证器接口
export interface Validator {
  validate(value: any, context: ValidationContext): Promise<ValidationResult>;
  canValidate(type: string): boolean;
}

// 验证器注册表
export interface ValidatorRegistry {
  register(type: string, validator: Validator): void;
  get(type: string): Validator | undefined;
  unregister(type: string): boolean;
  getAll(): Record<string, Validator>;
}

// 验证管道
export interface ValidationPipeline {
  addValidator(validator: Validator): void;
  addValidatorAt(index: number, validator: Validator): void;
  removeValidator(index: number): void;
  validate(value: any, context: ValidationContext): Promise<ValidationResult>;
  clear(): void;
}

// 验证规则构建器
export interface ValidationRuleBuilder<T = any> {
  required(message?: string): this;
  min(min: number, message?: string): this;
  max(max: number, message?: string): this;
  minLength(min: number, message?: string): this;
  maxLength(max: number, message?: string): this;
  pattern(pattern: RegExp, message?: string): this;
  email(message?: string): this;
  url(message?: string): this;
  custom(validator: (value: T) => boolean | Promise<boolean>, message: string): this;
  build(): ValidationRule[];
}

// 验证配置
export const ValidationConfigSchema = z.object({
  mode: z.enum(['sync', 'async', 'mixed']).default('mixed'),
  abortEarly: z.boolean().default(false),
  stripUnknown: z.boolean().default(false),
  strict: z.boolean().default(false)
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

// 验证性能指标
export const ValidationMetricsSchema = z.object({
  totalValidations: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  averageTime: z.number(),
  maxTime: z.number(),
  minTime: z.number(),
  lastValidationTime: z.date()
});

export type ValidationMetrics = z.infer<typeof ValidationMetricsSchema>;

// 验证监控器
export interface ValidationMonitor {
  recordValidation(result: ValidationResult, duration: number): void;
  getMetrics(): ValidationMetrics;
  reset(): void;
  startProfiling(): void;
  stopProfiling(): ValidationMetrics;
}

// 异步验证任务
export interface AsyncValidationTask {
  id: string;
  fieldId: string;
  value: any;
  validator: Validator;
  context: ValidationContext;
  priority: number;
  createdAt: z.date();
  startedAt?: z.date();
  completedAt?: z.date();
}

// 验证队列
export interface ValidationQueue {
  enqueue(task: AsyncValidationTask): void;
  dequeue(): AsyncValidationTask | undefined;
  peek(): AsyncValidationTask | undefined;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
  process(concurrency?: number): Promise<void>;
}

// 验证缓存
export interface ValidationCache {
  get(key: string): ValidationResult | undefined;
  set(key: string, result: ValidationResult, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}

// 验证事件
export const ValidationEventTypeSchema = z.enum([
  'validation_start',
  'validation_success',
  'validation_failure',
  'validation_error',
  'async_validation_queued',
  'async_validation_started',
  'async_validation_completed'
]);

export type ValidationEventType = z.infer<typeof ValidationEventTypeSchema>;

export const ValidationEventSchema = z.object({
  type: ValidationEventTypeSchema,
  fieldId: z.string().optional(),
  formId: z.string(),
  timestamp: z.date(),
  data: z.any().optional()
});

export type ValidationEvent = z.infer<typeof ValidationEventSchema>;

// 验证事件处理器
export interface ValidationEventHandler {
  handle(event: ValidationEvent): Promise<void>;
}

// 验证事件发射器
export interface ValidationEventEmitter {
  on(event: ValidationEventType, handler: ValidationEventHandler): void;
  off(event: ValidationEventType, handler: ValidationEventHandler): void;
  emit(event: ValidationEvent): Promise<void>;
}

// 验证上下文构建器
export interface ValidationContextBuilder {
  setFormId(formId: string): this;
  setFieldId(fieldId: string): this;
  setValues(values: Record<string, any>): this;
  setMetadata(metadata: any): this;
  build(): ValidationContext;
}

// 验证工具函数
export interface ValidationUtils {
  createValidator(type: string, config: any): Validator;
  createRuleBuilder<T>(): ValidationRuleBuilder<T>;
  createContextBuilder(): ValidationContextBuilder;
  createCache(): ValidationCache;
  createQueue(): ValidationQueue;
  createPipeline(): ValidationPipeline;
  createMonitor(): ValidationMonitor;
  createEventEmitter(): ValidationEventEmitter;
}