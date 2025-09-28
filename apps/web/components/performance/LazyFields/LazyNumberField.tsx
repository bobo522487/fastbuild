'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@workspace/ui/components/input';

interface LazyNumberFieldProps {
  field: {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: number;
  };
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const LazyNumberField = React.memo<LazyNumberFieldProps>(({
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

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numberValue = value === '' ? '' : Number(value);
    form.setValue(field.name, numberValue, { shouldValidate: true });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type="number"
        placeholder={field.placeholder}
        defaultValue={field.defaultValue}
        onChange={handleNumberChange}
        className={fieldState.error ? 'border-red-500' : ''}
      />
      {fieldState.error && (
        <p className="text-xs text-red-500">{fieldState.error.message}</p>
      )}
    </div>
  );
});

LazyNumberField.displayName = 'LazyNumberField';