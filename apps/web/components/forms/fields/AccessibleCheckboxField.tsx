'use client';

import React from 'react';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Label } from '@workspace/ui/components/label';
import { cn } from '@workspace/ui/lib/utils';
import {
  AccessibleFieldWrapper,
  FormFieldAccessibilityProps,
  generateActionDescription,
  ScreenReaderAnnouncement,
} from '../accessibility/AccessibilityWrapper';

export interface AccessibleCheckboxFieldProps extends Omit<FormFieldAccessibilityProps, 'id' | 'required'> {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  fieldId: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export const AccessibleCheckboxField: React.FC<AccessibleCheckboxFieldProps> = ({
  fieldId,
  checked,
  defaultChecked,
  indeterminate = false,
  onCheckedChange,
  description,
  required,
  disabled,
  readOnly,
  ...fieldProps
}) => {
  const [isChecked, setIsChecked] = React.useState(defaultChecked || false);
  const [announcement, setAnnouncement] = React.useState('');
  const checkboxRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked);
    }
  }, [checked]);

  React.useEffect(() => {
    // 处理 indeterminate 状态
    if (checkboxRef.current) {
      checkboxRef.current.dataset.state = indeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked';
    }
  }, [isChecked, indeterminate]);

  const handleCheckedChange = React.useCallback((newChecked: boolean | 'indeterminate') => {
    setIsChecked(newChecked === true);
    onCheckedChange?.(newChecked);

    // 生成状态变化的公告
    const status = newChecked === 'indeterminate' ? '部分选中' : newChecked ? '已选中' : '未选中';
    setAnnouncement(`${fieldProps.label || '选项'}: ${status}`);
  }, [onCheckedChange, fieldProps.label]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    // 空格键：切换状态
    if (event.key === ' ') {
      event.preventDefault();
      const newChecked = indeterminate ? false : !isChecked;
      handleCheckedChange(newChecked);
    }

    // Enter 键：切换状态
    if (event.key === 'Enter') {
      event.preventDefault();
      const newChecked = indeterminate ? false : !isChecked;
      handleCheckedChange(newChecked);
    }

    // 方向键：在选项组中导航（如果存在）
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      // 这里可以实现在选项组中的导航逻辑
      // 需要上下文信息来实现
    }
  }, [isChecked, indeterminate, handleCheckedChange]);

  const wrapperProps = {
    ...fieldProps,
    id: fieldId,
    required,
    disabled,
    readOnly,
    hasError: fieldProps.hasError,
    errorMessage: fieldProps.errorMessage,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-2">
        <Checkbox
          ref={checkboxRef}
          id={fieldId}
          checked={isChecked}
          onCheckedChange={handleCheckedChange}
          disabled={disabled}
          required={required}
          aria-checked={indeterminate ? 'mixed' : isChecked}
          aria-describedby={description ? `${fieldId}-description` : undefined}
          aria-invalid={fieldProps.hasError}
          aria-errormessage={fieldProps.hasError ? `${fieldId}-error` : undefined}
          onKeyDown={handleKeyDown}
          className={cn(
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            fieldProps.hasError && 'border-destructive data-[state=checked]:bg-destructive'
          )}
        />

        <div className="flex-1 space-y-1">
          {fieldProps.label && (
            <Label
              htmlFor={fieldId}
              className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                fieldProps.hasError && 'text-destructive',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {fieldProps.label}
              {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
            </Label>
          )}

          {description && (
            <p
              id={`${fieldId}-description`}
              className={cn('text-sm text-muted-foreground', disabled && 'opacity-50')}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* 错误消息 */}
      {fieldProps.hasError && fieldProps.errorMessage && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-destructive font-medium"
          role="alert"
          aria-live="polite"
        >
          {fieldProps.errorMessage}
        </p>
      )}

      {/* 屏幕阅读器公告 */}
      <ScreenReaderAnnouncement message={announcement} politeness="polite" />
    </div>
  );
};

// 复选框组组件
export interface CheckboxOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  checked?: boolean;
}

export interface AccessibleCheckboxGroupProps {
  id: string;
  label?: string;
  description?: string;
  options: CheckboxOption[];
  value?: string[];
  defaultValue?: string[];
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  onChange?: (selectedValues: string[]) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const AccessibleCheckboxGroup: React.FC<AccessibleCheckboxGroupProps> = ({
  id,
  label,
  description,
  options,
  value,
  defaultValue,
  required = false,
  disabled = false,
  hasError = false,
  onChange,
  orientation = 'vertical',
}) => {
  const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue || []);
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(value);
    }
  }, [value]);

  const handleOptionChange = React.useCallback((optionId: string, isChecked: boolean) => {
    const newSelectedValues = isChecked
      ? [...selectedValues, optionId]
      : selectedValues.filter(v => v !== optionId);

    setSelectedValues(newSelectedValues);
    onChange?.(newSelectedValues);

    const option = options.find(opt => opt.id === optionId);
    if (option) {
      setAnnouncement(`${option.label}: ${isChecked ? '已选中' : '已取消'}`);
    }
  }, [selectedValues, onChange, options]);

  const groupId = `${id}-group`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div
      role="group"
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={descriptionId}
      className="space-y-3"
    >
      {label && (
        <div id={`${id}-label`} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
        </div>
      )}

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className={cn(
        'space-y-2',
        orientation === 'horizontal' && 'flex flex-wrap gap-4'
      )}>
        {options.map((option) => (
          <AccessibleCheckboxField
            key={option.id}
            fieldId={option.id}
            label={option.label}
            description={option.description}
            checked={selectedValues.includes(option.value)}
            defaultChecked={option.checked}
            disabled={disabled || option.disabled}
            hasError={hasError}
            onCheckedChange={(checked) => handleOptionChange(option.value, checked === true)}
          />
        ))}
      </div>

      {/* 屏幕阅读器公告 */}
      <ScreenReaderAnnouncement message={announcement} politeness="polite" />
    </div>
  );
};