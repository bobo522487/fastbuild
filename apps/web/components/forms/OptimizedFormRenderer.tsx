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
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@workspace/ui/components/skeleton';

import { FormFieldFactory } from './fields/FormFieldFactory';
import { FormResetHandler, useFormReset } from './FormResetHandler';

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
}

// 简化的表单状态监控
const useFormState = (form: UseFormReturn<any>) => {
  const { isValid, isDirty, isSubmitting, errors } = form.formState;
  return {
    isValid,
    isDirty,
    isSubmitting,
    errorCount: Object.keys(errors).length,
  };
};

// 优化的提交按钮组件
const SubmitButton = React.memo(({
  isSubmitting,
  isValid,
  isDirty,
  isLoading
}: {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  isLoading: boolean;
}) => {
  const isDisabled = !isValid || !isDirty || isSubmitting || isLoading;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      className="w-full transition-all duration-200"
    >
      {isSubmitting ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>提交中...</span>
        </div>
      ) : (
        '提交表单'
      )}
    </Button>
  );
});

SubmitButton.displayName = 'SubmitButton';

// 简化的表单摘要组件
const FormSummary = React.memo(({
  isValid,
  isDirty,
  errorCount
}: {
  isValid: boolean;
  isDirty: boolean;
  errorCount: number;
}) => {
  if (!isDirty) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        {isValid && isDirty && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">表单验证通过</span>
          </div>
        )}
        {!isValid && errorCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">有 {errorCount} 个错误需要修正</span>
          </div>
        )}
      </div>
      {isDirty && (
        <Badge variant="secondary" className="text-xs">
          已修改
        </Badge>
      )}
    </div>
  );
});

FormSummary.displayName = 'FormSummary';

// 加载状态组件
const FormLoadingState = React.memo(() => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
));

FormLoadingState.displayName = 'FormLoadingState';

export const OptimizedFormRenderer = React.memo(({
  metadata,
  onSubmit,
  isLoading = false,
  className
}: OptimizedFormRendererProps) => {
  // 构建动态表单验证模式
  const formSchema = React.useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    metadata.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny = z.string();

      if (field.type === 'number') {
        fieldSchema = z.number();
      } else if (field.type === 'checkbox') {
        fieldSchema = z.boolean();
      }

      if (field.required) {
        fieldSchema = fieldSchema;
      }

      shape[field.name] = fieldSchema;
    });

    return z.object(shape);
  }, [metadata]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: React.useMemo(() => {
      const defaults: Record<string, any> = {};
      metadata.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        } else {
          switch (field.type) {
            case 'checkbox':
              defaults[field.name] = false;
              break;
            case 'number':
              defaults[field.name] = 0;
              break;
            default:
              defaults[field.name] = '';
          }
        }
      });
      return defaults;
    }, [metadata])
  });

  const { resetForm } = useFormReset(form, metadata);
  const formState = useFormState(form);

  const handleSubmit = React.useCallback(async (data: Record<string, any>) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [onSubmit]);

  if (isLoading) {
    return (
      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormLoadingState />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{metadata.version || '表单'}</CardTitle>
            <CardDescription>
              请填写以下信息，标记为必填的字段必须提供
            </CardDescription>
          </div>
          <FormResetHandler form={form} metadata={metadata} onReset={resetForm} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              {metadata.fields.map((field) => (
                <FormFieldFactory
                  key={field.id}
                  field={field}
                  form={form}
                />
              ))}
            </div>

            <FormSummary {...formState} />

            <div className="flex items-center gap-4">
              <SubmitButton
                isSubmitting={form.formState.isSubmitting}
                isValid={formState.isValid}
                isDirty={formState.isDirty}
                isLoading={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => resetForm()}
                disabled={!formState.isDirty}
              >
                重置
              </Button>
            </div>

            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {form.formState.errors.root.message}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});

OptimizedFormRenderer.displayName = 'OptimizedFormRenderer';