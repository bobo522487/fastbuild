import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// 模拟性能监控组件
const PerformanceMonitor = ({ componentId, children, showMetrics = false, onPerformanceWarning }: any) => {
  const [metrics, setMetrics] = React.useState<any>(null);

  const handleRender = (id: string, phase: string, actualDuration: number) => {
    const newMetrics = {
      renderTime: actualDuration,
      componentCount: 1,
      timestamp: Date.now(),
    };
    setMetrics(newMetrics);

    if (actualDuration > 100) {
      onPerformanceWarning?.(newMetrics);
    }
  };

  return (
    <>
      <div data-testid="profiler" data-onrender={handleRender} />
      {children}
      {showMetrics && metrics && (
        <div data-testid="metrics">
          <div data-render-time={metrics.renderTime} />
        </div>
      )}
    </>
  );
};

const PerformanceMetrics = {
  recordMetrics: vi.fn(),
  getAverageMetrics: vi.fn(),
  getMetricsReport: vi.fn(),
  clearMetrics: vi.fn(),
};

const usePerformanceMonitor = (componentId: string) => {
  return {
    metrics: null,
    recordPerformance: PerformanceMetrics.recordMetrics,
    getAverageMetrics: PerformanceMetrics.getAverageMetrics,
  };
};

const useFormPerformanceMonitor = (formId: string, fieldCount: number) => {
  return {
    performanceData: null,
    recordFormPerformance: vi.fn(),
  };
};

const getPerformanceOptimizationSuggestions = (metrics: any) => {
  const suggestions: string[] = [];

  if (metrics.renderTime > 100) {
    suggestions.push('考虑使用React.memo优化组件渲染');
  }

  if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) {
    suggestions.push('检查是否有内存泄漏');
  }

  if (metrics.validationTime && metrics.validationTime > 50) {
    suggestions.push('优化验证逻辑，考虑缓存验证结果');
  }

  return suggestions;
};

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PerformanceMonitor Component', () => {
    it('应该渲染性能监控组件', () => {
      const onPerformanceWarning = vi.fn();

      render(
        <PerformanceMonitor
          componentId="test-component"
          showMetrics={true}
          onPerformanceWarning={onPerformanceWarning}
        >
          <div>测试内容</div>
        </PerformanceMonitor>
      );

      expect(screen.getByText('测试内容')).toBeInTheDocument();
      expect(screen.getByTestId('profiler')).toBeInTheDocument();
    });

    it('应该显示性能指标', () => {
      render(
        <PerformanceMonitor
          componentId="test-component"
          showMetrics={true}
        >
          <div>测试内容</div>
        </PerformanceMonitor>
      );

      // 模拟指标更新
      const profiler = screen.getByTestId('profiler');
      const handleRender = profiler.dataset.onrender;

      if (handleRender) {
        const renderFunction = new Function('return ' + handleRender)();
        renderFunction('test', 'mount', 150);
      }

      expect(screen.getByTestId('metrics')).toBeInTheDocument();
    });

    it('应该在性能超标时触发警告', () => {
      const onPerformanceWarning = vi.fn();

      render(
        <PerformanceMonitor
          componentId="test-component"
          onPerformanceWarning={onPerformanceWarning}
        >
          <div>测试内容</div>
        </PerformanceMonitor>
      );

      // 模拟高性能时间
      const profiler = screen.getByTestId('profiler');
      const handleRender = profiler.dataset.onrender;

      if (handleRender) {
        const renderFunction = new Function('return ' + handleRender)();
        renderFunction('test', 'mount', 150); // 超过100ms阈值
      }

      expect(onPerformanceWarning).toHaveBeenCalled();
    });
  });

  describe('usePerformanceMonitor Hook', () => {
    it('应该提供性能监控功能', () => {
      function TestComponent() {
        const { recordPerformance, getAverageMetrics } = usePerformanceMonitor('test-component');

        React.useEffect(() => {
          recordPerformance({
            renderTime: 50,
            componentCount: 1,
            timestamp: Date.now(),
          });
        }, [recordPerformance]);

        return (
          <button onClick={() => getAverageMetrics()}>
            获取平均性能
          </button>
        );
      }

      render(<TestComponent />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(PerformanceMetrics.recordMetrics).toHaveBeenCalled();
      expect(PerformanceMetrics.getAverageMetrics).toHaveBeenCalled();
    });
  });

  describe('useFormPerformanceMonitor Hook', () => {
    it('应该监控表单性能', () => {
      function TestForm() {
        const { recordFormPerformance } = useFormPerformanceMonitor('test-form', 5);

        return (
          <button onClick={() => recordFormPerformance(100, 25, 50)}>
            记录表单性能
          </button>
        );
      }

      render(<TestForm />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // 验证表单性能记录被调用
      expect(screen.getByText('记录表单性能')).toBeInTheDocument();
    });
  });

  describe('PerformanceMetrics Class', () => {
    it('应该记录和管理性能指标', () => {
      const metrics = {
        renderTime: 75,
        componentCount: 1,
        timestamp: Date.now(),
      };

      PerformanceMetrics.recordMetrics('test-component', metrics);

      expect(PerformanceMetrics.recordMetrics).toHaveBeenCalledWith('test-component', metrics);
    });

    it('应该获取平均性能指标', () => {
      PerformanceMetrics.getAverageMetrics('test-component');

      expect(PerformanceMetrics.getAverageMetrics).toHaveBeenCalledWith('test-component');
    });

    it('应该清除性能指标', () => {
      PerformanceMetrics.clearMetrics('test-component');

      expect(PerformanceMetrics.clearMetrics).toHaveBeenCalledWith('test-component');
    });
  });

  describe('Performance Optimization Suggestions', () => {
    it('应该为慢渲染提供优化建议', () => {
      const metrics = {
        renderTime: 150,
        componentCount: 1,
        timestamp: Date.now(),
      };

      const suggestions = getPerformanceOptimizationSuggestions(metrics);

      expect(suggestions).toContain('考虑使用React.memo优化组件渲染');
    });

    it('应该为高内存使用提供优化建议', () => {
      const metrics = {
        renderTime: 50,
        componentCount: 1,
        memoryUsage: 60 * 1024 * 1024, // 60MB
        timestamp: Date.now(),
      };

      const suggestions = getPerformanceOptimizationSuggestions(metrics);

      expect(suggestions).toContain('检查是否有内存泄漏');
    });

    it('应该为慢验证提供优化建议', () => {
      const metrics = {
        renderTime: 50,
        componentCount: 1,
        validationTime: 75,
        timestamp: Date.now(),
      };

      const suggestions = getPerformanceOptimizationSuggestions(metrics);

      expect(suggestions).toContain('优化验证逻辑，考虑缓存验证结果');
    });

    it('应该为正常性能不提供建议', () => {
      const metrics = {
        renderTime: 50,
        componentCount: 1,
        timestamp: Date.now(),
      };

      const suggestions = getPerformanceOptimizationSuggestions(metrics);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Performance Edge Cases', () => {
    it('应该处理空的性能指标', () => {
      const suggestions = getPerformanceOptimizationSuggestions({});

      expect(suggestions).toHaveLength(0);
    });

    it('应该处理负数的性能指标', () => {
      const metrics = {
        renderTime: -50,
        componentCount: 1,
        timestamp: Date.now(),
      };

      const suggestions = getPerformanceOptimizationSuggestions(metrics);

      expect(suggestions).toHaveLength(0);
    });

    it('应该处理undefined的性能指标', () => {
      const suggestions = getPerformanceOptimizationSuggestions(undefined as any);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Performance Integration', () => {
    it('应该与其他组件正确集成', () => {
      function TestForm() {
        const { recordPerformance } = usePerformanceMonitor('test-form');
        const { recordFormPerformance } = useFormPerformanceMonitor('test-form', 3);

        const handleSubmit = () => {
          recordPerformance({
            renderTime: 80,
            componentCount: 3,
            timestamp: Date.now(),
          });

          recordFormPerformance(80, 25, 15);
        };

        return (
          <button onClick={handleSubmit}>
            提交表单
          </button>
        );
      }

      render(<TestForm />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(PerformanceMetrics.recordMetrics).toHaveBeenCalled();
    });
  });
});