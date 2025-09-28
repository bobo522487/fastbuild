'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
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
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import type {
  FormMetadata,
  FormField as FormFieldType,
  ValidationResult,
} from '@workspace/types';

interface ResponsiveFormLayoutProps {
  metadata: FormMetadata;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  layout?: 'stacked' | 'inline' | 'grid' | 'steps';
  maxContentWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// 响应式字段组件
interface ResponsiveFormFieldProps {
  field: FormFieldType;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  layout?: 'stacked' | 'inline' | 'grid';
}

function ResponsiveFormField({
  field,
  form,
  isVisible = true,
  layout = 'stacked',
}: ResponsiveFormFieldProps) {
  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);

  // 根据布局和字段类型应用不同的响应式类
  const getResponsiveClasses = () => {
    const baseClasses = 'w-full transition-all duration-200';

    switch (layout) {
      case 'inline':
        return cn(baseClasses, 'min-w-[200px] max-w-md');
      case 'grid':
        return cn(baseClasses, 'col-span-1 md:col-span-2');
      case 'stacked':
      default:
        return cn(baseClasses, 'max-w-none');
    }
  };

  // 渲染字段输入控件
  const renderFormControl = () => {
    const commonProps = {
      ...form.register(field.name),
      className: cn(
        getResponsiveClasses(),
        fieldState.error && 'border-destructive focus-visible:ring-destructive'
      ),
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
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
            placeholder={field.placeholder}
            rows={layout === 'grid' ? 3 : 4}
            className={cn(
              getResponsiveClasses(),
              'resize-none',
              fieldState.error && 'border-destructive focus-visible:ring-destructive'
            )}
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
              className={cn(
                getResponsiveClasses(),
                fieldState.error && 'border-destructive focus-visible:ring-destructive'
              )}
            >
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
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <Checkbox
              checked={form.getValues(field.name) || false}
              onCheckedChange={(checked) => {
                form.setValue(field.name, checked, { shouldValidate: true });
              }}
              className={fieldState.error ? 'border-destructive' : ''}
            />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium">
                  {field.label}
                </FormLabel>
                {field.required && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">
                    必填
                  </Badge>
                )}
              </div>
              {field.placeholder && (
                <FormDescription className="text-xs">
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
            type="date"
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={field.placeholder}
          />
        );
    }
  };

  // 复选框使用不同的布局
  if (field.type === 'checkbox') {
    return (
      <FormItem className="space-y-2">
        {renderFormControl()}
        {fieldState.error && (
          <FormMessage className="text-sm font-medium text-destructive" />
        )}
      </FormItem>
    );
  }

  return (
    <RHFFormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={cn(
          'space-y-2',
          layout === 'inline' && 'flex flex-col sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4',
          layout === 'grid' && 'grid grid-cols-1 md:grid-cols-3 gap-4'
        )}>
          <FormLabel className={cn(
            'text-sm font-medium',
            layout === 'inline' && 'sm:w-32 sm:shrink-0',
            layout === 'grid' && 'md:col-span-1',
            fieldState.error && 'text-destructive'
          )}>
            {field.label}
            {field.required && layout !== 'inline' && (
              <Badge variant="destructive" className="text-xs px-1 py-0 ml-1">
                必填
              </Badge>
            )}
          </FormLabel>
          <div className={cn(
            'flex-1',
            layout === 'grid' && 'md:col-span-2'
          )}>
            <FormControl>
              {renderFormControl()}
            </FormControl>
            {field.placeholder && field.type !== 'select' && (
              <FormDescription className="text-xs mt-1">
                {field.placeholder}
              </FormDescription>
            )}
            <FormMessage className="text-sm font-medium" />
          </div>
        </FormItem>
      )}
    />
  );
}

// 响应式进度指示器
interface ResponsiveProgressIndicatorProps {
  progressPercentage: number;
  requiredFields: number;
  filledRequiredFields: number;
}

function ResponsiveProgressIndicator({
  progressPercentage,
  requiredFields,
  filledRequiredFields,
}: ResponsiveProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      {/* 移动端紧凑视图 */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-sm font-medium">
          {filledRequiredFields}/{requiredFields}
        </span>
        <div className="w-24 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 桌面端详细视图 */}
      <div className="hidden sm:block space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>完成进度</span>
          <span>{filledRequiredFields}/{requiredFields} 必填字段</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// 主要的响应式表单布局组件
export function ResponsiveFormLayout({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  layout = 'stacked',
  maxContentWidth = 'lg',
}: ResponsiveFormLayoutProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

      // 处理必填字段
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

  // 处理表单提交
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);

    try {
      await onSubmit(data);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算表单验证状态
  const formValidationStatus = React.useMemo(() => {
    const { isValid, isDirty, errors } = form.formState;
    const errorCount = Object.keys(errors).length;
    const requiredFields = metadata.fields.filter(f => f.required).length;
    const filledRequiredFields = metadata.fields.filter(f => {
      if (!f.required) return false;
      const value = form.getValues(f.name);
      return value !== undefined && value !== null && value !== '';
    }).length;

    return {
      isValid,
      isDirty,
      errorCount,
      requiredFields,
      filledRequiredFields,
      progressPercentage: requiredFields > 0 ? (filledRequiredFields / requiredFields) * 100 : 100,
    };
  }, [form, metadata]);

  // 获取最大宽度类
  const getMaxWidthClass = () => {
    switch (maxContentWidth) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-2xl lg:max-w-4xl';
      case 'xl': return 'max-w-4xl lg:max-w-6xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-2xl lg:max-w-4xl';
    }
  };

  // 根据布局获取网格类
  const getLayoutClasses = () => {
    switch (layout) {
      case 'inline':
        return 'space-y-4';
      case 'grid':
        return 'space-y-6';
      case 'steps':
        return 'space-y-8';
      case 'stacked':
      default:
        return 'space-y-6';
    }
  };

  return (
    <Card className={cn('w-full mx-auto', getMaxWidthClass(), className)}>
      <CardHeader className="space-y-4">
        {/* 响应式标题 */}
        <div className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">
            响应式动态表单
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            版本 {metadata.version} • {metadata.fields.length} 个字段
          </CardDescription>
        </div>

        {/* 响应式状态指示器 */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={formValidationStatus.isValid ? 'default' : 'destructive'}
            className="text-xs"
          >
            {formValidationStatus.isValid ? '有效' : '无效'}
          </Badge>
          <Badge
            variant={formValidationStatus.isDirty ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {formValidationStatus.isDirty ? '已修改' : '未修改'}
          </Badge>
          {formValidationStatus.errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {formValidationStatus.errorCount} 个错误
            </Badge>
          )}
        </div>

        {/* 响应式进度指示器 */}
        {formValidationStatus.requiredFields > 0 && (
          <ResponsiveProgressIndicator {...formValidationStatus} />
        )}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className={getLayoutClasses()}
            noValidate
          >
            {/* 根据布局渲染字段 */}
            {layout === 'steps' ? (
              <div className="space-y-8">
                {/* 步骤布局 */}
                {metadata.fields.reduce((groups: any[][], field, index) => {
                  const groupIndex = Math.floor(index / 3);
                  if (!groups[groupIndex]) {
                    groups[groupIndex] = [];
                  }
                  groups[groupIndex].push(field);
                  return groups;
                }, []).map((group, groupIndex) => (
                  <div key={groupIndex} className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">
                      步骤 {groupIndex + 1}
                    </h3>
                    {group.map((field) => (
                      <ResponsiveFormField
                        key={field.id}
                        field={field}
                        form={form}
                        isVisible={fieldVisibility[field.id]}
                        layout="stacked"
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn(
                layout === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-4'
              )}>
                {metadata.fields.map((field) => (
                  <ResponsiveFormField
                    key={field.id}
                    field={field}
                    form={form}
                    isVisible={fieldVisibility[field.id]}
                    layout={layout}
                  />
                ))}
              </div>
            )}

            {/* 表单验证状态摘要 */}
            {formValidationStatus.errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  表单包含 {formValidationStatus.errorCount} 个验证错误，请修正后再提交
                </AlertDescription>
              </Alert>
            )}

            {/* 响应式提交按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                disabled={!formValidationStatus.isValid || isSubmitting || isLoading}
                className="w-full sm:w-auto sm:flex-1 min-h-[44px]"
                size="lg"
              >
                {isSubmitting || isLoading ? '提交中...' : '提交表单'}
              </Button>

              {!formValidationStatus.isValid && (
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  请修正表单错误后提交
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export type { ResponsiveFormLayoutProps };