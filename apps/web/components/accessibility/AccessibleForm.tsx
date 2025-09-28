'use client';

import React from 'react';
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form';
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
import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';

import type {
  FormMetadata,
  FormField as FormFieldType,
  ValidationResult,
} from '@workspace/types';

interface AccessibleFormProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  formId?: string;
  describedBy?: string;
}

// 无障碍字段组件
interface AccessibleFormFieldProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  formId: string;
}

function AccessibleFormField({
  field,
  form,
  isVisible = true,
  formId,
}: AccessibleFormFieldProps) {
  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);
  const fieldId = `${formId}-${field.name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;
  const hasError = !!fieldState.error;

  // 生成无障碍属性
  const getAriaAttributes = () => {
    const ariaAttrs: Record<string, string> = {
      'aria-required': field.required ? 'true' : 'false',
      'aria-invalid': hasError ? 'true' : 'false',
    };

    if (hasError) {
      ariaAttrs['aria-describedby'] = errorId;
    } else if (field.placeholder) {
      ariaAttrs['aria-describedby'] = descriptionId;
    }

    return ariaAttrs;
  };

  // 生成错误消息的无障碍属性
  const getErrorAriaAttributes = () => ({
    role: 'alert' as const,
    'aria-live': 'polite' as const,
  });

  // 根据字段类型渲染不同的输入控件
  const renderFormControl = () => {
    const commonProps = {
      id: fieldId,
      ...form.register(field.name),
      ...getAriaAttributes(),
      className: cn(
        'transition-colors duration-200',
        hasError && 'border-destructive focus-visible:ring-destructive'
      ),
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={field.placeholder}
            aria-describedby={hasError ? errorId : descriptionId}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            placeholder={field.placeholder}
            onChange={(e) => {
              const value = e.target.value;
              form.setValue(field.name, value === '' ? '' : Number(value), {
                shouldValidate: true,
              });
            }}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={4}
            aria-describedby={hasError ? errorId : descriptionId}
          />
        );

      case 'select':
        return (
          <Select
            onValueChange={(value) => {
              form.setValue(field.name, value, { shouldValidate: true });
            }}
            defaultValue={form.getValues(field.name)}
          >
            <SelectTrigger
              id={fieldId}
              {...getAriaAttributes()}
              className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
            >
              <SelectValue
                placeholder={field.placeholder || '请选择...'}
                aria-describedby={hasError ? errorId : descriptionId}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-start space-x-3">
            <Checkbox
              id={fieldId}
              checked={form.getValues(field.name) || false}
              onCheckedChange={(checked) => {
                form.setValue(field.name, checked, { shouldValidate: true });
              }}
              {...getAriaAttributes()}
              className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <div className="space-y-1 leading-none">
              <FormLabel
                htmlFor={fieldId}
                className={cn(
                  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  hasError && 'text-destructive'
                )}
              >
                {field.label}
                {field.required && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">
                    必填
                  </Badge>
                )}
              </FormLabel>
              {field.placeholder && (
                <FormDescription id={descriptionId} className="text-xs">
                  {field.placeholder}
                </FormDescription>
              )}
            </div>
          </div>
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            placeholder={field.placeholder}
            aria-describedby={hasError ? errorId : descriptionId}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={field.placeholder}
            aria-describedby={hasError ? errorId : descriptionId}
          />
        );
    }
  };

  // 如果是复选框，使用不同的布局
  if (field.type === 'checkbox') {
    return (
      <FormItem className="space-y-3">
        {renderFormControl()}
        {hasError && (
          <FormMessage
            id={errorId}
            {...getErrorAriaAttributes()}
            className="text-sm font-medium text-destructive"
          />
        )}
      </FormItem>
    );
  }

  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="space-y-2">
          <FormLabel
            htmlFor={fieldId}
            className={cn(
              'text-sm font-medium',
              hasError && 'text-destructive'
            )}
          >
            {field.label}
            {field.required && (
              <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">
                必填
              </Badge>
            )}
          </FormLabel>
          <FormControl>
            {renderFormControl()}
          </FormControl>
          {field.placeholder && field.type !== 'select' && (
            <FormDescription id={descriptionId} className="text-xs">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage
            id={errorId}
            {...getErrorAriaAttributes()}
            className="text-sm font-medium"
          />
        </FormItem>
      )}
    />
  );
}

// 无障碍表单状态指示器
interface FormStatusIndicatorProps {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errorCount: number;
  progressPercentage: number;
}

function FormStatusIndicator({
  isValid,
  isDirty,
  isSubmitting,
  errorCount,
  progressPercentage,
}: FormStatusIndicatorProps) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* 表单状态摘要 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="表单状态">
        <Badge
          variant={isValid ? 'default' : 'destructive'}
          aria-label={isValid ? '表单验证通过' : '表单验证失败'}
        >
          {isValid ? '有效' : '无效'}
        </Badge>
        <Badge
          variant={isDirty ? 'secondary' : 'outline'}
          aria-label={isDirty ? '表单已修改' : '表单未修改'}
        >
          {isDirty ? '已修改' : '未修改'}
        </Badge>
        {errorCount > 0 && (
          <Badge variant="destructive" aria-label={`表单包含 ${errorCount} 个错误`}>
            {errorCount} 个错误
          </Badge>
        )}
        {isSubmitting && (
          <Badge variant="outline" aria-label="表单正在提交">
            提交中...
          </Badge>
        )}
      </div>

      {/* 进度条 */}
      <div className="space-y-2" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="flex items-center justify-between text-sm">
          <span>完成进度</span>
          <span aria-label={`进度 ${Math.round(progressPercentage)}%`}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

// 错误汇总组件
interface ErrorSummaryProps {
  errors: Record<string, any>;
  formId: string;
}

function ErrorSummary({ errors, formId }: ErrorSummaryProps) {
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">表单包含以下错误，请修正后提交：</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {errorEntries.map(([fieldName, error], index) => {
              const fieldId = `${formId}-${fieldName}`;
              return (
                <li key={fieldName}>
                  <a
                    href={`#${fieldId}`}
                    className="underline hover:no-underline"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(fieldId)?.focus();
                    }}
                  >
                    {error.message || `${fieldName} 字段验证失败`}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// 主要的无障碍表单组件
export function AccessibleForm({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  formId = 'accessible-form',
  describedBy,
}: AccessibleFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 动态构建 Zod Schema
  const schema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'text':
          fieldSchema = z.string()
            .min(1, `${field.label}不能为空`)
            .max(500, `${field.label}不能超过500个字符`);
          break;
        case 'textarea':
          fieldSchema = z.string()
            .min(1, `${field.label}不能为空`)
            .max(2000, `${field.label}不能超过2000个字符`);
          break;
        case 'number':
          fieldSchema = z.number({
            required_error: `${field.label}不能为空`,
            invalid_type_error: `${field.label}必须是有效的数字`,
          })
          .min(Number.MIN_SAFE_INTEGER, `${field.label}不能太小`)
          .max(Number.MAX_SAFE_INTEGER, `${field.label}不能太大`);
          break;
        case 'select':
          fieldSchema = z.string()
            .min(1, `请选择${field.label}`);
          break;
        case 'checkbox':
          fieldSchema = z.boolean({
            required_error: `请选择${field.label}`,
            invalid_type_error: `${field.label}必须是是/否选择`,
          });
          break;
        case 'date':
          fieldSchema = z.string()
            .min(1, `请选择${field.label}`)
            .datetime(`${field.label}必须是有效的日期`);
          break;
        default:
          fieldSchema = z.string()
            .min(1, `${field.label}不能为空`);
      }

      // 处理必填字段
      if (field.required) {
        shape[field.name] = fieldSchema;
      } else {
        shape[field.name] = fieldSchema.optional();
      }
    });

    return z.object(shape);
  }, [metadata]);

  // 初始化表单
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: React.useMemo(() => {
      const values: Record<string, any> = {};
      metadata.fields.forEach((field) => {
        values[field.name] = field.defaultValue || '';
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
      await onSubmit(data);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算表单验证状态
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

  // 键盘导航支持
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  }, [form, handleSubmit]);

  return (
    <Card
      className={cn('w-full max-w-2xl mx-auto', className)}
      onKeyDown={handleKeyDown}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle id={`${formId}-title`}>
              无障碍动态表单
            </CardTitle>
            <CardDescription>
              版本 {metadata.version} • {metadata.fields.length} 个字段
              {describedBy && (
                <span className="sr-only">，由 {describedBy} 描述</span>
              )}
            </CardDescription>
          </div>
        </div>

        {/* 表单状态指示器 */}
        <FormStatusIndicator {...formValidationStatus} />
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
            noValidate
            aria-labelledby={`${formId}-title`}
            aria-describedby={describedBy}
          >
            {/* 错误汇总 */}
            {formValidationStatus.errorCount > 0 && (
              <ErrorSummary
                errors={form.formState.errors}
                formId={formId}
              />
            )}

            {/* 渲染所有字段 */}
            {metadata.fields.map((field) => (
              <AccessibleFormField
                key={field.id}
                field={field}
                form={form}
                isVisible={fieldVisibility[field.id]}
                formId={formId}
              />
            ))}

            {/* 提交按钮 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={!formValidationStatus.isValid || isSubmitting || isLoading}
                className="flex-1"
                aria-describedby={
                  !formValidationStatus.isValid
                    ? `${formId}-submit-disabled-reason`
                    : undefined
                }
              >
                {isSubmitting || isLoading ? '提交中...' : '提交表单'}
              </Button>

              {!formValidationStatus.isValid && (
                <div
                  id={`${formId}-submit-disabled-reason`}
                  className="text-sm text-muted-foreground"
                >
                  请修正表单错误后提交
                </div>
              )}
            </div>

            {/* 键盘快捷键提示 */}
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              提示：使用 Ctrl+Enter 快速提交表单
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export type { AccessibleFormProps };