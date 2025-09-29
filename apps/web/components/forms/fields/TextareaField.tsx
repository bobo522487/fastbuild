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

import { Textarea } from '@workspace/ui/components/textarea';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface TextareaFieldProps {
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
    min: '内容过短，请提供更多详细信息',
    max: '内容过长，请精简内容',
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
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

// 智能文本计数器
const CharacterCounter = React.memo(({
  value,
  minLength,
  maxLength
}: {
  value: string;
  minLength?: number;
  maxLength?: number;
}) => {
  const currentLength = value.length;

  // 计算状态
  const getStatus = () => {
    if (minLength !== undefined && currentLength < minLength) {
      return { color: 'text-red-600', text: `至少 ${minLength} 字符` };
    }
    if (maxLength !== undefined && currentLength > maxLength) {
      return { color: 'text-red-600', text: `超出 ${currentLength - maxLength} 字符` };
    }
    if (maxLength !== undefined && currentLength > maxLength * 0.9) {
      return { color: 'text-yellow-600', text: `${currentLength}/${maxLength}` };
    }
    return { color: 'text-green-600', text: `${currentLength}${maxLength ? `/${maxLength}` : ''} 字符` };
  };

  const status = getStatus();

  return (
    <div className={`text-xs ${status.color} font-medium`}>
      {status.text}
    </div>
  );
});

CharacterCounter.displayName = 'CharacterCounter';

// 自动调整高度的文本域
const useAutoResizeTextarea = () => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 重置高度以获取准确的 scrollHeight
    textarea.style.height = 'auto';

    // 计算新高度，限制最大高度
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // 最大高度
    const newHeight = Math.min(scrollHeight, maxHeight);

    textarea.style.height = `${newHeight}px`;

    // 如果内容很多，显示滚动条
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  React.useEffect(() => {
    // 初始调整
    adjustHeight();

    // 监听窗口大小变化
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
};

export const TextareaField = React.memo(({ field, form, isVisible = true }: TextareaFieldProps) => {
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea();

  // 获取当前值
  const currentValue = React.useMemo(() => {
    const values = form.getValues();
    return values[field.name] || '';
  }, [form, field.name]);

  // 优化的样式计算
  const textareaClassName = React.useMemo(() => cn(
    'resize-none transition-all duration-200',
    fieldState.error && 'border-destructive focus-visible:ring-destructive',
    !fieldState.error && fieldState.isDirty && 'border-green-500 focus-visible:ring-green-500',
  ), [fieldState.error, fieldState.isDirty]);

  // 处理输入变化
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    form.setValue(field.name, e.target.value, {
      shouldValidate: true,
      shouldDirty: true
    });

    // 延迟调整高度，避免性能问题
    requestAnimationFrame(adjustHeight);
  }, [form, field.name, adjustHeight]);

  // 验证规则
  const validationRules = React.useMemo(() => {
    const rules: { min?: number; max?: number } = {};
    if (field.validation?.min !== undefined) {
      rules.min = Number(field.validation.min);
    }
    if (field.validation?.max !== undefined) {
      rules.max = Number(field.validation.max);
    }
    return rules;
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
            <div className="flex items-center gap-2">
              <CharacterCounter
                value={currentValue}
                minLength={validationRules.min}
                maxLength={validationRules.max}
              />
              <FieldValidationStatus field={field} form={form} />
            </div>
          </div>

          <FormControl>
            <Textarea
              ref={textareaRef}
              placeholder={field.placeholder}
              value={formField.value || ''}
              onChange={handleInputChange}
              name={formField.name}
              onBlur={formField.onBlur}
              className={textareaClassName}
              disabled={form.formState.isSubmitting}
              aria-label={field.label}
              aria-required={field.required}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
              minLength={validationRules.min}
              maxLength={validationRules.max}
              rows={3}
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

TextareaField.displayName = 'TextareaField';