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
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { LoadingIndicator, FormLoadingIndicator, ButtonLoading } from './LoadingIndicator';
import { FormResetHandler, useFormReset } from './FormResetHandler';
import { EnhancedValidationSummary, ValidationErrorAnalyzer } from './EnhancedValidationSummary';

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

// 性能优化的字段验证状态组件
const FieldValidationStatus = React.memo(({ field, form }: { field: FormFieldType; form: UseFormReturn<any> }) => {
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
});

FieldValidationStatus.displayName = 'FieldValidationStatus';

// 性能优化的错误消息组件
const EnhancedFormMessage = React.memo(({ field, form }: { field: FormFieldType; form: UseFormReturn<any> }) => {
  const fieldState = form.getFieldState(field.name);
  const { error } = fieldState;

  if (!error) {
    return null;
  }

  // 使用对象缓存避免重复创建
  const errorMessages = React.useMemo(() => ({
    required: '此字段为必填项，请提供有效信息',
    min: '输入内容过短，请提供更多详细信息',
    max: '输入内容过长，请精简内容',
    invalid_type: '格式不正确，请检查输入内容',
  }), []);

  return (
    <div className="mt-1 space-y-1">
      <FormMessage />
      {error.type === 'required' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.required}
        </p>
      )}
      {error.type === 'min' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.min}
        </p>
      )}
      {error.type === 'max' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.max}
        </p>
      )}
      {error.type === 'invalid_type' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.invalid_type}
        </p>
      )}
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

// 缓存字段组件创建函数
const createFieldComponent = (type: string): React.FC<FormFieldComponentProps> => {
  switch (type) {
    case 'text':
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));

    case 'number':
      return React.memo(({ field, form, isVisible = true }) => (
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = (e.currentTarget as HTMLInputElement).value;
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
      ));

    case 'textarea':
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));

    case 'select':
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));

    case 'checkbox':
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));

    case 'date':
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));

    default:
      return React.memo(({ field, form, isVisible = true }) => (
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
      ));
  }
};

// 性能优化的字段组件缓存
const FormFieldComponents = React.useMemo(() => {
  const components: Record<string, React.FC<FormFieldComponentProps>> = {};
  const fieldTypes = ['text', 'number', 'textarea', 'select', 'checkbox', 'date'];

  fieldTypes.forEach(type => {
    components[type] = createFieldComponent(type);
  });

  return components;
}, []);

// 性能优化：缓存 Schema 构建
const buildOptimizedSchema = React.memo((metadata: FormMetadata) => {
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

export function DynamicFormRenderer({
  metadata,
  onSubmit,
  isLoading = false,
  className,
}: DynamicFormRendererProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showValidationDetails, setShowValidationDetails] = React.useState(false);

  // 性能优化：使用缓存的 Schema
  const schema = React.useMemo(() => buildOptimizedSchema(metadata), [metadata]);

  // 性能优化：减少不必要的重新计算
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange', // 实时验证
    reValidateMode: 'onChange', // 用户交互时重新验证
    defaultValues: React.useMemo(() => {
      const values: Record<string, any> = {};
      metadata.fields.forEach((field) => {
        values[field.name] = field.defaultValue || '';
      });
      return values;
    }, [metadata]),
  });

  // 性能优化：优化字段可见性计算
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

      // 简化条件判断逻辑
      if (conditionValue === undefined) {
        visibility[field.id] = false;
      } else {
        switch (condition.operator) {
          case 'equals':
            visibility[field.id] = conditionValue === condition.value;
            break;
          case 'not_equals':
            visibility[field.id] = conditionValue !== condition.value;
            break;
          default:
            visibility[field.id] = false;
        }
      }
    });

    return visibility;
  }, [form, metadata]);

  // 处理表单提交
  const handleSubmit = React.useCallback(async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);

    try {
      console.log('🚀 Form Submission Data:', data);
      await onSubmit(data);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, form]);

  // 性能优化：优化表单验证状态计算
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

  // 性能优化：减少验证分析频率
  const validationSummary = React.useMemo(() => {
    return ValidationErrorAnalyzer.analyzeForm(metadata, form);
  }, [form, metadata]);

  // 使用重置功能
  const { resetForm } = useFormReset(form, metadata);

  // 性能优化：虚拟化大表单渲染
  const renderFields = React.useMemo(() => {
    return metadata.fields.map((field) => {
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
    });
  }, [metadata.fields, fieldVisibility, form]);

  return (
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
            {renderFields}

            {/* 增强验证摘要 */}
            <EnhancedValidationSummary
              metadata={metadata}
              form={form}
              isVisible={showValidationDetails || !validationSummary.isValid}
              onFieldFocus={(fieldName) => {
                const fieldElement = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
                if (fieldElement) {
                  fieldElement.focus();
                  fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            />

            {/* 提交按钮 */}
            <div className="flex items-center justify-between">
              {!validationSummary.isValid && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                >
                  {showValidationDetails ? '隐藏详情' : '查看错误详情'}
                </Button>
              )}
              <ButtonLoading
                type="submit"
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
  );
}

export type { DynamicFormRendererProps };
