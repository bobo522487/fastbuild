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
import { ErrorHandler } from './error-handler';
import { PerformanceOptimizer } from './performance-optimizer';

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
  private errorHandler: ErrorHandler;
  private performanceOptimizer: PerformanceOptimizer;

  constructor(options: SchemaCompilerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.errorHandler = new ErrorHandler();
    this.performanceOptimizer = new PerformanceOptimizer({
      enableCache: this.options.enableCache,
      cacheSize: this.options.cacheMaxSize,
    });

    if (this.options.enableCache && !schemaCache) {
      schemaCache = new LRUCache(this.options.cacheMaxSize);
    }
  }

  /**
   * 编译表单元数据为 Zod Schema
   */
  compile(metadata: FormMetadata): CompilationResult {
    const startTime = performance.now();

    try {
      // 优先检查循环引用（这是更严重的架构问题）
      if (this.options.validateCircularReference && metadata.fields && Array.isArray(metadata.fields)) {
        const circularCheck = this.checkCircularReference(metadata.fields);
        if (!circularCheck.success) {
          const endTime = performance.now();
          this.performanceOptimizer.recordCompilationTime(endTime - startTime);
          return {
            success: false,
            errors: circularCheck.errors,
          };
        }
      }

      // 验证输入元数据
      const metadataValidation = this.validateMetadata(metadata);
      if (!metadataValidation.success) {
        const endTime = performance.now();
        this.performanceOptimizer.recordCompilationTime(endTime - startTime);
        return {
          success: false,
          errors: metadataValidation.errors,
        };
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(metadata);

      // 检查性能优化器缓存
      if (this.options.enableCache) {
        const cachedSchema = this.performanceOptimizer.getCachedSchema(cacheKey);
        if (cachedSchema) {
          const endTime = performance.now();
          this.performanceOptimizer.recordCompilationTime(endTime - startTime);
          return {
            success: true,
            schema: cachedSchema,
            errors: [],
          };
        }
      }

      // 预编译 schema（如果启用）
      if (this.options.enableCache) {
        this.performanceOptimizer.precompileSchema(metadata, cacheKey);
      }

      // 构建 Zod Schema
      const schema = this.buildZodSchema(metadata);

      // 缓存结果
      if (this.options.enableCache) {
        this.performanceOptimizer.cacheSchema(cacheKey, schema);
        if (schemaCache) {
          schemaCache.set(cacheKey, schema);
        }
      }

      const endTime = performance.now();
      this.performanceOptimizer.recordCompilationTime(endTime - startTime);

      return {
        success: true,
        schema,
        errors: [],
      };
    } catch (error) {
      const endTime = performance.now();
      this.performanceOptimizer.recordCompilationTime(endTime - startTime);

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
    const startTime = performance.now();

    const compilation = this.compile(metadata);

    if (!compilation.success || !compilation.schema) {
      const endTime = performance.now();
      this.performanceOptimizer.recordValidationTime(endTime - startTime);

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
      const endTime = performance.now();
      this.performanceOptimizer.recordValidationTime(endTime - startTime);

      return {
        success: true,
        data: result.data,
        errors: [],
      };
    }

    // 使用新的错误处理系统
    const errorMessages = this.errorHandler.handleZodError(result.error, { fields: metadata.fields });
    const errors: ValidationError[] = errorMessages.map(err => ({
      field: err.field,
      message: err.message,
      code: err.code,
    }));

    const endTime = performance.now();
    this.performanceOptimizer.recordValidationTime(endTime - startTime);

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
    // 同时清空性能优化器的缓存
    this.performanceOptimizer.clearCache();
  }

  /**
   * 设置错误消息语言
   */
  setErrorLocale(locale: string): void {
    this.errorHandler.setLocale(locale);
  }

  /**
   * 获取错误处理器实例
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 获取当前错误消息语言
   */
  getCurrentLocale(): string {
    return this.errorHandler.getCurrentLocalization().locale;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return this.performanceOptimizer.getMetrics();
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics(): void {
    this.performanceOptimizer.resetMetrics();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.performanceOptimizer.getCacheStats();
  }

  /**
   * 运行性能基准测试
   */
  async runPerformanceBenchmark(metadata: FormMetadata, iterations?: number) {
    return this.performanceOptimizer.runBenchmark(metadata, iterations);
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
    if (!metadata.fields || !Array.isArray(metadata.fields)) {
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
        break; // 只报告一个循环引用错误
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
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'textarea':
        schema = z.string();
        break;

      case 'number':
        schema = z.coerce.number();
        break;

      case 'date':
        schema = z.coerce.date();
        break;

      case 'select':
        schema = this.createSelectSchema(field);
        break;

      case 'checkbox':
        // 创建智能布尔值转换 schema
        schema = z.union([
          z.boolean(),  // 原生布尔值
          z.number().transform(val => val === 1),  // 数字转换：只有 1 为 true，其他数字为 false
          z.string().transform(val => {
            // 智能字符串转布尔值
            const lowerVal = val.toLowerCase().trim();
            if (['true', '1', 'yes', 'on', 'y'].includes(lowerVal)) return true;
            if (['false', '0', 'no', 'off', 'n', ''].includes(lowerVal)) return false;
            // 其他字符串值（包括 '2', 'invalid' 等）都转为 false
            return false;
          })
        ]);
        break;

      default:
        schema = z.any();
    }

    // 智能字段验证：基于字段名称和标签添加适当的验证规则
    if (field.type === 'text' || field.type === 'textarea') {
      // 邮箱验证：如果字段名或标签包含 'email'
      if (field.name.toLowerCase().includes('email') || field.label?.toLowerCase().includes('email')) {
        schema = (schema as z.ZodString).email(`请输入有效的${field.label || '邮箱地址'}`);
      }

      // URL验证：如果字段名或标签包含 'url' 或 'website'
      if (field.name.toLowerCase().includes('url') || field.label?.toLowerCase().includes('url') ||
          field.name.toLowerCase().includes('website') || field.label?.toLowerCase().includes('website')) {
        schema = (schema as z.ZodString).url(`请输入有效的${field.label || '网址'}`);
      }

      // 电话号码验证：如果字段名或标签包含 'phone' 或 'tel'
      if (field.name.toLowerCase().includes('phone') || field.label?.toLowerCase().includes('phone') ||
          field.name.toLowerCase().includes('tel') || field.label?.toLowerCase().includes('tel')) {
        schema = (schema as z.ZodString).regex(/^[+]?[\d\s\-\(\)]+$/, `请输入有效的${field.label || '电话号码'}`);
      }
    }

    // 数字字段智能验证
    if (field.type === 'number') {
      // 年龄验证：通常为正数且合理范围
      if (field.name.toLowerCase().includes('age') || field.label?.toLowerCase().includes('年龄')) {
        schema = (schema as z.ZodNumber)
          .min(0, `${field.label || '年龄'}不能为负数`)
          .max(150, `${field.label || '年龄'}不能超过150岁`);
      }

      // 数量验证：通常为正数
      if (field.name.toLowerCase().includes('quantity') || field.name.toLowerCase().includes('count') ||
          field.label?.toLowerCase().includes('数量') || field.label?.toLowerCase().includes('计数')) {
        schema = (schema as z.ZodNumber).min(0, `${field.label || '数量'}不能为负数`);
      }

      // 价格验证：通常为正数
      if (field.name.toLowerCase().includes('price') || field.name.toLowerCase().includes('amount') ||
          field.label?.toLowerCase().includes('价格') || field.label?.toLowerCase().includes('金额')) {
        schema = (schema as z.ZodNumber).min(0, `${field.label || '价格'}不能为负数`);
      }
    }

    // 尝试使用 Zod 4 的 .meta() 方法附加字段元数据（如果可用）
    // 这对 UI 生成、文档生成、权限控制等都很有价值
    const fieldMetadata = {
      fieldId: field.id,
      fieldType: field.type,
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      description: (field as any).description,
      // UI 相关元数据
      ui: {
        component: this.getUIComponentType(field.type),
        validation: {
          showError: true,
          realtime: true
        }
      },
      // 业务逻辑元数据
      business: {
        sensitive: field.type === 'text' && field.label?.toLowerCase().includes('password') ||
                   field.type === 'text' && field.label?.toLowerCase().includes('email'),
        encrypted: field.type === 'text' && field.label?.toLowerCase().includes('password')
      }
    };

    // 兼容性处理：如果 .meta() 方法可用则使用，否则直接返回 schema
    if (typeof (schema as any).meta === 'function') {
      return (schema as any).meta(fieldMetadata);
    }

    // 如果没有 .meta() 方法，直接返回 schema
    // 未来可以将元数据存储在其他地方，比如 schema._def.meta 或 WeakMap
    return schema;
  }

  /**
   * 获取字段对应的 UI 组件类型
   */
  private getUIComponentType(fieldType: FormField['type']): string {
    const componentMap: Record<FormField['type'], string> = {
      'text': 'input',
      'textarea': 'textarea',
      'number': 'input',
      'select': 'select',
      'checkbox': 'checkbox',
      'date': 'date-picker'
    };
    return componentMap[fieldType] || 'input';
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
      return (schema as z.ZodString)
        .min(1, { message: `${field.label}不能为空` })
        .refine(
          (value) => value !== undefined && value !== null && value.toString().trim() !== '',
          { message: `${field.label}不能为空` }
        );
    }

    // 为其他类型添加必填验证
    return schema.refine(
      (value) => value !== undefined && value !== null,
      { message: `${field.label}不能为空` }
    );
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

// 导出元数据提取工具
export * from './metadata-extractor';

// 导出错误处理工具
export * from './error-handler';

// 导出 JSON Schema 转换工具
export * from './json-schema-converter';

// 导出性能优化工具
export * from './performance-optimizer';

// 默认导出
export default SchemaCompiler;