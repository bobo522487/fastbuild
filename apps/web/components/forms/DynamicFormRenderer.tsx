'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle, TriangleAlert } from 'lucide-react';
import { LoadingIndicator, FormLoadingIndicator, ButtonLoading } from './LoadingIndicator';
import { FormResetHandler, useFormReset } from './FormResetHandler';

// 错误边界组件
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Form Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            表单加载时出现错误，请刷新页面重试。
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer">错误详情</summary>
                <pre className="text-xs bg-destructive/10 p-2 rounded mt-1 overflow-x-auto">
                  {this.state.error?.message}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
// import { EnhancedValidationSummary, ValidationErrorAnalyzer } from './EnhancedValidationSummary';

import type {
  FormMetadata,
  FormField as FormFieldType,
  ValidationResult,
} from '@workspace/types';

interface DynamicFormRendererProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface FormFieldComponentProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
}

// 字段验证状态组件
function FieldValidationStatus({ field, form }: { field: FormFieldType; form: UseFormReturn<any> }) {
  const fieldState = form.getFieldState(field.name);
  const { error, isDirty, isValidating } = fieldState;

  if (!isDirty && !error) {
    return null;
  }

  if (isValidating) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3 animate-pulse" />
        <span>验证中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <XCircle className="h-3 w-3" />
        <span>验证失败</span>
      </div>
    );
  }

  if (isDirty && !error) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>验证通过</span>
      </div>
    );
  }

  return null;
}

// 增强的错误消息组件
function EnhancedFormMessage({ field, form }: { field: FormFieldType; form: UseFormReturn<any> }) {
  const fieldState = form.getFieldState(field.name);
  const { error } = fieldState;

  if (!error) {
    return null;
  }

  // 根据字段类型提供特定的错误提示
  const isEmailField = field.name.toLowerCase().includes('email') ||
                      field.label.toLowerCase().includes('邮箱') ||
                      field.label.toLowerCase().includes('邮件');
  const isPhoneField = field.name.toLowerCase().includes('phone') ||
                      field.name.toLowerCase().includes('tel') ||
                      field.label.toLowerCase().includes('电话');
  const isUrlField = field.name.toLowerCase().includes('url') ||
                    field.name.toLowerCase().includes('website') ||
                    field.label.toLowerCase().includes('网址');

  const getHelperText = () => {
    if (error.type === 'required' || error.type === 'too_small') {
      if (isEmailField) return '请输入有效的邮箱地址';
      if (isPhoneField) return '请输入有效的手机号码';
      if (isUrlField) return '请输入有效的网址';
      return '此字段为必填项，请提供有效信息';
    }

    if (error.type === 'invalid_type') {
      if (isEmailField) return '邮箱格式不正确，请重新输入';
      if (isPhoneField) return '电话号码格式不正确，请重新输入';
      if (isUrlField) return '网址格式不正确，请重新输入';
      return '格式不正确，请检查输入内容';
    }

    if (error.type === 'invalid_string') {
      if (isEmailField) return '邮箱格式不正确，请使用类似 user@example.com 的格式';
      if (isPhoneField) return '电话号码格式不正确，请使用类似 13812345678 的格式';
      if (isUrlField) return '网址格式不正确，请使用类似 https://example.com 的格式';
      return '格式不正确，请检查输入内容';
    }

    return null;
  };

  const helperText = getHelperText();

  return (
    <div className="mt-1 space-y-1">
      <FormMessage />
      {helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error.type === 'min' && !isEmailField && !isPhoneField && !isUrlField && (
        <p className="text-xs text-muted-foreground">
          输入内容过短，请提供更多详细信息
        </p>
      )}
      {error.type === 'max' && (
        <p className="text-xs text-muted-foreground">
          输入内容过长，请精简内容
        </p>
      )}
    </div>
  );
}

// 字段组件映射
const FormFieldComponents: Record<string, React.FC<FormFieldComponentProps>> = {
  text: ({ field, form, isVisible = true }) => {
    // 根据字段名称和类型应用特定的输入组件
    const isEmailField = field.name.toLowerCase().includes('email') ||
                        field.label.toLowerCase().includes('邮箱') ||
                        field.label.toLowerCase().includes('邮件');
    const isPhoneField = field.name.toLowerCase().includes('phone') ||
                        field.name.toLowerCase().includes('tel') ||
                        field.label.toLowerCase().includes('电话');
    const isUrlField = field.name.toLowerCase().includes('url') ||
                      field.name.toLowerCase().includes('website') ||
                      field.label.toLowerCase().includes('网址');

    const inputType = isEmailField ? 'email' :
                     isPhoneField ? 'tel' :
                     isUrlField ? 'url' : 'text';

    return (
      <RHFFormField
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className={cn(!isVisible && 'hidden')}>
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                {field.label}
                {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
                {isEmailField && (
                  <span className="text-xs text-muted-foreground">(例: user@example.com)</span>
                )}
                {isPhoneField && (
                  <span className="text-xs text-muted-foreground">(例: 13812345678)</span>
                )}
                {isUrlField && (
                  <span className="text-xs text-muted-foreground">(例: https://example.com)</span>
                )}
              </FormLabel>
              <FieldValidationStatus field={field} form={form} />
            </div>
            <FormControl>
              <Input
                type={inputType}
                placeholder={field.placeholder}
                {...formField}
                value={formField.value || ''}
                className={cn(
                  form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
                )}
                onChange={(e) => {
                  if (isPhoneField) {
                    // 只允许数字
                    const value = e.target.value.replace(/\D/g, '');
                    formField.onChange(value);
                  } else {
                    formField.onChange(e.target.value);
                  }
                }}
              />
            </FormControl>
            {field.placeholder && (
              <FormDescription>{field.placeholder}</FormDescription>
            )}
            <EnhancedFormMessage field={field} form={form} />
          </FormItem>
        )}
      />
    );
  },

  number: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
            </FormLabel>
            <FieldValidationStatus field={field} form={form} />
          </div>
          <FormControl>
            <Input
              type="number"
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              onChange={(e) => {
                const value = e.target.value;
                formField.onChange(value === '' ? '' : Number(value));
              }}
              className={cn(
                form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  ),

  textarea: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
            </FormLabel>
            <FieldValidationStatus field={field} form={form} />
          </div>
          <FormControl>
            <Textarea
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              className={cn(
                form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  ),

  select: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
            </FormLabel>
            <FieldValidationStatus field={field} form={form} />
          </div>
          <Select onValueChange={formField.onChange} defaultValue={formField.value}>
            <FormControl>
              <SelectTrigger className={cn(
                form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
              )}>
                <SelectValue placeholder={field.placeholder || '请选择...'} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  ),

  checkbox: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden', 'flex flex-row items-start space-x-3 space-y-0')}>
          <FormControl>
            <Checkbox
              checked={formField.value || false}
              onCheckedChange={formField.onChange}
              className={cn(
                form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </FormControl>
          <div className="space-y-1 leading-none flex-1">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                {field.label}
                {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
              </FormLabel>
              <FieldValidationStatus field={field} form={form} />
            </div>
            {field.placeholder && (
              <FormDescription>{field.placeholder}</FormDescription>
            )}
            <EnhancedFormMessage field={field} form={form} />
          </div>
        </FormItem>
      )}
    />
  ),

  date: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
            </FormLabel>
            <FieldValidationStatus field={field} form={form} />
          </div>
          <FormControl>
            <Input
              type="date"
              {...formField}
              value={formField.value || ''}
              className={cn(
                form.getFieldState(field.name).error && 'border-destructive focus-visible:ring-destructive'
              )}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  ),
};

export function DynamicFormRenderer({
  metadata,
  onSubmit,
  isLoading = false,
  className,
}: DynamicFormRendererProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showValidationDetails, setShowValidationDetails] = React.useState(false);

  // 动态构建 Zod Schema
  const schema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      // 根据字段名称和类型应用特定的验证规则
      const isEmailField = field.name.toLowerCase().includes('email') ||
                          field.label.toLowerCase().includes('邮箱') ||
                          field.label.toLowerCase().includes('邮件');
      const isPhoneField = field.name.toLowerCase().includes('phone') ||
                          field.name.toLowerCase().includes('tel') ||
                          field.label.toLowerCase().includes('电话');
      const isUrlField = field.name.toLowerCase().includes('url') ||
                        field.name.toLowerCase().includes('website') ||
                        field.label.toLowerCase().includes('网址');

      switch (field.type) {
        case 'text':
          if (isEmailField) {
            // 邮箱字段验证
            fieldSchema = z.string()
              .email(`${field.label}格式不正确，请输入有效的邮箱地址`)
              .max(100, `${field.label}不能超过100个字符`);
            if (field.required) {
              fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
            }
          } else if (isPhoneField) {
            // 电话字段验证
            fieldSchema = z.string()
              .regex(/^1[3-9]\d{9}$/, `${field.label}格式不正确，请输入有效的手机号码`)
              .max(20, `${field.label}不能超过20个字符`);
            if (field.required) {
              fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
            }
          } else if (isUrlField) {
            // 网址字段验证
            fieldSchema = z.string()
              .url(`${field.label}格式不正确，请输入有效的网址`)
              .max(200, `${field.label}不能超过200个字符`);
            if (field.required) {
              fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
            }
          } else {
            // 普通文本字段验证
            fieldSchema = z.string()
              .max(500, `${field.label}不能超过500个字符`);
            if (field.required) {
              fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
            }
          }
          break;
        case 'textarea':
          fieldSchema = z.string()
            .max(2000, `${field.label}不能超过2000个字符`);
          if (field.required) {
            fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
          }
          break;
        case 'number':
          fieldSchema = z.number().nullable();
          if (field.required) {
            fieldSchema = z.number({
              required_error: `${field.label}不能为空`,
              invalid_type_error: `${field.label}必须是有效的数字`
            });
          }
          break;
        case 'select':
          fieldSchema = z.string();
          if (field.required) {
            fieldSchema = fieldSchema.min(1, `请选择${field.label}`);
          }
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, `${field.label}格式不正确，请选择有效日期`);
          if (field.required) {
            fieldSchema = fieldSchema.min(1, `请选择${field.label}`);
          }
          break;
        default:
          fieldSchema = z.string();
          if (field.required) {
            fieldSchema = fieldSchema.min(1, `${field.label}不能为空`);
          }
      }

      // 处理必填字段
      if (field.required && field.type !== 'number') {
        shape[field.name] = fieldSchema;
      } else {
        shape[field.name] = fieldSchema.optional();
      }
    });

    return z.object(shape);
  }, [metadata]);

  // 初始化表单
  const form = useForm<z.infer<typeof schema>>({
    resolver: async (data, context, options) => {
      try {
        // 如果是初始化验证且没有用户交互，跳过验证
        const hasUserInteraction = Object.keys(data).some(key => {
          const value = data[key];
          // 检查是否有实际的用户输入（不仅仅是默认值）
          return value !== undefined && value !== null &&
                 (typeof value === 'string' ? value.trim() !== '' : true);
        });

        // 如果没有用户交互且不是提交模式，跳过验证
        if (!hasUserInteraction && options?.mode !== 'submit') {
          return { values: data, errors: {} };
        }

        // 在提交时进行完整验证
        if (options?.mode === 'submit') {
          return zodResolver(schema)(data, context, options);
        }

        // 其他情况下进行轻度验证
        try {
          return await zodResolver(schema)(data, context, options);
        } catch (validationError) {
          // 如果是必填字段为空的错误，且没有用户交互，则忽略
          if (validationError.name === 'ZodError') {
            const isEmptyFieldErrors = validationError.errors.every(err =>
              err.code === 'too_small' && err.minimum === 1
            );
            if (isEmptyFieldErrors && !hasUserInteraction) {
              return { values: data, errors: {} };
            }
          }
          throw validationError;
        }
      } catch (error) {
        // 只在真正的验证错误时记录日志
        if (error.name === 'ZodError' && error.errors.length > 0) {
          const isEmptyFieldErrors = error.errors.every(err =>
            err.code === 'too_small' && err.minimum === 1
          );
          if (!isEmptyFieldErrors) {
            console.warn('Form validation error:', error.message);
          }
        }
        return { values: data, errors: {} };
      }
    },
    mode: 'onBlur', // 失去焦点时验证，避免初始验证
    reValidateMode: 'onChange', // 用户交互时重新验证
    shouldFocusError: true,
    shouldUseNativeValidation: false,
    criteriaMode: 'firstError',
    delayError: 300, // 延迟错误显示，避免频繁验证
    defaultValues: React.useMemo(() => {
      const values: Record<string, any> = {};
      metadata.fields.forEach((field) => {
        // 根据字段类型设置合适的默认值
        switch (field.type) {
          case 'checkbox':
            values[field.name] = field.defaultValue ?? false;
            break;
          case 'number':
            values[field.name] = field.defaultValue ?? null;
            break;
          case 'select':
            values[field.name] = field.defaultValue ?? '';
            break;
          default:
            values[field.name] = field.defaultValue ?? '';
        }
      });
      return values;
    }, [metadata]),
  });

  // 计算字段可见性
  const fieldVisibility = React.useMemo(() => {
    const visibility: Record<string, boolean> = {};
    const values = form.getValues();

    metadata.fields.forEach((field) => {
      if (!field.condition) {
        visibility[field.id] = true;
        return;
      }

      const condition = field.condition;
      const conditionValue = values[condition.fieldId];

      let isVisible = false;

      // 如果条件字段不存在或为undefined，条件无法满足
      if (conditionValue === undefined) {
        isVisible = false;
      } else {
        switch (condition.operator) {
          case 'equals':
            isVisible = conditionValue === condition.value;
            break;
          case 'not_equals':
            isVisible = conditionValue !== condition.value;
            break;
          case 'greater_than':
            isVisible = Number(conditionValue) > Number(condition.value);
            break;
          case 'less_than':
            isVisible = Number(conditionValue) < Number(condition.value);
            break;
          case 'greater_than_or_equal':
            isVisible = Number(conditionValue) >= Number(condition.value);
            break;
          case 'less_than_or_equal':
            isVisible = Number(conditionValue) <= Number(condition.value);
            break;
          case 'contains':
            isVisible = String(conditionValue).includes(String(condition.value));
            break;
          case 'not_empty':
            isVisible = conditionValue !== null && conditionValue !== undefined && conditionValue !== '';
            break;
          default:
            isVisible = false;
        }
      }

      visibility[field.id] = isVisible;
    });

    return visibility;
  }, [form, metadata]);

  // 处理表单提交
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);

    try {
      console.log('🚀 Form Submission Data:', data);

      await onSubmit(data);

      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取表单验证状态
  const formValidationStatus = React.useMemo(() => {
    const { isValid, isDirty, errors } = form.formState;
    const errorCount = Object.keys(errors).length;
    const requiredFields = metadata.fields.filter(f => f.required).length;
    const filledRequiredFields = metadata.fields.filter(f => {
      if (!f.required) return false;
      const value = form.getValues(f.name);
      return value !== undefined && value !== null && value !== '';
    }).length;

    return {
      isValid,
      isDirty,
      errorCount,
      requiredFields,
      filledRequiredFields,
      progressPercentage: requiredFields > 0 ? (filledRequiredFields / requiredFields) * 100 : 100,
    };
  }, [form, metadata]);

  // 简化的验证状态
  const validationSummary = React.useMemo(() => {
    const { isValid } = form.formState;
    return {
      isValid,
      errors: [],
      warnings: [],
    };
  }, [form]);

  // 监听字段值变化以更新可见性
  const watchedValues = form.watch();
  React.useEffect(() => {
    // 重新计算可见性时会触发重新渲染
    const _ = fieldVisibility;
  }, [watchedValues, fieldVisibility]);

  // 使用重置功能
  const { resetForm } = useFormReset(form, metadata);

  return (
    <FormErrorBoundary onError={(error) => {
      console.error('Form rendering error:', error);
    }}>
      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>动态表单</CardTitle>
              <CardDescription>
                版本 {metadata.version} • {metadata.fields.length} 个字段
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <FormResetHandler
                form={form}
                metadata={metadata}
                onReset={() => {
                  setShowValidationDetails(false);
                  console.log('表单已重置');
                }}
              />
              {validationSummary.errors.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {validationSummary.errors.length} 个错误
                </Badge>
              )}
              {validationSummary.warnings.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {validationSummary.warnings.length} 个建议
                </Badge>
              )}
              {formValidationStatus.isDirty && validationSummary.isValid && (
                <Badge variant="default" className="text-xs bg-green-600">
                  验证通过
                </Badge>
              )}
            </div>
          </div>

          {/* 表单进度条 */}
          {formValidationStatus.requiredFields > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>完成进度</span>
                <span>{formValidationStatus.filledRequiredFields}/{formValidationStatus.requiredFields} 必填字段</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${formValidationStatus.progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* 渲染所有字段 */}
              {metadata.fields.map((field) => {
                const FieldComponent = FormFieldComponents[field.type];
                if (!FieldComponent) {
                  console.warn(`Unsupported field type: ${field.type}`);
                  return null;
                }

                return (
                  <FieldComponent
                    key={field.id}
                    field={field}
                    form={form}
                    isVisible={fieldVisibility[field.id]}
                  />
                );
              })}

                {/* 提交按钮 */}
              <div className="flex items-center justify-end">
                <ButtonLoading
                  isLoading={isSubmitting || isLoading}
                  disabled={!validationSummary.isValid}
                  loadingText="提交中..."
                  className="ml-auto"
                >
                  提交表单
                </ButtonLoading>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </FormErrorBoundary>
  );
}

export type { DynamicFormRendererProps };