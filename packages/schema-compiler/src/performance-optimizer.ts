/**
 * 性能优化模块
 * 利用 Zod 4 的性能改进和缓存机制来优化 schema 编译性能
 */

import { z } from 'zod';
import { FormMetadata, FormField } from '@workspace/types';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  compilationTime: number;
  validationTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  cacheSize: number;
  totalCompilations: number;
}

/**
 * 性能配置选项
 */
export interface PerformanceOptions {
  enableCache: boolean;
  cacheSize: number;
  enablePrecompilation: boolean;
  enableLazyValidation: boolean;
  enableOptimizedCompilation: boolean;
  memoryThreshold: number; // MB
}

/**
 * 性能优化器类
 */
export class PerformanceOptimizer {
  private options: Required<PerformanceOptions>;
  private metrics: PerformanceMetrics;
  private compilationCache: Map<string, { schema: z.ZodObject<any>; timestamp: number }>;
  private precompiledSchemas: Map<string, z.ZodObject<any>>;
  private totalCompilations: number;
  private cacheHits: number;

  constructor(options: Partial<PerformanceOptions> = {}) {
    this.options = {
      enableCache: true,
      cacheSize: 1000,
      enablePrecompilation: true,
      enableLazyValidation: false,
      enableOptimizedCompilation: true,
      memoryThreshold: 100, // 100MB
      ...options,
    };

    this.metrics = {
      compilationTime: 0,
      validationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      totalCompilations: 0,
    };

    this.compilationCache = new Map();
    this.precompiledSchemas = new Map();
    this.totalCompilations = 0;
    this.cacheHits = 0;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics = {
      compilationTime: 0,
      validationTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      totalCompilations: 0,
    };
    this.totalCompilations = 0;
    this.cacheHits = 0;
  }

  /**
   * 检查缓存中是否有 schema
   */
  hasCachedSchema(cacheKey: string): boolean {
    return this.compilationCache.has(cacheKey);
  }

  /**
   * 从缓存获取 schema
   */
  getCachedSchema(cacheKey: string): z.ZodObject<any> | null {
    const cached = this.compilationCache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return cached.schema;
    }
    return null;
  }

  /**
   * 缓存 schema
   */
  cacheSchema(cacheKey: string, schema: z.ZodObject<any>): void {
    if (!this.options.enableCache) return;

    // 检查缓存大小限制
    if (this.compilationCache.size >= this.options.cacheSize) {
      this.evictOldestCacheEntries();
    }

    // 检查内存使用
    if (this.getCurrentMemoryUsage() > this.options.memoryThreshold) {
      this.cleanupMemory();
    }

    this.compilationCache.set(cacheKey, {
      schema,
      timestamp: Date.now(),
    });
  }

  /**
   * 预编译常用 schema
   */
  precompileSchema(metadata: FormMetadata, cacheKey: string): void {
    if (!this.options.enablePrecompilation) return;

    // 预编译的 schema 键前缀
    const precompiledKey = `precompiled:${cacheKey}`;

    if (!this.precompiledSchemas.has(precompiledKey)) {
      const optimizedSchema = this.createOptimizedSchema(metadata);
      this.precompiledSchemas.set(precompiledKey, optimizedSchema);
    }
  }

  /**
   * 创建优化的 schema
   */
  private createOptimizedSchema(metadata: FormMetadata): z.ZodObject<any> {
    const fieldSchemas: Record<string, z.ZodTypeAny> = {};

    for (const field of metadata.fields) {
      if (this.options.enableOptimizedCompilation) {
        fieldSchemas[field.name] = this.createOptimizedFieldSchema(field);
      } else {
        fieldSchemas[field.name] = this.createBasicFieldSchema(field);
      }
    }

    return z.object(fieldSchemas);
  }

  /**
   * 创建优化的字段 schema
   */
  private createOptimizedFieldSchema(field: FormField): z.ZodTypeAny {
    let schema: z.ZodTypeAny;

    // 根据字段类型创建优化的 schema
    switch (field.type) {
      case 'text':
      case 'textarea':
        // 对于文本字段，使用更快的验证
        schema = z.string().min(field.required ? 1 : 0);
        break;

      case 'number':
        // 对于数字字段，使用 coerce.number() 但添加最小验证
        schema = z.coerce.number().min(0);
        break;

      case 'date':
        // 对于日期字段，使用优化的日期验证
        schema = z.coerce.date();
        break;

      case 'checkbox':
        // 对于复选框，使用简化的布尔验证
        schema = z.union([
          z.boolean(),
          z.coerce.number().transform(val => val === 1),
          z.string().transform(val => {
            const lowerVal = val.toLowerCase().trim();
            return ['true', '1', 'yes', 'on'].includes(lowerVal);
          }),
        ]);
        break;

      case 'select':
        // 对于选择器，直接使用枚举
        if (field.options && field.options.length > 0) {
          const values = field.options.map(opt => opt.value);
          schema = z.enum(values as any);
        } else {
          schema = z.string();
        }
        break;

      default:
        schema = z.string();
    }

    // 应用必填验证
    if (field.required) {
      schema = this.applyRequiredValidation(schema, field);
    } else {
      schema = schema.optional();
    }

    return schema;
  }

  /**
   * 创建基本的字段 schema
   */
  private createBasicFieldSchema(field: FormField): z.ZodTypeAny {
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
      case 'checkbox':
        schema = z.union([
          z.boolean(),
          z.coerce.number(),
          z.string(),
        ]);
        break;
      case 'select':
        schema = z.string();
        break;
      default:
        schema = z.string();
    }

    if (field.required) {
      schema = this.applyRequiredValidation(schema, field);
    } else {
      schema = schema.optional();
    }

    return schema;
  }

  /**
   * 应用必填验证
   */
  private applyRequiredValidation(schema: z.ZodTypeAny, field: FormField): z.ZodTypeAny {
    if (field.type === 'text' || field.type === 'textarea') {
      if (schema instanceof z.ZodString) {
        return schema.min(1, { message: `${field.label}不能为空` });
      }
    }

    return schema.refine(
      (value) => value !== undefined && value !== null,
      { message: `${field.label}不能为空` }
    );
  }

  /**
   * 淘汰最老的缓存条目
   */
  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.compilationCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // 淘汰 20% 的最老条目
    const evictionCount = Math.ceil(this.compilationCache.size * 0.2);
    for (let i = 0; i < evictionCount; i++) {
      const [key] = entries[i];
      this.compilationCache.delete(key);
    }
  }

  /**
   * 清理内存
   */
  private cleanupMemory(): void {
    // 清理编译缓存
    this.compilationCache.clear();

    // 清理预编译的 schema
    this.precompiledSchemas.clear();

    // 强制垃圾回收（如果可用）
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : {};
    if (typeof globalObj.gc === 'function') {
      (globalObj.gc as () => void)();
    }
  }

  /**
   * 获取当前内存使用量
   */
  private getCurrentMemoryUsage(): number {
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.memoryUsage) {
      const memoryUsage = (globalThis as any).process.memoryUsage();
      return Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100; // MB
    }

    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100; // MB
    }

    return 0;
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(): void {
    this.metrics.cacheSize = this.compilationCache.size;
    this.metrics.cacheHitRate = this.totalCompilations > 0
      ? (this.cacheHits / this.totalCompilations) * 100
      : 0;
    this.metrics.memoryUsage = this.getCurrentMemoryUsage();
    this.metrics.totalCompilations = this.totalCompilations;
  }

  /**
   * 记录编译时间
   */
  recordCompilationTime(time: number): void {
    this.totalCompilations++;
    this.metrics.compilationTime += time;
  }

  /**
   * 记录验证时间
   */
  recordValidationTime(time: number): void {
    this.metrics.validationTime += time;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.compilationCache.clear();
    this.precompiledSchemas.clear();
    this.updateMetrics();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    this.updateMetrics();
    return {
      size: this.metrics.cacheSize,
      maxSize: this.options.cacheSize,
      hitRate: this.metrics.cacheHitRate,
      memoryUsage: this.metrics.memoryUsage,
    };
  }

  /**
   * 性能基准测试
   */
  async runBenchmark(metadata: FormMetadata, iterations: number = 1000): Promise<{
    compilation: { avgTime: number; minTime: number; maxTime: number };
    validation: { avgTime: number; minTime: number; maxTime: number };
    memory: { before: number; after: number; delta: number };
  }> {
    const memoryBefore = this.getCurrentMemoryUsage();

    // 编译基准测试
    const compilationTimes: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const cacheKey = this.generateCacheKey(metadata);
      const startTime = performance.now();

      // 清空缓存以确保每次都重新编译
      this.compilationCache.delete(cacheKey);

      // 创建优化 schema（模拟编译过程）
      const schema = this.createOptimizedSchema(metadata);

      // 缓存结果
      this.compilationCache.set(cacheKey, {
        schema,
        timestamp: Date.now(),
      });

      const endTime = performance.now();
      compilationTimes.push(endTime - startTime);

      // 记录编译时间
      this.recordCompilationTime(endTime - startTime);
    }

    // 验证基准测试
    const validationTimes: number[] = [];
    const testData = this.generateTestData(metadata);
    const cacheKey = this.generateCacheKey(metadata);
    const cached = this.compilationCache.get(cacheKey);
    const schema = cached?.schema || this.createOptimizedSchema(metadata);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // 执行验证
      schema.safeParse(testData);

      const endTime = performance.now();
      validationTimes.push(endTime - startTime);

      // 记录验证时间
      this.recordValidationTime(endTime - startTime);
    }

    const memoryAfter = this.getCurrentMemoryUsage();

    return {
      compilation: {
        avgTime: compilationTimes.reduce((a, b) => a + b, 0) / compilationTimes.length,
        minTime: Math.min(...compilationTimes),
        maxTime: Math.max(...compilationTimes),
      },
      validation: {
        avgTime: validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length,
        minTime: Math.min(...validationTimes),
        maxTime: Math.max(...validationTimes),
      },
      memory: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryAfter - memoryBefore,
      },
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(metadata: FormMetadata): string {
    return JSON.stringify(metadata);
  }

  /**
   * 生成测试数据
   */
  private generateTestData(metadata: FormMetadata): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of metadata.fields) {
      switch (field.type) {
        case 'text':
        case 'textarea':
          data[field.name] = 'test value';
          break;
        case 'number':
          data[field.name] = 42;
          break;
        case 'date':
          data[field.name] = new Date().toISOString();
          break;
        case 'checkbox':
          data[field.name] = true;
          break;
        case 'select':
          data[field.name] = field.options?.[0]?.value || 'option1';
          break;
        default:
          data[field.name] = 'default';
      }
    }

    return data;
  }
}

/**
 * 全局性能优化器实例
 */
export const globalPerformanceOptimizer = new PerformanceOptimizer();

/**
 * 便捷函数：获取性能指标
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return globalPerformanceOptimizer.getMetrics();
}

/**
 * 便捷函数：重置性能指标
 */
export function resetPerformanceMetrics(): void {
  globalPerformanceOptimizer.resetMetrics();
}

/**
 * 便捷函数：运行性能基准测试
 */
export async function runPerformanceBenchmark(
  metadata: FormMetadata,
  iterations?: number
): Promise<ReturnType<PerformanceOptimizer['runBenchmark']>> {
  return globalPerformanceOptimizer.runBenchmark(metadata, iterations);
}

// 导出默认
export default PerformanceOptimizer;
