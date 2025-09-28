import { describe, it, expect } from 'vitest';
import {
  AppErrors,
  AppError,
  ErrorMessages,
  createErrorResponse,
  AppErrorClass,
} from '@workspace/errors';

describe('错误定义单元测试', () => {
  describe('AppErrors 常量', () => {
    it('应该包含所有必要的错误代码', () => {
      expect(AppErrors).toBeDefined();
      expect(typeof AppErrors).toBe('object');

      // 验证认证错误
      expect(AppErrors.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(AppErrors.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(AppErrors.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(AppErrors.FORBIDDEN).toBe('FORBIDDEN');

      // 验证用户错误
      expect(AppErrors.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
      expect(AppErrors.USER_ALREADY_EXISTS).toBe('USER_ALREADY_EXISTS');
      expect(AppErrors.USER_INACTIVE).toBe('USER_INACTIVE');
      expect(AppErrors.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');

      // 验证表单错误
      expect(AppErrors.FORM_NOT_FOUND).toBe('FORM_NOT_FOUND');
      expect(AppErrors.FORM_ALREADY_EXISTS).toBe('FORM_ALREADY_EXISTS');
      expect(AppErrors.FORM_INACTIVE).toBe('FORM_INACTIVE');
      expect(AppErrors.INVALID_FORM_DATA).toBe('INVALID_FORM_DATA');

      // 验证提交错误
      expect(AppErrors.SUBMISSION_NOT_FOUND).toBe('SUBMISSION_NOT_FOUND');
      expect(AppErrors.SUBMISSION_INVALID).toBe('SUBMISSION_INVALID');
      expect(AppErrors.FORM_CLOSED).toBe('FORM_CLOSED');

      // 验证验证错误
      expect(AppErrors.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(AppErrors.REQUIRED_FIELD_MISSING).toBe('REQUIRED_FIELD_MISSING');
      expect(AppErrors.INVALID_EMAIL).toBe('INVALID_EMAIL');
      expect(AppErrors.INVALID_PASSWORD).toBe('INVALID_PASSWORD');

      // 验证服务器错误
      expect(AppErrors.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(AppErrors.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(AppErrors.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });

    it('应该具有只读属性', () => {
      // 验证 AppErrors 是只读的
      expect(() => {
        (AppErrors as any).UNAUTHORIZED = 'MODIFIED';
      }).toThrow();

      // 验证值没有被修改
      expect(AppErrors.UNAUTHORIZED).toBe('UNAUTHORIZED');
    });

    it('应该提供完整的错误类型覆盖', () => {
      const expectedErrors = [
        'UNAUTHORIZED',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'FORBIDDEN',
        'USER_NOT_FOUND',
        'USER_ALREADY_EXISTS',
        'USER_INACTIVE',
        'INVALID_CREDENTIALS',
        'FORM_NOT_FOUND',
        'FORM_ALREADY_EXISTS',
        'FORM_INACTIVE',
        'INVALID_FORM_DATA',
        'SUBMISSION_NOT_FOUND',
        'SUBMISSION_INVALID',
        'FORM_CLOSED',
        'VALIDATION_ERROR',
        'REQUIRED_FIELD_MISSING',
        'INVALID_EMAIL',
        'INVALID_PASSWORD',
        'INTERNAL_ERROR',
        'DATABASE_ERROR',
        'NETWORK_ERROR',
      ];

      const actualErrors = Object.values(AppErrors);
      expect(actualErrors).toEqual(expect.arrayContaining(expectedErrors));
      expect(actualErrors).toHaveLength(expectedErrors.length);
    });
  });

  describe('AppError 类型', () => {
    it('应该正确定义错误类型', () => {
      type TestError = AppError;

      const testError: TestError = 'UNAUTHORIZED';
      expect(testError).toBeDefined();

      const testError2: TestError = 'FORM_NOT_FOUND';
      expect(testError2).toBeDefined();
    });

    it('应该只允许有效的错误代码', () => {
      const validErrors: AppError[] = Object.values(AppErrors);

      validErrors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ErrorMessages 映射', () => {
    it('应该为所有错误代码提供中文消息', () => {
      expect(ErrorMessages).toBeDefined();
      expect(typeof ErrorMessages).toBe('object');

      // 验证认证错误消息
      expect(ErrorMessages.UNAUTHORIZED).toBe('Unauthorized access');
      expect(ErrorMessages.INVALID_TOKEN).toBe('Invalid token');
      expect(ErrorMessages.TOKEN_EXPIRED).toBe('Token expired');
      expect(ErrorMessages.FORBIDDEN).toBe('Access forbidden');

      // 验证用户错误消息
      expect(ErrorMessages.USER_NOT_FOUND).toBe('User not found');
      expect(ErrorMessages.USER_ALREADY_EXISTS).toBe('User already exists');
      expect(ErrorMessages.USER_INACTIVE).toBe('User inactive');
      expect(ErrorMessages.INVALID_CREDENTIALS).toBe('Invalid credentials');

      // 验证表单错误消息
      expect(ErrorMessages.FORM_NOT_FOUND).toBe('Form not found');
      expect(ErrorMessages.FORM_ALREADY_EXISTS).toBe('Form already exists');
      expect(ErrorMessages.FORM_INACTIVE).toBe('Form inactive');
      expect(ErrorMessages.INVALID_FORM_DATA).toBe('Invalid form data');

      // 验证提交错误消息
      expect(ErrorMessages.SUBMISSION_NOT_FOUND).toBe('Submission not found');
      expect(ErrorMessages.SUBMISSION_INVALID).toBe('Invalid submission data');
      expect(ErrorMessages.FORM_CLOSED).toBe('Form closed');

      // 验证验证错误消息
      expect(ErrorMessages.VALIDATION_ERROR).toBe('Data validation failed');
      expect(ErrorMessages.REQUIRED_FIELD_MISSING).toBe('Required field missing');
      expect(ErrorMessages.INVALID_EMAIL).toBe('Invalid email address');
      expect(ErrorMessages.INVALID_PASSWORD).toBe('Invalid password');

      // 验证服务器错误消息
      expect(ErrorMessages.INTERNAL_ERROR).toBe('Internal server error');
      expect(ErrorMessages.DATABASE_ERROR).toBe('Database error');
      expect(ErrorMessages.NETWORK_ERROR).toBe('Network error');
    });

    it('应该提供完整的消息覆盖', () => {
      const errorCount = Object.keys(AppErrors).length;
      const messageCount = Object.keys(ErrorMessages).length;

      expect(messageCount).toBe(errorCount);
    });

    it('应该提供一致的错误消息格式', () => {
      Object.values(ErrorMessages).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message.trim()).toBe(message); // 没有前后空格
      });
    });
  });

  describe('createErrorResponse 函数', () => {
    it('应该创建标准错误响应', () => {
      const response = createErrorResponse('UNAUTHORIZED');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized access',
        },
      });
    });

    it('应该包含详细信息', () => {
      const response = createErrorResponse('FORM_NOT_FOUND', 'Form ID: 123');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'FORM_NOT_FOUND',
          message: 'Form not found',
          details: 'Form ID: 123',
        },
      });
    });

    it('应该处理空详细信息', () => {
      const response = createErrorResponse('INTERNAL_ERROR', '');

      expect(response).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: '',
        },
      });
    });

    it('应该处理 undefined 详细信息', () => {
      const response = createErrorResponse('DATABASE_ERROR', undefined);

      expect(response).toEqual({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database error',
        },
      });
    });

    it('应该返回正确的类型结构', () => {
      const response = createErrorResponse('VALIDATION_ERROR', 'Missing required field');

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Data validation failed');
      expect(response.error.details).toBe('Missing required field');
    });

    it('应该支持所有错误类型', () => {
      Object.values(AppErrors).forEach(errorCode => {
        const response = createErrorResponse(errorCode);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe(errorCode);
        expect(response.error.message).toBe(ErrorMessages[errorCode]);
      });
    });
  });

  describe('AppErrorClass 类', () => {
    it('应该创建自定义错误实例', () => {
      const error = new AppErrorClass('UNAUTHORIZED');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppErrorClass);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized access');
      expect(error.name).toBe('AppError');
      expect(error.details).toBeUndefined();
    });

    it('应该支持自定义消息', () => {
      const error = new AppErrorClass('FORM_NOT_FOUND', 'Custom not found message');

      expect(error.code).toBe('FORM_NOT_FOUND');
      expect(error.message).toBe('Custom not found message');
      expect(error.details).toBeUndefined();
    });

    it('应该支持详细信息', () => {
      const error = new AppErrorClass('USER_ALREADY_EXISTS', 'User already exists', 'Email: test@example.com');

      expect(error.code).toBe('USER_ALREADY_EXISTS');
      expect(error.message).toBe('User already exists');
      expect(error.details).toBe('Email: test@example.com');
    });

    it('应该继承 Error 的属性', () => {
      const error = new AppErrorClass('INTERNAL_ERROR');

      expect(error.stack).toBeDefined();
      expect(error.toString()).toBe('AppError: Internal server error');
    });

    it('应该正确处理所有错误类型', () => {
      Object.values(AppErrors).forEach(errorCode => {
        const error = new AppErrorClass(errorCode);

        expect(error.code).toBe(errorCode);
        expect(error.message).toBe(ErrorMessages[errorCode]);
        expect(error.name).toBe('AppError');
      });
    });

    it('应该支持 instanceof 检查', () => {
      const error = new AppErrorClass('VALIDATION_ERROR');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppErrorClass).toBe(true);
    });
  });

  describe('类型安全', () => {
    it('应该保持类型安全', () => {
      // 验证 AppErrors 类型
      const errorCode: keyof typeof AppErrors = 'UNAUTHORIZED';
      expect(errorCode).toBeDefined();

      // 验证 AppError 类型
      const appError: AppError = 'FORM_NOT_FOUND';
      expect(appError).toBeDefined();

      // 验证 ErrorMessages 类型
      const errorMessage: string = ErrorMessages.UNAUTHORIZED;
      expect(errorMessage).toBeDefined();
    });

    it('应该提供完整的类型覆盖', () => {
      // 验证所有错误代码都可以用作 AppError 类型
      const allErrors = Object.values(AppErrors);
      allErrors.forEach(error => {
        const typedError: AppError = error;
        expect(typedError).toBeDefined();
      });
    });
  });

  describe('错误分类', () => {
    it('应该正确分类认证错误', () => {
      const authErrors = [
        'UNAUTHORIZED',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'FORBIDDEN',
      ];

      authErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });

    it('应该正确分类用户错误', () => {
      const userErrors = [
        'USER_NOT_FOUND',
        'USER_ALREADY_EXISTS',
        'USER_INACTIVE',
        'INVALID_CREDENTIALS',
      ];

      userErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });

    it('应该正确分类表单错误', () => {
      const formErrors = [
        'FORM_NOT_FOUND',
        'FORM_ALREADY_EXISTS',
        'FORM_INACTIVE',
        'INVALID_FORM_DATA',
      ];

      formErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });

    it('应该正确分类提交错误', () => {
      const submissionErrors = [
        'SUBMISSION_NOT_FOUND',
        'SUBMISSION_INVALID',
        'FORM_CLOSED',
      ];

      submissionErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });

    it('应该正确分类验证错误', () => {
      const validationErrors = [
        'VALIDATION_ERROR',
        'REQUIRED_FIELD_MISSING',
        'INVALID_EMAIL',
        'INVALID_PASSWORD',
      ];

      validationErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });

    it('应该正确分类服务器错误', () => {
      const serverErrors = [
        'INTERNAL_ERROR',
        'DATABASE_ERROR',
        'NETWORK_ERROR',
      ];

      serverErrors.forEach(error => {
        expect(AppErrors[error]).toBeDefined();
        expect(ErrorMessages[error]).toBeDefined();
      });
    });
  });

  describe('错误处理一致性', () => {
    it('应该在 AppErrors 和 ErrorMessages 之间保持一致', () => {
      Object.keys(AppErrors).forEach(key => {
        const errorCode = AppErrors[key as keyof typeof AppErrors];
        expect(ErrorMessages[errorCode]).toBeDefined();
      });
    });

    it('应该提供一致的错误处理接口', () => {
      // 验证 createErrorResponse 与 AppErrorClass 的一致性
      const errorCode = 'FORM_NOT_FOUND';
      const details = 'Form ID: 123';

      const response = createErrorResponse(errorCode, details);
      const error = new AppErrorClass(errorCode, undefined, details);

      expect(response.error.code).toBe(error.code);
      expect(response.error.message).toBe(error.message);
      expect(response.error.details).toBe(error.details);
    });

    it('应该支持错误链', () => {
      const originalError = new Error('Original error');
      const appError = new AppErrorClass('DATABASE_ERROR', 'Database connection failed', originalError.message);

      expect(appError.message).toBe('Database connection failed');
      expect(appError.details).toBe(originalError.message);
    });
  });

  describe('扩展性和维护性', () => {
    it('应该易于添加新的错误类型', () => {
      // 验证当前结构支持扩展
      const currentErrorCount = Object.keys(AppErrors).length;
      expect(currentErrorCount).toBeGreaterThan(0);

      // 验证每个错误都有对应的消息
      Object.values(AppErrors).forEach(errorCode => {
        expect(ErrorMessages[errorCode]).toBeDefined();
      });
    });

    it('应该提供清晰的错误层次结构', () => {
      // 验证错误代码的命名约定
      Object.values(AppErrors).forEach(errorCode => {
        expect(errorCode).toMatch(/^[A-Z_]+$/); // 只包含大写字母和下划线
        expect(errorCode.length).toBeGreaterThan(0);
      });
    });

    it('应该提供英文的错误消息', () => {
      // 验证消息是英文的
      Object.values(ErrorMessages).forEach(message => {
        expect(message).toMatch(/^[A-Za-z\s\-']+$/); // 包含英文字符
      });
    });
  });
});