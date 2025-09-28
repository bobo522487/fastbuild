'use client';

import React, { Profiler } from 'react';
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
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import { PerformanceMonitor, usePerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor';
import { ButtonLoading } from '../forms/LoadingIndicator';

import type {
  FormMetadata,
  FormField as FormFieldType,
  ValidationResult,
} from '@workspace/types';

interface OptimizedFormRendererProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  enablePerformanceMonitoring?: boolean;
}

interface FormFieldComponentProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

// 优化的字段组件 - 使用React.memo
const OptimizedFormField = React.memo<FormFieldComponentProps>(({
  field,
  form,
  isVisible = true,
  onVisibilityChange
}) => {
  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);

  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-sm font-medium">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs px-1 py-0">必填</Badge>}
            </FormLabel>
            <FieldValidationStatus fieldState={fieldState} />
          </div>
          <FormControl>
            <OptimizedFieldInput field={field} formField={formField} />
          </FormControl>
          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}
          <OptimizedFieldMessage fieldState={fieldState} />
        </FormItem>
      )}
    />
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.form.getFieldState(prevProps.field.name).error ===
    nextProps.form.getFieldState(nextProps.field.name).error
  );
});

OptimizedFormField.displayName = 'OptimizedFormField';

// 优化的字段输入组件
const OptimizedFieldInput = React.memo(({
  field,
  formField
}: {
  field: FormFieldType;
  formField: any;
}) => {
  const commonProps = {
    ...formField,
    value: formField.value || '',
    className: cn(
      'transition-colors duration-200',
      formField.formState?.errors[field.name] && 'border-destructive focus-visible:ring-destructive'
    ),
  };

  switch (field.type) {
    case 'text':
      return <Input placeholder={field.placeholder} {...commonProps} />;

    case 'number':
      return (
        <Input
          type="number"
          placeholder={field.placeholder}
          {...commonProps}
          onChange={(e) => {
            const value = e.target.value;
            formField.onChange(value === '' ? '' : Number(value));
          }}
        />
      );

    case 'textarea':
      return <Textarea placeholder={field.placeholder} {...commonProps} />;

    case 'select':
      return (
        <Select onValueChange={formField.onChange} defaultValue={formField.value}>
          <SelectTrigger className={commonProps.className}>
            <SelectValue placeholder={field.placeholder || '请选择...'} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'checkbox':
      return (
        <Checkbox
          checked={formField.value || false}
          onCheckedChange={formField.onChange}
          className={commonProps.className}
        />
      );

    case 'date':
      return <Input type="date" {...commonProps} />;

    default:
      return <Input placeholder={field.placeholder} {...commonProps} />;
  }
});

OptimizedFieldInput.displayName = 'OptimizedFieldInput';

// 优化的字段验证状态组件
const FieldValidationStatus = React.memo(({ fieldState }: { fieldState: any }) => {
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
});

FieldValidationStatus.displayName = 'FieldValidationStatus';

// 优化的字段消息组件
const OptimizedFieldMessage = React.memo(({ fieldState }: { fieldState: any }) => {
  const { error } = fieldState;

  if (!error) {
    return null;
  }

  return (
    <div className="mt-1 space-y-1">
      <FormMessage />
      {error.type === 'required' && (
        <p className="text-xs text-muted-foreground">
          此字段为必填项，请提供有效信息
        </p>
      )}
      {error.type === 'min' && (
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
});

OptimizedFieldMessage.displayName = 'OptimizedFieldMessage';

// 缓存的Zod Schema构建
const createCachedSchema = React.cache((metadata: FormMetadata) => {
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
});

export function OptimizedFormRenderer({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  enablePerformanceMonitoring = true,
}: OptimizedFormRendererProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationTime, setValidationTime] = React.useState<number>(0);

  const performanceMonitor = usePerformanceMonitor('OptimizedFormRenderer');

  // 使用缓存的Schema构建
  const schema = React.useMemo(() => createCachedSchema(metadata), [metadata]);

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

  // 优化的字段可见性计算
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
  const handleSubmit = React.useCallback(async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    const startTime = performance.now();

    try {
      await onSubmit(data);
      form.reset();
    } finally {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      setValidationTime(totalTime);
      setIsSubmitting(false);

      // 记录性能指标
      performanceMonitor.recordPerformance({
        renderTime: 0, // 将在Profiler中记录
        componentCount: metadata.fields.length,
        validationTime: totalTime,
        timestamp: Date.now(),
      });
    }
  }, [onSubmit, form, metadata.fields.length, performanceMonitor]);

  // 表单验证状态
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

  // Profiler回调
  const handlePerformanceMeasure = React.useCallback((
    id: string,
    phase: string,
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (enablePerformanceMonitoring) {
      performanceMonitor.recordPerformance({
        renderTime: actualDuration,
        componentCount: metadata.fields.length,
        validationTime,
        timestamp: Date.now(),
      });
    }
  }, [enablePerformanceMonitoring, metadata.fields.length, validationTime, performanceMonitor]);

  const formContent = (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>优化的动态表单</CardTitle>
            <CardDescription>
              版本 {metadata.version} • {metadata.fields.length} 个字段
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {formValidationStatus.errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {formValidationStatus.errorCount} 个错误
              </Badge>
            )}
            {formValidationStatus.isDirty && formValidationStatus.isValid && (
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 优化的字段渲染 */}
            {metadata.fields.map((field) => (
              <OptimizedFormField
                key={field.id}
                field={field}
                form={form}
                isVisible={fieldVisibility[field.id]}
              />
            ))}

            {/* 表单验证状态摘要 */}
            {formValidationStatus.errorCount > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  表单包含 {formValidationStatus.errorCount} 个验证错误，请修正后再提交
                </AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <ButtonLoading
              type="submit"
              isLoading={isSubmitting || isLoading}
              disabled={!formValidationStatus.isValid}
              loadingText="提交中..."
              className="w-full"
            >
              提交表单
            </ButtonLoading>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  if (enablePerformanceMonitoring) {
    return (
      <Profiler id="OptimizedFormRenderer" onRender={handlePerformanceMeasure}>
        {formContent}
      </Profiler>
    );
  }

  return formContent;
}

export type { OptimizedFormRendererProps };