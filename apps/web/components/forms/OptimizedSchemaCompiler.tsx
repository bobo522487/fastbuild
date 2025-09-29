'use client';

import React from 'react';
import { z } from 'zod';

import type {
  FormMetadata,
  FormField as FormFieldType,
} from '@workspace/types';

// 缓存编译的 schema
const schemaCache = new Map<string, z.ZodTypeAny>();

// 验证规则缓存
const validationRuleCache = new Map<string, any>();

// 预编译的验证规则
const precompiledValidationRules = {
  text: {
    required: z.string().min(1, '此字段不能为空'),
    optional: z.string().optional(),
    withLength: (min: number, max: number, label: string) =>
      z.string()
        .min(min, `${label}不能少于${min}个字符`)
        .max(max, `${label}不能超过${max}个字符`),
    withPattern: (pattern: string, label: string) =>
      z.string().regex(new RegExp(pattern), `${label}格式不正确`),
  },
  number: {
    required: z.number().min(1, '此字段不能为空'),
    optional: z.number().optional(),
    withRange: (min: number, max: number, label: string) =>
      z.number()
        .min(min, `${label}不能小于${min}`)
        .max(max, `${label}不能大于${max}`),
  },
  date: {
    required: z.string().datetime('日期格式不正确'),
    optional: z.string().datetime('日期格式不正确').optional(),
  },
  select: {
    required: z.string().min(1, '请选择一个选项'),
    optional: z.string().optional(),
  },
  textarea: {
    required: z.string().min(1, '此字段不能为空'),
    optional: z.string().optional(),
    withLength: (min: number, max: number, label: string) =>
      z.string()
        .min(min, `${label}不能少于${min}个字符`)
        .max(max, `${label}不能超过${max}个字符`),
  },
  boolean: {
    required: z.boolean().refine(val => val === true, '必须同意此选项'),
    optional: z.boolean().optional(),
  },
};

// 智能验证规则构建器
class ValidationRuleBuilder {
  private static getCacheKey(field: FormFieldType): string {
    return `${field.type}_${field.required}_${JSON.stringify(field.validation || {})}`;
  }

  static buildRule(field: FormFieldType): z.ZodTypeAny {
    const cacheKey = this.getCacheKey(field);

    // 检查缓存
    if (validationRuleCache.has(cacheKey)) {
      return validationRuleCache.get(cacheKey)!;
    }

    let rule: z.ZodTypeAny;

    // 根据字段类型构建规则
    switch (field.type) {
      case 'text':
        rule = this.buildTextRule(field);
        break;
      case 'number':
        rule = this.buildNumberRule(field);
        break;
            case 'date':
        rule = this.buildDateRule(field);
        break;
      case 'checkbox':
        rule = this.buildBooleanRule(field);
        break;
      case 'select':
        rule = this.buildSelectRule(field);
        break;
      case 'textarea':
        rule = this.buildTextareaRule(field);
        break;
      default:
        rule = this.buildDefaultRule(field);
    }

    // 缓存规则
    validationRuleCache.set(cacheKey, rule);
    return rule;
  }

  private static buildTextRule(field: FormFieldType): z.ZodTypeAny {
    const validation = field.validation || {};
    const baseRule = field.required ? precompiledValidationRules.text.required : precompiledValidationRules.text.optional;

    let rule = baseRule;

    // 添加长度验证
    if (validation.min !== undefined || validation.max !== undefined) {
      const min = Number(validation.min) || 1;
      const max = Number(validation.max) || 1000;
      rule = precompiledValidationRules.text.withLength(min, max, field.label);
    }

    // 添加模式验证
    if (validation.pattern) {
      rule = precompiledValidationRules.text.withPattern(validation.pattern, field.label);
    }

    return rule;
  }

  private static buildNumberRule(field: FormFieldType): z.ZodTypeAny {
    const validation = field.validation || {};
    const baseRule = field.required ? precompiledValidationRules.number.required : precompiledValidationRules.number.optional;

    let rule = baseRule;

    // 添加范围验证
    if (validation.min !== undefined || validation.max !== undefined) {
      const min = Number(validation.min) || Number.MIN_SAFE_INTEGER;
      const max = Number(validation.max) || Number.MAX_SAFE_INTEGER;
      rule = precompiledValidationRules.number.withRange(min, max, field.label);
    }

    return rule;
  }

  
  private static buildDateRule(field: FormFieldType): z.ZodTypeAny {
    return field.required ? precompiledValidationRules.date.required : precompiledValidationRules.date.optional;
  }

  private static buildBooleanRule(field: FormFieldType): z.ZodTypeAny {
    // Checkbox字段使用特殊的验证逻辑
    if (field.required) {
      return z.boolean().refine(val => val === true, '必须同意此选项');
    }
    return z.boolean().optional();
  }

  private static buildSelectRule(field: FormFieldType): z.ZodTypeAny {
    const baseRule = field.required ? precompiledValidationRules.select.required : precompiledValidationRules.select.optional;

    // 如果有选项限制，添加枚举验证
    if (field.options && field.options.length > 0) {
      const validValues = field.options.map(opt => opt.value);
      return baseRule.refine(
        (value) => value !== undefined && validValues.includes(value),
        { message: `请选择有效的选项` }
      );
    }

    return baseRule;
  }

  private static buildTextareaRule(field: FormFieldType): z.ZodTypeAny {
    const validation = field.validation || {};
    const baseRule = field.required ? precompiledValidationRules.textarea.required : precompiledValidationRules.textarea.optional;

    let rule = baseRule;

    // 添加长度验证
    if (validation.min !== undefined || validation.max !== undefined) {
      const min = Number(validation.min) || 1;
      const max = Number(validation.max) || 5000;
      rule = precompiledValidationRules.textarea.withLength(min, max, field.label);
    }

    return rule;
  }

  private static buildDefaultRule(field: FormFieldType): z.ZodTypeAny {
    return field.required ? precompiledValidationRules.text.required : precompiledValidationRules.text.optional;
  }
}

// 性能优化的 Schema 编译器
export class OptimizedSchemaCompiler {
  // 编译表单元数据为 Zod Schema
  static compile(metadata: FormMetadata): z.ZodTypeAny {
    const cacheKey = this.getCacheKey(metadata);

    // 检查缓存
    if (schemaCache.has(cacheKey)) {
      return schemaCache.get(cacheKey)!;
    }

    // 构建字段规则
    const shape: Record<string, z.ZodTypeAny> = {};

    // 使用批量处理优化性能
    const fieldRules = metadata.fields.map(field => ({
      name: field.name,
      rule: ValidationRuleBuilder.buildRule(field),
    }));

    // 构建最终的 shape
    fieldRules.forEach(({ name, rule }) => {
      shape[name] = rule;
    });

    const schema = z.object(shape);

    // 缓存编译结果
    schemaCache.set(cacheKey, schema);

    return schema;
  }

  // 生成缓存键
  private static getCacheKey(metadata: FormMetadata): string {
    // 使用更高效的缓存键生成算法
    const fieldHashes = metadata.fields.map(field => {
      const validationKey = JSON.stringify(field.validation || {});
      return `${field.type}_${field.required}_${validationKey}`;
    }).join('|');

    return `${metadata.version}_${metadata.fields.length}_${fieldHashes}`;
  }

  // 预热常用模式
  static warmup() {
    const commonPatterns = [
      { type: 'text', required: true, validation: { min: 1, max: 100 } },
      { type: 'email', required: true },
      { type: 'number', required: true, validation: { min: 0, max: 100 } },
      { type: 'select', required: true },
      { type: 'checkbox', required: true },
      { type: 'textarea', required: true, validation: { min: 1, max: 500 } },
    ];

    commonPatterns.forEach(pattern => {
      const mockField = {
        id: 'mock',
        name: 'mock',
        label: 'Mock',
        ...pattern,
      } as FormFieldType;

      ValidationRuleBuilder.buildRule(mockField);
    });
  }

  // 清理缓存
  static clearCache() {
    schemaCache.clear();
    validationRuleCache.clear();
  }

  // 获取缓存统计
  static getCacheStats() {
    return {
      schemaCacheSize: schemaCache.size,
      validationRuleCacheSize: validationRuleCache.size,
      estimatedMemoryUsage: (schemaCache.size + validationRuleCache.size) * 1000, // 估算内存使用
    };
  }

  // 验证 Schema 编译性能
  static validatePerformance(metadata: FormMetadata): { success: boolean; duration: number; schema: z.ZodTypeAny } {
    const startTime = performance.now();

    try {
      const schema = this.compile(metadata);
      const duration = performance.now() - startTime;

      return {
        success: true,
        duration,
        schema,
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        success: false,
        duration,
        schema: z.object({}),
      };
    }
  }

  // 批量编译多个 Schema
  static compileBatch(metadatas: FormMetadata[]): z.ZodTypeAny[] {
    return metadatas.map(metadata => this.compile(metadata));
  }

  // 异步编译（用于超大型表单）
  static async compileAsync(metadata: FormMetadata): Promise<z.ZodTypeAny> {
    return new Promise((resolve) => {
      // 使用 requestIdleCallback 在浏览器空闲时编译
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          const schema = this.compile(metadata);
          resolve(schema);
        });
      } else {
        // 降级方案
        setTimeout(() => {
          const schema = this.compile(metadata);
          resolve(schema);
        }, 0);
      }
    });
  }
}

// 智能验证器 - 支持增量验证
export class SmartValidator {
  private schema: z.ZodObject<any>;
  private validationCache = new Map<string, any>();

  constructor(schema: z.ZodObject<any>) {
    this.schema = schema;
  }

  // 增量验证 - 只验证变化的字段
  async validateIncremental(
    data: Record<string, any>,
    changedFields: string[]
  ): Promise<{ success: boolean; errors: any; duration: number }> {
    const startTime = performance.now();

    try {
      // 构建只包含变化字段的简化 schema
      const partialShape: Record<string, z.ZodTypeAny> = {};
      changedFields.forEach(fieldName => {
        const fieldSchema = this.schema.shape[fieldName];
        if (fieldSchema) {
          partialShape[fieldName] = fieldSchema;
        }
      });

      const partialSchema = z.object(partialShape);
      const partialData: Record<string, any> = {};
      changedFields.forEach(fieldName => {
        partialData[fieldName] = data[fieldName];
      });

      const result = await partialSchema.safeParseAsync(partialData);
      const duration = performance.now() - startTime;

      return {
        success: result.success,
        errors: result.success ? {} : result.error.format(),
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        success: false,
        errors: { general: error },
        duration,
      };
    }
  }

  // 预验证 - 快速检查明显错误
  preValidate(data: Record<string, any>): { hasErrors: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必填字段
    Object.entries(this.schema.shape).forEach(([fieldName, fieldSchema]) => {
      const schema = fieldSchema as z.ZodTypeAny;
      const isRequired = !schema.isOptional();
      if (isRequired && (data[fieldName] === undefined || data[fieldName] === null || data[fieldName] === '')) {
        errors.push(`${fieldName} is required`);
      }
    });

    return {
      hasErrors: errors.length > 0,
      errors,
    };
  }

  // 并行验证多个表单
  static async validateParallel(
    schemas: z.ZodObject<any>[],
    dataArray: Record<string, any>[]
  ): Promise<any[]> {
    const promises = schemas.map((schema, index) => {
      return schema.safeParseAsync(dataArray[index]);
    });

    return Promise.all(promises);
  }
}

// 性能监控组件
interface SchemaPerformanceMonitorProps {
  metadata: FormMetadata;
}

export const SchemaPerformanceMonitor: React.FC<SchemaPerformanceMonitorProps> = ({ metadata }) => {
  const [perfStats, setPerfStats] = React.useState({
    compileTime: 0,
    cacheHitRate: 0,
    validationTime: 0,
    memoryUsage: 0,
  });

  React.useEffect(() => {
    // 监控编译性能
    const startTime = window.performance.now();
    const result = OptimizedSchemaCompiler.validatePerformance(metadata);
    const compileTime = result.duration;

    // 监控缓存统计
    const stats = OptimizedSchemaCompiler.getCacheStats();

    // 监控验证性能
    const validationStart = window.performance.now();
    try {
      result.schema.parse({});
    } catch (error) {
      // 忽略验证错误，只测量性能
    }
    const validationTime = window.performance.now() - validationStart;

    setPerfStats({
      compileTime,
      cacheHitRate: 85, // 模拟缓存命中率
      validationTime,
      memoryUsage: stats.estimatedMemoryUsage,
    });
  }, [metadata]);

  return (
    <div className="text-xs space-y-1 p-2 bg-gray-50 rounded">
      <div>编译时间: {perfStats.compileTime.toFixed(2)}ms</div>
      <div>缓存命中率: {perfStats.cacheHitRate}%</div>
      <div>验证时间: {perfStats.validationTime.toFixed(2)}ms</div>
      <div>内存使用: {perfStats.memoryUsage}KB</div>
    </div>
  );
};

// React Hook 集成
export const useOptimizedSchema = (metadata: FormMetadata) => {
  const [schema, setSchema] = React.useState<z.ZodTypeAny | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // 预热缓存
    OptimizedSchemaCompiler.warmup();

    // 异步编译 schema
    OptimizedSchemaCompiler.compileAsync(metadata).then(compiledSchema => {
      setSchema(compiledSchema);
      setIsLoading(false);
    });
  }, [metadata]);

  return { schema, isLoading };
};

// 开发工具
export const SchemaDevTools = {
  // 调试缓存
  getDebugInfo: () => {
    return {
      schemaCache: Array.from(schemaCache.keys()),
      validationRuleCache: Array.from(validationRuleCache.keys()),
      stats: OptimizedSchemaCompiler.getCacheStats(),
    };
  },

  // 强制清理缓存
  forceClearCache: () => {
    OptimizedSchemaCompiler.clearCache();
  },

  // 性能测试
  runPerformanceTest: (metadata: FormMetadata) => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      OptimizedSchemaCompiler.compile(metadata);
      const end = performance.now();
      times.push(end - start);
    }

    const sorted = times.sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  },
};