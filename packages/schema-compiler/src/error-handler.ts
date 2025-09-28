/**
 * 统一错误处理系统
 * 利用 Zod 4 的统一错误处理 API 提供更好的错误消息和本地化支持
 */

import { z } from 'zod';
import { ValidationError, CompilationError, FormField } from '@workspace/types';

/**
 * 错误消息接口
 */
export interface ErrorMessage {
  field: string;
  message: string;
  code?: string;
  expected?: string;
  received?: string;
  path?: string[];
  severity: 'error' | 'warning' | 'info';
}

/**
 * 错误本地化配置
 */
export interface ErrorLocalization {
  locale: string;
  messages: Record<string, string>;
}

/**
 * 默认中文错误消息
 */
const zhCNMessages: Record<string, string> = {
  // 基础类型错误
  'invalid_type': '类型错误',
  'invalid_literal': '值不符合要求',
  'invalid_union': '值不符合任何允许的类型',
  'invalid_union_discriminator': '联合类型标识符无效',
  'invalid_enum_value': '枚举值无效',
  'invalid_arguments': '参数无效',
  'invalid_return_type': '返回类型无效',
  'invalid_date': '日期无效',

  // 字符串错误
  'too_small': '值太小',
  'too_big': '值太大',
  'invalid_string': '字符串格式无效',
  'invalid_email': '邮箱格式无效',
  'invalid_url': 'URL 格式无效',
  'invalid_uuid': 'UUID 格式无效',
  'invalid_regex': '正则表达式无效',
  'invalid_datetime': '日期时间格式无效',

  // 数字错误
  'not_multiple_of': '不是指定值的倍数',
  'not_finite': '不是有限数字',

  // 数组错误
  'invalid_length': '长度无效',
  'non_empty': '不能为空',

  // 对象错误
  'unrecognized_keys': '包含未识别的键',
  'missing_keys': '缺少必需的键',
  'invalid_keys': '无效的键',

  // 自定义错误消息
  'required': '不能为空',
  'invalid_format': '格式无效',
  'custom_error': '自定义错误',
};

/**
 * 默认英文错误消息
 */
const enUSMessages: Record<string, string> = {
  'invalid_type': 'Invalid type',
  'invalid_literal': 'Invalid literal value',
  'invalid_union': 'Invalid union value',
  'invalid_union_discriminator': 'Invalid union discriminator',
  'invalid_enum_value': 'Invalid enum value',
  'invalid_arguments': 'Invalid arguments',
  'invalid_return_type': 'Invalid return type',
  'invalid_date': 'Invalid date',
  'too_small': 'Value too small',
  'too_big': 'Value too big',
  'invalid_string': 'Invalid string format',
  'invalid_email': 'Invalid email format',
  'invalid_url': 'Invalid URL format',
  'invalid_uuid': 'Invalid UUID format',
  'invalid_regex': 'Invalid regex format',
  'invalid_datetime': 'Invalid datetime format',
  'not_multiple_of': 'Not a multiple of',
  'not_finite': 'Not a finite number',
  'invalid_length': 'Invalid length',
  'non_empty': 'Cannot be empty',
  'unrecognized_keys': 'Unrecognized keys',
  'missing_keys': 'Missing keys',
  'invalid_keys': 'Invalid keys',
  'required': 'Required',
  'invalid_format': 'Invalid format',
  'custom_error': 'Custom error',
};

/**
 * 本地化配置
 */
const localizations: Record<string, ErrorLocalization> = {
  'zh-CN': {
    locale: 'zh-CN',
    messages: zhCNMessages,
  },
  'en-US': {
    locale: 'en-US',
    messages: enUSMessages,
  },
};

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private currentLocale: string = 'zh-CN';

  /**
   * 设置本地化语言
   */
  setLocale(locale: string): void {
    if (localizations[locale]) {
      this.currentLocale = locale;
      return;
    }

    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`Locale "${locale}" not supported, using "zh-CN"`);
    }
    this.currentLocale = 'zh-CN';
  }

  /**
   * 获取当前本地化配置
   */
  getCurrentLocalization(): ErrorLocalization {
    return localizations[this.currentLocale] ?? localizations['zh-CN'];
  }

  /**
   * 处理 Zod 验证错误
   */
  handleZodError(error: z.ZodError, metadata?: { fields?: FormField[] }): ErrorMessage[] {
    const localization = this.getCurrentLocalization();
    const messages = localization?.messages ?? {};
    const errors: ErrorMessage[] = [];

    for (const issue of error.errors) {
      const typedIssue = issue as (typeof issue) & {
        expected?: string;
        received?: string;
        validation?: string;
      };

      const fieldName = typedIssue.path.map(String).join('.');
      const field = metadata?.fields?.find(f => f.name === fieldName);

      // 构建基础错误消息
      let message = typedIssue.message;
      if (typedIssue.code && messages[typedIssue.code]) {
        message = messages[typedIssue.code];
      }

      // 根据错误类型和字段信息定制消息
      if (typedIssue.code === 'invalid_type' && typedIssue.received === 'undefined') {
        if (field?.label) {
          message = `${field.label}${messages['required'] || messages['invalid_type']}`;
        } else {
          message = `${fieldName}${messages['required'] || messages['invalid_type']}`;
        }
      } else if (typedIssue.code === 'invalid_string' && field?.label) {
        if (typedIssue.validation === 'email') {
          message = `${field.label}格式无效`;
        } else if (typedIssue.validation === 'url') {
          message = `${field.label}URL格式无效`;
        } else {
          message = `${field.label}${message}`;
        }
      } else if (field?.label && typedIssue.message !== `${field.label}不能为空`) {
        message = `${field.label}: ${message}`;
      }

      errors.push({
        field: fieldName,
        message,
        code: typedIssue.code,
        expected: typedIssue.expected,
        received: typedIssue.received,
        path: typedIssue.path.map(String),
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * 处理编译错误
   */
  handleCompilationError(errors: CompilationError[]): ErrorMessage[] {
    return errors.map(err => ({
      field: err.field ?? 'system',
      message: err.message,
      code: err.type,
      severity: 'error',
    }));
  }

  /**
   * 格式化错误消息为用户友好的格式
   */
  formatErrorMessage(error: ErrorMessage): string {
    return error.message;
  }

  /**
   * 格式化多个错误消息
   */
  formatErrorMessages(errors: ErrorMessage[]): string[] {
    return errors.map(error => this.formatErrorMessage(error));
  }

  /**
   * 按字段分组错误
   */
  groupErrorsByField(errors: ErrorMessage[]): Record<string, ErrorMessage[]> {
    const grouped: Record<string, ErrorMessage[]> = {};

    for (const error of errors) {
      if (!grouped[error.field]) {
        grouped[error.field] = [];
      }
      grouped[error.field].push(error);
    }

    return grouped;
  }

  /**
   * 获取最重要错误（用于显示单个错误消息）
   */
  getMostImportantError(errors: ErrorMessage[]): ErrorMessage | null {
    if (errors.length === 0) return null;

    // 优先级：required > invalid_type > 其他错误
    const priorityOrder = ['invalid_type', 'required', 'invalid_string', 'invalid_union'];

    for (const code of priorityOrder) {
      const error = errors.find(e => e.code === code);
      if (error) return error;
    }

    return errors[0];
  }

  /**
   * 创建自定义错误
   */
  createCustomError(
    field: string,
    message: string,
    code: string = 'custom_error',
    severity: 'error' | 'warning' | 'info' = 'error'
  ): ErrorMessage {
    return {
      field,
      message,
      code,
      severity,
    };
  }

  /**
   * 验证错误消息的严重程度
   */
  getErrorsBySeverity(errors: ErrorMessage[], severity: 'error' | 'warning' | 'info'): ErrorMessage[] {
    return errors.filter(error => error.severity === severity);
  }

  /**
   * 检查是否有严重错误
   */
  hasSevereErrors(errors: ErrorMessage[]): boolean {
    return errors.some(error => error.severity === 'error');
  }
}

/**
 * 全局错误处理器实例
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * 便捷函数：处理 Zod 错误
 */
export function handleZodError(error: z.ZodError, metadata?: { fields?: FormField[] }): ErrorMessage[] {
  return globalErrorHandler.handleZodError(error, metadata);
}

/**
 * 便捷函数：处理编译错误
 */
export function handleCompilationError(errors: CompilationError[]): ErrorMessage[] {
  return globalErrorHandler.handleCompilationError(errors);
}

/**
 * 便捷函数：格式化错误消息
 */
export function formatErrors(errors: ErrorMessage[]): string[] {
  return globalErrorHandler.formatErrorMessages(errors);
}

/**
 * 便捷函数：设置错误消息语言
 */
export function setErrorLocale(locale: string): void {
  globalErrorHandler.setLocale(locale);
}

// 导出默认
export default ErrorHandler;
