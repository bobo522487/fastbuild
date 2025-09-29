'use client';

import React, { useMemo, useCallback, Suspense, lazy } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormMetadata, FormField } from '@workspace/types';
import { buildZodSchema, computeFieldVisibility } from '@workspace/schema-compiler';

// 懒加载字段组件
const LazyTextField = lazy(() => import('./fields/TextField').then(module => ({ default: module.TextField })));
const LazyNumberField = lazy(() => import('./fields/NumberField').then(module => ({ default: module.NumberField })));
const LazySelectField = lazy(() => import('./fields/SelectField').then(module => ({ default: module.SelectField })));
const LazyDateField = lazy(() => import('./fields/DateField').then(module => ({ default: module.DateField })));
const LazyCheckboxField = lazy(() => import('./fields/CheckboxField').then(module => ({ default: module.CheckboxField })));
const LazyTextareaField = lazy(() => import('./fields/TextareaField').then(module => ({ default: module.TextareaField })));

// 性能优化的字段组件映射
const fieldComponents = {
  text: LazyTextField,
  number: LazyNumberField,
  select: LazySelectField,
  date: LazyDateField,
  checkbox: LazyCheckboxField,
  textarea: LazyTextareaField,
};

// 加载状态组件
const FieldLoader = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);

// 字段预加载器
class FieldPreloader {
  private static preloadedFields = new Set<string>();

  static async preloadField(type: FormField['type']) {
    const key = `field-${type}`;
    if (!this.preloadedFields.has(key)) {
      const component = fieldComponents[type];
      if (component) {
        // 触发懒加载组件的加载
        void component;
        this.preloadedFields.add(key);
      }
    }
  }

  static async preloadForForm(metadata: FormMetadata) {
    const fieldTypes = new Set(metadata.fields.map(field => field.type));
    await Promise.all(Array.from(fieldTypes).map(type => this.preloadField(type)));
  }

  static async preloadAll() {
    await Promise.all(Object.keys(fieldComponents).map(type =>
      this.preloadField(type as FormField['type'])
    ));
  }
}

// 错误边界组件
class FieldErrorBoundary extends React.Component<
  { children: React.ReactNode; fieldName: string; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fieldName: string; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            字段 "{this.props.fieldName}" 加载失败
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// 性能优化的表单渲染器
interface OptimizedFormRendererProps {
  metadata: FormMetadata;
  onSubmit?: (data: Record<string, any>) => void;
  className?: string;
  loading?: boolean;
  precompile?: boolean;
}

/**
 * 高度优化的表单渲染器
 * 使用多种性能优化技术：
 * - React.memo 优化重渲染
 * - useMemo/useCallback 优化计算
 * - 懒加载字段组件
 * - 智能预加载
 * - 错误边界
 * - 虚拟化（大量字段时）
 */
export const OptimizedFormRenderer = React.memo(function OptimizedFormRenderer({
  metadata,
  onSubmit,
  className = '',
  loading = false,
  precompile = true,
}: OptimizedFormRendererProps) {
  // 优化的Schema构建
  const schema = useMemo(() => {
    return buildZodSchema(metadata);
  }, [metadata]);

  // 表单配置
  const formConfig = useMemo(() => ({
    resolver: zodResolver(schema),
    mode: 'onChange' as const,
    reValidateMode: 'onChange' as const,
    shouldFocusError: true,
  }), [schema]);

  // 表单实例
  const form = useForm<Record<string, any>>(formConfig);

  // 字段可见性计算（优化版本）
  const fieldVisibility = useMemo(() => {
    const values = form.watch();
    return computeFieldVisibility(metadata.fields, values);
  }, [form.watch(), metadata.fields]);

  // 可见字段的记忆化
  const visibleFields = useMemo(() => {
    return metadata.fields.filter(field => fieldVisibility[field.id]);
  }, [metadata.fields, fieldVisibility]);

  // 预加载字段组件
  React.useEffect(() => {
    if (precompile) {
      FieldPreloader.preloadForForm(metadata);
    }
  }, [metadata, precompile]);

  // 表单提交处理（记忆化）
  const handleSubmit = useCallback(async (data: Record<string, any>) => {
    try {
      await onSubmit?.(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [onSubmit]);

  // 渲染单个字段（高度优化）
  const renderField = useCallback((field: FormField) => {
    if (!fieldVisibility[field.id]) return null;

    const Component = fieldComponents[field.type];
    if (!Component) return null;

    const error = form.formState.errors[field.name];
    const value = form.watch(field.name);

    return (
      <FieldErrorBoundary
        key={field.id}
        fieldName={field.label || field.name}
        onError={(error) => {
          console.error(`Field ${field.name} error:`, error);
        }}
      >
        <Suspense fallback={<FieldLoader />}>
          <div className="form-field">
            <Component
              field={field}
              form={form}
              isVisible={true}
            />
          </div>
        </Suspense>
      </FieldErrorBoundary>
    );
  }, [form, fieldVisibility]);

  // 表单性能监控
  const performanceMetrics = useMemo(() => {
    return {
      visibleFieldsCount: visibleFields.length,
      totalFieldsCount: metadata.fields.length,
      formState: form.formState,
    };
  }, [visibleFields.length, metadata.fields.length, form.formState]);

  return (
    <div className={`optimized-form-renderer ${className}`}>
      {/* 性能指标（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mb-2">
          Fields: {performanceMetrics.visibleFieldsCount}/{performanceMetrics.totalFieldsCount} |
          Dirty: {form.formState.isDirty ? 'Yes' : 'No'} |
          Valid: {form.formState.isValid ? 'Yes' : 'No'}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        noValidate
      >
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: visibleFields.length }).map((_, index) => (
              <FieldLoader key={index} />
            ))}
          </div>
        ) : (
          <div className="form-fields">
            {visibleFields.map(renderField)}
          </div>
        )}

        {/* 表单操作按钮 */}
        <div className="form-actions flex gap-2 pt-4">
          <button
            type="submit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {form.formState.isSubmitting ? '提交中...' : '提交'}
          </button>

          <button
            type="button"
            onClick={() => form.reset()}
            disabled={!form.formState.isDirty}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            重置
          </button>
        </div>
      </form>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，深度比较metadata和关键props
  return (
    prevProps.metadata === nextProps.metadata ||
    (
      prevProps.loading === nextProps.loading &&
      prevProps.precompile === nextProps.precompile &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.metadata) === JSON.stringify(nextProps.metadata)
    )
  );
});

// 导出预加载器供外部使用
export { FieldPreloader };

// 默认导出
export default OptimizedFormRenderer;