'use client';

import React from 'react';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { cn } from '@workspace/ui/lib/utils';
import {
  AccessibleFieldWrapper,
  FormFieldAccessibilityProps,
  useKeyboardNavigation,
  generateActionDescription,
  ScreenReaderAnnouncement,
} from '../accessibility/AccessibilityWrapper';

export interface AccessibleTextFieldProps extends Omit<FormFieldAccessibilityProps, 'id'> {
  type?: 'text' | 'email' | 'url' | 'password' | 'search' | 'tel';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  fieldId: string;
  showCharCount?: boolean;
  clearButton?: boolean;
  onClear?: () => void;
}

export const AccessibleTextField: React.FC<AccessibleTextFieldProps> = ({
  fieldId,
  type = 'text',
  value,
  defaultValue,
  placeholder,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  autoFocus,
  onChange,
  onBlur,
  onFocus,
  showCharCount = false,
  clearButton = false,
  onClear,
  ...fieldProps
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || '');

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    onChange?.(event);

    // 屏幕阅读器公告
    if (maxLength && newValue.length > (internalValue.length || 0)) {
      const remaining = maxLength - newValue.length;
      if (remaining <= 10) {
        setAnnouncement(`还剩 ${remaining} 个字符`);
      }
    }
  }, [onChange, maxLength, internalValue.length]);

  const handleFocus = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(event);
    setAnnouncement(generateActionDescription('focus', type, fieldProps.label));
  }, [onFocus, type, fieldProps.label]);

  const handleBlur = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(event);
  }, [onBlur]);

  const handleClear = React.useCallback(() => {
    onClear?.();
    setInternalValue('');
    setAnnouncement('已清除内容');
    // 重新聚焦到输入框
    const input = document.getElementById(fieldId) as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, [onClear, fieldId]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl/Cmd + A: 全选
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      // 允许默认全选行为
      return;
    }

    // Escape: 清除内容（如果支持）
    if (event.key === 'Escape' && clearButton) {
      event.preventDefault();
      handleClear();
    }

    // Enter: 提交表单
    if (event.key === 'Enter' && !event.shiftKey) {
      const form = event.currentTarget.form;
      if (form) {
        event.preventDefault();
        const submitButton = form.querySelector('[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.click();
        }
      }
    }
  }, [clearButton, handleClear, type]);

  const inputProps = {
    type,
    value: internalValue,
    defaultValue,
    placeholder,
    maxLength,
    minLength,
    pattern,
    autoComplete,
    autoFocus,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    'aria-describedby': fieldProps.description || fieldProps.hint ? `${fieldId}-description` : undefined,
    className: cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      fieldProps.hasError && 'border-destructive focus-visible:ring-destructive',
      isFocused && 'ring-2 ring-ring ring-offset-2'
    ),
  };

  return (
    <AccessibleFieldWrapper fieldProps={{ ...fieldProps, id: fieldId }}>
      <div className="relative">
        <Input {...inputProps} />

        {/* 清除按钮 */}
        {clearButton && internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
            aria-label="清除内容"
            tabIndex={-1}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* 字符计数 */}
        {showCharCount && maxLength && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <span
              className={cn(
                'text-xs',
                internalValue.length > maxLength * 0.9
                  ? 'text-destructive'
                  : internalValue.length > maxLength * 0.7
                  ? 'text-yellow-600'
                  : 'text-muted-foreground'
              )}
              aria-live="polite"
            >
              {internalValue.length}/{maxLength}
            </span>
          </div>
        )}
      </div>

      {/* 屏幕阅读器公告 */}
      <ScreenReaderAnnouncement message={announcement} politeness="polite" />
    </AccessibleFieldWrapper>
  );
};