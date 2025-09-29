'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';

// 无障碍访问属性接口
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-errormessage'?: string;
  'aria-disabled'?: boolean;
  'aria-readonly'?: boolean;
  role?: string;
  tabIndex?: number;
}

// 错误状态接口
export interface ErrorState {
  hasError: boolean;
  errorMessage?: string;
  errorId?: string;
}

// 表单字段通用属性
export interface FormFieldAccessibilityProps extends AccessibilityProps, ErrorState {
  id: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
  descriptionId?: string;
  hintId?: string;
}

// 生成唯一的错误ID
export const generateErrorId = (fieldId: string): string => `${fieldId}-error`;

// 生成唯一的描述ID
export const generateDescriptionId = (fieldId: string): string => `${fieldId}-description`;

// 生成唯一的提示ID
export const generateHintId = (fieldId: string): string => `${fieldId}-hint`;

// 无障碍访问包装器组件
export const AccessibleFieldWrapper: React.FC<{
  fieldProps: FormFieldAccessibilityProps;
  children: React.ReactNode;
  className?: string;
}> = ({ fieldProps, children, className }) => {
  const {
    id,
    label,
    description,
    required,
    disabled,
    readOnly,
    hint,
    hasError,
    errorMessage,
    errorId = generateErrorId(id),
    descriptionId = generateDescriptionId(id),
    hintId = generateHintId(id),
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    ...restProps
  } = fieldProps;

  // 构建 aria-describedby 属性
  const describedBy = React.useMemo(() => {
    const ids: string[] = [];

    if (description) ids.push(descriptionId);
    if (hint) ids.push(hintId);
    if (hasError && errorMessage) ids.push(errorId);
    if (ariaDescribedby) ids.push(ariaDescribedby);

    return ids.length > 0 ? ids.join(' ') : undefined;
  }, [description, hint, hasError, errorMessage, errorId, descriptionId, hintId, ariaDescribedby]);

  // 克隆子元素并注入无障碍访问属性
  const childWithProps = React.useMemo(() => {
    if (!React.isValidElement(children)) return children;

    return React.cloneElement(children as React.ReactElement<any>, {
      id,
      'aria-invalid': hasError,
      'aria-errormessage': hasError ? errorId : undefined,
      'aria-describedby': describedBy,
      'aria-required': required,
      'aria-disabled': disabled,
      'aria-readonly': readOnly,
      'aria-labelledby': ariaLabelledby,
      disabled,
      readOnly,
      required,
      ...restProps,
    });
  }, [children, id, hasError, errorId, describedBy, required, disabled, readOnly, ariaLabelledby, restProps]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标签 */}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            hasError && 'text-destructive',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
        </label>
      )}

      {/* 子元素（表单控件） */}
      {childWithProps}

      {/* 描述文本 */}
      {description && (
        <p
          id={descriptionId}
          className={cn('text-sm text-muted-foreground', disabled && 'opacity-50')}
        >
          {description}
        </p>
      )}

      {/* 提示文本 */}
      {hint && (
        <p
          id={hintId}
          className={cn('text-sm text-muted-foreground', disabled && 'opacity-50')}
        >
          {hint}
        </p>
      )}

      {/* 错误消息 */}
      {hasError && errorMessage && (
        <p
          id={errorId}
          className="text-sm text-destructive font-medium"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

// 键盘导航钩子
export const useKeyboardNavigation = (
  onSubmit?: () => void,
  onCancel?: () => void,
  onReset?: () => void
) => {
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    // 只有在表单级别的按键需要全局处理
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          onSubmit?.();
          break;
        case 'Escape':
          event.preventDefault();
          onCancel?.();
          break;
        case 'r':
          if (event.shiftKey) {
            event.preventDefault();
            onReset?.();
          }
          break;
      }
    }
  }, [onSubmit, onCancel, onReset]);

  return { handleKeyDown };
};

// 焦点管理钩子
export const useFocusManagement = () => {
  const firstInputRef = React.useRef<HTMLElement>(null);
  const lastInputRef = React.useRef<HTMLElement>(null);
  const errorRef = React.useRef<HTMLElement>(null);

  const focusFirstInput = React.useCallback(() => {
    firstInputRef.current?.focus();
  }, []);

  const focusFirstError = React.useCallback(() => {
    errorRef.current?.focus();
  }, []);

  const trapFocus = React.useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const activeElement = document.activeElement;
    if (!activeElement) return;

    if (event.shiftKey) {
      // Shift+Tab: 向前导航
      if (activeElement === firstInputRef.current) {
        event.preventDefault();
        lastInputRef.current?.focus();
      }
    } else {
      // Tab: 向后导航
      if (activeElement === lastInputRef.current) {
        event.preventDefault();
        firstInputRef.current?.focus();
      }
    }
  }, []);

  return {
    firstInputRef,
    lastInputRef,
    errorRef,
    focusFirstInput,
    focusFirstError,
    trapFocus,
  };
};

// 动作描述生成器
export const generateActionDescription = (
  action: string,
  fieldType: string,
  fieldLabel?: string
): string => {
  const descriptions: Record<string, string> = {
    text: '输入文本',
    number: '输入数字',
    email: '输入邮箱地址',
    url: '输入网址',
    date: '选择日期',
    checkbox: '选择选项',
    select: '选择一个选项',
    textarea: '输入多行文本',
  };

  const fieldDescription = descriptions[fieldType] || '填写字段';
  const labelPart = fieldLabel ? ` "${fieldLabel}"` : '';

  switch (action) {
    case 'focus':
      return `正在${fieldDescription}${labelPart}`;
    case 'change':
      return `已更改${fieldDescription}${labelPart}`;
    case 'error':
      return `${fieldDescription}${labelPart}有错误`;
    case 'success':
      return `${fieldDescription}${labelPart}验证通过`;
    default:
      return fieldDescription + labelPart;
  }
};

// 屏幕阅读器公告组件
export const ScreenReaderAnnouncement: React.FC<{
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  timeout?: number;
}> = ({ message, politeness = 'polite', timeout = 5000 }) => {
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    setAnnouncement(message);
    const timer = setTimeout(() => setAnnouncement(''), timeout);
    return () => clearTimeout(timer);
  }, [message, timeout]);

  if (!announcement) return null;

  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// 快捷键帮助组件
export const KeyboardShortcutsHelp: React.FC<{
  shortcuts: Array<{
    key: string;
    description: string;
    category?: string;
  }>;
}> = ({ shortcuts }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const groupedShortcuts = React.useMemo(() => {
    const groups: Record<string, Array<{ key: string; description: string }>> = {};

    shortcuts.forEach(shortcut => {
      const category = shortcut.category || '通用';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        key: shortcut.key,
        description: shortcut.description,
      });
    });

    return groups;
  }, [shortcuts]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted-foreground hover:text-foreground underline"
        aria-expanded={isOpen}
        aria-controls="keyboard-shortcuts"
      >
        键盘快捷键
      </button>

      {isOpen && (
        <div
          id="keyboard-shortcuts"
          className="absolute z-50 mt-2 w-80 bg-background border rounded-md shadow-lg p-4"
        >
          <h3 className="font-medium mb-3">键盘快捷键</h3>
          <div className="space-y-3">
            {Object.entries(groupedShortcuts).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {category}
                </h4>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">
                        {item.key}
                      </kbd>
                      <span className="text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};