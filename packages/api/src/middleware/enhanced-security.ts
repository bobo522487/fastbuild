import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';
import { z } from 'zod';

/**
 * 增强的安全验证工具
 */
export class EnhancedSecurityUtils {
  /**
   * 输入数据深度清理
   */
  static deepSanitize(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return this.sanitizePrimitive(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.deepSanitize(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(input)) {
      // 防止原型污染
      if (this.isUnsafeKey(key)) {
        continue;
      }

      // 递归清理嵌套对象
      sanitized[key] = this.deepSanitize(value);
    }

    return sanitized;
  }

  /**
   * 清理原始值
   */
  static sanitizePrimitive(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    return value;
  }

  /**
   * 检查不安全的键名
   */
  static isUnsafeKey(key: string): boolean {
    const unsafeKeys = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
    ];
    return unsafeKeys.includes(key);
  }

  /**
   * 字符串清理和XSS防护
   */
  static sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*<\/object>/gi, '')
      .replace(/<embed\b[^<]*>/gi, '')
      .replace(/data:\s*text\/html/gi, '')
      .trim();
  }

  /**
   * SQL注入检测
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)(\s|$)/i,
      /(\s|^)(UNION|JOIN|WHERE|HAVING)(\s|$)/i,
      /['"](\s|;)*(\s)*(OR|AND)(\s)+.*=/i,
      /(\s|^)(EXEC|EXECUTE|SP_)(\s|$)/i,
      /(\s|^)(--|\/\*|\*\/|;)(\s|$)/i,
      /(\s|^)(XOR|LIKE|BETWEEN|IN)(\s|$)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * NoSQL注入检测
   */
  static detectNoSQLInjection(input: string): boolean {
    const nosqlPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /\$options/i,
      /\{.*\$.*\}/i,
    ];

    return nosqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 文件路径遍历检测
   */
  static detectPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /~\//,
      /\/etc\//,
      /\/usr\//,
      /\/var\//,
      /C:\\/,
      /D:\\/,
    ];

    return pathPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 命令注入检测
   */
  static detectCommandInjection(input: string): boolean {
    const commandPatterns = [
      /[;&|`$(){}[\]<>]/,
      /\/bin\/sh/,
      /cmd\.exe/,
      /powershell/i,
      /bash/i,
      /sh\s+-c/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /shell_exec/i,
      /passthru/i,
    ];

    return commandPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 综合安全检查
   */
  static comprehensiveSecurityCheck(input: any, context: string = ''): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof input === 'string') {
      if (this.detectSQLInjection(input)) {
        errors.push(`Potential SQL injection detected in ${context}`);
      }
      if (this.detectNoSQLInjection(input)) {
        errors.push(`Potential NoSQL injection detected in ${context}`);
      }
      if (this.detectPathTraversal(input)) {
        errors.push(`Potential path traversal detected in ${context}`);
      }
      if (this.detectCommandInjection(input)) {
        errors.push(`Potential command injection detected in ${context}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证和清理电子邮件
   */
  static validateAndSanitizeEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
    try {
      const emailSchema = z.string().email();
      const validatedEmail = emailSchema.parse(email);

      return {
        isValid: true,
        sanitized: validatedEmail.toLowerCase().trim(),
      };
    } catch (error) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Invalid email format',
      };
    }
  }

  /**
   * 密码强度验证
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[]
  } {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    // 包含大写字母
    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    // 包含小写字母
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    // 包含数字
    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    // 包含特殊字符
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }

  /**
   * 生成安全的随机令牌
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = new Uint32Array(length);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * chars.length);
      }
    }

    return Array.from(randomValues, val => chars[val % chars.length]).join('');
  }

  /**
   * 检查用户代理安全性
   */
  static analyzeUserAgent(userAgent: string): {
    isSuspicious: boolean;
    reasons: string[];
    botScore: number
  } {
    const reasons: string[] = [];
    let botScore = 0;

    // 空User-Agent
    if (!userAgent || userAgent.length < 10) {
      reasons.push('Empty or very short User-Agent');
      botScore += 30;
    }

    // 已知恶意模式
    const suspiciousPatterns = [
      { pattern: /bot/i, weight: 20 },
      { pattern: /crawler/i, weight: 20 },
      { pattern: /spider/i, weight: 20 },
      { pattern: /scanner/i, weight: 25 },
      { pattern: /test/i, weight: 15 },
      { pattern: /curl/i, weight: 10 },
      { pattern: /wget/i, weight: 10 },
      { pattern: /python/i, weight: 15 },
      { pattern: /perl/i, weight: 15 },
      { pattern: /php/i, weight: 10 },
    ];

    suspiciousPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(userAgent)) {
        reasons.push(`Suspicious User-Agent pattern: ${pattern}`);
        botScore += weight;
      }
    });

    return {
      isSuspicious: botScore > 40,
      reasons,
      botScore,
    };
  }
}

/**
 * 增强的安全中间件
 */
export function createEnhancedSecurityMiddleware(config: {
  enableInputValidation?: boolean;
  enableSecurityScanning?: boolean;
  enableUserAgentAnalysis?: boolean;
  enableCSRFProtection?: boolean;
  customValidators?: Record<string, z.ZodSchema<any>>;
} = {}) {
  const {
    enableInputValidation = true,
    enableSecurityScanning = true,
    enableUserAgentAnalysis = true,
    enableCSRFProtection = true,
    customValidators = {},
  } = config;

  return async function enhancedSecurityMiddleware(opts: any) {
    const { ctx, input, next } = opts;

    try {
      // 用户代理分析
      if (enableUserAgentAnalysis && ctx.req?.headers['user-agent']) {
        const userAgent = ctx.req.headers['user-agent'] as string;
        const analysis = EnhancedSecurityUtils.analyzeUserAgent(userAgent);

        if (analysis.isSuspicious) {
          // 记录可疑活动
          console.warn(`Suspicious User-Agent detected: ${userAgent}`, analysis.reasons);

          // 可以在这里添加额外的安全措施，如要求验证码等
        }
      }

      // 输入数据清理和验证
      let sanitizedInput = input;

      if (enableInputValidation && input) {
        // 深度清理输入数据
        sanitizedInput = EnhancedSecurityUtils.deepSanitize(input);

        // 安全扫描
        if (enableSecurityScanning) {
          const securityCheck = EnhancedSecurityUtils.comprehensiveSecurityCheck(
            JSON.stringify(sanitizedInput),
            'request input'
          );

          if (!securityCheck.isValid) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Security validation failed: ${securityCheck.errors.join(', ')}`,
            });
          }
        }

        // 自定义验证器
        const path = opts.path || '';
        const customValidator = customValidators[path];
        if (customValidator) {
          try {
            sanitizedInput = customValidator.parse(sanitizedInput);
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Custom validation failed',
                cause: error.issues,
              });
            }
          }
        }
      }

      // CSRF保护
      if (enableCSRFProtection && ctx.req?.method !== 'GET') {
        const csrfToken = ctx.req?.headers['x-csrf-token'] || ctx.req?.headers['x-xsrf-token'];
        const sessionToken = ctx.req?.headers.cookie?.match(/csrf-token=([^;]+)/)?.[1];

        if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'CSRF token validation failed',
          });
        }
      }

      // 执行下一个中间件，传入清理后的输入
      return next({
        ...opts,
        input: sanitizedInput,
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Security middleware error',
        cause: error,
      });
    }
  };
}

/**
 * 常用的验证器模式
 */
export const CommonValidators = {
  // 电子邮件验证
  email: z.string().email('Invalid email format'),

  // 用户名验证
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be no more than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  // 密码验证
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

  // URL验证
  url: z.string().url('Invalid URL format'),

  // ID验证
  id: z.string().min(1, 'ID cannot be empty'),

  // 分页参数验证
  pagination: z.object({
    limit: z.number().min(1).max(100),
    cursor: z.string().optional(),
  }),

  // 搜索参数验证
  search: z.object({
    query: z.string().min(1).max(100),
    filters: z.record(z.string(), z.unknown()).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

