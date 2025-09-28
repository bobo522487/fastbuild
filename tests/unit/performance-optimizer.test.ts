// 测试性能优化器
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceOptimizer, PerformanceMetrics } from '@workspace/schema-compiler';
import { FormMetadata } from '@workspace/types';

describe('Performance Optimizer', () => {
  let optimizer: PerformanceOptimizer;
  let testMetadata: FormMetadata;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer({
      enableCache: true,
      cacheSize: 10,
      enablePrecompilation: true,
      enableOptimizedCompilation: true,
      memoryThreshold: 50, // 50MB for testing
    });

    testMetadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          required: true,
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
          required: false,
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          required: true,
        },
      ],
    };
  });

  afterEach(() => {
    optimizer.resetMetrics();
  });

  describe('缓存管理', () => {
    it('应该正确缓存和获取 schema', () => {
      const cacheKey = 'test-key';
      const mockSchema = {} as any; // 简化的 mock schema

      // 缓存 schema
      optimizer.cacheSchema(cacheKey, mockSchema);

      // 验证缓存存在
      expect(optimizer.hasCachedSchema(cacheKey)).toBe(true);

      // 获取缓存的 schema
      const cached = optimizer.getCachedSchema(cacheKey);
      expect(cached).toBe(mockSchema);
    });

    it('应该正确处理缓存未命中的情况', () => {
      const nonExistentKey = 'non-existent-key';

      expect(optimizer.hasCachedSchema(nonExistentKey)).toBe(false);
      expect(optimizer.getCachedSchema(nonExistentKey)).toBeNull();
    });

    it('应该在缓存满时淘汰最老的条目', () => {
      // 填满缓存
      for (let i = 0; i < 15; i++) {
        optimizer.cacheSchema(`key-${i}`, {} as any);
      }

      // 最老的条目应该被淘汰
      expect(optimizer.hasCachedSchema('key-0')).toBe(false);
      expect(optimizer.hasCachedSchema('key-5')).toBe(false);

      // 新的条目应该存在
      expect(optimizer.hasCachedSchema('key-14')).toBe(true);
    });

    it('应该在禁用缓存时跳过缓存操作', () => {
      const disabledOptimizer = new PerformanceOptimizer({
        enableCache: false,
        cacheSize: 10,
      });

      disabledOptimizer.cacheSchema('test-key', {} as any);

      expect(disabledOptimizer.hasCachedSchema('test-key')).toBe(false);
    });
  });

  describe('性能指标', () => {
    it('应该正确记录编译时间', () => {
      optimizer.recordCompilationTime(100);
      optimizer.recordCompilationTime(200);

      const metrics = optimizer.getMetrics();

      expect(metrics.compilationTime).toBe(300);
      expect(metrics.cacheHitRate).toBe(0); // 没有缓存命中
    });

    it('应该正确记录验证时间', () => {
      optimizer.recordValidationTime(50);
      optimizer.recordValidationTime(75);

      const metrics = optimizer.getMetrics();

      expect(metrics.validationTime).toBe(125);
    });

    it('应该正确计算缓存命中率', () => {
      // 模拟缓存命中
      optimizer['cacheHits'] = 3;
      optimizer['totalCompilations'] = 5;

      const metrics = optimizer.getMetrics();

      expect(metrics.cacheHitRate).toBe(60); // 3/5 * 100
    });

    it('应该在没有编译时返回 0% 缓存命中率', () => {
      const metrics = optimizer.getMetrics();

      expect(metrics.cacheHitRate).toBe(0);
    });

    it('应该能够重置性能指标', () => {
      optimizer.recordCompilationTime(100);
      optimizer.recordValidationTime(50);

      optimizer.resetMetrics();

      const metrics = optimizer.getMetrics();

      expect(metrics.compilationTime).toBe(0);
      expect(metrics.validationTime).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('缓存统计', () => {
    it('应该提供准确的缓存统计信息', () => {
      // 添加一些缓存条目
      for (let i = 0; i < 5; i++) {
        optimizer.cacheSchema(`key-${i}`, {} as any);
      }

      // 模拟一些缓存命中
      optimizer['cacheHits'] = 2;
      optimizer['totalCompilations'] = 4;

      const stats = optimizer.getCacheStats();

      console.log('Cache size:', stats.size);
      console.log('Cache max size:', stats.maxSize);
      console.log('Cache hit rate:', stats.hitRate);
      console.log('Cache hits:', optimizer['cacheHits']);
      console.log('Total compilations:', optimizer['totalCompilations']);

      expect(stats.size).toBe(5);
      expect(stats.maxSize).toBe(10);
      expect(stats.hitRate).toBe(50); // 2/4 * 100
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('预编译', () => {
    it('应该预编译常用 schema', () => {
      const cacheKey = 'test-key';

      optimizer.precompileSchema(testMetadata, cacheKey);

      // 预编译使用不同的键名前缀
      const precompiledKey = `precompiled:${cacheKey}`;

      // 验证预编译的 schema 被存储（但不一定在主缓存中）
      expect(optimizer['precompiledSchemas'].has(precompiledKey)).toBe(true);
    });

    it('应该在禁用预编译时跳过预编译', () => {
      const disabledOptimizer = new PerformanceOptimizer({
        enablePrecompilation: false,
        enableCache: true,
        cacheSize: 10,
      });

      const cacheKey = 'test-key';

      disabledOptimizer.precompileSchema(testMetadata, cacheKey);

      expect(disabledOptimizer.hasCachedSchema(cacheKey)).toBe(false);
    });
  });

  describe('内存管理', () => {
    it('应该监控内存使用情况', () => {
      const stats = optimizer.getCacheStats();

      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该在内存超过阈值时清理内存', () => {
      // 设置很低的内存阈值
      const lowMemoryOptimizer = new PerformanceOptimizer({
        enableCache: true,
        cacheSize: 10,
        memoryThreshold: 0.001, // 1KB
      });

      // 添加大量数据以触发内存清理
      for (let i = 0; i < 20; i++) {
        lowMemoryOptimizer.cacheSchema(`key-${i}`, { large: 'data'.repeat(1000) } as any);
      }

      // 验证缓存被清理
      expect(lowMemoryOptimizer.getCacheStats().size).toBeLessThan(20);
    });
  });

  describe('性能基准测试', () => {
    it('应该能够运行性能基准测试', async () => {
      const benchmark = await optimizer.runBenchmark(testMetadata, 10);

      expect(benchmark.compilation).toBeDefined();
      expect(benchmark.validation).toBeDefined();
      expect(benchmark.memory).toBeDefined();

      expect(benchmark.compilation.avgTime).toBeGreaterThan(0);
      expect(benchmark.compilation.minTime).toBeGreaterThan(0);
      expect(benchmark.compilation.maxTime).toBeGreaterThan(0);
      expect(benchmark.compilation.minTime).toBeLessThanOrEqual(benchmark.compilation.avgTime);
      expect(benchmark.compilation.avgTime).toBeLessThanOrEqual(benchmark.compilation.maxTime);

      expect(benchmark.validation.avgTime).toBeGreaterThan(0);
      expect(benchmark.memory.before).toBeGreaterThanOrEqual(0);
      expect(benchmark.memory.after).toBeGreaterThanOrEqual(0);
    });

    it('应该使用默认迭代次数运行基准测试', async () => {
      const benchmark = await optimizer.runBenchmark(testMetadata);

      expect(benchmark.compilation).toBeDefined();
      expect(benchmark.validation).toBeDefined();
      expect(benchmark.memory).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该优雅地处理无效的缓存键', () => {
      expect(optimizer.hasCachedSchema('')).toBe(false);
      expect(optimizer.getCachedSchema('')).toBeNull();
    });

    it('应该处理空的表单元数据', () => {
      const emptyMetadata: FormMetadata = {
        version: '1.0.0',
        fields: [],
      };

      expect(() => {
        optimizer.precompileSchema(emptyMetadata, 'empty-key');
      }).not.toThrow();
    });

    it('应该处理负数的缓存大小', () => {
      const invalidOptimizer = new PerformanceOptimizer({
        enableCache: true,
        cacheSize: -1,
      });

      expect(() => {
        invalidOptimizer.cacheSchema('test', {} as any);
      }).not.toThrow();
    });
  });

  describe('配置选项', () => {
    it('应该使用默认配置', () => {
      const defaultOptimizer = new PerformanceOptimizer();

      const stats = defaultOptimizer.getCacheStats();

      expect(stats.maxSize).toBe(1000); // 默认值
      expect(defaultOptimizer.getMetrics().cacheHitRate).toBe(0);
    });

    it('应该支持自定义配置', () => {
      const customOptimizer = new PerformanceOptimizer({
        enableCache: true,
        cacheSize: 50,
        enablePrecompilation: false,
        enableLazyValidation: true,
        enableOptimizedCompilation: false,
        memoryThreshold: 200,
      });

      const stats = customOptimizer.getCacheStats();

      expect(stats.maxSize).toBe(50);
    });
  });

  describe('内存清理', () => {
    it('应该能够清理内存而不影响其他功能', () => {
      // 添加一些缓存条目
      for (let i = 0; i < 5; i++) {
        optimizer.cacheSchema(`key-${i}`, {} as any);
      }

      // 记录一些性能指标
      optimizer.recordCompilationTime(100);
      optimizer.recordValidationTime(50);

      // 手动触发内存清理
      optimizer['cleanupMemory']();

      // 验证性能指标仍然存在
      const metrics = optimizer.getMetrics();
      expect(metrics.compilationTime).toBe(100);
      expect(metrics.validationTime).toBe(50);
    });
  });
});