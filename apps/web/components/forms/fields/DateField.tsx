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
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle, Calendar, CalendarDays } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface DateFieldProps {
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
    required: '请选择日期',
    invalid_type: '日期格式无效',
    invalid_string: '日期字符串格式不正确',
    invalid_date: '日期无效',
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
      {error.type === 'invalid_string' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.invalid_string}
        </p>
      )}
      {error.type === 'invalid_date' && (
        <p className="text-xs text-muted-foreground">
          {errorMessages.invalid_date}
        </p>
      )}
    </div>
  );
});

EnhancedFormMessage.displayName = 'EnhancedFormMessage';

// 日期格式化工具
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateString: string): Date | null => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// 智能日期选择器
const SmartDatePicker = React.memo(({
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
  error,
}: {
  value: string;
  onChange: (dateString: string) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  error?: boolean;
}) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // 点击外部关闭选择器
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 生成日历
  const generateCalendar = React.useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDate = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push({
          date: new Date(currentDate),
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.toDateString() === new Date().toDateString(),
          isSelected: currentDate.toDateString() === parseDate(value)?.toDateString(),
          isDisabled: currentDate < minDate || currentDate > maxDate,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    return calendar;
  }, [currentMonth, value, minDate, maxDate]);

  const calendar = generateCalendar();

  // 快捷选择按钮
  const quickSelectButtons = React.useMemo(() => [
    { label: '今天', days: 0 },
    { label: '明天', days: 1 },
    { label: '本周', days: 0, isWeek: true },
    { label: '下周', days: 7, isWeek: true },
  ], []);

  const handleQuickSelect = React.useCallback((days: number, isWeek: boolean = false) => {
    const selectedDate = new Date();
    if (isWeek) {
      selectedDate.setDate(selectedDate.getDate() + days);
      // 设置到本周第一天
      selectedDate.setDate(selectedDate.getDate() - selectedDate.getDay());
    } else {
      selectedDate.setDate(selectedDate.getDate() + days);
    }
    onChange(formatDate(selectedDate));
    setShowPicker(false);
  }, [onChange]);

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center space-x-2">
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={minDate ? formatDate(minDate) : undefined}
          max={maxDate ? formatDate(maxDate) : undefined}
          className={cn(
            'flex-1',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          disabled={disabled}
          className="px-2"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>

      {showPicker && (
        <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
          {/* 快捷选择 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {quickSelectButtons.map((button) => (
              <Button
                key={button.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect(button.days, button.isWeek)}
                className="text-xs h-7"
              >
                {button.label}
              </Button>
            ))}
          </div>

          {/* 日历头部 */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
            >
              &lt;
            </Button>
            <div className="font-medium">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCurrentMonth(newMonth);
              }}
            >
              &gt;
            </Button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-1">
            {calendar.flat().map((day, index) => (
              <Button
                key={index}
                type="button"
                variant={day.isSelected ? 'default' : 'ghost'}
                size="sm"
                disabled={day.isDisabled}
                onClick={() => {
                  onChange(formatDate(day.date));
                  setShowPicker(false);
                }}
                className={cn(
                  'h-8 text-xs',
                  !day.isCurrentMonth && 'text-muted-foreground',
                  day.isToday && 'border border-blue-500',
                  day.isSelected && 'bg-primary text-primary-foreground'
                )}
              >
                {day.date.getDate()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SmartDatePicker.displayName = 'SmartDatePicker';

export const DateField = React.memo(({ field, form, isVisible = true }: DateFieldProps) => {
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);
  const currentValue = React.useMemo(() => form.getValues(field.name), [form, field.name]);

  // 解析验证规则
  const validationRules = React.useMemo(() => {
    const rules: { minDate?: Date; maxDate?: Date } = {};
    if (field.validation?.min) {
      rules.minDate = new Date(field.validation.min);
    }
    if (field.validation?.max) {
      rules.maxDate = new Date(field.validation.max);
    }
    return rules;
  }, [field.validation]);

  // 格式化显示日期
  const formattedDate = React.useMemo(() => {
    if (!currentValue) return '';
    const date = parseDate(currentValue);
    if (!date) return currentValue;

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('zh-CN', options);
  }, [currentValue]);

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
              <Calendar className="h-4 w-4" />
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
            <SmartDatePicker
              value={formField.value || ''}
              onChange={formField.onChange}
              disabled={form.formState.isSubmitting}
              minDate={validationRules.minDate}
              maxDate={validationRules.maxDate}
              error={!!fieldState.error}
            />
          </FormControl>

          {/* 格式化日期显示 */}
          {formattedDate && (
            <FormDescription className="text-xs text-blue-600">
              {formattedDate}
            </FormDescription>
          )}

          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}

          {/* 日期范围提示 */}
          {(validationRules.minDate || validationRules.maxDate) && (
            <FormDescription className="text-xs text-orange-600">
              日期范围: {validationRules.minDate ? formatDate(validationRules.minDate) : '不限'}
              {' ~ '}
              {validationRules.maxDate ? formatDate(validationRules.maxDate) : '不限'}
            </FormDescription>
          )}

          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  );
});

DateField.displayName = 'DateField';