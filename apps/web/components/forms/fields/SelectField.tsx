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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

import { Badge } from '@workspace/ui/components/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface SelectFieldProps {
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
    required: '请选择一个选项',
    invalid_type: '选项值无效',
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

// 智能搜索过滤
const useSelectSearch = (options: any[]) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredOptions, setFilteredOptions] = React.useState(options);

  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  return {
    searchTerm,
    setSearchTerm,
    filteredOptions,
  };
};

// 选项分组组件
const OptionGroup = React.memo(({
  group,
  options,
  onSelect,
  selectedValue,
}: {
  group: string;
  options: any[];
  onSelect: (value: string) => void;
  selectedValue?: string;
}) => {
  return (
    <div className="space-y-1">
      <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted">
        {group}
      </div>
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}
          className={cn(
            'cursor-pointer transition-colors',
            selectedValue === option.value && 'bg-primary/10'
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span>{option.label}</span>
            {selectedValue === option.value && (
              <CheckCircle2 className="h-3 w-3 text-primary" />
            )}
          </div>
        </SelectItem>
      ))}
    </div>
  );
});

OptionGroup.displayName = 'OptionGroup';

export const SelectField = React.memo(({ field, form, isVisible = true }: SelectFieldProps) => {
  const fieldState = React.useMemo(() => form.getFieldState(field.name), [form, field.name]);
  const currentValue = React.useMemo(() => form.getValues(field.name), [form, field.name]);

  // 如果选项很多，启用搜索功能
  const enableSearch = (field.options?.length || 0) > 10;
  const { searchTerm, setSearchTerm, filteredOptions } = useSelectSearch(field.options || []);

  // 检查选项是否分组
  const hasGroups = React.useMemo(() => {
    return field.options?.some(opt => opt.group) || false;
  }, [field.options]);

  // 分组选项
  const groupedOptions = React.useMemo(() => {
    if (!hasGroups) return { '': field.options || [] };

    const groups: Record<string, any[]> = {};
    field.options?.forEach(option => {
      const group = option.group || '';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(option);
    });

    return groups;
  }, [field.options, hasGroups]);

  // 优化的样式计算
  const triggerClassName = React.useMemo(() => cn(
    'transition-colors duration-200',
    fieldState.error && 'border-destructive focus-visible:ring-destructive',
    !fieldState.error && fieldState.isDirty && 'border-green-500 focus-visible:ring-green-500',
  ), [fieldState.error, fieldState.isDirty]);

  // 获取当前选中项的标签
  const selectedLabel = React.useMemo(() => {
    const selectedOption = field.options?.find(opt => opt.value === currentValue);
    return selectedOption?.label || '';
  }, [field.options, currentValue]);

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

          <Select
            onValueChange={formField.onChange}
            defaultValue={formField.value}
            value={formField.value}
          >
            <FormControl>
              <SelectTrigger
                className={triggerClassName}
                disabled={form.formState.isSubmitting}
                aria-label={field.label}
                aria-required={field.required}
                aria-invalid={!!fieldState.error}
                aria-describedby={fieldState.error ? `${field.name}-error` : undefined}
              >
                <SelectValue placeholder={field.placeholder || '请选择...'}>
                  {selectedLabel}
                </SelectValue>
              </SelectTrigger>
            </FormControl>

            <SelectContent className="max-h-80">
              {/* 搜索功能 */}
              {enableSearch && (
                <div className="p-2 border-b">
                  <input
                    type="text"
                    placeholder="搜索选项..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* 选项列表 */}
              <div className="max-h-60 overflow-y-auto">
                {hasGroups ? (
                  // 分组显示
                  Object.entries(groupedOptions).map(([group, options]) => (
                    <OptionGroup
                      key={group}
                      group={group || '未分组'}
                      options={filteredOptions.filter(opt =>
                        options.some(orig => orig.value === opt.value)
                      )}
                      onSelect={formField.onChange}
                      selectedValue={formField.value}
                    />
                  ))
                ) : (
                  // 普通列表
                  filteredOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={cn(
                        'cursor-pointer transition-colors',
                        formField.value === option.value && 'bg-primary/10'
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        {formField.value === option.value && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}

                {/* 无搜索结果 */}
                {filteredOptions.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    没有找到匹配的选项
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>

          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}

          {/* 选项计数 */}
          {field.options && field.options.length > 0 && (
            <FormDescription className="text-xs text-blue-600">
              共 {field.options.length} 个选项可选
            </FormDescription>
          )}

          <EnhancedFormMessage field={field} form={form} />
        </FormItem>
      )}
    />
  );
});

SelectField.displayName = 'SelectField';