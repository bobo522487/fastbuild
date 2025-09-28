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

import { Checkbox } from '@workspace/ui/components/checkbox';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface CheckboxFieldProps {
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
    required: '此选项为必填项',
    invalid_type: '值类型无效',
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
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

// 智能复选框组件
const SmartCheckbox = React.memo(({
  checked,
  onCheckedChange,
  disabled,
  required,
  label,
  description,
  error,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  label: string;
  description?: string;
  error?: boolean;
  className?: string;
}) => {
  const checkboxRef = React.useRef<HTMLButtonElement>(null);

  // 键盘快捷键支持
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  }, [checked, onCheckedChange]);

  // 动画状态
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleChange = React.useCallback((newChecked: boolean) => {
    setIsAnimating(true);
    onCheckedChange(newChecked);

    // 重置动画状态
    setTimeout(() => setIsAnimating(false), 200);
  }, [onCheckedChange]);

  return (
    <div className={cn('flex items-start space-x-3 space-y-0', className)}>
      <FormControl>
        <Checkbox
          ref={checkboxRef}
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled}
          required={required}
          className={cn(
            'transition-all duration-200',
            error && 'border-destructive focus-visible:ring-destructive',
            !error && checked && 'border-green-500 focus-visible:ring-green-500',
            isAnimating && 'scale-110'
          )}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-required={required}
          aria-invalid={error}
        />
      </FormControl>

      <div className="space-y-1 leading-none flex-1">
        <FormLabel
          className={cn(
            'text-sm font-medium cursor-pointer transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'text-destructive',
            !error && checked && 'text-green-600'
          )}
          onClick={() => !disabled && handleChange(!checked)}
        >
          {label}
          {required && (
            <Badge variant="destructive" className="text-xs px-1 py-0 h-4 ml-2">
              必填
            </Badge>
          )}
        </FormLabel>

        {description && (
          <FormDescription className={cn(
            'text-xs',
            disabled && 'opacity-50',
            error && 'text-destructive/80'
          )}>
            {description}
          </FormDescription>
        )}
      </div>
    </div>
  );
});

SmartCheckbox.displayName = 'SmartCheckbox';

// 复选框组组件
const CheckboxGroup = React.memo(({
  options,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  options: Array<{ label: string; value: string; description?: string }>;
  value: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
}) => {
  const handleOptionChange = React.useCallback((optionValue: string, checked: boolean) => {
    let newValues: string[];

    if (checked) {
      newValues = [...value, optionValue];
    } else {
      newValues = value.filter(v => v !== optionValue);
    }

    onChange(newValues);
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <SmartCheckbox
          key={option.value}
          checked={value.includes(option.value)}
          onCheckedChange={(checked) => handleOptionChange(option.value, checked)}
          disabled={disabled}
          label={option.label}
          description={option.description}
          error={error && required && value.length === 0}
        />
      ))}
    </div>
  );
});

CheckboxGroup.displayName = 'CheckboxGroup';

export const CheckboxField = React.memo(({ field, form, isVisible = true }: CheckboxFieldProps) => {
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);
  const currentValue = React.useMemo(() => form.getValues(field.name), [form, field.name]);

  // 确定是否为多选模式
  const isMultiSelect = React.useMemo(() => {
    return field.options && field.options.length > 1;
  }, [field.options]);

  // 处理单选复选框
  if (!isMultiSelect) {
    return (
      <RHFFormField
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {field.label}
              </span>
              <FieldValidationStatus field={field} form={form} />
            </div>

            <SmartCheckbox
              checked={formField.value || false}
              onCheckedChange={formField.onChange}
              disabled={form.formState.isSubmitting}
              required={field.required}
              label={field.label}
              description={field.placeholder}
              error={!!fieldState.error}
            />

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
  }

  // 处理多选复选框
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

          <CheckboxGroup
            options={field.options || []}
            value={formField.value || []}
            onChange={formField.onChange}
            required={field.required}
            disabled={form.formState.isSubmitting}
            error={!!fieldState.error}
          />

          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}

          {/* 选择计数 */}
          {field.options && (
            <FormDescription className="text-xs text-blue-600">
              已选择 {formField.value?.length || 0} / {field.options.length} 个选项
              {field.required && formField.value?.length === 0 && (
                <span className="text-red-600 ml-1">（至少选择一项）</span>
              )}
            </FormDescription>
          )}

          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  );
});

CheckboxField.displayName = 'CheckboxField';