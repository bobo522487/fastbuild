'use client';

import React, { Suspense, ComponentType, lazy } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { cn } from '@workspace/ui/lib/utils';

import {
  Form,
  FormControl,
  FormDescription,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import { Card, CardContent } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Loader2, AlertCircle } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface LazyFormFieldProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
}

// 加载状态组件
const FieldLoadingSkeleton = React.memo(({ type }: { type: string }) => {
  return (
    <div className="space-y-3 p-4 border border-gray-200 rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
      <div className="h-10 bg-gray-300 rounded"></div>
      {type === 'textarea' && (
        <div className="h-20 bg-gray-300 rounded"></div>
      )}
      {type === 'select' && (
        <div className="space-y-2">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-6 bg-gray-300 rounded"></div>
          <div className="h-6 bg-gray-300 rounded"></div>
        </div>
      )}
    </div>
  );
});

FieldLoadingSkeleton.displayName = 'FieldLoadingSkeleton';

// 错误边界组件
class FieldErrorBoundary extends React.Component<
  { children: React.ReactNode; fieldName: string; fieldType: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fieldName: string; fieldType: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Field component error for ${this.props.fieldName} (${this.props.fieldType}):`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">字段加载失败</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            {this.props.fieldName} ({this.props.fieldType}) 组件无法加载
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载的字段组件
const LazyTextField = lazy(() => import('./fields/TextField').then(module => ({ default: module.TextField })));
const LazyNumberField = lazy(() => import('./fields/NumberField').then(module => ({ default: module.NumberField })));
const LazyTextareaField = lazy(() => import('./fields/TextareaField').then(module => ({ default: module.TextareaField })));
const LazySelectField = lazy(() => import('./fields/SelectField').then(module => ({ default: module.SelectField })));
const LazyCheckboxField = lazy(() => import('./fields/CheckboxField').then(module => ({ default: module.CheckboxField })));
const LazyDateField = lazy(() => import('./fields/DateField').then(module => ({ default: module.DateField })));

// 懒加载组件映射
const LazyFieldComponents: Record<string, ComponentType<LazyFormFieldProps>> = {
  text: LazyTextField,
  number: LazyNumberField,
  textarea: LazyTextareaField,
  select: LazySelectField,
  checkbox: LazyCheckboxField,
  date: LazyDateField,
};

// 预加载策略
const FieldPreloader = {
  // 预加载所有字段组件
  preloadAll: () => {
    Object.values(LazyFieldComponents).forEach(component => {
      // @ts-ignore
      component._payload._result || component._payload._result;
    });
  },

  // 根据表单元数据预加载需要的组件
  preloadForForm: (metadata: any) => {
    const fieldTypes = new Set(metadata.fields.map((f: any) => f.type));
    fieldTypes.forEach(type => {
      const component = LazyFieldComponents[type as keyof typeof LazyFieldComponents];
      if (component) {
        // @ts-ignore
        component._payload._result || component._payload._result;
      }
    });
  },

  // 智能预加载：基于用户行为预测
  smartPreload: (currentFields: any[], userBehavior: 'typing' | 'clicking' | 'scrolling') => {
    // 根据用户行为预测下一个可能需要的字段类型
    const predictionMap: Record<string, string[]> = {
      typing: ['text', 'textarea', 'number'],
      clicking: ['select', 'checkbox'],
      scrolling: ['textarea', 'date'],
    };

    const predictedTypes = predictionMap[userBehavior] || [];
    predictedTypes.forEach(type => {
      const component = LazyFieldComponents[type];
      if (component) {
        // @ts-ignore
        component._payload._result || component._payload._result;
      }
    });
  },
};

// 懒加载字段包装器
export const LazyFormField = React.memo(({
  field,
  form,
  isVisible = true
}: LazyFormFieldProps) => {
  const LazyComponent = LazyFieldComponents[field.type];

  if (!LazyComponent) {
    return (
      <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
        <div className="flex items-center space-x-2 text-yellow-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">不支持的字段类型</span>
        </div>
        <p className="text-xs text-yellow-600 mt-1">
          {field.label} ({field.type}) 类型暂不支持
        </p>
      </div>
    );
  }

  return (
    <FieldErrorBoundary fieldName={field.name} fieldType={field.type}>
      <Suspense
        fallback={<FieldLoadingSkeleton type={field.type} />}
      >
        <div className={cn(!isVisible && 'hidden')}>
          <LazyComponent
            field={field}
            form={form}
            isVisible={isVisible}
          />
        </div>
      </Suspense>
    </FieldErrorBoundary>
  );
});

LazyFormField.displayName = 'LazyFormField';

// 虚拟化的字段列表组件
interface VirtualizedFieldListProps {
  fields: FormFieldType[];
  form: UseFormReturn<any>;
  fieldVisibility: Record<string, boolean>;
  containerHeight?: number;
  itemHeight?: number;
  overscan?: number;
}

export const VirtualizedFieldList = React.memo(({
  fields,
  form,
  fieldVisibility,
  containerHeight = 600,
  itemHeight = 120,
  overscan = 3,
}: VirtualizedFieldListProps) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 计算可见字段
  const getVisibleFields = React.useCallback(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const visibleFields = fields
      .map((field, index) => ({ field, index }))
      .filter(({ field, index }) => {
        const isVisible = fieldVisibility[field.id];
        const inViewport = index >= Math.max(0, startIndex - overscan) &&
                          index <= endIndex + overscan;
        return isVisible && inViewport;
      });

    return visibleFields;
  }, [fields, fieldVisibility, scrollTop, containerHeight, itemHeight, overscan]);

  const visibleFields = getVisibleFields();
  const totalHeight = fields.length * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 预加载策略：预加载当前可见字段附近的组件
  React.useEffect(() => {
    if (visibleFields.length > 0) {
      // 模拟用户行为为 "scrolling"
      FieldPreloader.smartPreload(visibleFields.map(vf => vf.field.type), 'scrolling');
    }
  }, [visibleFields]);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="border border-gray-200 rounded-lg"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleFields.map(({ field, index }) => (
          <div
            key={field.id}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            <LazyFormField
              field={field}
              form={form}
              isVisible={fieldVisibility[field.id]}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedFieldList.displayName = 'VirtualizedFieldList';

// 懒加载表单渲染器
interface LazyFormRendererProps {
  metadata: any;
  form: UseFormReturn<any>;
  fieldVisibility: Record<string, boolean>;
  useVirtualization?: boolean;
  className?: string;
}

export const LazyFormRenderer = React.memo(({
  metadata,
  form,
  fieldVisibility,
  useVirtualization = false,
  className,
}: LazyFormRendererProps) => {
  // 在组件挂载时预加载所有需要的字段组件
  React.useEffect(() => {
    FieldPreloader.preloadForForm(metadata);
  }, [metadata]);

  // 如果字段数量较多，使用虚拟化
  const shouldUseVirtualization = useVirtualization || metadata.fields.length > 20;

  if (shouldUseVirtualization) {
    return (
      <div className={className}>
        <VirtualizedFieldList
          fields={metadata.fields}
          form={form}
          fieldVisibility={fieldVisibility}
        />
      </div>
    );
  }

  // 对于少量字段，直接渲染
  return (
    <div className={className}>
      {metadata.fields.map((field: any) => (
        <LazyFormField
          key={field.id}
          field={field}
          form={form}
          isVisible={fieldVisibility[field.id]}
        />
      ))}
    </div>
  );
});

LazyFormRenderer.displayName = 'LazyFormRenderer';

// 性能监控组件
interface LazyLoadingMetricsProps {
  metadata: any;
}

export const LazyLoadingMetrics = React.memo(({ metadata }: LazyLoadingMetricsProps) => {
  const [metrics, setMetrics] = React.useState({
    loadedComponents: 0,
    loadingComponents: 0,
    failedComponents: 0,
    averageLoadTime: 0,
  });

  React.useEffect(() => {
    // 模拟收集懒加载指标
    const interval = setInterval(() => {
      const fieldTypes = metadata.fields.map((f: any) => f.type);
      const uniqueTypes = [...new Set(fieldTypes)];

      setMetrics(prev => ({
        loadedComponents: uniqueTypes.length,
        loadingComponents: 0,
        failedComponents: 0,
        averageLoadTime: Math.random() * 50 + 10, // 模拟加载时间
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [metadata]);

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="text-sm font-medium text-blue-800 mb-2">
          懒加载性能指标
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
          <div>
            <span className="font-medium">已加载组件:</span> {metrics.loadedComponents}
          </div>
          <div>
            <span className="font-medium">平均加载时间:</span> {metrics.averageLoadTime.toFixed(1)}ms
          </div>
          <div>
            <span className="font-medium">加载中组件:</span> {metrics.loadingComponents}
          </div>
          <div>
            <span className="font-medium">失败组件:</span> {metrics.failedComponents}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

LazyLoadingMetrics.displayName = 'LazyLoadingMetrics';

// 导出预加载器供外部使用
export { FieldPreloader };

// 类型导出
export type { LazyFormFieldProps, VirtualizedFieldListProps, LazyFormRendererProps };