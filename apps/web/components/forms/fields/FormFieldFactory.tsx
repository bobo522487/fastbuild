'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';

import { StandardTextField } from './StandardTextField';
import { Textarea } from '@workspace/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';
import { Calendar } from '@workspace/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { CalendarIcon } from 'lucide-react';
// import { format } from 'date-fns';

// 临时日期格式化函数
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN');
};
import { cn } from '@workspace/ui/lib/utils';

import {
  FormControl,
  FormDescription,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import type {
  FormField as FormFieldType,
} from '@workspace/types';

interface FormFieldFactoryProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
}

// 简化的日期字段组件
const DateFieldComponent = React.memo(({
  field,
  form
}: {
  field: FormFieldType;
  form: UseFormReturn<any>
}) => {
  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="flex items-center gap-2 text-sm font-medium">
            {field.label}
            {field.required && (
              <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                必填
              </Badge>
            )}
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <div
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    !formField.value && "text-muted-foreground"
                  )}
                >
                  {formField.value ? (
                    formatDate(new Date(formField.value))
                  ) : (
                    <span className="text-muted-foreground">选择日期</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </div>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formField.value ? new Date(formField.value) : undefined}
                onSelect={formField.onChange}
                disabled={(date: Date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

DateFieldComponent.displayName = 'DateFieldComponent';

// 数字字段组件
const NumberFieldComponent = React.memo(({
  field,
  form
}: {
  field: FormFieldType;
  form: UseFormReturn<any>
}) => {
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
          </div>
          <FormControl>
            <Input
              type="number"
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              onChange={(e) => formField.onChange(e.target.valueAsNumber)}
              className="transition-colors duration-200"
              disabled={form.formState.isSubmitting}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

NumberFieldComponent.displayName = 'NumberFieldComponent';

// 选择字段组件
const SelectFieldComponent = React.memo(({
  field,
  form
}: {
  field: FormFieldType;
  form: UseFormReturn<any>
}) => {
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
          </div>
          <Select onValueChange={formField.onChange} defaultValue={formField.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "选择选项"} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

SelectFieldComponent.displayName = 'SelectFieldComponent';

// 复选框字段组件
const CheckboxFieldComponent = React.memo(({
  field,
  form
}: {
  field: FormFieldType;
  form: UseFormReturn<any>
}) => {
  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox
              checked={formField.value}
              onCheckedChange={formField.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="flex items-center gap-2 text-sm font-medium">
              {field.label}
              {field.required && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                  必填
                </Badge>
              )}
            </FormLabel>
            {field.placeholder && (
              <FormDescription className="text-xs text-muted-foreground">
                {field.placeholder}
              </FormDescription>
            )}
          </div>
        </FormItem>
      )}
    />
  );
});

CheckboxFieldComponent.displayName = 'CheckboxFieldComponent';

// 文本区域字段组件
const TextareaFieldComponent = React.memo(({
  field,
  form
}: {
  field: FormFieldType;
  form: UseFormReturn<any>
}) => {
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
          </div>
          <FormControl>
            <Textarea
              placeholder={field.placeholder}
              {...formField}
              value={formField.value || ''}
              className="transition-colors duration-200 resize-none"
              disabled={form.formState.isSubmitting}
              rows={3}
            />
          </FormControl>
          {field.placeholder && (
            <FormDescription className="text-xs text-muted-foreground">
              {field.placeholder}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});

TextareaFieldComponent.displayName = 'TextareaFieldComponent';

export const FormFieldFactory = React.memo(({
  field,
  form,
  isVisible = true
}: FormFieldFactoryProps) => {
  if (!isVisible) {
    return null;
  }

  switch (field.type) {
    case 'text':
      return <StandardTextField field={field} form={form} isVisible={isVisible} />;

    case 'textarea':
      return <TextareaFieldComponent field={field} form={form} />;

    case 'number':
      return <NumberFieldComponent field={field} form={form} />;

    case 'select':
      return <SelectFieldComponent field={field} form={form} />;

    case 'checkbox':
      return <CheckboxFieldComponent field={field} form={form} />;

    case 'date':
      return <DateFieldComponent field={field} form={form} />;

    default:
      console.warn(`Unsupported field type: ${field.type}`);
      return null;
  }
});

FormFieldFactory.displayName = 'FormFieldFactory';