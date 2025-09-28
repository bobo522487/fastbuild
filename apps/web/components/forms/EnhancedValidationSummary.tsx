'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lightbulb,
  Shield,
  Zap
} from 'lucide-react';
import type { FormMetadata } from '@workspace/types';

export interface ValidationError {
  fieldName: string;
  fieldLabel: string;
  type: string;
  message: string;
  suggestions?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixable: boolean;
  example?: string;
}

export interface ValidationSummary {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  totalFields: number;
  completedFields: number;
  score: number; // 0-100
}

interface EnhancedValidationSummaryProps {
  metadata: FormMetadata;
  form: UseFormReturn<any>;
  isVisible?: boolean;
  onFieldFocus?: (fieldName: string) => void;
  className?: string;
}

// 验证错误消息映射
const VALIDATION_ERROR_MESSAGES: Record<string, ValidationErrorConfig> = {
  required: {
    title: '必填字段未填写',
    message: '此字段为必填项，请提供有效信息',
    suggestions: [
      '请填写此字段以继续',
      '如果此字段不适用，请联系管理员',
      '检查是否有相关前置条件'
    ],
    severity: 'high' as const,
    fixable: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  min: {
    title: '内容长度不足',
    message: '输入内容过短，请提供更多详细信息',
    suggestions: [
      '提供更详细的描述',
      '补充相关信息',
      '参考示例格式'
    ],
    severity: 'medium' as const,
    fixable: true,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  max: {
    title: '内容长度超限',
    message: '输入内容过长，请精简内容',
    suggestions: [
      '删除冗余信息',
      '使用简明扼要的表达',
      '分点说明关键信息'
    ],
    severity: 'medium' as const,
    fixable: true,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  invalid_type: {
    title: '数据格式错误',
    message: '格式不正确，请检查输入内容',
    suggestions: [
      '检查数据格式要求',
      '参考示例格式',
      '移除特殊字符'
    ],
    severity: 'high' as const,
    fixable: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  invalid_string: {
    title: '字符串格式错误',
    message: '输入的字符串格式不符合要求',
    suggestions: [
      '检查是否有特殊字符',
      '确认编码格式',
      '使用标准格式'
    ],
    severity: 'medium' as const,
    fixable: true,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  invalid_number: {
    title: '数字格式错误',
    message: '请输入有效的数字',
    suggestions: [
      '只输入数字字符',
      '检查小数点位置',
      '确认数字范围'
    ],
    severity: 'high' as const,
    fixable: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  invalid_date: {
    title: '日期格式错误',
    message: '请输入有效的日期',
    suggestions: [
      '使用 YYYY-MM-DD 格式',
      '确认日期在有效范围内',
      '选择有效的日期'
    ],
    severity: 'high' as const,
    fixable: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  invalid_email: {
    title: '邮箱格式错误',
    message: '请输入有效的邮箱地址',
    suggestions: [
      '格式：username@domain.com',
      '检查是否有特殊字符',
      '确认域名拼写正确'
    ],
    severity: 'high' as const,
    fixable: true,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  too_small: {
    title: '数值过小',
    message: '输入的数值小于最小要求',
    suggestions: [
      '增加数值大小',
      '检查单位是否正确',
      '确认最小值要求'
    ],
    severity: 'medium' as const,
    fixable: true,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  too_big: {
    title: '数值过大',
    message: '输入的数值超过最大限制',
    suggestions: [
      '减小数值大小',
      '检查单位是否正确',
      '确认最大值限制'
    ],
    severity: 'medium' as const,
    fixable: true,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
};

interface ValidationErrorConfig {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  fixable: boolean;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

// 字段类型特定的错误建议
const FIELD_TYPE_SUGGESTIONS: Record<string, Record<string, string[]>> = {
  text: {
    required: ['请输入必要的文本信息', '如果不确定，可以填写"待补充"'],
    min: ['提供更详细的描述', '至少包含基本的信息'],
    max: ['精简表达，突出重点', '使用缩写或列表形式']
  },
  email: {
    invalid_type: ['确保格式如：user@example.com', '检查邮箱地址拼写'],
    invalid_email: ['使用常用邮箱服务商地址', '确认邮箱后缀是否正确']
  },
  number: {
    invalid_type: ['只输入数字，不要包含文字', '使用小数点表示小数'],
    too_small: ['增加到最小值以上', '检查数值单位'],
    too_big: ['减小到最大值以下', '检查数值单位']
  },
  textarea: {
    min: ['详细说明相关情况', '提供背景信息'],
    max: ['分点列出关键信息', '删除重复内容']
  },
  select: {
    required: ['从下拉列表中选择一个选项', '如果无合适选项，请选择"其他"']
  },
  date: {
    invalid_type: ['使用 YYYY-MM-DD 格式', '选择日期选择器中的日期'],
    invalid_date: ['确认日期真实存在', '检查是否在有效范围内']
  }
};

export class ValidationErrorAnalyzer {
  static analyzeForm(metadata: FormMetadata, form: UseFormReturn<any>): ValidationSummary {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const { errors: formErrors } = form.formState;

    let totalFields = 0;
    let completedFields = 0;

    // 分析每个字段的验证状态
    metadata.fields.forEach(field => {
      totalFields++;
      const fieldState = form.getFieldState(field.name);
      const fieldValue = form.getValues(field.name);

      // 检查字段是否已填写
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        completedFields++;
      }

      // 分析错误
      if (fieldState.error) {
        const error = fieldState.error;
        const fieldConfig = FIELD_TYPE_SUGGESTIONS[field.type] || {};
        const errorConfig = VALIDATION_ERROR_MESSAGES[error.type] || VALIDATION_ERROR_MESSAGES.invalid_type;

        const validationError: ValidationError = {
          fieldName: field.name,
          fieldLabel: field.label,
          type: error.type,
          message: error.message || errorConfig.message,
          suggestions: fieldConfig[error.type] || errorConfig.suggestions,
          severity: errorConfig.severity,
          fixable: errorConfig.fixable,
          example: this.getExampleForField(field)
        };

        if (errorConfig.severity === 'critical' || errorConfig.severity === 'high') {
          errors.push(validationError);
        } else {
          warnings.push(validationError);
        }
      }

      // 检查字段警告（可选字段建议）
      if (!field.required && !fieldState.isDirty) {
        warnings.push({
          fieldName: field.name,
          fieldLabel: field.label,
          type: 'suggestion',
          message: `建议填写${field.label}以获得更好体验`,
          suggestions: ['此字段为可选，但填写有助于提供更好的服务'],
          severity: 'low',
          fixable: false
        });
      }
    });

    // 计算完成度分数
    const baseScore = totalFields > 0 ? (completedFields / totalFields) * 100 : 100;
    const errorPenalty = errors.length * 10;
    const warningPenalty = warnings.length * 2;
    const score = Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalFields,
      completedFields,
      score: Math.round(score)
    };
  }

  private static getExampleForField(field: any): string {
    switch (field.type) {
      case 'email':
        return 'example@domain.com';
      case 'number':
        return '42';
      case 'date':
        return '2024-01-01';
      case 'text':
        return field.label.includes('姓名') ? '张三' : '示例文本';
      case 'textarea':
        return '请在此输入详细描述...';
      default:
        return '';
    }
  }
}

export function EnhancedValidationSummary({
  metadata,
  form,
  isVisible = true,
  onFieldFocus,
  className = ''
}: EnhancedValidationSummaryProps) {
  const summary = ValidationErrorAnalyzer.analyzeForm(metadata, form);

  if (!isVisible || summary.isValid) {
    return null;
  }

  const handleFieldFocus = (fieldName: string) => {
    // 聚焦到对应字段
    const fieldElement = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
    if (fieldElement) {
      fieldElement.focus();
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onFieldFocus?.(fieldName);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-red-50 text-red-600 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'low': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 整体验证状态 */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">表单验证提醒</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={getScoreColor(summary.score)}>
                {summary.score}分
              </Badge>
              <Badge variant="destructive">
                {summary.errors.length} 个错误
              </Badge>
              {summary.warnings.length > 0 && (
                <Badge variant="outline">
                  {summary.warnings.length} 个建议
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 进度概览 */}
            <div className="flex items-center justify-between text-sm">
              <span>完成进度</span>
              <span>{summary.completedFields}/{summary.totalFields} 字段</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(summary.completedFields / summary.totalFields) * 100}%` }}
              />
            </div>

            {/* 关键错误提示 */}
            {summary.errors.length > 0 && (
              <Alert variant="destructive" className="border-l-4 border-l-red-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">
                  需要修正的错误 ({summary.errors.length})
                </AlertTitle>
                <AlertDescription className="text-xs">
                  请修正以下错误后再提交表单
                </AlertDescription>
              </Alert>
            )}

            {/* 建议信息 */}
            {summary.warnings.length > 0 && (
              <Alert className="border-l-4 border-l-yellow-400">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-sm font-medium">
                  优化建议 ({summary.warnings.length})
                </AlertTitle>
                <AlertDescription className="text-xs">
                  填写这些字段可以获得更好的体验
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 详细错误列表 */}
      {summary.errors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>详细错误信息</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.errors.map((error, index) => {
                const config = VALIDATION_ERROR_MESSAGES[error.type] || VALIDATION_ERROR_MESSAGES.invalid_type;
                const Icon = config.icon;

                return (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium text-sm">{error.fieldLabel}</span>
                        <Badge variant="outline" className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                      </div>
                      {error.fixable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFieldFocus(error.fieldName)}
                          className="h-6 text-xs"
                        >
                          定位
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-gray-700">{error.message}</p>

                    {error.example && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium">示例：</span> {error.example}
                      </div>
                    )}

                    {error.suggestions && error.suggestions.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Lightbulb className="h-3 w-3" />
                          <span className="font-medium">建议：</span>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1 ml-4">
                          {error.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start space-x-1">
                              <span className="text-gray-400">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作建议 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-blue-800">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">操作建议</span>
          </div>
          <ul className="text-xs text-blue-700 space-y-1 mt-2 ml-6">
            <li>• 点击错误旁的"定位"按钮快速跳转到对应字段</li>
            <li>• 按照从上到下的顺序逐个修正错误</li>
            <li>• 修正后错误会自动消失，无需手动刷新</li>
            <li>• 如有疑问，可联系技术支持</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// 单字段错误提示组件
export function FieldErrorTooltip({
  field,
  form,
  isVisible = true
}: {
  field: any;
  form: UseFormReturn<any>;
  isVisible?: boolean;
}) {
  const fieldState = form.getFieldState(field.name);

  if (!isVisible || !fieldState.error) {
    return null;
  }

  const error = fieldState.error;
  const config = VALIDATION_ERROR_MESSAGES[error.type] || VALIDATION_ERROR_MESSAGES.invalid_type;
  const Icon = config.icon;

  return (
    <div className="relative group">
      <Icon className={`h-3 w-3 cursor-help ${config.color}`} />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 shadow-lg`}>
          <div className="flex items-center space-x-1 mb-1">
            <Icon className={`h-3 w-3 ${config.color}`} />
            <span className="text-xs font-medium">{config.title}</span>
          </div>
          <p className="text-xs text-gray-700">{config.message}</p>
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className={`w-2 h-2 ${config.borderColor} border-r border-b transform rotate-45`}></div>
        </div>
      </div>
    </div>
  );
}

// 表单验证健康检查组件
export function FormHealthCheck({
  summary,
  onShowDetails
}: {
  summary: ValidationSummary;
  onShowDetails?: () => void;
}) {
  const getHealthStatus = () => {
    if (summary.score >= 90) return { status: 'excellent', label: '优秀', color: 'text-green-600', icon: CheckCircle2 };
    if (summary.score >= 70) return { status: 'good', label: '良好', color: 'text-blue-600', icon: CheckCircle2 };
    if (summary.score >= 50) return { status: 'fair', label: '一般', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'poor', label: '需改进', color: 'text-red-600', icon: XCircle };
  };

  const healthStatus = getHealthStatus();
  const Icon = healthStatus.icon;

  return (
    <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
      <div className="flex items-center space-x-3">
        <Icon className={`h-5 w-5 ${healthStatus.color}`} />
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">表单健康度</span>
            <Badge variant="outline" className={healthStatus.color}>
              {healthStatus.label}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            {summary.score}分 • {summary.completedFields}/{summary.totalFields} 字段完成
          </div>
        </div>
      </div>

      {!summary.isValid && onShowDetails && (
        <Button variant="outline" size="sm" onClick={onShowDetails}>
          查看详情
        </Button>
      )}
    </div>
  );
}