'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { cn } from '@workspace/ui/lib/utils';

import type { FormMetadata, FormField } from '@workspace/types';

// 无障碍访问表单属性
export interface AccessibleFormProps {
  metadata: FormMetadata;
  onSubmit?: (data: Record<string, any>) => void;
  onReset?: () => void;
  onCancel?: () => void;
  onError?: (errors: Record<string, any>) => void;
  onChange?: (data: Record<string, any>, changedField: string) => void;
  className?: string;
  showPerformance?: boolean;
  showKeyboardShortcuts?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  initialData?: Record<string, any>;
  readOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

// 错误边界组件
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError(error);
    console.error('Form error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            表单加载失败，请刷新页面重试。
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// 可访问的表单渲染器
export const AccessibleFormRenderer: React.FC<AccessibleFormProps> = ({
  metadata,
  onSubmit,
  onReset,
  onCancel,
  onError,
  onChange,
  className,
  showPerformance = false,
  showKeyboardShortcuts = true,
  ariaLabel,
  ariaDescribedBy,
  initialData = {},
  readOnly = false,
  disabled = false,
  loading = false,
}) => {
  const [announcement, setAnnouncement] = React.useState('');
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // 编译 Schema
  const schema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        default:
          fieldSchema = z.string();
      }

      if (field.required) {
        fieldSchema = fieldSchema.min(1, `${field.label}是必填项`);
      } else {
        fieldSchema = fieldSchema.optional();
      }

      shape[field.name] = fieldSchema;
    });

    return z.object(shape);
  }, [metadata]);

  // 设置 React Hook Form
  const methods = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });

  const {
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
    setValue,
    reset,
    trigger,
  } = methods;

  // 错误处理
  React.useEffect(() => {
    const newErrors: Record<string, string> = {};
    Object.entries(errors).forEach(([field, error]) => {
      if (error?.message) {
        newErrors[field] = error.message;
      }
    });
    setFormErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setAnnouncement('表单中有错误需要修正');
    }
  }, [errors]);

  // 字段变化监听
  const subscription = React.useRef<any>(null);
  React.useEffect(() => {
    subscription.current = watch((value, { name, type }) => {
      if (name && type) {
        onChange?.(value, name);
        trigger(name);
      }
    });

    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe();
      }
    };
  }, [watch, onChange, trigger]);

  // 提交处理
  const onFormSubmit = React.useCallback(async (data: z.infer<typeof schema>) => {
    try {
      await onSubmit?.(data);
      setAnnouncement('表单提交成功');
    } catch (error) {
      onError?.(errors);
      setAnnouncement('表单提交失败');
    }
  }, [onSubmit, onError, errors]);

  // 重置处理
  const handleReset = React.useCallback(() => {
    reset();
    setFormErrors({});
    setAnnouncement('表单已重置');
    onReset?.();
  }, [reset, onReset]);

  // 错误处理
  const handleError = React.useCallback((error: Error) => {
    console.error('Form render error:', error);
    setAnnouncement('表单加载失败');
  }, []);

  // 渲染字段组件
  const renderField = React.useCallback((field: FormField, index: number) => {
    const hasError = !!formErrors[field.name];
    const errorMessage = formErrors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}{field.required && ' *'}
            </label>
            <input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              disabled={disabled || loading}
              readOnly={readOnly}
              className={`w-full px-3 py-2 border rounded-md ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
              {...methods.register(field.name)}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}{field.required && ' *'}
            </label>
            <input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              disabled={disabled || loading}
              readOnly={readOnly}
              className={`w-full px-3 py-2 border rounded-md ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
              {...methods.register(field.name, { valueAsNumber: true })}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}{field.required && ' *'}
            </label>
            <textarea
              id={field.id}
              placeholder={field.placeholder}
              disabled={disabled || loading}
              readOnly={readOnly}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
              {...methods.register(field.name)}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}{field.required && ' *'}
            </label>
            <select
              id={field.id}
              disabled={disabled || loading}
              className={`w-full px-3 py-2 border rounded-md ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
              {...methods.register(field.name)}
            >
              <option value="">{field.placeholder || `请选择${field.label}`}</option>
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <input
              id={field.id}
              type="checkbox"
              disabled={disabled || loading}
              className={`rounded ${
                hasError ? 'border-red-500' : 'border-gray-300'
              }`}
              {...methods.register(field.name)}
            />
            <label htmlFor={field.id} className="text-sm font-medium">
              {field.label}{field.required && ' *'}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
            {hasError && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [formErrors, disabled, loading, readOnly, methods]);

  return (
    <FormErrorBoundary onError={handleError}>
      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardHeader>
          <CardTitle className="text-xl">
            {metadata.name || '表单'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            onReset={handleReset}
            noValidate
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            className="space-y-6"
          >
            <fieldset disabled={disabled || loading} aria-busy={loading}>
              {/* 表单字段 */}
              <div className="space-y-4">
                {metadata.fields.map((field, index) => (
                  <div key={field.id} role="group">
                    {renderField(field, index)}
                  </div>
                ))}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || loading}
                  className="flex-1"
                >
                  {isSubmitting ? '提交中...' : '提交'}
                </Button>

                {onReset && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1"
                  >
                    重置
                  </Button>
                )}

                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1"
                  >
                    取消
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </CardContent>
      </Card>
    </FormErrorBoundary>
  );
};