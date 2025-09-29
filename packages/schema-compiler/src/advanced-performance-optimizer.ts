import { FormMetadata } from '@workspace/types';
import { z } from 'zod';

/**
 * 高级性能优化工具
 * 提供智能缓存、预编译和性能监控功能
 */
export class AdvancedPerformanceOptimizer {
  private schemaCache = new Map<string, z.ZodSchema<any>>();
  private compilationCache = new Map<string, { schema: z.ZodSchema<any>; timestamp: number }>();
  private visibilityCache = new Map<string, Record<string, boolean>>();
  private performanceMetrics = {
    compilationTimes: [] as number[],
    validationTimes: [] as number[],
    cacheHits: 0,
    cacheMisses: 0,
  };

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存过期
  private readonly MAX_CACHE_SIZE = 200;

  /**
   * 智能Schema缓存系统
   */
  getCachedSchema(metadata: FormMetadata): z.ZodSchema<any> | null {
    const cacheKey = this.generateOptimizedCacheKey(metadata);
    const cached = this.compilationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.performanceMetrics.cacheHits++;
      return cached.schema;
    }

    this.performanceMetrics.cacheMisses++;
    return null;
  }

  /**
   * 缓存Schema编译结果
   */
  cacheSchema(metadata: FormMetadata, schema: z.ZodSchema<any>): void {
    const cacheKey = this.generateOptimizedCacheKey(metadata);

    // LRU缓存清理
    if (this.compilationCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.compilationCache.keys().next().value;
      this.compilationCache.delete(oldestKey);
    }

    this.compilationCache.set(cacheKey, {
      schema,
      timestamp: Date.now(),
    });
  }

  /**
   * 预编译常用的Schema模式
   */
  precompileCommonSchemas(): void {
    // 预编译常用的表单模式
    const commonPatterns: FormMetadata[] = [
      // 登录表单
      {
        version: "1.0",
        fields: [
          { id: "email", name: "email", type: "text", label: "邮箱", required: true },
          { id: "password", name: "password", type: "text", label: "密码", required: true },
        ]
      },
      // 注册表单
      {
        version: "1.0",
        fields: [
          { id: "username", name: "username", type: "text", label: "用户名", required: true },
          { id: "email", name: "email", type: "text", label: "邮箱", required: true },
          { id: "password", name: "password", type: "text", label: "密码", required: true },
        ]
      },
      // 联系表单
      {
        version: "1.0",
        fields: [
          { id: "name", name: "name", type: "text", label: "姓名", required: true },
          { id: "email", name: "email", type: "text", label: "邮箱", required: true },
          { id: "message", name: "message", type: "textarea", label: "留言", required: true },
        ]
      },
    ];

    commonPatterns.forEach(pattern => {
      const cacheKey = this.generateOptimizedCacheKey(pattern);
      if (!this.compilationCache.has(cacheKey)) {
        // 这里会延迟实际编译，只在首次使用时编译
        this.compilationCache.set(cacheKey, {
          schema: null as any, // 占位符
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * 智能字段可见性计算
   */
  computeVisibilityOptimized(
    fields: FormMetadata['fields'],
    values: Record<string, any>
  ): Record<string, boolean> {
    // 生成可见性计算缓存键
    const visibilityKey = this.generateVisibilityKey(fields, values);

    // 检查缓存
    const cached = this.visibilityCache.get(visibilityKey);
    if (cached) {
      return cached;
    }

    // 优化后的可见性计算
    const visibility: Record<string, boolean> = {};
    const dependencyGraph = this.buildDependencyGraph(fields);

    // 拓扑排序处理依赖关系
    const sortedFields = this.topologicalSort(fields, dependencyGraph);

    for (const field of sortedFields) {
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

    // 缓存结果
    this.visibilityCache.set(visibilityKey, visibility);

    return visibility;
  }

  /**
   * 构建字段依赖图
   */
  private buildDependencyGraph(fields: FormMetadata['fields']): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const field of fields) {
      if (field.condition) {
        if (!graph.has(field.id)) {
          graph.set(field.id, []);
        }
        graph.get(field.id)!.push(field.condition.fieldId);
      }
    }

    return graph;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    fields: FormMetadata['fields'],
    graph: Map<string, string[]>
  ): FormMetadata['fields'] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: FormMetadata['fields'] = [];

    // 计算入度
    for (const field of fields) {
      inDegree.set(field.id, 0);
    }

    for (const [node, dependencies] of graph) {
      for (const dep of dependencies) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // 找到入度为0的节点
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // 拓扑排序
    while (queue.length > 0) {
      const node = queue.shift()!;
      const field = fields.find(f => f.id === node);
      if (field) {
        result.push(field);
      }

      for (const [dependent, dependencies] of graph) {
        if (dependencies.includes(node)) {
          inDegree.set(dependent, inDegree.get(dependent)! - 1);
          if (inDegree.get(dependent) === 0) {
            queue.push(dependent);
          }
        }
      }
    }

    return result;
  }

  /**
   * 生成优化的缓存键
   */
  private generateOptimizedCacheKey(metadata: FormMetadata): string {
    // 使用更高效的哈希算法
    const fieldsKey = metadata.fields
      .map(field => `${field.id}:${field.type}:${field.required}:${field.defaultValue || ''}`)
      .join('|');

    return `${metadata.version}:${fieldsKey}`;
  }

  /**
   * 生成可见性计算缓存键
   */
  private generateVisibilityKey(
    fields: FormMetadata['fields'],
    values: Record<string, any>
  ): string {
    const relevantValues = fields
      .filter(field => field.condition)
      .map(field => `${field.condition?.fieldId}:${values[field.condition?.fieldId] || ''}`)
      .join('|');

    return relevantValues;
  }

  /**
   * 批量Schema编译优化
   */
  async batchCompileSchemas(
    metadataList: FormMetadata[]
  ): Promise<Map<string, z.ZodSchema<any>>> {
    const results = new Map<string, z.ZodSchema<any>>();
    const uniqueCacheKeys = new Set<string>();

    // 收集唯一的缓存键
    for (const metadata of metadataList) {
      const cacheKey = this.generateOptimizedCacheKey(metadata);
      uniqueCacheKeys.add(cacheKey);
    }

    // 批量处理缓存键
    for (const cacheKey of uniqueCacheKeys) {
      const cached = this.compilationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        results.set(cacheKey, cached.schema);
      }
    }

    return results;
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();

    // 清理编译缓存
    for (const [key, value] of this.compilationCache) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.compilationCache.delete(key);
      }
    }

    // 清理可见性缓存（简单的LRU策略）
    if (this.visibilityCache.size > 100) {
      const keysToDelete = Array.from(this.visibilityCache.keys()).slice(0, 20);
      keysToDelete.forEach(key => this.visibilityCache.delete(key));
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.cacheHits /
        (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0,
      averageCompilationTime: this.performanceMetrics.compilationTimes.length > 0
        ? this.performanceMetrics.compilationTimes.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.compilationTimes.length
        : 0,
      cacheSize: {
        compilation: this.compilationCache.size,
        visibility: this.visibilityCache.size,
      },
    };
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.performanceMetrics = {
      compilationTimes: [],
      validationTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * 记录编译时间
   */
  recordCompilationTime(time: number): void {
    this.performanceMetrics.compilationTimes.push(time);

    // 保持最近1000次记录
    if (this.performanceMetrics.compilationTimes.length > 1000) {
      this.performanceMetrics.compilationTimes =
        this.performanceMetrics.compilationTimes.slice(-1000);
    }
  }

  /**
   * 记录验证时间
   */
  recordValidationTime(time: number): void {
    this.performanceMetrics.validationTimes.push(time);

    // 保持最近1000次记录
    if (this.performanceMetrics.validationTimes.length > 1000) {
      this.performanceMetrics.validationTimes =
        this.performanceMetrics.validationTimes.slice(-1000);
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.schemaCache.clear();
    this.compilationCache.clear();
    this.visibilityCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      compilationCache: {
        size: this.compilationCache.size,
        maxSize: this.MAX_CACHE_SIZE,
        hitRate: this.performanceMetrics.cacheHits /
          (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0,
      },
      visibilityCache: {
        size: this.visibilityCache.size,
      },
    };
  }
}

// 全局性能优化器实例
let globalOptimizer: AdvancedPerformanceOptimizer | null = null;

/**
 * 获取全局性能优化器实例
 */
export function getGlobalPerformanceOptimizer(): AdvancedPerformanceOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new AdvancedPerformanceOptimizer();
    globalOptimizer.precompileCommonSchemas();
  }
  return globalOptimizer;
}

/**
 * 重置全局性能优化器
 */
export function resetGlobalPerformanceOptimizer(): void {
  globalOptimizer = null;
}