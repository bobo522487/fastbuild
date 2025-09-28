'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { cn } from '@workspace/ui/lib/utils';
import {
  AccessibleFieldWrapper,
  FormFieldAccessibilityProps,
  generateActionDescription,
  ScreenReaderAnnouncement,
} from '../accessibility/AccessibilityWrapper';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface AccessibleSelectFieldProps extends Omit<FormFieldAccessibilityProps, 'id'> {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  onChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  fieldId: string;
  maxVisibleOptions?: number;
  groupBy?: (option: SelectOption) => string;
}

export const AccessibleSelectField: React.FC<AccessibleSelectFieldProps> = ({
  fieldId,
  options,
  value,
  defaultValue,
  placeholder = '请选择...',
  searchable = false,
  multiple = false,
  onChange,
  onOpenChange,
  maxVisibleOptions = 6,
  groupBy,
  ...fieldProps
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [announcement, setAnnouncement] = React.useState('');
  const selectTriggerRef = React.useRef<HTMLButtonElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options;

    const term = searchTerm.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term)
    );
  }, [options, searchable, searchTerm]);

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { '': filteredOptions };

    const groups: Record<string, SelectOption[]> = {};
    filteredOptions.forEach(option => {
      const group = groupBy(option);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(option);
    });

    return groups;
  }, [filteredOptions, groupBy]);

  const handleValueChange = React.useCallback((newValue: string) => {
    onChange?.(newValue);

    // 找到选中的选项
    const selectedOption = options.find(opt => opt.value === newValue);
    if (selectedOption) {
      setAnnouncement(`已选择: ${selectedOption.label}`);
    }
  }, [onChange, options]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    setSearchTerm(''); // 清空搜索词

    if (open) {
      setAnnouncement('下拉菜单已打开');

      // 搜索模式下聚焦到搜索框
      if (searchable) {
        setTimeout(() => {
          const searchInput = document.querySelector(
            `[data-select-search="${fieldId}"]`
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 0);
      }
    } else {
      setAnnouncement('下拉菜单已关闭');

      // 关闭时重新聚焦到触发器
      setTimeout(() => {
        selectTriggerRef.current?.focus();
      }, 0);
    }
  }, [onOpenChange, searchable, fieldId]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      // 空格键、回车键、向下箭头：打开下拉菜单
      if ([' ', 'Enter', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        handleOpenChange(true);
      }
      return;
    }

    // 下拉菜单打开时的键盘导航
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        handleOpenChange(false);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        // 这些键由 Select 组件内部处理
        break;
      case 'Home':
      case 'End':
        // 跳转到第一个/最后一个选项
        event.preventDefault();
        // 这里需要 Select 组件支持这些键
        break;
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          // Ctrl+A: 全选（多选模式）
          if (multiple) {
            event.preventDefault();
            // 实现全选逻辑
          }
        }
        break;
    }
  }, [isOpen, handleOpenChange, multiple]);

  const handleSearch = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);

    // 公告搜索结果数量
    const resultCount = filteredOptions.length;
    if (resultCount <= 10) {
      setAnnouncement(`找到 ${resultCount} 个选项`);
    }
  }, [filteredOptions.length]);

  const visibleOptions = React.useMemo(() => {
    const allOptions = Object.values(groupedOptions).flat();
    return maxVisibleOptions > 0 ? allOptions.slice(0, maxVisibleOptions) : allOptions;
  }, [groupedOptions, maxVisibleOptions]);

  return (
    <AccessibleFieldWrapper fieldProps={{ ...fieldProps, id: fieldId }}>
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        onOpenChange={handleOpenChange}
        disabled={fieldProps.disabled}
        required={fieldProps.required}
      >
        <SelectTrigger
          ref={selectTriggerRef}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onKeyDown={handleKeyDown}
          className={cn(
            fieldProps.hasError && 'border-destructive focus-visible:ring-destructive'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent
          className="max-h-80"
          position="popper"
          sideOffset={4}
        >
          {searchable && (
            <div className="p-2 border-b">
              <input
                type="text"
                data-select-search={fieldId}
                placeholder="搜索选项..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="搜索选项"
                autoComplete="off"
              />
            </div>
          )}

          {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
            <div key={groupName}>
              {groupName && (
                <div
                  className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted"
                  role="presentation"
                >
                  {groupName}
                </div>
              )}

              {groupOptions.slice(0, maxVisibleOptions).map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  aria-describedby={option.description ? `${fieldId}-desc-${option.value}` : undefined}
                  className="text-sm"
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span
                        id={`${fieldId}-desc-${option.value}`}
                        className="text-xs text-muted-foreground"
                      >
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}

              {groupName && groupOptions.length > maxVisibleOptions && (
                <div className="px-2 py-1 text-xs text-muted-foreground italic">
                  还有 {groupOptions.length - maxVisibleOptions} 个选项...
                </div>
              )}
            </div>
          ))}

          {filteredOptions.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {searchTerm ? '没有找到匹配的选项' : '没有可选选项'}
            </div>
          )}

          {visibleOptions.length !== filteredOptions.length && (
            <div className="px-2 py-1 text-xs text-muted-foreground border-t text-center">
              共 {filteredOptions.length} 个选项
            </div>
          )}
        </SelectContent>
      </Select>

      {/* 屏幕阅读器公告 */}
      <ScreenReaderAnnouncement message={announcement} politeness="polite" />
    </AccessibleFieldWrapper>
  );
};