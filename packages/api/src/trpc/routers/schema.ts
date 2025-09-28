import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import {
  SchemaCompiler,
  buildZodSchema,
  validateFormData,
  computeFieldVisibility,
  clearSchemaCache,
  compileFormMetadata,
} from '@workspace/schema-compiler';
import type { Context } from '../context';

// 表单字段验证 Schema
const FormFieldSchema = z.object({
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

// 表单元数据验证 Schema
const FormMetadataSchema = z.object({
  version: z.string(),
  fields: z.array(FormFieldSchema),
});

// 全局编译器实例
const schemaCompiler = new SchemaCompiler({
  enableCache: true,
  cacheMaxSize: 100,
  validateCircularReference: true,
  detailedErrors: true
});

export const schemaRouter = router({
  /**
   * 编译表单元数据为 Zod Schema
   */
  compile: publicProcedure
    .input(z.object({
      metadata: FormMetadataSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        const result = compileFormMetadata(input.metadata as any);

        return {
          success: result.success,
          schema: result.success ? 'Zod Schema compiled successfully' : undefined,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          schema: undefined,
          errors: [{
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown compilation error',
            type: 'UNKNOWN' as const,
          }],
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * 验证表单数据
   */
  validate: publicProcedure
    .input(z.object({
      data: z.record(z.any()),
      metadata: FormMetadataSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        const result = validateFormData(input.data, input.metadata as any);

        return {
          success: result.success,
          data: result.success ? result.data : undefined,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          data: undefined,
          errors: [{
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown validation error',
            code: 'UNKNOWN',
          }],
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * 计算字段可见性
   */
  computeVisibility: publicProcedure
    .input(z.object({
      fields: z.array(FormFieldSchema),
      values: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      try {
        const visibility = computeFieldVisibility(input.fields as any, input.values);

        return {
          success: true,
          visibility,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          visibility: {},
          errors: [{
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown visibility computation error',
            code: 'UNKNOWN',
          }],
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * 批量验证表单数据
   */
  batchValidate: publicProcedure
    .input(z.object({
      submissions: z.array(z.object({
        data: z.record(z.any()),
        metadata: FormMetadataSchema,
      })),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = input.submissions.map((submission, index) => {
          const result = validateFormData(submission.data, submission.metadata as any);

          return {
            index,
            success: result.success,
            data: result.success ? result.data : undefined,
            errors: result.errors,
          };
        });

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
          success: true,
          results,
          summary: {
            total: results.length,
            success: successCount,
            failures: failureCount,
            successRate: successCount / results.length,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          results: [],
          summary: {
            total: 0,
            success: 0,
            failures: 0,
            successRate: 0,
          },
          errors: [{
            field: 'system',
            message: error instanceof Error ? error.message : 'Unknown batch validation error',
            code: 'UNKNOWN',
          }],
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * 获取表单字段类型信息
   */
  getFieldTypes: publicProcedure
    .query(() => {
      return {
        success: true,
        fieldTypes: [
          {
            type: 'text',
            label: '文本输入',
            description: '单行文本输入框',
            supports: ['required', 'placeholder', 'defaultValue', 'condition'],
          },
          {
            type: 'textarea',
            label: '多行文本',
            description: '多行文本输入区域',
            supports: ['required', 'placeholder', 'defaultValue', 'condition'],
          },
          {
            type: 'number',
            label: '数字输入',
            description: '数字输入框，支持整数和小数',
            supports: ['required', 'placeholder', 'defaultValue', 'condition'],
          },
          {
            type: 'select',
            label: '下拉选择',
            description: '单选下拉菜单',
            supports: ['required', 'options', 'defaultValue', 'condition'],
          },
          {
            type: 'date',
            label: '日期选择',
            description: '日期选择器',
            supports: ['required', 'defaultValue', 'condition'],
          },
          {
            type: 'checkbox',
            label: '复选框',
            description: '布尔值选择',
            supports: ['required', 'defaultValue', 'condition'],
          },
        ],
        conditionOperators: [
          { value: 'equals', label: '等于' },
          { value: 'not_equals', label: '不等于' },
        ],
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * 清空 schema 缓存
   */
  clearCache: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new Error('FORBIDDEN');
      }

      try {
        clearSchemaCache();

        return {
          success: true,
          message: 'Schema 缓存已清空',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown cache clear error',
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * 验证表单元数据的结构完整性
   */
  validateMetadata: publicProcedure
    .input(z.object({
      metadata: FormMetadataSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        const result = schemaCompiler.compile(input.metadata as any);

        if (result.success) {
          return {
            success: true,
            isValid: true,
            message: '表单元数据验证通过',
            timestamp: new Date().toISOString(),
          };
        } else {
          return {
            success: true,
            isValid: false,
            message: '表单元数据验证失败',
            errors: result.errors,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (error) {
        return {
          success: false,
          isValid: false,
          message: error instanceof Error ? error.message : 'Unknown metadata validation error',
          timestamp: new Date().toISOString(),
        };
      }
    }),
});