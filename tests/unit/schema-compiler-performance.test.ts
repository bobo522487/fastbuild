// 测试 SchemaCompiler 的性能功能
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SchemaCompiler } from '@workspace/schema-compiler';
import { FormMetadata, FormField } from '@workspace/types';

describe('SchemaCompiler Performance Integration', () => {
  let compiler: SchemaCompiler;
  let testMetadata: FormMetadata;

  beforeEach(() => {
    compiler = new SchemaCompiler({
      enableCache: true,
      cacheMaxSize: 10,
      validateCircularReference: true,
      detailedErrors: true,
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
        {
          id: 'active',
          name: 'active',
          type: 'checkbox',
          label: '激活',
          required: false,
        },
      ],
    };
  });

  afterEach(() => {
    compiler.clearCache();
    compiler.resetPerformanceMetrics();
  });

  describe('性能监控集成', () => {
    it('应该记录编译时间', () => {
      const result = compiler.compile(testMetadata);

      // Temporarily show the error to debug
      if (!result.success) {
        console.log('DEBUG - Compilation failed with errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.success).toBe(true);

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.compilationTime).toBeGreaterThan(0);
      expect(metrics.totalCompilations).toBeGreaterThan(0);
    });

    it('应该记录验证时间', () => {
      const testData = {
        name: '测试用户',
        age: 25,
        email: 'test@example.com',
        active: true,
      };

      const result = compiler.validate(testData, testMetadata);

      expect(result.success).toBe(true);

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.validationTime).toBeGreaterThan(0);
    });

    it('应该提供完整的性能指标', () => {
      // 进行几次编译和验证
      compiler.compile(testMetadata);
      compiler.validate({ name: 'test', age: 30, email: 'test@test.com', active: true }, testMetadata);
      compiler.compile(testMetadata);

      const metrics = compiler.getPerformanceMetrics();

      expect(metrics.compilationTime).toBeGreaterThan(0);
      expect(metrics.validationTime).toBeGreaterThan(0);
      expect(metrics.cacheSize).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该能够重置性能指标', () => {
      compiler.compile(testMetadata);
      compiler.validate({ name: 'test', age: 30, email: 'test@test.com', active: true }, testMetadata);

      compiler.resetPerformanceMetrics();

      const metrics = compiler.getPerformanceMetrics();

      expect(metrics.compilationTime).toBe(0);
      expect(metrics.validationTime).toBe(0);
      expect(metrics.totalCompilations).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('缓存集成', () => {
    it('应该缓存编译结果以提高性能', () => {
      const firstResult = compiler.compile(testMetadata);
      expect(firstResult.success).toBe(true);

      // 第二次编译应该使用缓存
      const secondResult = compiler.compile(testMetadata);
      expect(secondResult.success).toBe(true);

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
    });

    it('应该提供缓存统计信息', () => {
      compiler.compile(testMetadata);

      const cacheStats = compiler.getCacheStats();

      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.maxSize).toBeGreaterThanOrEqual(cacheStats.size);
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0);
      expect(cacheStats.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该能够清空缓存', () => {
      compiler.compile(testMetadata);

      let cacheStats = compiler.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      compiler.clearCache();

      cacheStats = compiler.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('性能基准测试', () => {
    it('应该能够运行性能基准测试', async () => {
      const benchmark = await compiler.runPerformanceBenchmark(testMetadata, 5);

      expect(benchmark.compilation).toBeDefined();
      expect(benchmark.validation).toBeDefined();
      expect(benchmark.memory).toBeDefined();

      expect(benchmark.compilation.avgTime).toBeGreaterThan(0);
      expect(benchmark.compilation.minTime).toBeGreaterThan(0);
      expect(benchmark.compilation.maxTime).toBeGreaterThan(0);

      expect(benchmark.validation.avgTime).toBeGreaterThan(0);
      expect(benchmark.memory.before).toBeGreaterThanOrEqual(0);
      expect(benchmark.memory.after).toBeGreaterThanOrEqual(0);
    });

    it('应该使用默认迭代次数运行基准测试', async () => {
      const benchmark = await compiler.runPerformanceBenchmark(testMetadata);

      expect(benchmark.compilation).toBeDefined();
      expect(benchmark.validation).toBeDefined();
      expect(benchmark.memory).toBeDefined();

      // 默认应该运行足够的迭代次数
      expect(benchmark.compilation.avgTime).toBeGreaterThan(0);
    });

    it('应该在基准测试后保留性能指标', async () => {
      await compiler.runPerformanceBenchmark(testMetadata, 3);

      const metrics = compiler.getPerformanceMetrics();

      expect(metrics.compilationTime).toBeGreaterThan(0);
      expect(metrics.totalCompilations).toBeGreaterThan(0);
    });
  });

  describe('内存管理', () => {
    it('应该监控内存使用情况', () => {
      compiler.compile(testMetadata);

      const metrics = compiler.getPerformanceMetrics();

      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该在缓存满时自动管理内存', () => {
      // 创建大量的不同表单元数据
      const largeMetadataArray: FormMetadata[] = [];
      for (let i = 0; i < 20; i++) {
        largeMetadataArray.push({
          version: `1.0.${i}`,
          fields: [
            {
              id: `field-${i}`,
              name: `field-${i}`,
              type: 'text',
              label: `字段 ${i}`,
              required: true,
            },
          ],
        });
      }

      // 编译所有表单，触发缓存管理
      largeMetadataArray.forEach(metadata => {
        compiler.compile(metadata);
      });

      const cacheStats = compiler.getCacheStats();

      // 缓存大小应该被限制
      expect(cacheStats.size).toBeLessThanOrEqual(20);
    });
  });

  describe('复杂表单的性能', () => {
    it('应该高效处理复杂表单', () => {
      const complexMetadata: FormMetadata = {
        version: '1.0.0',
        fields: Array.from({ length: 50 }, (_, i) => ({
          id: `field-${i}`,
          name: `field-${i}`,
          type: ['text', 'number', 'select', 'checkbox'][i % 4] as FormField['type'],
          label: `字段 ${i}`,
          required: i % 3 === 0, // 每3个字段一个必填
          ...(i % 4 === 2 && {
            options: [
              { label: '选项1', value: 'option1' },
              { label: '选项2', value: 'option2' },
            ],
          }),
        })),
      };

      const startTime = performance.now();
      const result = compiler.compile(complexMetadata);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 编译时间应该小于1秒

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.compilationTime).toBeGreaterThan(0);
    });

    it('应该高效处理大量数据验证', () => {
      const largeTestData = {
        name: '测试用户',
        age: 25,
        email: 'test@example.com',
        active: true,
        // 添加大量字段
        ...Object.fromEntries(Array.from({ length: 20 }, (_, i) => [
          `field-${i}`,
          `value-${i}`,
        ])),
      };

      const startTime = performance.now();
      const result = compiler.validate(largeTestData, testMetadata);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 验证时间应该小于100ms

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.validationTime).toBeGreaterThan(0);
    });
  });

  describe('并发性能', () => {
    it('应该能够处理并发编译请求', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const metadata = {
          ...testMetadata,
          version: `1.0.${i}`,
        };
        return Promise.resolve(compiler.compile(metadata));
      });

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results.every(result => result.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // 并发编译时间应该小于2秒

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.totalCompilations).toBe(10);
    });
  });

  describe('错误处理的性能', () => {
    it('应该高效处理错误情况', () => {
      const invalidMetadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'invalid-type' as any, // 无效类型
            label: '姓名',
            required: true,
          },
        ],
      };

      const startTime = performance.now();
      const result = compiler.compile(invalidMetadata);
      const endTime = performance.now();

      expect(result.success).toBe(false);
      expect(endTime - startTime).toBeLessThan(100); // 错误处理应该很快

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.compilationTime).toBeGreaterThan(0);
    });
  });
});