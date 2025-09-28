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

// 字段组件映射
const FormFieldComponents: Record<string, React.FC<FormFieldComponentProps>> = {
  text: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <FormLabel>{field.label}</FormLabel>
          <FormControl>
            <Input
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  ),

  number: ({ field, form, isVisible = true }) => (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(!isVisible && 'hidden')}>
          <FormLabel>{field.label}</FormLabel>
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
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <FormMessage />
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
          <FormLabel>{field.label}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <FormMessage />
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
          <FormLabel>{field.label}</FormLabel>
          <Select onValueChange={formField.onChange} defaultValue={formField.value}>
            <FormControl>
              <SelectTrigger>
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
          <FormMessage />
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
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{field.label}</FormLabel>
            {field.placeholder && (
              <FormDescription>{field.placeholder}</FormDescription>
            )}
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
          <FormLabel>{field.label}</FormLabel>
          <FormControl>
            <Input
              type="date"
              {...formField}
              value={formField.value || ''}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription>{field.placeholder}</FormDescription>
          )}
          <FormMessage />
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
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 动态构建 Zod Schema
  const schema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'text':
        case 'textarea':
          fieldSchema = z.string();
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
          fieldSchema = z.string().datetime();
          break;
        default:
          fieldSchema = z.string();
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
      if (field.condition) {
        const conditionValue = values[field.condition.fieldId];
        const isVisible = field.condition.operator === 'equals'
          ? conditionValue === field.condition.value
          : conditionValue !== field.condition.value;
        visibility[field.id] = isVisible;
      } else {
        visibility[field.id] = true;
      }
    });

    return visibility;
  }, [form, metadata]);

  // 处理表单提交
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('🚀 Form Submission Data:', data);

      await onSubmit(data);

      form.reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed, please try again';
      setSubmitError(errorMessage);
      console.error('❌ Form Submission Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 监听字段值变化以更新可见性
  const watchedValues = form.watch();
  React.useEffect(() => {
    // 重新计算可见性时会触发重新渲染
    const _ = fieldVisibility;
  }, [watchedValues, fieldVisibility]);

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>动态表单</CardTitle>
        <CardDescription>
          版本 {metadata.version} • {metadata.fields.length} 个字段
        </CardDescription>
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

            {/* 错误提示 */}
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full"
            >
              {isSubmitting ? '提交中...' : '提交表单'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export type { DynamicFormRendererProps };