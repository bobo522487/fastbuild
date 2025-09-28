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

interface NumberFieldProps {
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
    invalid_type: '必须是有效的数字',
    too_small: '数值太小',
    too_big: '数值太大',
  }), []);

  return (
    <div className="mt-1 space-y-1">
      <FormMessage />
      {error.type === 'required' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.required}
        </p>
      )}
      {error.type === 'invalid_type' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.invalid_type}
        </p>
      )}
      {error.type === 'too_small' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.too_small}
        </p>
      )}
      {error.type === 'too_big' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.too_big}
        </p>
      )}
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

// 智能数字输入处理
const useSmartNumberInput = (fieldState: any, validation?: any) => {
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 允许空值、数字、小数点、负号
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      return value === '' ? '' : Number(value);
    }

    // 如果输入无效，返回当前值
    return e.target.value;
  }, []);

  const handleBlur = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 应用验证规则
    if (value !== '') {
      const numValue = Number(value);

      // 检查最小值
      if (validation?.min !== undefined && numValue < validation.min) {
        return validation.min;
      }

      // 检查最大值
      if (validation?.max !== undefined && numValue > validation.max) {
        return validation.max;
      }

      return numValue;
    }

    return '';
  }, [validation]);

  return {
    handleChange,
    handleBlur,
  };
};

export const NumberField = React.memo(({ field, form, isVisible = true }: NumberFieldProps) => {
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);
  const { handleChange, handleBlur } = useSmartNumberInput(fieldState, field.validation);

  // 优化的样式计算
  const inputClassName = React.useMemo(() => cn(
    'transition-colors duration-200',
    fieldState.error && 'border-destructive focus-visible:ring-destructive',
    !fieldState.error && fieldState.isDirty && 'border-green-500 focus-visible:ring-green-500',
  ), [fieldState.error, fieldState.isDirty]);

  // 验证信息
  const validationInfo = React.useMemo(() => {
    if (!field.validation) return null;

    const info = [];
    if (field.validation.min !== undefined) {
      info.push(`最小值: ${field.validation.min}`);
    }
    if (field.validation.max !== undefined) {
      info.push(`最大值: ${field.validation.max}`);
    }

    return info.length > 0 ? info.join(', ') : null;
  }, [field.validation]);

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
              type="number"
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              onChange={(e) => {
                const processedValue = handleChange(e);
                formField.onChange(processedValue);
              }}
              onBlur={(e) => {
                const processedValue = handleBlur(e);
                formField.onChange(processedValue);
                formField.onBlur();
              }}
              className={inputClassName}
              disabled={form.formState.isSubmitting}
              aria-label={field.label}
              aria-required={field.required}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
              min={field.validation?.min}
              max={field.validation?.max}
              step="any"
            />
          </FormControl>

          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}

          {validationInfo && (
            <FormDescription className="text-xs text-blue-600">
              {validationInfo}
            </FormDescription>
          )}

          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  );
});

NumberField.displayName = 'NumberField';