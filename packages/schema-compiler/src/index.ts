import { z } from 'zod';
import {
  FormMetadata,
  FormField,
  CompilationResult,
  CompilationError,
  ValidationResult,
  ValidationError,
  SchemaCompilerOptions,
  VisibilityMap,
} from '@workspace/types';

// 默认选项
const DEFAULT_OPTIONS: Required<SchemaCompilerOptions> = {
  enableCache: true,
  cacheMaxSize: 100,
  validateCircularReference: true,
  detailedErrors: true,
};

// 简单的 LRU 缓存实现
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到最前面（最近使用）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最老的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 全局缓存实例
let schemaCache: LRUCache<string, z.ZodObject<any>> | null = null;

/**
 * Schema 编译器类
 */
export class SchemaCompiler {
  private options: Required<SchemaCompilerOptions>;

  constructor(options: SchemaCompilerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.enableCache && !schemaCache) {
      schemaCache = new LRUCache(this.options.cacheMaxSize);
    }
  }

  /**
   * 编译表单元数据为 Zod Schema
   */
  compile(metadata: FormMetadata): CompilationResult {
    try {
      // 验证输入元数据
      const metadataValidation = this.validateMetadata(metadata);
      if (!metadataValidation.success) {
        return {
          success: false,
          errors: metadataValidation.errors,
        };
      }

      // 检查循环引用
      if (this.options.validateCircularReference) {
        const circularCheck = this.checkCircularReference(metadata.fields);
        if (!circularCheck.success) {
          return {
            success: false,
            errors: circularCheck.errors,
          };
        }
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(metadata);

      // 检查缓存
      if (this.options.enableCache && schemaCache) {
        const cachedSchema = schemaCache.get(cacheKey);
        if (cachedSchema) {
          return {
            success: true,
            schema: cachedSchema,
            errors: [],
          };
        }
      }

      // 构建 Zod Schema
      const schema = this.buildZodSchema(metadata);

      // 缓存结果
      if (this.options.enableCache && schemaCache) {
        schemaCache.set(cacheKey, schema);
      }

      return {
        success: true,
        schema,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            message: error instanceof Error ? error.message : '未知编译错误',
            type: 'UNKNOWN',
          },
        ],
      };
    }
  }

  /**
   * 验证表单数据
   */
  validate(data: Record<string, any>, metadata: FormMetadata): ValidationResult {
    const compilation = this.compile(metadata);

    if (!compilation.success || !compilation.schema) {
      return {
        success: false,
        errors: compilation.errors.map(err => ({
          field: err.field || 'unknown',
          message: err.message,
        })),
      };
    }

    const result = compilation.schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        errors: [],
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return {
      success: false,
      errors,
    };
  }

  /**
   * 计算字段可见性
   */
  computeVisibility(fields: FormField[], values: Record<string, any>): VisibilityMap {
    const visibility: VisibilityMap = {};

    for (const field of fields) {
      if (!field.condition) {
        visibility[field.id] = true;
        continue;
      }

      const targetValue = values[field.condition.fieldId];
      const isVisible = field.condition.operator === 'equals'
        ? targetValue === field.condition.value
        : targetValue !== field.condition.value;

      visibility[field.id] = isVisible;
    }

    return visibility;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    if (schemaCache) {
      schemaCache.clear();
    }
  }

  /**
   * 验证表单元数据
   */
  private validateMetadata(metadata: FormMetadata): CompilationResult {
    const errors: CompilationError[] = [];

    // 验证版本
    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push({
        field: 'version',
        message: '版本号不能为空且必须是字符串',
        type: 'VALIDATION',
      });
    }

    // 验证字段
    if (!Array.isArray(metadata.fields)) {
      errors.push({
        field: 'fields',
        message: '字段必须是数组',
        type: 'VALIDATION',
      });
    } else {
      const fieldIds = new Set<string>();
      const fieldNames = new Set<string>();

      for (const field of metadata.fields) {
        // 验证字段 ID
        if (!field.id || typeof field.id !== 'string') {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].id`,
            message: '字段 ID 不能为空且必须是字符串',
            type: 'VALIDATION',
          });
        } else if (fieldIds.has(field.id)) {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].id`,
            message: `字段 ID "${field.id}" 重复`,
            type: 'VALIDATION',
          });
        } else {
          fieldIds.add(field.id);
        }

        // 验证字段名称
        if (!field.name || typeof field.name !== 'string') {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].name`,
            message: '字段名称不能为空且必须是字符串',
            type: 'VALIDATION',
          });
        } else if (fieldNames.has(field.name)) {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].name`,
            message: `字段名称 "${field.name}" 重复`,
            type: 'VALIDATION',
          });
        } else {
          fieldNames.add(field.name);
        }

        // 验证字段类型
        const validTypes: FormField['type'][] = ['text', 'number', 'select', 'date', 'checkbox', 'textarea'];
        if (!validTypes.includes(field.type)) {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].type`,
            message: `无效的字段类型 "${field.type}"`,
            type: 'VALIDATION',
          });
        }

        // 验证选择器选项
        if (field.type === 'select' && (!field.options || field.options.length === 0)) {
          errors.push({
            field: `fields[${metadata.fields.indexOf(field)}].options`,
            message: '选择器字段必须包含选项',
            type: 'MISSING_OPTION',
          });
        }

        // 验证条件字段
        if (field.condition) {
          if (!fieldIds.has(field.condition.fieldId)) {
            errors.push({
              field: `fields[${metadata.fields.indexOf(field)}].condition.fieldId`,
              message: `条件字段 "${field.condition.fieldId}" 不存在`,
              type: 'VALIDATION',
            });
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * 检查循环引用
   */
  private checkCircularReference(fields: FormField[]): CompilationResult {
    const errors: CompilationError[] = [];
    const graph = new Map<string, string[]>();

    // 构建依赖图
    for (const field of fields) {
      if (field.condition) {
        if (!graph.has(field.id)) {
          graph.set(field.id, []);
        }
        graph.get(field.id)!.push(field.condition.fieldId);
      }
    }

    // DFS 检测循环
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const fieldId of graph.keys()) {
      if (hasCycle(fieldId)) {
        errors.push({
          field: fieldId,
          message: `检测到循环引用，涉及字段 "${fieldId}"`,
          type: 'CIRCULAR_REFERENCE',
        });
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(metadata: FormMetadata): string {
    return JSON.stringify(metadata);
  }

  /**
   * 构建 Zod Schema
   */
  private buildZodSchema(metadata: FormMetadata): z.ZodObject<any> {
    const fieldSchemas: Record<string, z.ZodTypeAny> = {};

    for (const field of metadata.fields) {
      let schema = this.createFieldSchema(field);

      if (field.required) {
        schema = this.applyRequiredValidation(schema, field);
      } else {
        schema = this.markAsOptional(schema, field);
      }

      if (field.defaultValue !== undefined) {
        schema = schema.default(field.defaultValue);
      }

      fieldSchemas[field.name] = schema;
    }

    return z.object(fieldSchemas);
  }

  /**
   * 创建字段 Schema
   */
  private createFieldSchema(field: FormField): z.ZodTypeAny {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return z.string();

      case 'number':
        return z.coerce.number();

      case 'date':
        return z.coerce.date();

      case 'select':
        return this.createSelectSchema(field);

      case 'checkbox':
        return z.boolean();

      default:
        return z.any();
    }
  }

  /**
   * 创建选择器 Schema
   */
  private createSelectSchema(field: FormField): z.ZodTypeAny {
    if (!field.options || field.options.length === 0) {
      throw new Error(`选择器字段 "${field.name}" 缺少选项`);
    }

    const values = field.options.map(option => option.value);
    const literals = values.map(value => z.literal(value));

    if (literals.length === 1) {
      return literals[0]!;
    }

    // 使用 any 避免复杂的类型问题
    return z.union(literals as any);
  }

  /**
   * 应用必填验证
   */
  private applyRequiredValidation(schema: z.ZodTypeAny, field: FormField): z.ZodTypeAny {
    if (field.type === 'text' || field.type === 'textarea') {
      return (schema as z.ZodString).min(1, { message: `${field.label}不能为空` });
    }

    return schema;
  }

  /**
   * 标记为可选
   */
  private markAsOptional(schema: z.ZodTypeAny, field: FormField): z.ZodTypeAny {
    if (field.type === 'text' || field.type === 'textarea' || field.type === 'select') {
      return schema
        .optional()
        .transform((value) => (value === '' ? undefined : value));
    }

    if (field.type === 'checkbox') {
      return schema.optional().default(false);
    }

    return schema.optional().nullable();
  }
}

// 导出便捷函数
export const buildZodSchema = (metadata: FormMetadata): z.ZodObject<any> => {
  const compiler = new SchemaCompiler();
  const result = compiler.compile(metadata);

  if (!result.success || !result.schema) {
    throw new Error(`Schema 编译失败: ${result.errors.map(e => e.message).join(', ')}`);
  }

  return result.schema;
};

export const compileFormMetadata = (metadata: FormMetadata): CompilationResult => {
  const compiler = new SchemaCompiler();
  return compiler.compile(metadata);
};

export const validateFormData = (
  data: Record<string, any>,
  metadata: FormMetadata
): ValidationResult => {
  const compiler = new SchemaCompiler();
  return compiler.validate(data, metadata);
};

export const computeFieldVisibility = (
  fields: FormField[],
  values: Record<string, any>
): VisibilityMap => {
  const compiler = new SchemaCompiler();
  return compiler.computeVisibility(fields, values);
};

// 清空缓存的函数
export const clearSchemaCache = (): void => {
  const compiler = new SchemaCompiler();
  compiler.clearCache();
};

// 默认导出
export default SchemaCompiler;