'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@workspace/ui/components/input';

interface LazyTextFieldProps {
  field: {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: string;
  };
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const LazyTextField = React.memo<LazyTextFieldProps>(({
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
      <Input
        placeholder={field.placeholder}
        {...form.register(field.name)}
        defaultValue={field.defaultValue}
        className={fieldState.error ? 'border-red-500' : ''}
      />
      {fieldState.error && (
        <p className="text-xs text-red-500">{fieldState.error.message}</p>
      )}
    </div>
  );
});

LazyTextField.displayName = 'LazyTextField';