'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { cn } from '@workspace/ui/lib/utils';

import {
  FormControl,
  FormDescription,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface TextFieldProps {
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
    invalid_string: '字符串格式不正确',
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
      {error.type === 'invalid_string' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.invalid_string}
        </p>
      )}
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

export const TextField = React.memo(({ field, form, isVisible = true }: TextFieldProps) => {
  // 计算字段状态
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);

  // 优化的样式计算
  const inputClassName = React.useMemo(() => cn(
    'transition-colors duration-200',
    fieldState.error && 'border-destructive focus-visible:ring-destructive',
    !fieldState.error && fieldState.isDirty && 'border-green-500 focus-visible:ring-green-500',
  ), [fieldState.error, fieldState.isDirty]);

  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-sm font-medium">
              {field.label}
              {field.required && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                  必填
                </Badge>
              )}
            </FormLabel>
            <FieldValidationStatus field={field} form={form} />
          </div>

          <FormControl>
            <Input
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              className={inputClassName}
              disabled={form.formState.isSubmitting}
              aria-label={field.label}
              aria-required={field.required}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
            />
          </FormControl>

          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}

          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  );
});

TextField.displayName = 'TextField';