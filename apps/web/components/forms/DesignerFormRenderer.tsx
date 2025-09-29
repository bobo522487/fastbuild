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
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

import {
  convertDesignerJsonToFormMetadata,
  buildZodSchema,
} from '@workspace/schema-compiler';

import type {
  DesignerJsonField,
  DesignerFormMetadata,
  DesignerFormField,
  DesignerFormRendererProps,
} from '@workspace/types';

/**
 * 设计器表单字段组件
 */
function DesignerFormField({
  field,
  form,
  isVisible = true,
}: {
  field: DesignerFormField;
  form: UseFormReturn<any>;
  isVisible?: boolean;
}) {
  if (!isVisible) {
    return null;
  }

  const fieldState = form.getFieldState(field.name);
  const uiConfig = field.$ui;

  // 计算网格类名
  const gridClasses = React.useMemo(() => {
    const classes: string[] = ['col-span-24']; // 移动端全宽

    if (uiConfig?.col?.span) {
      const span = uiConfig.col.span;
      // 桌面端按比例缩放
      const mdSpan = Math.min(24, Math.max(1, Math.ceil(span / 2)));
      classes.push(`md:col-span-${mdSpan}`);
    } else {
      classes.push('md:col-span-24'); // 默认桌面端全宽
    }

    // 偏移配置
    if (uiConfig?.col?.offset) {
      const offset = uiConfig.col.offset;
      classes.push(`md:col-start-${offset + 1}`);
    }

    return classes.join(' ');
  }, [uiConfig?.col]);

  // 应用组件属性
  const componentProps = React.useMemo(() => {
    const props: any = {
      placeholder: field.placeholder,
      disabled: uiConfig?.props?.disabled || false,
      readOnly: uiConfig?.props?.readonly || false,
    };

    // 根据字段类型添加特定属性
    if (field.type === 'text' || field.type === 'textarea') {
      if (uiConfig?.props?.maxlength) {
        props.maxLength = uiConfig.props.maxlength;
      }
      if (uiConfig?.props?.minlength) {
        props.minLength = uiConfig.props.minlength;
      }
      if (uiConfig?.props?.pattern) {
        props.pattern = uiConfig.props.pattern;
      }
    }

    if (field.type === 'number') {
      if (uiConfig?.props?.min !== undefined) {
        props.min = uiConfig.props.min;
      }
      if (uiConfig?.props?.max !== undefined) {
        props.max = uiConfig.props.max;
      }
    }

    return props;
  }, [field.type, field.placeholder, uiConfig?.props]);

  // 渲染字段组件
  const renderFieldComponent = () => {
    const commonProps = {
      ...form.register(field.name),
      ...componentProps,
      className: cn(
        fieldState.error && 'border-destructive focus-visible:ring-destructive',
        uiConfig?.className
      ),
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} type="text" />;

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            onChange={(e) => {
              const value = e.target.value;
              form.setValue(field.name, value === '' ? null : Number(value), {
                shouldValidate: true,
              });
            }}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={uiConfig?.props?.rows || 4}
            onChange={(e) => {
              form.setValue(field.name, e.target.value, {
                shouldValidate: true,
              });
            }}
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
                fieldState.error && 'border-destructive focus-visible:ring-destructive',
                uiConfig?.className
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
              disabled={componentProps.disabled}
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
            onChange={(e) => {
              form.setValue(field.name, e.target.value, {
                shouldValidate: true,
              });
            }}
          />
        );

      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  // 复选框使用不同的布局
  if (field.type === 'checkbox') {
    return (
      <div className={gridClasses}>
        {renderFieldComponent()}
        {fieldState.error && (
          <FormMessage className="text-sm font-medium text-destructive mt-1" />
        )}
      </div>
    );
  }

  return (
    <div className={gridClasses}>
      <RHFFormField
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className="space-y-2">
            <FormLabel className={cn(
              'text-sm font-medium flex items-center gap-2',
              fieldState.error && 'text-destructive'
            )}>
              {field.label}
              {field.required && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  必填
                </Badge>
              )}
            </FormLabel>
            <FormControl>
              {renderFieldComponent()}
            </FormControl>
            {field.placeholder && field.type !== 'select' && (
              <FormDescription className="text-xs">
                {field.placeholder}
              </FormDescription>
            )}
            <FormMessage className="text-sm font-medium" />
          </FormItem>
        )}
      />
    </div>
  );
}

/**
 * 主设计器表单渲染器组件
 */
export function DesignerFormRenderer({
  designerJson,
  onSubmit,
  isLoading = false,
  className,
  maxContentWidth = 'lg',
  layout = 'auto',
}: DesignerFormRendererProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 转换设计器JSON为FormMetadata
  const metadata = React.useMemo(() => {
    return convertDesignerJsonToFormMetadata(designerJson);
  }, [designerJson]);

  // 动态构建 Zod Schema
  const schema = React.useMemo(() => {
    return buildZodSchema(metadata);
  }, [metadata]);

  // 初始化表单
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: React.useMemo(() => {
      const values: Record<string, any> = {};
      metadata.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          values[field.name] = field.defaultValue;
        } else {
          // 根据字段类型设置默认值
          switch (field.type) {
            case 'checkbox':
              values[field.name] = false;
              break;
            case 'number':
              values[field.name] = null;
              break;
            default:
              values[field.name] = '';
          }
        }
      });
      return values;
    }, [metadata]),
  });

  // 计算字段可见性（如果支持条件逻辑）
  const fieldVisibility = React.useMemo(() => {
    const visibility: Record<string, boolean> = {};
    metadata.fields.forEach((field) => {
      visibility[field.id] = true; // 目前所有字段都可见，后续可添加条件逻辑
    });
    return visibility;
  }, [metadata]);

  // 处理表单提交
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
      console.log('🚀 Designer Form Submission Data:', data);
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
      case 'lg': return 'max-w-2xl lg:max-w-6xl';
      case 'xl': return 'max-w-6xl lg:max-w-7xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-2xl lg:max-w-6xl';
    }
  };

  // 判断是否为网格布局
  const useGridLayout = layout === 'grid' || layout === 'auto';

  return (
    <Card className={cn('w-full mx-auto', getMaxWidthClass(), className)}>
      <CardHeader className="space-y-4">
        {/* 响应式标题 */}
        <div className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">
            设计器表单
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            版本 {metadata.version} • {metadata.fields.length} 个字段 • {useGridLayout ? '网格布局' : '流式布局'}
          </CardDescription>
        </div>

        {/* 状态指示器 */}
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
          {useGridLayout && (
            <Badge variant="outline" className="text-xs">
              网格布局
            </Badge>
          )}
        </div>

        {/* 进度指示器 */}
        {formValidationStatus.requiredFields > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>完成进度</span>
              <span>{formValidationStatus.filledRequiredFields}/{formValidationStatus.requiredFields} 必填字段</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${formValidationStatus.progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* 网格布局容器 */}
            {useGridLayout ? (
              <div className="grid grid-cols-24 gap-4">
                {metadata.fields.map((field) => (
                  <DesignerFormField
                    key={field.id}
                    field={field}
                    form={form}
                    isVisible={fieldVisibility[field.id]}
                  />
                ))}
              </div>
            ) : (
              {/* 流式布局容器 */}
              <div className="space-y-4">
                {metadata.fields.map((field) => (
                  <DesignerFormField
                    key={field.id}
                    field={field}
                    form={form}
                    isVisible={fieldVisibility[field.id]}
                  />
                ))}
              </div>
            )}

            {/* 验证错误提示 */}
            {formValidationStatus.errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  表单包含 {formValidationStatus.errorCount} 个验证错误，请修正后再提交
                </AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="submit"
                disabled={!formValidationStatus.isValid || isSubmitting || isLoading}
                className="w-full sm:w-auto sm:flex-1 min-h-[44px]"
                size="lg"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交表单'
                )}
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

export type { DesignerFormRendererProps };