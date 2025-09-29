'use client';

import React, { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';

// 延迟加载的字段组件类型
interface LazyFieldProps {
  field: any;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

// 延迟加载的基础字段组件
const LazyTextField = lazy(() => import('./LazyFields/LazyTextField').then(module => ({ default: module.LazyTextField })));
const LazyNumberField = lazy(() => import('./LazyFields/LazyNumberField').then(module => ({ default: module.LazyNumberField })));
const LazyTextareaField = lazy(() => import('./LazyFields/LazyTextareaField').then(module => ({ default: module.LazyTextareaField })));
const LazySelectField = lazy(() => import('./LazyFields/LazySelectField').then(module => ({ default: module.LazySelectField })));
const LazyCheckboxField = lazy(() => import('./LazyFields/LazyCheckboxField').then(module => ({ default: module.LazyCheckboxField })));
const LazyDateField = lazy(() => import('./LazyFields/LazyDateField').then(module => ({ default: module.LazyDateField })));

// 字段类型映射
const fieldTypeComponents: Record<string, LazyExoticComponent<ComponentType<LazyFieldProps>>> = {
  text: LazyTextField,
  number: LazyNumberField,
  textarea: LazyTextareaField,
  select: LazySelectField,
  checkbox: LazyCheckboxField,
  date: LazyDateField,
};

// 加载指示器组件
export function FieldLoadingFallback() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
}

// 延迟加载的字段包装器
export function LazyFieldWrapper({
  field,
  form,
  isVisible = true,
  onVisibilityChange,
  preload = false,
}: {
  field: any;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  preload?: boolean;
}) {
  const [isClient, setIsClient] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isVisible && isClient) {
      setShouldLoad(true);
    }
  }, [isVisible, isClient]);

  React.useEffect(() => {
    if (preload && isClient) {
      // 预加载组件
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preload, isClient]);

  if (!isVisible) {
    return null;
  }

  const FieldComponent = fieldTypeComponents[field.type];
  if (!FieldComponent) {
    console.warn(`Unsupported field type: ${field.type}`);
    return null;
  }

  if (!shouldLoad) {
    return <FieldLoadingFallback />;
  }

  return (
    <Suspense fallback={<FieldLoadingFallback />}>
      <FieldComponent
        field={field}
        form={form}
        isVisible={isVisible}
        onVisibilityChange={onVisibilityChange}
      />
    </Suspense>
  );
}

// 延迟加载的表单节
interface FormSectionProps {
  title: string;
  description?: string;
  fields: any[];
  form: UseFormReturn<any>;
  isVisible?: boolean;
  className?: string;
}

export function LazyFormSection({
  title,
  description,
  fields,
  form,
  isVisible = true,
  className = '',
}: FormSectionProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  if (!isLoaded) {
    return (
      <div ref={sectionRef} className={`space-y-4 ${className}`}>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          {description && (
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          )}
        </div>
        <div className="space-y-3">
          {fields.slice(0, 3).map((_, index) => (
            <FieldLoadingFallback key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef} className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {fields.map((field) => (
          <LazyFieldWrapper
            key={field.id}
            field={field}
            form={form}
            isVisible={true}
          />
        ))}
      </div>
    </div>
  );
}

// 暂时注释掉复杂组件，等文件创建后再启用
// const ComplexFormComponents = {
//   address: lazy(() => import('./LazyFields/LazyAddressField')),
//   fileUpload: lazy(() => import('./LazyFields/LazyFileUploadField')),
//   signature: lazy(() => import('./LazyFields/LazySignatureField')),
//   rating: lazy(() => import('./LazyFields/LazyRatingField')),
//   richText: lazy(() => import('./LazyFields/LazyRichTextField')),
// };

// 延迟加载的复杂字段组件 - 暂时禁用
export function LazyComplexField({
  fieldType,
  field,
  form,
  isVisible = true,
  onVisibilityChange,
}: {
  fieldType: string;
  field: any;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}) {
  console.warn(`Complex field type ${fieldType} is not yet implemented`);
  return <FieldLoadingFallback />;
}

// 预加载管理器
export class FieldPreloader {
  private static instance: FieldPreloader;
  private preloadedComponents = new Set<string>();

  static getInstance(): FieldPreloader {
    if (!FieldPreloader.instance) {
      FieldPreloader.instance = new FieldPreloader();
    }
    return FieldPreloader.instance;
  }

  async preloadField(fieldType: string): Promise<void> {
    if (this.preloadedComponents.has(fieldType)) {
      return;
    }

    const component = fieldTypeComponents[fieldType];
    if (component) {
      try {
        // 触发预加载
        await component;
        this.preloadedComponents.add(fieldType);
      } catch (error) {
        console.warn(`Failed to preload field type: ${fieldType}`, error);
      }
    }
  }

  async preloadComplexField(fieldType: string): Promise<void> {
    // 暂时禁用复杂字段预加载
    console.warn(`Complex field preloading for ${fieldType} is not yet implemented`);
    return;
  }

  isPreloaded(fieldType: string): boolean {
    return this.preloadedComponents.has(fieldType) ||
           this.preloadedComponents.has(`complex_${fieldType}`);
  }
}

// 使用预加载的Hook
export function useFieldPreloader() {
  const preloader = FieldPreloader.getInstance();

  const preloadField = React.useCallback((fieldType: string) => {
    return preloader.preloadField(fieldType);
  }, [preloader]);

  const preloadComplexField = React.useCallback((fieldType: string) => {
    return preloader.preloadComplexField(fieldType);
  }, [preloader]);

  const isPreloaded = React.useCallback((fieldType: string) => {
    return preloader.isPreloaded(fieldType);
  }, [preloader]);

  return {
    preloadField,
    preloadComplexField,
    isPreloaded,
  };
}

// 性能优化的表单字段管理器
export function LazyFieldManager({
  fields,
  form,
  visibility,
}: {
  fields: any[];
  form: UseFormReturn<any>;
  visibility: Record<string, boolean>;
}) {
  const { preloadField } = useFieldPreloader();

  React.useEffect(() => {
    // 预加载可见字段
    const visibleFields = fields.filter(field => visibility[field.id]);
    visibleFields.forEach(field => {
      if (fieldTypeComponents[field.type]) {
        preloadField(field.type);
      }
    });
  }, [fields, visibility, preloadField]);

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <LazyFieldWrapper
          key={field.id}
          field={field}
          form={form}
          isVisible={visibility[field.id]}
          preload={visibility[field.id]}
        />
      ))}
    </div>
  );
}