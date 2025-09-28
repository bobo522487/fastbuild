'use client';

import React from 'react';
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form';
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
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Keyboard,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Enter,
  Escape,
  Tab
} from 'lucide-react';

import type {
  FormMetadata,
  FormField as FormFieldType,
  ValidationResult,
} from '@workspace/types';

interface KeyboardNavigableFormProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  formId?: string;
  enableKeyboardShortcuts?: boolean;
  enableFocusManagement?: boolean;
}

// 键盘导航管理器
class KeyboardNavigationManager {
  private formId: string;
  private fieldIds: string[] = [];
  private currentFocusIndex: number = -1;
  private shortcuts: Map<string, () => void> = new Map();

  constructor(formId: string) {
    this.formId = formId;
    this.initializeKeyboardListeners();
  }

  registerField(fieldId: string): void {
    if (!this.fieldIds.includes(fieldId)) {
      this.fieldIds.push(fieldId);
    }
  }

  unregisterField(fieldId: string): void {
    const index = this.fieldIds.indexOf(fieldId);
    if (index > -1) {
      this.fieldIds.splice(index, 1);
      if (this.currentFocusIndex >= index && this.currentFocusIndex > 0) {
        this.currentFocusIndex--;
      }
    }
  }

  focusNextField(): void {
    if (this.fieldIds.length === 0) return;

    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.fieldIds.length;
    this.focusCurrentField();
  }

  focusPreviousField(): void {
    if (this.fieldIds.length === 0) return;

    this.currentFocusIndex = this.currentFocusIndex <= 0
      ? this.fieldIds.length - 1
      : this.currentFocusIndex - 1;
    this.focusCurrentField();
  }

  focusFirstField(): void {
    if (this.fieldIds.length === 0) return;
    this.currentFocusIndex = 0;
    this.focusCurrentField();
  }

  focusLastField(): void {
    if (this.fieldIds.length === 0) return;
    this.currentFocusIndex = this.fieldIds.length - 1;
    this.focusCurrentField();
  }

  private focusCurrentField(): void {
    const fieldId = this.fieldIds[this.currentFocusIndex];
    if (fieldId) {
      const element = document.getElementById(`${this.formId}-${fieldId}`);
      if (element) {
        element.focus();
        this.announceFocusChange(fieldId);
      }
    }
  }

  private announceFocusChange(fieldId: string): void {
    // 为屏幕阅读器宣布焦点变化
    const announcer = document.getElementById(`${this.formId}-announcer`);
    if (announcer) {
      announcer.textContent = `已移动到字段: ${fieldId}`;
    }
  }

  registerShortcut(key: string, callback: () => void): void {
    this.shortcuts.set(key.toLowerCase(), callback);
  }

  private initializeKeyboardListeners(): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在表单区域内处理键盘事件
      const formElement = document.getElementById(this.formId);
      if (!formElement || !formElement.contains(document.activeElement)) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrlKey = event.ctrlKey || event.metaKey;

      // 处理快捷键
      if (this.shortcuts.has(key)) {
        if (key === 'enter' && document.activeElement?.tagName === 'BUTTON') {
          return; // 允许按钮的默认 Enter 行为
        }

        event.preventDefault();
        this.shortcuts.get(key)!();
        return;
      }

      // 处理导航键
      switch (key) {
        case 'tab':
          // Tab 键的默认行为已经可以处理，但我们可以添加特殊逻辑
          if (event.shiftKey) {
            // Shift+Tab: 向后导航
            setTimeout(() => this.updateFocusIndex(), 0);
          } else {
            // Tab: 向前导航
            setTimeout(() => this.updateFocusIndex(), 0);
          }
          break;

        case 'arrowdown':
          if (!this.isInputField(document.activeElement)) {
            event.preventDefault();
            this.focusNextField();
          }
          break;

        case 'arrowup':
          if (!this.isInputField(document.activeElement)) {
            event.preventDefault();
            this.focusPreviousField();
          }
          break;

        case 'enter':
          if (document.activeElement?.tagName !== 'BUTTON' &&
              document.activeElement?.tagName !== 'TEXTAREA') {
            event.preventDefault();
            this.focusNextField();
          }
          break;

        case 'escape':
          // ESC: 返回第一个字段
          event.preventDefault();
          this.focusFirstField();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  private updateFocusIndex(): void {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    const fieldId = activeElement.id.replace(`${this.formId}-`, '');
    const index = this.fieldIds.indexOf(fieldId);
    if (index !== -1) {
      this.currentFocusIndex = index;
    }
  }

  private isInputField(element: Element | null): boolean {
    if (!element) return false;
    const tagName = element.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  getNavigationSummary(): {
    totalFields: number;
    currentIndex: number;
    currentField: string | null;
  } {
    return {
      totalFields: this.fieldIds.length,
      currentIndex: this.currentFocusIndex,
      currentField: this.fieldIds[this.currentFocusIndex] || null,
    };
  }

  destroy(): void {
    this.fieldIds = [];
    this.shortcuts.clear();
    this.currentFocusIndex = -1;
  }
}

// 键盘导航字段组件
interface KeyboardNavigableFieldProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  formId: string;
  navigationManager: KeyboardNavigationManager;
  onFocusChange?: (fieldId: string, isFocused: boolean) => void;
}

function KeyboardNavigableField({
  field,
  form,
  isVisible = true,
  formId,
  navigationManager,
  onFocusChange,
}: KeyboardNavigableFieldProps) {
  const fieldId = `${formId}-${field.name}`;
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (isVisible) {
      navigationManager.registerField(field.name);
    } else {
      navigationManager.unregisterField(field.name);
    }

    return () => {
      navigationManager.unregisterField(field.name);
    };
  }, [isVisible, field.name, navigationManager]);

  const handleFocus = React.useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(field.name, true);
  }, [field.name, onFocusChange]);

  const handleBlur = React.useCallback(() => {
    setIsFocused(false);
    onFocusChange?.(field.name, false);
  }, [field.name, onFocusChange]);

  // 键盘事件处理
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        if (field.type !== 'textarea' && field.type !== 'select') {
          event.preventDefault();
          navigationManager.focusNextField();
        }
        break;

      case 'ArrowDown':
        if (field.type === 'select') {
          // 允许 Select 组件处理方向键
          return;
        }
        event.preventDefault();
        navigationManager.focusNextField();
        break;

      case 'ArrowUp':
        if (field.type === 'select') {
          // 允许 Select 组件处理方向键
          return;
        }
        event.preventDefault();
        navigationManager.focusPreviousField();
        break;
    }
  }, [field.type, navigationManager]);

  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);
  const hasError = !!fieldState.error;

  // 渲染字段输入控件
  const renderFormControl = () => {
    const commonProps = {
      id: fieldId,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: cn(
        'transition-all duration-200',
        isFocused && 'ring-2 ring-primary ring-offset-2',
        hasError && 'border-destructive focus-visible:ring-destructive'
      ),
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            {...form.register(field.name)}
            type="text"
            placeholder={field.placeholder}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : `${fieldId}-description`}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            {...form.register(field.name)}
            type="number"
            placeholder={field.placeholder}
            onChange={(e) => {
              const value = e.target.value;
              form.setValue(field.name, value === '' ? '' : Number(value), {
                shouldValidate: true,
              });
            }}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            {...form.register(field.name)}
            placeholder={field.placeholder}
            rows={4}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : `${fieldId}-description`}
          />
        );

      case 'select':
        return (
          <Select
            onValueChange={(value) => {
              form.setValue(field.name, value, { shouldValidate: true });
            }}
            defaultValue={form.getValues(field.name)}
          >
            <SelectTrigger
              id={fieldId}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
            >
              <SelectValue
                placeholder={field.placeholder || '请选择...'}
                aria-invalid={hasError}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-start space-x-3">
            <Checkbox
              id={fieldId}
              checked={form.getValues(field.name) || false}
              onCheckedChange={(checked) => {
                form.setValue(field.name, checked, { shouldValidate: true });
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <div className="space-y-1 leading-none">
              <FormLabel
                htmlFor={fieldId}
                className={cn(
                  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  hasError && 'text-destructive'
                )}
              >
                {field.label}
                {field.required && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">
                    必填
                  </Badge>
                )}
              </FormLabel>
              {field.placeholder && (
                <FormDescription id={`${fieldId}-description`} className="text-xs">
                  {field.placeholder}
                </FormDescription>
              )}
            </div>
          </div>
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            {...form.register(field.name)}
            type="date"
            placeholder={field.placeholder}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : `${fieldId}-description`}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            {...form.register(field.name)}
            type="text"
            placeholder={field.placeholder}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : `${fieldId}-description`}
          />
        );
    }
  };

  // 复选框使用不同的布局
  if (field.type === 'checkbox') {
    return (
      <FormItem className="space-y-3">
        {renderFormControl()}
        {hasError && (
          <FormMessage
            id={`${fieldId}-error`}
            className="text-sm font-medium text-destructive"
            role="alert"
            aria-live="polite"
          />
        )}
      </FormItem>
    );
  }

  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="space-y-2">
          <FormLabel
            htmlFor={fieldId}
            className={cn(
              'text-sm font-medium',
              hasError && 'text-destructive'
            )}
          >
            {field.label}
            {field.required && (
              <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">
                必填
              </Badge>
            )}
          </FormLabel>
          <FormControl>
            {renderFormControl()}
          </FormControl>
          {field.placeholder && field.type !== 'select' && (
            <FormDescription id={`${fieldId}-description`} className="text-xs">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage
            id={`${fieldId}-error`}
            className="text-sm font-medium"
            role="alert"
            aria-live="polite"
          />
        </FormItem>
      )}
    />
  );
}

// 键盘快捷键提示组件
function KeyboardShortcutsHelp({ navigationManager }: { navigationManager: KeyboardNavigationManager }) {
  const shortcuts = [
    { key: 'Tab', description: '移动到下一个字段' },
    { key: 'Shift+Tab', description: '移动到上一个字段' },
    { key: 'Enter', description: '移动到下一个字段（除文本区域外）' },
    { key: '↑/↓', description: '在字段间导航' },
    { key: 'Ctrl/Cmd + Enter', description: '提交表单' },
    { key: 'Esc', description: '返回第一个字段' },
  ];

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          键盘快捷键
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div>当前导航状态:</div>
          <div className="mt-1 font-mono text-xs">
            {navigationManager.getNavigationSummary().currentField
              ? `字段 ${navigationManager.getNavigationSummary().currentIndex + 1}/${navigationManager.getNavigationSummary().totalFields}`
              : '无活动字段'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 主要的键盘导航表单组件
export function KeyboardNavigableForm({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  formId = 'keyboard-navigable-form',
  enableKeyboardShortcuts = true,
  enableFocusManagement = true,
}: KeyboardNavigableFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  // 创建导航管理器
  const navigationManager = React.useMemo(
    () => new KeyboardNavigationManager(formId),
    [formId]
  );

  // 动态构建 Zod Schema
  const schema = React.useMemo(() => {
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
    mode: 'onChange',
    reValidateMode: 'onChange',
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
      if (!field.condition) {
        visibility[field.id] = true;
        return;
      }

      const condition = field.condition;
      const conditionValue = values[condition.fieldId];

      let isVisible = false;

      if (conditionValue === undefined) {
        isVisible = false;
      } else {
        switch (condition.operator) {
          case 'equals':
            isVisible = conditionValue === condition.value;
            break;
          case 'not_equals':
            isVisible = conditionValue !== condition.value;
            break;
          case 'greater_than':
            isVisible = Number(conditionValue) > Number(condition.value);
            break;
          case 'less_than':
            isVisible = Number(conditionValue) < Number(condition.value);
            break;
          case 'greater_than_or_equal':
            isVisible = Number(conditionValue) >= Number(condition.value);
            break;
          case 'less_than_or_equal':
            isVisible = Number(conditionValue) <= Number(condition.value);
            break;
          case 'contains':
            isVisible = String(conditionValue).includes(String(condition.value));
            break;
          case 'not_empty':
            isVisible = conditionValue !== null && conditionValue !== undefined && conditionValue !== '';
            break;
          default:
            isVisible = false;
        }
      }

      visibility[field.id] = isVisible;
    });

    return visibility;
  }, [form, metadata]);

  // 注册键盘快捷键
  React.useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleSubmit = () => {
      form.handleSubmit(handleSubmit)();
    };

    const shortcuts = [
      { key: 'enter', ctrl: true, callback: handleSubmit },
      { key: '?', ctrl: false, callback: () => setShowShortcuts(v => !v) },
      { key: 'h', ctrl: false, callback: () => setShowShortcuts(v => !v) },
    ];

    shortcuts.forEach(({ key, ctrl, callback }) => {
      navigationManager.registerShortcut(key, callback);
    });

    return () => {
      shortcuts.forEach(({ key }) => {
        navigationManager.registerShortcut(key, () => {});
      });
    };
  }, [form, navigationManager, enableKeyboardShortcuts]);

  // 处理表单提交
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);

    try {
      await onSubmit(data);
      form.reset();
      // 提交成功后聚焦到第一个字段
      setTimeout(() => navigationManager.focusFirstField(), 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理字段焦点变化
  const handleFieldFocusChange = React.useCallback((fieldId: string, isFocused: boolean) => {
    setFocusedField(isFocused ? fieldId : null);
  }, []);

  // 计算表单验证状态
  const formValidationStatus = React.useMemo(() => {
    const { isValid, isDirty, errors } = form.formState;
    const errorCount = Object.keys(errors).length;

    return {
      isValid,
      isDirty,
      errorCount,
    };
  }, [form]);

  // 清理导航管理器
  React.useEffect(() => {
    return () => {
      navigationManager.destroy();
    };
  }, [navigationManager]);

  return (
    <div className="relative">
      {/* 键盘快捷键帮助面板 */}
      {showShortcuts && (
        <div className="fixed top-4 right-4 z-50 shadow-lg">
          <KeyboardShortcutsHelp navigationManager={navigationManager} />
        </div>
      )}

      {/* 屏幕阅读器公告器 */}
      <div
        id={`${formId}-announcer`}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <Card className={cn('w-full max-w-2xl mx-auto', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle id={`${formId}-title`} className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                键盘导航表单
              </CardTitle>
              <CardDescription>
                版本 {metadata.version} • {metadata.fields.length} 个字段
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShortcuts(v => !v)}
              className="flex items-center gap-1"
            >
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">?</kbd>
              帮助
            </Button>
          </div>

          {/* 键盘导航状态 */}
          {enableFocusManagement && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                键盘导航已启用
              </Badge>
              {focusedField && (
                <span className="text-xs">
                  当前字段: {focusedField}
                </span>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              id={formId}
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
              noValidate
              aria-labelledby={`${formId}-title`}
            >
              {/* 渲染所有字段 */}
              {metadata.fields.map((field) => (
                <KeyboardNavigableField
                  key={field.id}
                  field={field}
                  form={form}
                  isVisible={fieldVisibility[field.id]}
                  formId={formId}
                  navigationManager={navigationManager}
                  onFocusChange={handleFieldFocusChange}
                />
              ))}

              {/* 提交按钮区域 */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={!formValidationStatus.isValid || isSubmitting || isLoading}
                  className="flex-1"
                  aria-describedby={
                    !formValidationStatus.isValid
                      ? `${formId}-submit-disabled-reason`
                      : undefined
                  }
                >
                  {isSubmitting || isLoading ? '提交中...' : '提交表单'}
                </Button>

                {/* 快捷操作按钮 */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigationManager.focusFirstField()}
                    title="移动到第一个字段 (Esc)"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.reset()}
                    title="重置表单"
                  >
                    重置
                  </Button>
                </div>

                {!formValidationStatus.isValid && (
                  <div
                    id={`${formId}-submit-disabled-reason`}
                    className="text-sm text-muted-foreground sm:text-left"
                  >
                    请修正表单错误后提交
                  </div>
                )}
              </div>

              {/* 键盘导航提示 */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-3 w-3" />
                  键盘导航提示:
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div><kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> 下一个字段</div>
                  <div><kbd className="px-1 py-0.5 bg-muted rounded">Shift+Tab</kbd> 上一个字段</div>
                  <div><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> 下一个字段</div>
                  <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+Enter</kbd> 提交表单</div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export type { KeyboardNavigableFormProps };