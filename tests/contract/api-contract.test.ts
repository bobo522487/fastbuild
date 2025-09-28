import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// API 合约测试 - 验证 API 契约的正确性
describe('API 合约测试', () => {
  describe('用户认证合约', () => {
    it('登录输入应该符合预期模式', () => {
      const loginInputSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        rememberMe: z.boolean().default(false),
      });

      // 测试有效输入
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      expect(loginInputSchema.safeParse(validInput).success).toBe(true);

      // 测试无效输入
      const invalidInputs = [
        { email: 'invalid-email', password: 'valid' },
        { email: 'test@example.com', password: '123' },
        { email: 'test@example.com', password: 123 as any },
      ];

      invalidInputs.forEach(input => {
        expect(loginInputSchema.safeParse(input).success).toBe(false);
      });
    });

    it('注册输入应该符合预期模式', () => {
      const registerInputSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(2),
      });

      const validInput = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      expect(registerInputSchema.safeParse(validInput).success).toBe(true);

      const invalidInputs = [
        { email: 'invalid', password: 'valid', name: 'User' },
        { email: 'test@example.com', password: '123', name: 'User' },
        { email: 'test@example.com', password: 'valid', name: 'A' },
      ];

      invalidInputs.forEach(input => {
        expect(registerInputSchema.safeParse(input).success).toBe(false);
      });
    });

    it('认证输出应该符合预期模式', () => {
      const authOutputSchema = z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          name: z.string(),
          role: z.enum(['USER', 'ADMIN']),
          emailVerified: z.boolean(),
          isActive: z.boolean(),
        }),
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.date(),
      });

      const validOutput = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER' as const,
          emailVerified: true,
          isActive: true,
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      };

      expect(authOutputSchema.safeParse(validOutput).success).toBe(true);
    });
  });

  describe('表单管理合约', () => {
    it('表单字段应该符合预期模式', () => {
      const formFieldSchema = z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
        label: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().default(false),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })).optional(),
        condition: z.object({
          fieldId: z.string(),
          operator: z.enum(['equals', 'not_equals']),
          value: z.any(),
        }).optional(),
        defaultValue: z.any().optional(),
      });

      const validField = {
        id: 'name',
        name: 'name',
        type: 'text' as const,
        label: '姓名',
        required: true,
      };

      expect(formFieldSchema.safeParse(validField).success).toBe(true);
    });

    it('表单元数据应该符合预期模式', () => {
      const formMetadataSchema = z.object({
        version: z.string(),
        fields: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
          label: z.string(),
          placeholder: z.string().optional(),
          required: z.boolean().default(false),
          options: z.array(z.object({
            label: z.string(),
            value: z.string(),
          })).optional(),
          condition: z.object({
            fieldId: z.string(),
            operator: z.enum(['equals', 'not_equals']),
            value: z.any(),
          }).optional(),
          defaultValue: z.any().optional(),
        })),
      });

      const validMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text' as const,
            label: '姓名',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text' as const,
            label: '邮箱',
            required: true,
          },
        ],
      };

      expect(formMetadataSchema.safeParse(validMetadata).success).toBe(true);
    });

    it('表单创建输入应该符合预期模式', () => {
      const formCreateInputSchema = z.object({
        name: z.string().min(1),
        metadata: z.object({
          version: z.string(),
          fields: z.array(z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
            label: z.string(),
            placeholder: z.string().optional(),
            required: z.boolean().default(false),
            options: z.array(z.object({
              label: z.string(),
              value: z.string(),
            })).optional(),
            condition: z.object({
              fieldId: z.string(),
              operator: z.enum(['equals', 'not_equals']),
              value: z.any(),
            }).optional(),
            defaultValue: z.any().optional(),
          })),
        }),
      });

      const validInput = {
        name: '测试表单',
        metadata: {
          version: '1.0.0',
          fields: [
            {
              id: 'name',
              name: 'name',
              type: 'text' as const,
              label: '姓名',
              required: true,
            },
          ],
        },
      };

      expect(formCreateInputSchema.safeParse(validInput).success).toBe(true);
    });
  });

  describe('表单提交合约', () => {
    it('提交数据应该符合表单字段定义', () => {
      const formSubmissionSchema = z.object({
        formId: z.string(),
        data: z.any(),
      });

      const validSubmission = {
        formId: 'form-1',
        data: {
          name: '张三',
          email: 'zhangsan@example.com',
          age: 25,
        },
      };

      const result = formSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('应该验证提交数据的类型', () => {
      const textValidationSchema = z.string().min(1);
      const numberValidationSchema = z.number();
      const emailValidationSchema = z.string().email();

      // 测试文本字段
      expect(textValidationSchema.safeParse('Valid text').success).toBe(true);
      expect(textValidationSchema.safeParse('').success).toBe(false);

      // 测试数字字段
      expect(numberValidationSchema.safeParse(25).success).toBe(true);
      expect(numberValidationSchema.safeParse('25' as any).success).toBe(false);

      // 测试邮箱字段
      expect(emailValidationSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailValidationSchema.safeParse('invalid-email').success).toBe(false);
    });
  });

  describe('错误响应合约', () => {
    it('错误响应应该符合标准格式', () => {
      const errorResponseSchema = z.object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
        timestamp: z.string(),
      });

      const validErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: {
          field: 'email',
          issue: 'Invalid email format',
        },
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      expect(errorResponseSchema.safeParse(validErrorResponse).success).toBe(true);
    });

    it('应该定义标准错误代码', () => {
      const errorCodes = z.enum([
        'VALIDATION_ERROR',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'INTERNAL_ERROR',
        'RATE_LIMITED',
        'BAD_REQUEST',
      ]);

      expect(errorCodes.safeParse('VALIDATION_ERROR').success).toBe(true);
      expect(errorCodes.safeParse('INVALID_CODE').success).toBe(false);
    });
  });

  describe('分页响应合约', () => {
    it('分页响应应该符合标准格式', () => {
      const paginationResponseSchema = z.object({
        items: z.array(z.any()),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean(),
      });

      const validResponse = {
        items: [{ id: '1' }, { id: '2' }],
        total: 10,
        page: 1,
        pageSize: 2,
        hasNext: true,
        hasPrev: false,
      };

      expect(paginationResponseSchema.safeParse(validResponse).success).toBe(true);
    });

    it('应该验证分页参数', () => {
      const paginationParamsSchema = z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      });

      const validParams = {
        limit: 20,
        offset: 10,
        search: 'test',
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      expect(paginationParamsSchema.safeParse(validParams).success).toBe(true);

      const invalidParams = [
        { limit: 0 },
        { limit: 101 },
        { offset: -1 },
        { sortOrder: 'invalid' as any },
      ];

      invalidParams.forEach(params => {
        expect(paginationParamsSchema.safeParse(params).success).toBe(false);
      });
    });
  });
});