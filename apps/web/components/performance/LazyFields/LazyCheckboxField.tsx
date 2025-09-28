'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@workspace/ui/components/checkbox';

interface LazyCheckboxFieldProps {
  field: {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: boolean;
  };
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const LazyCheckboxField = React.memo<LazyCheckboxFieldProps>(({
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
    <div className="flex items-center space-x-2">
      <Checkbox
        id={field.id}
        checked={field.defaultValue || false}
        onCheckedChange={(checked) => form.setValue(field.name, checked, { shouldValidate: true })}
        className={fieldState.error ? 'border-red-500' : ''}
      />
      <label htmlFor={field.id} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {fieldState.error && (
        <p className="text-xs text-red-500">{fieldState.error.message}</p>
      )}
    </div>
  );
});

LazyCheckboxField.displayName = 'LazyCheckboxField';