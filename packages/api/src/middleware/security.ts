import { initTRPC } from '@trpc/server';
import type { Context } from '../trpc/context';
import { ErrorHandler, ErrorCode } from './errorHandler';
import { z } from 'zod';
import { prisma } from '@workspace/database';

/**
 * 安全配置
 */
const SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  loginCooldown: 15 * 60 * 1000, // 15分钟
  sessionTimeout: 30 * 60 * 1000, // 30分钟
  maxRequestPerMinute: 60,
  maxRequestPerHour: 1000,
  suspiciousPatterns: [
    /<script[^>]*>.*?<\/script>/gi, // XSS
    /javascript:[^s]*/gi, // JavaScript协议
    /on\w+\s*=/gi, // 事件处理器
    /['";]/gi, // SQL注入字符
  ],
  blockedIPs: new Set<string>(),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
};

/**
 * 安全相关工具函数
 */
class SecurityUtilsInternal {
  /**
   * 验证和清理输入数据
   */
  static sanitizeInput(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return input;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(input)) {
      // 防止原型污染
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      // 递归清理对象
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'string') {
        // 清理字符串，移除潜在的XSS攻击
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 清理字符串
   */
  static sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, '') // 移除事件处理器
      .trim();
  }

  /**
   * 验证电子邮件格式
   */
  static isValidEmail(email: string): boolean {
    const emailSchema = z.string().email();
    return emailSchema.safeParse(email).success;
  }

  /**
   * 验证密码强度
   */
  static isStrongPassword(password: string): boolean {
    // 至少8个字符，包含大小写字母、数字和特殊字符
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  /**
   * 生成安全的随机字符串
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint32Array(length);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        result += chars[randomValues[i]! % chars.length];
      }
    } else {
      // 降级方案（仅在服务端使用）
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    return result;
  }

  /**
   * 检查是否为可疑请求
   */
  static isSuspiciousRequest(ctx: Context): boolean {
    const userAgent = ctx.req?.headers['user-agent'] || '';
    const ip = ctx.req?.socket?.remoteAddress || '';

    // 检查空User-Agent
    if (!userAgent || userAgent.length < 10) {
      return true;
    }

    // 检查已知的恶意User-Agent
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /test/i,
      /curl/i,
      /wget/i,
      /python/i,
      /perl/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * 获取客户端IP地址
   */
  static getClientIP(ctx: Context): string {
    const forwarded = ctx.req?.headers['x-forwarded-for'];
    const realIP = ctx.req?.headers['x-real-ip'];
    const ip = ctx.req?.socket?.remoteAddress;

    // 处理代理转发的情况
    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const parts = String(forwardedStr || '').split(',');
      return parts[0]?.trim() || 'unknown';
    }

    if (realIP) {
      return String(realIP);
    }

    return ip || 'unknown';
  }

  /**
   * 验证CSRF令牌
   */
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    // 简单的CSRF验证逻辑
    // 实际项目中应该使用更复杂的验证
    return !!(token && sessionToken && token === sessionToken);
  }

  /**
   * 检查文件类型安全性
   */
  static isSafeFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? allowedTypes.includes(extension) : false;
  }

  /**
   * 限制文件大小
   */
  static isSafeFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * 检测可疑请求模式
   */
  static detectSuspiciousRequest(input: any): boolean {
    const inputStr = JSON.stringify(input);
    return SECURITY_CONFIG.suspiciousPatterns.some(pattern =>
      pattern.test(inputStr)
    );
  }

  /**
   * IP地址工具
   */
  static ipUtils = {
    isBlocked(ip: string): boolean {
      return SECURITY_CONFIG.blockedIPs.has(ip);
    },

    blockIP(ip: string, duration: number = 24 * 60 * 60 * 1000): void {
      SECURITY_CONFIG.blockedIPs.add(ip);
      setTimeout(() => {
        SECURITY_CONFIG.blockedIPs.delete(ip);
      }, duration);
    },
  };

  /**
   * 登录尝试记录
   */
  static loginAttemptTracker = {
    async recordAttempt(email: string, ip: string, success: boolean): Promise<void> {
      // 简化的实现，不使用缓存
      console.log(`Login attempt recorded for ${email} from ${ip}, success: ${success}`);
    },

    async isBlocked(email: string, ip: string): Promise<boolean> {
      // 简化的实现，总是返回 false
      return false;
    },
  };

  /**
   * 速率限制器
   */
  static rateLimiter = {
    async checkLimit(identifier: string, endpoint: string): Promise<boolean> {
      // 简化的实现，总是返回 true
      return true;
    },

    async getRemainingRequests(identifier: string, endpoint: string): Promise<{
      minute: number;
      hour: number;
    }> {
      // 简化的实现
      return {
        minute: SECURITY_CONFIG.maxRequestPerMinute,
        hour: SECURITY_CONFIG.maxRequestPerHour,
      };
    },
  };

  /**
   * 审计日志记录
   */
  static auditLogger = {
    async log(action: string, userId: string, metadata: any = {}) {
      try {
        // 简化实现，不记录数据库
        console.log(`Audit log: ${action} by ${userId}`, metadata);
      } catch (error) {
        console.error('Failed to log audit event:', error);
      }
    },

    async logSecurityEvent(event: string, userId?: string, metadata: any = {}) {
      try {
        // 简化实现，不记录数据库
        console.log(`Security event: ${event}`, metadata);
      } catch (error) {
        console.error('Failed to log security event:', error);
      }
    },
  };
}

/**
 * 安全工具函数导出
 */
export const SecurityUtils = SecurityUtilsInternal;

/**
 * 输入验证中间件
 */
export function withInputValidation(schema: z.ZodSchema<any>) {
  return initTRPC.context<Context>().create().middleware(async ({ ctx, input, next }) => {
    try {
      // 清理输入数据
      const sanitizedInput = SecurityUtils.sanitizeInput(input);

      // 验证数据
      const validatedData = schema.parse(sanitizedInput);

      // 用验证后的数据替换原始输入
      return next({
        ctx,
        input: validatedData
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ErrorHandler.handle({
          code: 'BAD_REQUEST',
          message: '输入数据验证失败',
          details: error.issues
        }, ctx);
      }
      throw ErrorHandler.handle({
        code: 'BAD_REQUEST',
        message: '输入数据验证失败'
      }, ctx);
    }
  });
}

/**
 * 安全检查中间件
 */
export const securityMiddleware = initTRPC.context<Context>().create().middleware(async ({ ctx, next }) => {
  // 检查可疑请求
  if (SecurityUtils.isSuspiciousRequest(ctx)) {
    // 记录可疑活动
    console.warn(`Suspicious request detected from IP: ${SecurityUtils.getClientIP(ctx)}`);

    // 可以在这里添加额外的安全措施，如增加验证码等
  }

  // 获取客户端IP
  const clientIP = SecurityUtils.getClientIP(ctx);

  // 检查IP黑名单（这里可以扩展为数据库查询）
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  if (blockedIPs.includes(clientIP)) {
    throw ErrorHandler.handle(ErrorCode.FORBIDDEN, ctx);
  }

  return next({
    ctx: {
      ...ctx,
      clientIP
    }
  });
});

/**
 * 内容安全策略中间件
 */
export const cspMiddleware = initTRPC.context<Context>().create().middleware(async ({ ctx, next }) => {
  // 在响应头中添加CSP
  if (ctx.res) {
    ctx.res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '));

    // 其他安全头
    ctx.res.setHeader('X-Content-Type-Options', 'nosniff');
    ctx.res.setHeader('X-Frame-Options', 'DENY');
    ctx.res.setHeader('X-XSS-Protection', '1; mode=block');
    ctx.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    ctx.res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }

  return next();
});