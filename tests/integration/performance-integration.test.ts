// 性能功能集成测试
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SchemaCompiler } from '@workspace/schema-compiler';
import { buildZodSchema, validateFormData } from '@workspace/schema-compiler';
import { FormMetadata } from '@workspace/types';

describe('Performance Integration Tests', () => {
  let compiler: SchemaCompiler;

  beforeEach(() => {
    compiler = new SchemaCompiler({
      enableCache: true,
      cacheMaxSize: 5,
      detailedErrors: true,
    });
  });

  afterEach(() => {
    compiler.clearCache();
    compiler.resetPerformanceMetrics();
  });

  describe('端到端性能测试', () => {
    it('应该在真实场景中展示缓存优势', () => {
      const contactForm: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'fullName',
            name: 'fullName',
            type: 'text',
            label: 'Full Name',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: 'Email',
            required: true,
          },
          {
            id: 'phone',
            name: 'phone',
            type: 'text',
            label: 'Phone',
            required: false,
          },
          {
            id: 'message',
            name: 'message',
            type: 'textarea',
            label: 'Message',
            required: true,
          },
          {
            id: 'newsletter',
            name: 'newsletter',
            type: 'checkbox',
            label: 'Subscribe to newsletter',
            required: false,
          },
        ],
      };

      // 模拟用户多次提交相同表单
      const testData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        message: 'This is a test message',
        newsletter: true,
      };

      // 第一次编译（无缓存）
      const firstStart = performance.now();
      const firstCompile = compiler.compile(contactForm);
      const firstEnd = performance.now();

      // 第二次编译（应该使用缓存）
      const secondStart = performance.now();
      const secondCompile = compiler.compile(contactForm);
      const secondEnd = performance.now();

      // 第三次编译（缓存命中）
      const thirdStart = performance.now();
      const thirdCompile = compiler.compile(contactForm);
      const thirdEnd = performance.now();

      expect(firstCompile.success).toBe(true);
      expect(secondCompile.success).toBe(true);
      expect(thirdCompile.success).toBe(true);

      // 缓存应该提高性能
      const firstTime = firstEnd - firstStart;
      const secondTime = secondEnd - secondStart;
      const thirdTime = thirdEnd - thirdStart;

      console.log(`第一次编译时间: ${firstTime.toFixed(2)}ms`);
      console.log(`第二次编译时间: ${secondTime.toFixed(2)}ms`);
      console.log(`第三次编译时间: ${thirdTime.toFixed(2)}ms`);

      // 缓存版本应该比第一次快
      expect(secondTime).toBeLessThan(firstTime * 0.8); // 至少快20%

      const metrics = compiler.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(50); // 至少50%的缓存命中率
    });

    it('应该在高并发场景下保持性能', async () => {
      const registrationForm: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'username',
            name: 'username',
            type: 'text',
            label: 'Username',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: 'Email',
            required: true,
          },
          {
            id: 'password',
            name: 'password',
            type: 'text',
            label: 'Password',
            required: true,
          },
          {
            id: 'age',
            name: 'age',
            type: 'number',
            label: 'Age',
            required: true,
          },
          {
            id: 'terms',
            name: 'terms',
            type: 'checkbox',
            label: 'Accept Terms',
            required: true,
          },
        ],
      };

      // 模拟并发用户注册
      const concurrentUsers = 50;
      const testUserData = Array.from({ length: concurrentUsers }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: `password${i}`,
        age: 20 + (i % 30),
        terms: true,
      }));

      const startTime = performance.now();
      const validationPromises = testUserData.map(userData =>
        compiler.validate(userData, registrationForm)
      );
      const results = await Promise.all(validationPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTimePerValidation = totalTime / concurrentUsers;

      console.log(`${concurrentUsers} 个并发验证总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`平均每个验证时间: ${avgTimePerValidation.toFixed(2)}ms`);

      // 所有验证都应该成功
      expect(results.every(result => result.success)).toBe(true);

      // 性能应该合理
      expect(avgTimePerValidation).toBeLessThan(10); // 平均每个验证应该小于10ms
      expect(totalTime).toBeLessThan(1000); // 总时间应该小于1秒
    });
  });

  describe('内存效率测试', () => {
    it('应该在长时间运行时保持内存稳定', () => {
      const formTemplates = Array.from({ length: 100 }, (_, i) => ({
        version: `1.0.${i}`,
        fields: Array.from({ length: 10 }, (_, j) => ({
          id: `field-${j}`,
          name: `field-${j}`,
          type: ['text', 'number', 'checkbox', 'select'][j % 4] as FormField['type'],
          label: `Field ${j}`,
          required: j % 2 === 0,
          ...(j % 4 === 3 && {
            options: [
              { label: 'Option 1', value: 'opt1' },
              { label: 'Option 2', value: 'opt2' },
            ],
          }),
        })),
      }));

      const initialMemory = compiler.getPerformanceMetrics().memoryUsage;

      // 编译大量表单
      formTemplates.forEach(template => {
        compiler.compile(template);
      });

      const afterProcessingMemory = compiler.getPerformanceMetrics().memoryUsage;
      const memoryGrowth = afterProcessingMemory - initialMemory;

      console.log(`初始内存使用: ${initialMemory.toFixed(2)}MB`);
      console.log(`处理后内存使用: ${afterProcessingMemory.toFixed(2)}MB`);
      console.log(`内存增长: ${memoryGrowth.toFixed(2)}MB`);

      // 内存增长应该合理
      expect(memoryGrowth).toBeLessThan(50); // 内存增长应该小于50MB
    });

    it('应该在缓存清理时释放内存', () => {
      // 填充缓存
      for (let i = 0; i < 20; i++) {
        const metadata: FormMetadata = {
          version: `1.0.${i}`,
          fields: [
            {
              id: 'field',
              name: 'field',
              type: 'text',
              label: 'Field',
              required: true,
            },
          ],
        };
        compiler.compile(metadata);
      }

      const beforeClearMemory = compiler.getPerformanceMetrics().memoryUsage;

      // 清理缓存
      compiler.clearCache();

      const afterClearMemory = compiler.getPerformanceMetrics().memoryUsage;

      console.log(`清理前内存: ${beforeClearMemory.toFixed(2)}MB`);
      console.log(`清理后内存: ${afterClearMemory.toFixed(2)}MB`);

      // 清理后内存应该减少（或者至少不显著增加）
      expect(afterClearMemory).toBeLessThanOrEqual(beforeClearMemory * 1.1);
    });
  });

  describe('便捷函数性能', () => {
    it('应该保持便捷函数的性能', () => {
      const simpleForm: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: 'Name',
            required: true,
          },
        ],
      };

      const testData = { name: 'Test User' };

      // 测试便捷函数性能
      const iterations = 1000;

      const schemaBuildStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        buildZodSchema(simpleForm);
      }
      const schemaBuildEnd = performance.now();

      const validationStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateFormData(testData, simpleForm);
      }
      const validationEnd = performance.now();

      const avgSchemaBuildTime = (schemaBuildEnd - schemaBuildStart) / iterations;
      const avgValidationTime = (validationEnd - validationStart) / iterations;

      console.log(`平均 schema 构建时间: ${avgSchemaBuildTime.toFixed(3)}ms`);
      console.log(`平均验证时间: ${avgValidationTime.toFixed(3)}ms`);

      // 性能应该合理
      expect(avgSchemaBuildTime).toBeLessThan(1); // 平均构建时间应该小于1ms
      expect(avgValidationTime).toBeLessThan(0.5); // 平均验证时间应该小于0.5ms
    });
  });

  describe('性能基准测试集成', () => {
    it('应该提供有意义的性能基准数据', async () => {
      const complexForm: FormMetadata = {
        version: '1.0.0',
        fields: Array.from({ length: 30 }, (_, i) => ({
          id: `field-${i}`,
          name: `field-${i}`,
          type: ['text', 'number', 'select', 'checkbox', 'textarea'][i % 5] as FormField['type'],
          label: `Field ${i}`,
          required: i % 3 === 0,
          ...(i % 5 === 2 && {
            options: [
              { label: 'Option 1', value: 'opt1' },
              { label: 'Option 2', value: 'opt2' },
              { label: 'Option 3', value: 'opt3' },
            ],
          }),
        })),
      };

      const benchmark = await compiler.runPerformanceBenchmark(complexForm, 20);

      console.log('编译性能:', benchmark.compilation);
      console.log('验证性能:', benchmark.validation);
      console.log('内存使用:', benchmark.memory);

      // 基准数据应该合理
      expect(benchmark.compilation.avgTime).toBeGreaterThan(0);
      expect(benchmark.compilation.minTime).toBeGreaterThan(0);
      expect(benchmark.compilation.maxTime).toBeGreaterThan(0);
      expect(benchmark.compilation.minTime).toBeLessThanOrEqual(benchmark.compilation.avgTime);

      expect(benchmark.validation.avgTime).toBeGreaterThan(0);
      expect(benchmark.memory.before).toBeGreaterThanOrEqual(0);
      expect(benchmark.memory.after).toBeGreaterThanOrEqual(0);

      // 性能应该稳定（最大值不应该超过平均值的5倍）
      expect(benchmark.compilation.maxTime).toBeLessThan(benchmark.compilation.avgTime * 5);
    });
  });

  describe('错误处理性能', () => {
    it('应该高效处理无效数据', () => {
      const formWithValidation: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: 'Email',
            required: true,
          },
          {
            id: 'age',
            name: 'age',
            type: 'number',
            label: 'Age',
            required: true,
          },
        ],
      };

      const invalidData = {
        email: 'invalid-email',
        age: -5,
      };

      const startTime = performance.now();
      const result = compiler.validate(invalidData, formWithValidation);
      const endTime = performance.now();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const validationTime = endTime - startTime;
      console.log(`错误验证时间: ${validationTime.toFixed(3)}ms`);

      // 错误处理应该很快
      expect(validationTime).toBeLessThan(10); // 错误验证应该小于10ms
    });
  });
});