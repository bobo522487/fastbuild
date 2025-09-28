'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

interface LazySelectFieldProps {
  field: {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: string;
    options?: Array<{ label: string; value: string }>;
  };
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const LazySelectField = React.memo<LazySelectFieldProps>(({
  field,
  form,
  isVisible = true,
  onVisibilityChange
}) => {
  React.useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);

  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Select
        onValueChange={(value) => form.setValue(field.name, value, { shouldValidate: true })}
        defaultValue={field.defaultValue}
      >
        <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
          <SelectValue placeholder={field.placeholder || '请选择...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fieldState.error && (
        <p className="text-xs text-red-500">{fieldState.error.message}</p>
      )}
    </div>
  );
});

LazySelectField.displayName = 'LazySelectField';