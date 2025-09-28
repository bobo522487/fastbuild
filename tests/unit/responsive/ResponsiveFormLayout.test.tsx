import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  breakpoints,
  useScreenSize,
  useBreakpoint,
  getResponsiveValue,
  ResponsiveSpacing,
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveText,
  useMobileOptimization,
  ResponsiveFormLayout,
  useGestures,
} from '../../../apps/web/components/forms/responsive/ResponsiveFormLayout';

// Mock window object
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn((fn) => fn()),
    useCallback: vi.fn((fn) => fn),
    useMemo: vi.fn((fn) => fn()),
    useRef: vi.fn(() => ({ current: null })),
  };
});

describe('ResponsiveFormLayout', () => {
  describe('breakpoints', () => {
    it('应该定义正确的断点值', () => {
      expect(breakpoints.xs).toBe(0);
      expect(breakpoints.sm).toBe(640);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
      expect(breakpoints['2xl']).toBe(1536);
    });
  });

  describe('useScreenSize', () => {
    it('应该返回正确的屏幕尺寸', () => {
      const { result } = renderHook(() => useScreenSize());

      expect(result.current.width).toBe(window.innerWidth);
      expect(result.current.height).toBe(window.innerHeight);
    });

    it('应该在窗口大小改变时更新', () => {
      const { result, rerender } = renderHook(() => useScreenSize());

      // 模拟窗口大小改变
      window.innerWidth = 800;
      window.innerHeight = 600;

      rerender();

      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
    });
  });

  describe('useBreakpoint', () => {
    beforeEach(() => {
      window.innerWidth = 1024;
    });

    it('应该返回正确的断点 - xs', () => {
      window.innerWidth = 500;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('xs');
    });

    it('应该返回正确的断点 - sm', () => {
      window.innerWidth = 700;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('sm');
    });

    it('应该返回正确的断点 - md', () => {
      window.innerWidth = 800;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('md');
    });

    it('应该返回正确的断点 - lg', () => {
      window.innerWidth = 1200;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('lg');
    });

    it('应该返回正确的断点 - xl', () => {
      window.innerWidth = 1400;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('xl');
    });

    it('应该返回正确的断点 - 2xl', () => {
      window.innerWidth = 1600;
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('2xl');
    });
  });

  describe('getResponsiveValue', () => {
    it('应该返回直接的值', () => {
      const result = getResponsiveValue('fixed', 'lg', 'default');
      expect(result).toBe('fixed');
    });

    it('应该返回匹配的响应式值', () => {
      const responsiveValue = {
        xs: 'small',
        sm: 'medium',
        lg: 'large',
      };

      let result = getResponsiveValue(responsiveValue, 'xs', 'default');
      expect(result).toBe('small');

      result = getResponsiveValue(responsiveValue, 'sm', 'default');
      expect(result).toBe('medium');

      result = getResponsiveValue(responsiveValue, 'lg', 'default');
      expect(result).toBe('large');
    });

    it('应该回退到更小的断点', () => {
      const responsiveValue = {
        sm: 'medium',
        lg: 'large',
      };

      const result = getResponsiveValue(responsiveValue, 'md', 'default');
      expect(result).toBe('medium');
    });

    it('应该返回默认值', () => {
      const responsiveValue = {
        lg: 'large',
      };

      const result = getResponsiveValue(responsiveValue, 'sm', 'default');
      expect(result).toBe('default');
    });
  });

  describe('ResponsiveSpacing', () => {
    it('应该正确渲染间距容器', () => {
      render(
        <ResponsiveSpacing spacing={4}>
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveSpacing>
      );

      const container = screen.getByText('Child 1').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'flex-col', 'space-y-4');
    });

    it('应该支持行方向', () => {
      render(
        <ResponsiveSpacing spacing={2} direction="row">
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveSpacing>
      );

      const container = screen.getByText('Child 1').parentElement;
      expect(container).toHaveClass('flex-row', 'space-x-2');
    });

    it('应该支持换行', () => {
      render(
        <ResponsiveSpacing spacing={3} wrap={true}>
          <div>Child 1</div>
          <div>Child 2</div>
        </ResponsiveSpacing>
      );

      const container = screen.getByText('Child 1').parentElement;
      expect(container).toHaveClass('flex-wrap');
    });
  });

  describe('ResponsiveGrid', () => {
    it('应该正确渲染网格容器', () => {
      render(
        <ResponsiveGrid cols={2} gap={4}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </ResponsiveGrid>
      );

      const container = screen.getByText('Item 1').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('grid', 'grid-cols-2', 'gap-4');
    });

    it('应该支持响应式列数', () => {
      const responsiveCols = {
        xs: 1,
        sm: 2,
        lg: 4,
      };

      render(
        <ResponsiveGrid cols={responsiveCols}>
          <div>Item 1</div>
        </ResponsiveGrid>
      );

      const container = screen.getByText('Item 1').parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe('ResponsiveContainer', () => {
    it('应该正确渲染容器', () => {
      render(
        <ResponsiveContainer size="lg">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('Content').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('max-w-4xl', 'mx-auto', 'px-4');
    });

    it('应该支持不同尺寸', () => {
      render(
        <ResponsiveContainer size="sm">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('Content').parentElement;
      expect(container).toHaveClass('max-w-sm');
    });

    it('应该支持全宽', () => {
      render(
        <ResponsiveContainer size="full">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('Content').parentElement;
      expect(container).toHaveClass('max-w-full');
    });
  });

  describe('ResponsiveText', () => {
    it('应该正确渲染文本', () => {
      render(
        <ResponsiveText size="lg" weight="bold">
          Test Text
        </ResponsiveText>
      );

      const text = screen.getByText('Test Text');
      expect(text).toBeInTheDocument();
      expect(text).toHaveClass('text-lg', 'font-bold');
    });

    it('应该支持不同的HTML标签', () => {
      render(
        <ResponsiveText as="h1" size="2xl">
          Heading
        </ResponsiveText>
      );

      const heading = screen.getByText('Heading');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('应该支持响应式大小', () => {
      const responsiveSize = {
        xs: 'sm',
        sm: 'base',
        lg: 'xl',
      };

      render(
        <ResponsiveText size={responsiveSize}>
          Responsive Text
        </ResponsiveText>
      );

      const text = screen.getByText('Responsive Text');
      expect(text).toBeInTheDocument();
    });
  });

  describe('useMobileOptimization', () => {
    beforeEach(() => {
      window.innerWidth = 1024;
    });

    it('应该正确检测设备类型', () => {
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('应该检测移动设备', () => {
      window.innerWidth = 500;
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('应该检测平板设备', () => {
      window.innerWidth = 800;
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('应该检测横向模式', () => {
      window.innerWidth = 1200;
      window.innerHeight = 800;
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isLandscape).toBe(true);
    });

    it('应该检测纵向模式', () => {
      window.innerWidth = 800;
      window.innerHeight = 1200;
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isLandscape).toBe(false);
    });

    it('应该返回正确的触摸目标尺寸', () => {
      const { result } = renderHook(() => useMobileOptimization());

      expect(typeof result.current.getTouchTargetSize()).toBe('number');
    });

    it('应该返回正确的字体缩放比例', () => {
      const { result } = renderHook(() => useMobileOptimization());

      const scale = result.current.getFontScale();
      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThanOrEqual(1);
    });

    it('应该检测触摸设备', () => {
      // Mock touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });

      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.isTouchDevice).toBe(true);
    });

    it('应该返回正确的输入模式', () => {
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.getInputMode('email')).toBe('email');
      expect(result.current.getInputMode('tel')).toBe('tel');
      expect(result.current.getInputMode('number')).toBe('numeric');
      expect(result.current.getInputMode('text')).toBe('text');
    });

    it('应该返回正确的键盘类型', () => {
      const { result } = renderHook(() => useMobileOptimization());

      expect(result.current.getKeyboardType('email')).toBe('email-address');
      expect(result.current.getKeyboardType('url')).toBe('url');
      expect(result.current.getKeyboardType('number')).toBe('numeric');
      expect(result.current.getKeyboardType('text')).toBe('default');
    });
  });

  describe('ResponsiveFormLayout', () => {
    it('应该正确渲染表单布局', () => {
      render(
        <ResponsiveFormLayout>
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveFormLayout>
      );

      const container = screen.getByText('Field 1').parentElement;
      expect(container).toBeInTheDocument();
    });

    it('应该支持堆叠布局', () => {
      render(
        <ResponsiveFormLayout layout="stacked">
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveFormLayout>
      );

      const container = screen.getByText('Field 1').parentElement;
      expect(container).toHaveClass('flex-col', 'space-y-4');
    });

    it('应该支持内联布局', () => {
      render(
        <ResponsiveFormLayout layout="inline">
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveFormLayout>
      );

      const container = screen.getByText('Field 1').parentElement;
      expect(container).toHaveClass('flex-wrap', 'gap-4');
    });

    it('应该支持网格布局', () => {
      render(
        <ResponsiveFormLayout layout="grid">
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveFormLayout>
      );

      const container = screen.getByText('Field 1').parentElement;
      expect(container).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-4');
    });
  });

  describe('useGestures', () => {
    it('应该提供手势处理方法', () => {
      const onSwipeLeft = vi.fn();
      const onSwipeRight = vi.fn();
      const onSwipeUp = vi.fn();
      const onSwipeDown = vi.fn();

      const { result } = renderHook(() =>
        useGestures(onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown)
      );

      expect(result.current).toHaveProperty('onTouchStart');
      expect(result.current).toHaveProperty('onTouchEnd');
      expect(typeof result.current.onTouchStart).toBe('function');
      expect(typeof result.current.onTouchEnd).toBe('function');
    });
  });
});

// Helper function for testing hooks
function renderHook<T>(hook: () => T): { result: { current: T }; rerender: () => void } {
  let result: { current: T };

  const TestComponent = () => {
    result = { current: hook() };
    return null;
  };

  render(<TestComponent />);

  return {
    get result() {
      return result!;
    },
    rerender: () => {
      render(<TestComponent />);
    },
  };
}