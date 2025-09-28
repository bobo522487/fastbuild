'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@workspace/ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Badge } from '@workspace/ui/components/badge';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Separator } from '@workspace/ui/components/separator';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';

import {
  HighContrastWrapper,
  HighContrastProvider,
  useHighContrast
} from '../accessibility/HighContrastMode';

import {
  NavigationManager,
  useKeyboardNavigation,
  KeyboardNavigationProvider
} from '../../hooks/use-keyboard-navigation';

import { useFontSize, useSpacing, useAnimations } from '../accessibility/AccessibilityControlPanel';

// 表单字段类型定义
export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
}

// 表单元数据类型
export interface FormMetadata {
  version: string;
  title?: string;
  description?: string;
  fields: FormField[];
}

// 表单组件属性
interface AccessibleDynamicFormProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
  formId?: string;
  enableKeyboardNavigation?: boolean;
  enableHighContrast?: boolean;
  showValidationSummary?: boolean;
}

// 可访问的表单字段组件
function AccessibleFormField({
  field,
  form,
  formId,
  isVisible = true
}: {
  field: FormField;
  form: UseFormReturn<Record<string, any>>;
  formId: string;
  isVisible?: boolean;
}) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = form;

  const fieldId = `${formId}-${field.name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;
  const hasError = !!errors[field.name];
  const value = watch(field.name);

  if (!isVisible) return null;

  // 获取ARIA属性
  const getAriaAttributes = () => ({
    'aria-required': field.required ? 'true' : 'false',
    'aria-invalid': hasError ? 'true' : 'false',
    'aria-describedby': hasError ? errorId : field.description ? descriptionId : undefined,
    'aria-labelledby': `${fieldId}-label`
  });

  // 字段描述组件
  const FieldDescription = () => {
    if (!field.description) return null;
    return (
      <p
        id={descriptionId}
        className="text-sm text-muted-foreground"
      >
        {field.description}
      </p>
    );
  };

  // 错误消息组件
  const ErrorMessage = () => {
    if (!hasError) return null;
    return (
      <div
        id={errorId}
        role="alert"
        className="flex items-center gap-2 text-sm error-message"
      >
        <AlertCircle className="h-4 w-4" />
        <span>{errors[field.name]?.message as string}</span>
      </div>
    );
  };

  // 根据字段类型渲染不同的输入控件
  const renderField = () => {
    const commonProps = {
      id: fieldId,
      ...register(field.name, {
        required: field.required ? `${field.label}是必填项` : false,
        ...field.validation
      }),
      ...getAriaAttributes(),
      className: cn(
        'w-full transition-all duration-200',
        hasError && 'border-error focus:border-error',
        'min-h-[44px] px-3 py-2 text-base'
      )
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            {...commonProps}
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            rows={4}
            {...commonProps}
            className={cn(commonProps.className, 'min-h-[100px] resize-y')}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(selectedValue) => {
              setValue(field.name, selectedValue, { shouldValidate: true });
              trigger(field.name);
            }}
          >
            <SelectTrigger
              {...commonProps}
              className={cn(commonProps.className, 'cursor-pointer')}
            >
              <SelectValue placeholder={field.placeholder || `请选择${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="min-h-[44px] py-2"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              id={fieldId}
              checked={value || false}
              onCheckedChange={(checked) => {
                setValue(field.name, checked, { shouldValidate: true });
                trigger(field.name);
              }}
              {...getAriaAttributes()}
              className="h-5 w-5"
            />
            <label
              htmlFor={fieldId}
              id={`${fieldId}-label`}
              className="text-sm font-medium cursor-pointer select-none"
            >
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${fieldId}-label`}>
      {field.type !== 'checkbox' && (
        <label
          htmlFor={fieldId}
          id={`${fieldId}-label`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {field.label}
          {field.required && <span className="text-error ml-1" aria-label="必填">*</span>}
        </label>
      )}

      {renderField()}

      <FieldDescription />
      <ErrorMessage />
    </div>
  );
}

// 验证摘要组件
function ValidationSummary({ errors }: { errors: Record<string, any> }) {
  const errorCount = Object.keys(errors).length;

  if (errorCount === 0) return null;

  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium">表单包含 {errorCount} 个错误：</div>
        <ul className="mt-2 list-disc list-inside space-y-1">
          {Object.entries(errors).map(([fieldName, error]) => (
            <li key={fieldName}>{error.message as string}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// 主要的可访问动态表单组件
export function AccessibleDynamicForm({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  formId = 'accessible-form',
  enableKeyboardNavigation = true,
  enableHighContrast = true,
  showValidationSummary = true
}: AccessibleDynamicFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { fontSize } = useFontSize();
  const { spacing } = useSpacing();
  const { enabled: highContrastEnabled } = useHighContrast();

  // 构建Zod schema
  const schema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'text':
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'email':
          fieldSchema = z.string().email('请输入有效的邮箱地址');
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string().refine((date) => !isNaN(Date.parse(date)), {
            message: '请输入有效的日期'
          });
          break;
        default:
          fieldSchema = z.string();
      }

      // 添加必填验证
      if (field.required) {
        fieldSchema = fieldSchema.refine((val) => val !== undefined && val !== null && val !== '', {
          message: `${field.label}是必填项`
        });
      }

      // 添加自定义验证
      if (field.validation?.min !== undefined) {
        fieldSchema = fieldSchema.refine((val) => val >= field.validation!.min!, {
          message: `${field.label}不能小于 ${field.validation!.min}`
        });
      }

      if (field.validation?.max !== undefined) {
        fieldSchema = fieldSchema.refine((val) => val <= field.validation!.max!, {
          message: `${field.label}不能大于 ${field.validation!.max}`
        });
      }

      shape[field.name] = fieldSchema;
    });

    return z.object(shape);
  }, [metadata]);

  // 初始化表单
  const form = useForm<Record<string, any>>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: metadata.fields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue || '';
      return acc;
    }, {} as Record<string, any>)
  });

  const { handleSubmit, formState: { errors, isValid } } = form;

  // 键盘导航设置
  const formRef = React.useRef<HTMLDivElement>(null);
  const {
    state,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    registerShortcut
  } = useKeyboardNavigation(formRef, '[data-field-id]', {
    enableKeyboardShortcuts: enableKeyboardNavigation,
    customShortcuts: {
      'ctrl+enter': () => {
        if (isValid) {
          handleSubmit(onSubmitForm)();
        }
      },
      'escape': () => navigateFirst()
    }
  });

  // 注册快捷键
  React.useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const shortcuts = [
      { key: 'tab', action: navigateNext },
      { key: 'shift+tab', action: navigatePrevious },
      { key: 'arrowdown', action: navigateNext },
      { key: 'arrowup', action: navigatePrevious },
      { key: 'home', action: navigateFirst },
      { key: 'end', action: navigateLast }
    ];

    shortcuts.forEach(({ key, action }) => {
      registerShortcut(key, action);
    });
  }, [navigateNext, navigatePrevious, navigateFirst, navigateLast, registerShortcut, enableKeyboardNavigation]);

  // 表单提交处理
  const onSubmitForm = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSubmit(data);
      setSubmitSuccess(true);

      // 3秒后清除成功消息
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 应用字体大小和间距样式
  const formStyle = React.useMemo(() => ({
    fontSize: `${fontSize}%`,
    '--spacing-factor': spacing / 100
  } as React.CSSProperties), [fontSize, spacing]);

  return (
    <HighContrastWrapper>
      <KeyboardNavigationProvider>
        <div
          ref={formRef}
          style={formStyle}
          className={cn(
            'w-full max-w-2xl mx-auto space-y-6',
            'transition-all duration-200',
            highContrastEnabled && 'high-contrast-form',
            className
          )}
          role="form"
          aria-label={metadata.title || '表单'}
        >
          {/* 表单标题和描述 */}
          {(metadata.title || metadata.description) && (
            <Card>
              <CardHeader>
                {metadata.title && (
                  <CardTitle
                    id={`${formId}-title`}
                    className="text-xl font-bold"
                  >
                    {metadata.title}
                  </CardTitle>
                )}
                {metadata.description && (
                  <p
                    id={`${formId}-description`}
                    className="text-muted-foreground"
                  >
                    {metadata.description}
                  </p>
                )}
              </CardHeader>
            </Card>
          )}

          {/* 验证摘要 */}
          {showValidationSummary && <ValidationSummary errors={errors} />}

          {/* 成功消息 */}
          {submitSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                表单提交成功！
              </AlertDescription>
            </Alert>
          )}

          {/* 错误消息 */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* 键盘导航状态 */}
          {enableKeyboardNavigation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                键盘导航已启用 - 按 Tab 键导航，Enter 键提交
              </span>
              {state.currentElement && (
                <Badge variant="outline" className="ml-auto">
                  字段 {state.currentIndex + 1} / {state.totalElements}
                </Badge>
              )}
            </div>
          )}

          {/* 表单字段 */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <form
                id={formId}
                onSubmit={handleSubmit(onSubmitForm)}
                noValidate
                className="space-y-6"
              >
                {metadata.fields.map((field) => (
                  <div
                    key={field.id}
                    data-field-id={field.name}
                    role="group"
                    aria-labelledby={`${formId}-${field.name}-label`}
                  >
                    <AccessibleFormField
                      field={field}
                      form={form}
                      formId={formId}
                    />
                  </div>
                ))}

                {/* 提交按钮 */}
                <div className="pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading || !isValid}
                    className="w-full min-h-[44px] text-base font-medium"
                    aria-describedby={isValid ? undefined : `${formId}-submit-help`}
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      '提交表单'
                    )}
                  </Button>

                  {!isValid && (
                    <p
                      id={`${formId}-submit-help`}
                      className="mt-2 text-sm text-muted-foreground"
                    >
                      请修正表单中的错误后再提交
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 可访问性信息 */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 text-sm">
                <h4 className="font-medium">无障碍功能</h4>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span>键盘导航:</span>
                    <Badge variant={enableKeyboardNavigation ? "default" : "secondary"}>
                      {enableKeyboardNavigation ? "已启用" : "已禁用"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>高对比度:</span>
                    <Badge variant={highContrastEnabled ? "default" : "secondary"}>
                      {highContrastEnabled ? "已启用" : "已禁用"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>字体大小:</span>
                    <Badge variant="outline">{fontSize}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>元素间距:</span>
                    <Badge variant="outline">{spacing}%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </KeyboardNavigationProvider>
    </HighContrastWrapper>
  );
}