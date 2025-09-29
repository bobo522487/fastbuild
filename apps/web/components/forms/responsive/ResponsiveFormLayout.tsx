'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';

// 响应式断点配置
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// 响应式值类型
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// 获取当前屏幕尺寸
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// 获取当前断点
export const useBreakpoint = (): Breakpoint => {
  const { width } = useScreenSize();

  return React.useMemo(() => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }, [width]);
};

// 解析响应式值
export const getResponsiveValue = <T,>(
  value: ResponsiveValue<T>,
  currentBreakpoint: Breakpoint,
  defaultValue: T
): T => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const responsiveValue = value as Partial<Record<Breakpoint, T>>;

    // 按断点优先级查找匹配的值
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bpKey = breakpointOrder[i] as string;
      const value = (responsiveValue as any)[bpKey];
      if (value !== undefined) {
        return value as T;
      }
    }

    return defaultValue;
  }

  return value as T;
};

// 响应式间距组件
export interface ResponsiveSpacingProps {
  children: React.ReactNode;
  spacing?: ResponsiveValue<number>;
  direction?: 'row' | 'column';
  wrap?: boolean;
  className?: string;
}

export const ResponsiveSpacing: React.FC<ResponsiveSpacingProps> = ({
  children,
  spacing = 4,
  direction = 'column',
  wrap = false,
  className,
}) => {
  const breakpoint = useBreakpoint();
  const currentSpacing = getResponsiveValue(spacing, breakpoint, 4);

  const spacingClass = React.useMemo(() => {
    if (direction === 'row') {
      return `space-x-${currentSpacing}`;
    }
    return `space-y-${currentSpacing}`;
  }, [direction, currentSpacing]);

  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        wrap && 'flex-wrap',
        spacingClass,
        className
      )}
    >
      {children}
    </div>
  );
};

// 响应式网格布局
export interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: ResponsiveValue<number>;
  gap?: ResponsiveValue<number>;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = 1,
  gap = 4,
  className,
}) => {
  const breakpoint = useBreakpoint();
  const currentCols = getResponsiveValue(cols, breakpoint, 1);
  const currentGap = getResponsiveValue(gap, breakpoint, 4);

  const gridClass = React.useMemo(() => {
    return `grid grid-cols-${currentCols} gap-${currentGap}`;
  }, [currentCols, currentGap]);

  return (
    <div className={cn(gridClass, className)}>
      {children}
    </div>
  );
};

// 响应式容器
export interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: ResponsiveValue<'sm' | 'md' | 'lg' | 'xl' | 'full'>;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  size = 'lg',
  className,
}) => {
  const breakpoint = useBreakpoint();
  const currentSize = getResponsiveValue(size, breakpoint, 'lg');

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('mx-auto px-4', sizeClasses[currentSize], className)}>
      {children}
    </div>
  );
};

// 响应式文本
export interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: ResponsiveValue<'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'>;
  weight?: ResponsiveValue<'normal' | 'medium' | 'semibold' | 'bold'>;
  className?: string;
  as?: React.ElementType;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = 'base',
  weight = 'normal',
  className,
  as: Component = 'div',
}) => {
  const breakpoint = useBreakpoint();
  const currentSize = getResponsiveValue(size, breakpoint, 'base');
  const currentWeight = getResponsiveValue(weight, breakpoint, 'normal');

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <Component
      className={cn(
        sizeClasses[currentSize],
        weightClasses[currentWeight],
        className
      )}
    >
      {children}
    </Component>
  );
};

// 移动端优化工具钩子
export const useMobileOptimization = () => {
  const { width, height } = useScreenSize();
  const isMobile = React.useMemo(() => width < breakpoints.md, [width]);
  const isTablet = React.useMemo(() => width >= breakpoints.md && width < breakpoints.lg, [width]);
  const isDesktop = React.useMemo(() => width >= breakpoints.lg, [width]);

  // 检测是否为横向模式
  const isLandscape = React.useMemo(() => width > height, [width, height]);

  // 获取适合的触摸目标尺寸
  const getTouchTargetSize = React.useCallback(() => {
    return isMobile ? 48 : 32; // 移动端最小触摸目标尺寸为 48px
  }, [isMobile]);

  // 获取适合的字体缩放比例
  const getFontScale = React.useCallback(() => {
    if (width < breakpoints.sm) return 0.875; // 小屏幕
    if (width < breakpoints.md) return 0.9375; // 中等屏幕
    return 1; // 默认
  }, [width]);

  // 检测是否支持触摸
  const isTouchDevice = React.useMemo(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // 获取适合的输入法建议
  const getInputMode = React.useCallback((fieldType: string) => {
    switch (fieldType) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'number':
        return 'numeric';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  }, []);

  // 获取适合的键盘类型
  const getKeyboardType = React.useCallback((fieldType: string) => {
    switch (fieldType) {
      case 'email':
        return 'email-address';
      case 'url':
        return 'url';
      case 'number':
        return 'numeric';
      case 'tel':
        return 'phone-pad';
      default:
        return 'default';
    }
  }, []);

  return {
    screenSize: { width, height },
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    isTouchDevice,
    getTouchTargetSize,
    getFontScale,
    getInputMode,
    getKeyboardType,
  };
};

// 响应式表单布局组件
export interface ResponsiveFormLayoutProps {
  children: React.ReactNode;
  layout?: ResponsiveValue<'stacked' | 'inline' | 'grid'>;
  labelPosition?: ResponsiveValue<'top' | 'left' | 'floating'>;
  fieldWidth?: ResponsiveValue<'full' | 'fixed' | 'auto'>;
  className?: string;
}

export const ResponsiveFormLayout: React.FC<ResponsiveFormLayoutProps> = ({
  children,
  layout = { xs: 'stacked', sm: 'inline', lg: 'grid' },
  labelPosition = { xs: 'top', sm: 'left' },
  fieldWidth = { xs: 'full', sm: 'fixed' },
  className,
}) => {
  const breakpoint = useBreakpoint();
  const currentLayout = getResponsiveValue(layout, breakpoint, 'stacked');
  const currentLabelPosition = getResponsiveValue(labelPosition, breakpoint, 'top');
  const currentFieldWidth = getResponsiveValue(fieldWidth, breakpoint, 'full');

  const layoutClasses = React.useMemo(() => {
    switch (currentLayout) {
      case 'stacked':
        return 'flex flex-col space-y-4';
      case 'inline':
        return 'flex flex-wrap gap-4';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 gap-4';
      default:
        return 'flex flex-col space-y-4';
    }
  }, [currentLayout]);

  const labelPositionClasses = React.useMemo(() => {
    switch (currentLabelPosition) {
      case 'left':
        return 'items-center';
      case 'floating':
        return 'relative';
      default:
        return '';
    }
  }, [currentLabelPosition]);

  const fieldWidthClasses = React.useMemo(() => {
    switch (currentFieldWidth) {
      case 'fixed':
        return 'w-64';
      case 'auto':
        return 'flex-1';
      default:
        return 'w-full';
    }
  }, [currentFieldWidth]);

  return (
    <div className={cn(layoutClasses, labelPositionClasses, className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(fieldWidthClasses, (child.props as any).className),
          });
        }
        return child;
      })}
    </div>
  );
};

// 移动端手势支持钩子
export const useGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) => {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);

  const handleTouchStart = React.useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (touch) {
      setStartX(touch.clientX);
      setStartY(touch.clientY);
    }
  }, []);

  const handleTouchEnd = React.useCallback((event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 判断主要滑动方向
    if (Math.max(absDeltaX, absDeltaY) > threshold) {
      if (absDeltaX > absDeltaY) {
        // 水平滑动
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // 垂直滑动
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
  }, [startX, startY, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
};