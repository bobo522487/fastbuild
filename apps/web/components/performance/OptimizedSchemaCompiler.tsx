'use client';

import React, { useMemo, useCallback } from 'react';
import { z } from 'zod';

import type { FormMetadata, FormField } from '@workspace/types';

// 缓存的Schema构建器
export class OptimizedSchemaCompiler {
  private static instance: OptimizedSchemaCompiler;
  private schemaCache = new Map<string, z.ZodSchema<any>>();
  private fieldSchemaCache = new Map<string, z.ZodTypeAny>();

  static getInstance(): OptimizedSchemaCompiler {
    if (!OptimizedSchemaCompiler.instance) {
      OptimizedSchemaCompiler.instance = new OptimizedSchemaCompiler();
    }
    return OptimizedSchemaCompiler.instance;
  }

  // 生成缓存键
  private generateCacheKey(metadata: FormMetadata): string {
    const keyData = {
      version: metadata.version,
      fields: metadata.fields.map(f => ({
        id: f.id,
        type: f.type,
        required: f.required,
        defaultValue: f.defaultValue,
        condition: f.condition,
      })),
    };
    return JSON.stringify(keyData);
  }

  // 优化的字段Schema构建
  private buildFieldSchema(field: FormField): z.ZodTypeAny {
    const fieldKey = `${field.type}_${field.required}_${field.defaultValue !== undefined}`;

    if (this.fieldSchemaCache.has(fieldKey)) {
      return this.fieldSchemaCache.get(fieldKey)!;
    }

    let fieldSchema: z.ZodTypeAny;

    const startTime = performance.now();

    switch (field.type) {
      case 'text':
        fieldSchema = z.string()
          .min(1, `${field.label}不能为空`)
          .max(500, `${field.label}不能超过500个字符`);
        break;

      case 'textarea':
        fieldSchema = z.string()
          .min(1, `${field.label}不能为空`)
          .max(2000, `${field.label}不能超过2000个字符`);
        break;

      case 'number':
        fieldSchema = z.number({
          required_error: `${field.label}不能为空`,
          invalid_type_error: `${field.label}必须是有效的数字`,
        })
        .min(Number.MIN_SAFE_INTEGER, `${field.label}不能太小`)
        .max(Number.MAX_SAFE_INTEGER, `${field.label}不能太大`);
        break;

      case 'select':
        fieldSchema = z.string()
          .min(1, `请选择${field.label}`);
        break;

      case 'checkbox':
        fieldSchema = z.boolean({
          required_error: `请选择${field.label}`,
          invalid_type_error: `${field.label}必须是是/否选择`,
        });
        break;

      case 'date':
        fieldSchema = z.string()
          .min(1, `请选择${field.label}`)
          .datetime(`${field.label}必须是有效的日期`);
        break;

      default:
        fieldSchema = z.string()
          .min(1, `${field.label}不能为空`);
    }

    // 处理必填字段
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    // 添加默认值处理
    if (field.defaultValue !== undefined) {
      fieldSchema = fieldSchema.default(field.defaultValue);
    }

    const endTime = performance.now();
    const buildTime = endTime - startTime;

    // 如果构建时间超过1ms，记录警告
    if (buildTime > 1) {
      console.warn(`字段Schema构建时间过长: ${field.id} (${buildTime.toFixed(2)}ms)`);
    }

    this.fieldSchemaCache.set(fieldKey, fieldSchema);
    return fieldSchema;
  }

  // 优化的Schema构建
  buildSchema(metadata: FormMetadata): z.ZodSchema<any> {
    const cacheKey = this.generateCacheKey(metadata);

    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const startTime = performance.now();

    const shape: Record<string, z.ZodTypeAny> = {};

    // 并行构建字段Schema
    const fieldSchemas = metadata.fields.map(field => ({
      name: field.name,
      schema: this.buildFieldSchema(field),
    }));

    // 组合Schema
    fieldSchemas.forEach(({ name, schema }) => {
      shape[name] = schema;
    });

    const schema = z.object(shape);

    const endTime = performance.now();
    const buildTime = endTime - startTime;

    // 记录性能指标
    if (buildTime > 10) { // 超过10ms记录警告
      console.warn(`Schema构建时间过长: ${buildTime.toFixed(2)}ms (字段数: ${metadata.fields.length})`);
    }

    // 缓存Schema
    this.schemaCache.set(cacheKey, schema);

    return schema;
  }

  // 清除缓存
  clearCache(metadata?: FormMetadata): void {
    if (metadata) {
      const cacheKey = this.generateCacheKey(metadata);
      this.schemaCache.delete(cacheKey);
    } else {
      this.schemaCache.clear();
      this.fieldSchemaCache.clear();
    }
  }

  // 获取缓存统计
  getCacheStats(): {
    schemaCacheSize: number;
    fieldSchemaCacheSize: number;
    cacheHitRate: number;
  } {
    return {
      schemaCacheSize: this.schemaCache.size,
      fieldSchemaCacheSize: this.fieldSchemaCache.size,
      cacheHitRate: this.schemaCache.size / (this.schemaCache.size + this.fieldSchemaCache.size),
    };
  }
}

// 预编译的Schema Hook
export function useOptimizedSchema(metadata: FormMetadata) {
  const compiler = OptimizedSchemaCompiler.getInstance();
  const [buildTime, setBuildTime] = React.useState<number>(0);

  const schema = useMemo(() => {
    const startTime = performance.now();
    const compiledSchema = compiler.buildSchema(metadata);
    const endTime = performance.now();
    setBuildTime(endTime - startTime);
    return compiledSchema;
  }, [metadata, compiler]);

  const validationFunction = useCallback(
    (data: unknown) => {
      const startTime = performance.now();
      const result = schema.safeParse(data);
      const endTime = performance.now();
      const validationTime = endTime - startTime;

      if (validationTime > 50) { // 超过50ms记录警告
        console.warn(`Schema验证时间过长: ${validationTime.toFixed(2)}ms`);
      }

      return result;
    },
    [schema]
  );

  return {
    schema,
    validationFunction,
    buildTime,
  };
}

// Schema验证性能监控
export class SchemaValidationMonitor {
  private static instance: SchemaValidationMonitor;
  private validationTimes: number[] = [];
  private maxSamples = 100;

  static getInstance(): SchemaValidationMonitor {
    if (!SchemaValidationMonitor.instance) {
      SchemaValidationMonitor.instance = new SchemaValidationMonitor();
    }
    return SchemaValidationMonitor.instance;
  }

  recordValidation(time: number): void {
    this.validationTimes.push(time);

    if (this.validationTimes.length > this.maxSamples) {
      this.validationTimes.shift();
    }
  }

  getAverageValidationTime(): number {
    if (this.validationTimes.length === 0) {
      return 0;
    }
    return this.validationTimes.reduce((a, b) => a + b, 0) / this.validationTimes.length;
  }

  getMaxValidationTime(): number {
    return Math.max(...this.validationTimes, 0);
  }

  getMinValidationTime(): number {
    return Math.min(...this.validationTimes, Infinity);
  }

  getPercentileValidationTime(percentile: number): number {
    if (this.validationTimes.length === 0) {
      return 0;
    }

    const sorted = [...this.validationTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (percentile / 100));
    return sorted[index];
  }

  clear(): void {
    this.validationTimes = [];
  }

  getReport(): {
    average: number;
    max: number;
    min: number;
    p95: number;
    p99: number;
    sampleCount: number;
  } {
    return {
      average: this.getAverageValidationTime(),
      max: this.getMaxValidationTime(),
      min: this.getMinValidationTime(),
      p95: this.getPercentileValidationTime(95),
      p99: this.getPercentileValidationTime(99),
      sampleCount: this.validationTimes.length,
    };
  }
}

// 优化的验证器组件
export interface OptimizedValidatorProps {
  schema: z.ZodSchema<any>;
  data: any;
  onValidationComplete?: (result: z.SafeParseReturnType<any, any>, time: number) => void;
  children?: (isValid: boolean, errors?: z.ZodError<any>) => React.ReactNode;
}

export function OptimizedValidator({
  schema,
  data,
  onValidationComplete,
  children,
}: OptimizedValidatorProps) {
  const [isValid, setIsValid] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<z.ZodError<any> | undefined>();
  const [validationTime, setValidationTime] = React.useState<number>(0);

  React.useEffect(() => {
    const startTime = performance.now();

    const result = schema.safeParse(data);
    const endTime = performance.now();
    const time = endTime - startTime;

    setValidationTime(time);
    setIsValid(result.success);
    setErrors(result.success ? undefined : result.error);

    // 记录验证时间
    SchemaValidationMonitor.getInstance().recordValidation(time);

    onValidationComplete?.(result, time);
  }, [schema, data, onValidationComplete]);

  if (children) {
    return <>{children(isValid, errors)}</>;
  }

  return null;
}

// Schema优化建议
export function getSchemaOptimizationSuggestions(metadata: FormMetadata): string[] {
  const suggestions: string[] = [];

  // 检查字段数量
  if (metadata.fields.length > 20) {
    suggestions.push('考虑将表单拆分为多个步骤或页面');
  }

  // 检查条件字段
  const conditionalFields = metadata.fields.filter(f => f.condition);
  if (conditionalFields.length > 10) {
    suggestions.push('条件字段过多，考虑简化条件逻辑或分组显示');
  }

  // 检查必填字段
  const requiredFields = metadata.fields.filter(f => f.required);
  if (requiredFields.length > 15) {
    suggestions.push('必填字段过多，考虑标记部分字段为可选');
  }

  // 检查复杂字段类型
  const complexFields = metadata.fields.filter(f =>
    ['textarea', 'select', 'date'].includes(f.type)
  );
  if (complexFields.length > 8) {
    suggestions.push('复杂字段过多，考虑使用延迟加载');
  }

  return suggestions;
}