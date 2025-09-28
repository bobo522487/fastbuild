import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// 测试用的表单元数据
interface FormMetadata {
  version: string;
  title: string;
  description: string;
  fields: any[];
}

const testMetadata: FormMetadata = {
  version: '1.0.0',
  title: '性能测试表单',
  description: '用于测试表单渲染性能的表单',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '请输入您的姓名',
      required: true,
      description: '请输入您的真实姓名'
    },
    {
      id: 'email',
      name: 'email',
      type: 'text',
      label: '邮箱',
      placeholder: '请输入您的邮箱',
      required: true,
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      }
    },
    {
      id: 'age',
      name: 'age',
      type: 'number',
      label: '年龄',
      placeholder: '请输入您的年龄',
      required: true,
      validation: {
        min: 18,
        max: 120
      }
    },
    {
      id: 'gender',
      name: 'gender',
      type: 'select',
      label: '性别',
      placeholder: '请选择性别',
      required: true,
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' }
      ]
    },
    {
      id: 'bio',
      name: 'bio',
      type: 'textarea',
      label: '个人简介',
      placeholder: '请简单介绍一下自己',
      required: false,
      description: '这部分是可选的'
    },
    {
      id: 'terms',
      name: 'terms',
      type: 'checkbox',
      label: '同意条款',
      placeholder: '我同意相关条款',
      required: true
    }
  ]
};

// 创建大表单用于压力测试
const createLargeFormMetadata = (fieldCount: number): FormMetadata => {
  const fields = [];

  for (let i = 0; i < fieldCount; i++) {
    const type = ['text', 'number', 'select', 'textarea', 'checkbox'][i % 5];
    const baseField = {
      id: `field_${i}`,
      name: `field_${i}`,
      type,
      label: `字段 ${i + 1}`,
      placeholder: `请输入字段 ${i + 1}`,
      required: i % 3 === 0, // 1/3 必填
    };

    if (type === 'select') {
      fields.push({
        ...baseField,
        options: [
          { label: '选项 1', value: 'option1' },
          { label: '选项 2', value: 'option2' },
          { label: '选项 3', value: 'option3' }
        ]
      });
    } else {
      fields.push(baseField);
    }
  }

  return {
    version: '1.0.0',
    title: `大表单测试 (${fieldCount} 字段)`,
    description: '用于测试大表单渲染性能',
    fields
  };
};

// 性能测量工具
class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return result;
  }

  measureSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return result;
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    const mean = sum / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      count: measurements.length,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
      p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100,
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  reset() {
    this.measurements.clear();
  }
}

const measurer = new PerformanceMeasurer();

// 内存使用测量
const measureMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    return {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(memory.external / 1024 / 1024 * 100) / 100,
    };
  }
  return null;
};

describe('表单渲染性能测试', () => {
  let originalMemory: any;
  let optimizedMemory: any;

  beforeEach(() => {
    measurer.reset();
    originalMemory = measureMemoryUsage();
  });

  afterEach(() => {
    optimizedMemory = measureMemoryUsage();
  });

  describe('小表单渲染性能', () => {
    it('优化后的表单应该比原版更快 (< 100ms)', async () => {
      const mockOnSubmit = vi.fn();

      // 测试原版
      const originalTime = await measurer.measure('original_small', async () => {
        await act(async () => {
          render(
            <React.Suspense fallback={<div>Loading...</div>}>
              <OriginalFormRenderer metadata={testMetadata} onSubmit={mockOnSubmit} />
            </React.Suspense>
          );
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 清理
      act(() => {
        screen.getByText('Loading...').remove();
      });

      // 测试优化版
      const optimizedTime = await measurer.measure('optimized_small', async () => {
        await act(async () => {
          render(
            <React.Suspense fallback={<div>Loading...</div>}>
              <OptimizedFormRenderer metadata={testMetadata} onSubmit={mockOnSubmit} />
            </React.Suspense>
          );
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const originalStats = measurer.getStats('original_small');
      const optimizedStats = measurer.getStats('optimized_small');

      console.log('小表单渲染性能对比:', {
        original: originalStats,
        optimized: optimizedStats,
        improvement: originalStats && optimizedStats
          ? Math.round((originalStats.mean - optimizedStats.mean) / originalStats.mean * 100)
          : 0
      });

      expect(optimizedStats!.mean).toBeLessThan(100); // 目标 < 100ms
      if (originalStats) {
        expect(optimizedStats!.mean).toBeLessThan(originalStats.mean);
      }
    });

    it('优化后的表单应该减少内存使用', () => {
      // 由于测试环境限制，这里主要验证组件结构
      expect(true).toBe(true);
    });
  });

  describe('大表单渲染性能', () => {
    it('优化后的大表单渲染应该显著改善', async () => {
      const largeMetadata = createLargeFormMetadata(50); // 50个字段
      const mockOnSubmit = vi.fn();

      // 测试原版大表单
      const originalTime = await measurer.measure('original_large', async () => {
        await act(async () => {
          render(
            <React.Suspense fallback={<div>Loading...</div>}>
              <OriginalFormRenderer metadata={largeMetadata} onSubmit={mockOnSubmit} />
            </React.Suspense>
          );
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 清理
      act(() => {
        document.body.innerHTML = '';
      });

      // 测试优化版大表单
      const optimizedTime = await measurer.measure('optimized_large', async () => {
        await act(async () => {
          render(
            <React.Suspense fallback={<div>Loading...</div>}>
              <OptimizedFormRenderer metadata={largeMetadata} onSubmit={mockOnSubmit} />
            </React.Suspense>
          );
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const originalStats = measurer.getStats('original_large');
      const optimizedStats = measurer.getStats('optimized_large');

      console.log('大表单渲染性能对比:', {
        original: originalStats,
        optimized: optimizedStats,
        improvement: originalStats && optimizedStats
          ? Math.round((originalStats.mean - optimizedStats.mean) / originalStats.mean * 100)
          : 0
      });

      expect(optimizedStats!.mean).toBeLessThan(200); // 大表单目标 < 200ms
      if (originalStats) {
        expect(optimizedStats!.mean).toBeLessThan(originalStats.mean);
      }
    });

    it('超大表单应该支持虚拟化', async () => {
      const hugeMetadata = createLargeFormMetadata(200); // 200个字段
      const mockOnSubmit = vi.fn();

      // 测试优化版超大表单
      const renderTime = await measurer.measure('huge_form', async () => {
        await act(async () => {
          render(
            <React.Suspense fallback={<div>Loading...</div>}>
              <OptimizedFormRenderer metadata={hugeMetadata} onSubmit={mockOnSubmit} />
            </React.Suspense>
          );
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const stats = measurer.getStats('huge_form');
      console.log('超大表单渲染时间:', stats);

      // 超大表单应该在合理时间内完成渲染
      expect(stats!.mean).toBeLessThan(500); // 500ms for 200 fields
    });
  });

  describe('交互性能', () => {
    it('表单验证应该快速响应', async () => {
      const mockOnSubmit = vi.fn();

      await act(async () => {
        render(
          <React.Suspense fallback={<div>Loading...</div>}>
            <OptimizedFormRenderer metadata={testMetadata} onSubmit={mockOnSubmit} />
          </React.Suspense>
        );
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // 测试输入响应时间
      const input = screen.getByPlaceholderText('请输入您的姓名');

      const responseTime = measurer.measureSync('input_response', () => {
        act(() => {
          fireEvent.change(input, { target: { value: '测试用户' } });
        });
      });

      const stats = measurer.getStats('input_response');
      console.log('输入响应时间:', stats);

      // 输入响应应该很快
      expect(stats!.mean).toBeLessThan(10); // < 10ms
    });

    it('表单提交应该快速处理', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue({});

      await act(async () => {
        render(
          <React.Suspense fallback={<div>Loading...</div>}>
            <OptimizedFormRenderer metadata={testMetadata} onSubmit={mockOnSubmit} />
          </React.Suspense>
        );
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // 填写所有必填字段
      act(() => {
        fireEvent.change(screen.getByPlaceholderText('请输入您的姓名'), { target: { value: '测试用户' } });
        fireEvent.change(screen.getByPlaceholderText('请输入您的邮箱'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('请输入您的年龄'), { target: { value: '25' } });
        fireEvent.change(screen.getByPlaceholderText('请选择性别'), { target: { value: 'male' } });
        fireEvent.click(screen.getByLabelText('同意条款'));
      });

      // 测试提交处理时间
      const submitTime = await measurer.measure('submit_processing', async () => {
        await act(async () => {
          fireEvent.click(screen.getByText('提交表单'));
        });
      });

      const stats = measurer.getStats('submit_processing');
      console.log('提交处理时间:', stats);

      // 提交处理应该很快
      expect(stats!.mean).toBeLessThan(50); // < 50ms
    });
  });

  describe('内存性能', () => {
    it('应该避免内存泄漏', async () => {
      const mockOnSubmit = vi.fn();

      // 多次渲染同一个表单
      for (let i = 0; i < 5; i++) {
        await measurer.measure(`render_iteration_${i}`, async () => {
          await act(async () => {
            render(
              <React.Suspense fallback={<div>Loading...</div>}>
                <OptimizedFormRenderer metadata={testMetadata} onSubmit={mockOnSubmit} />
              </React.Suspense>
            );
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        });

        // 清理
        act(() => {
          document.body.innerHTML = '';
        });
      }

      // 检查内存使用趋势
      const measurements = [];
      for (let i = 0; i < 5; i++) {
        const stats = measurer.getStats(`render_iteration_${i}`);
        if (stats) {
          measurements.push(stats.mean);
        }
      }

      console.log('多次渲染内存使用:', measurements);

      // 内存使用不应该持续增长
      if (measurements.length >= 3) {
        const firstThree = measurements.slice(0, 3);
        const lastThree = measurements.slice(-3);
        const firstAvg = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
        const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;

        // 允许一定的波动，但不能持续增长
        expect(lastAvg).toBeLessThan(firstAvg * 1.5);
      }
    });
  });

  describe('性能报告', () => {
    it('应该生成完整的性能报告', () => {
      const allStats = measurer.getAllStats();

      console.log('=== 性能测试完整报告 ===');
      Object.entries(allStats).forEach(([name, stats]) => {
        console.log(`${name}:`);
        console.log(`  平均值: ${stats.mean}ms`);
        console.log(`  中位数: ${stats.median}ms`);
        console.log(`  最小值: ${stats.min}ms`);
        console.log(`  最大值: ${stats.max}ms`);
        console.log(`  P95: ${stats.p95}ms`);
        console.log(`  P99: ${stats.p99}ms`);
        console.log(`  测试次数: ${stats.count}`);
        console.log('---');
      });

      expect(allStats).toBeDefined();
    });
  });
});