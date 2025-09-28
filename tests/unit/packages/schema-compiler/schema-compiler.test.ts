// Schema Compiler Unit Tests
// 测试 schema-compiler 包的核心功能

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  SchemaCompiler,
  buildZodSchema,
  compileFormMetadata,
  validateFormData,
  computeFieldVisibility,
  clearSchemaCache,
  FormMetadata,
  FormField,
} from '@workspace/schema-compiler';

describe('SchemaCompiler', () => {
  let compiler: SchemaCompiler;

  beforeEach(() => {
    compiler = new SchemaCompiler();
    clearSchemaCache();
  });

  afterEach(() => {
    clearSchemaCache();
  });

  describe('compile', () => {
    it('should compile valid form metadata', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text',
            label: '邮箱',
            required: false,
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      expect(result.schema).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.schema).toBeInstanceOf(z.ZodObject);
    });

    it('should handle invalid metadata - missing version', () => {
      const metadata = {
        version: '',
        fields: [],
      } as FormMetadata;

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('version');
      expect(result.errors[0].type).toBe('VALIDATION');
    });

    it('should handle invalid metadata - missing fields', () => {
      const metadata = {
        version: '1.0.0',
        fields: null,
      } as any;

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('fields');
    });

    it('should handle invalid metadata - duplicate field IDs', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
          },
          {
            id: 'name',
            name: 'name2',
            type: 'text',
            label: '姓名2',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('重复');
    });

    it('should handle invalid metadata - duplicate field names', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name1',
            name: 'name',
            type: 'text',
            label: '姓名',
          },
          {
            id: 'name2',
            name: 'name',
            type: 'text',
            label: '姓名2',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('重复');
    });

    it('should handle invalid metadata - invalid field type', () => {
      const metadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'test',
            name: 'test',
            type: 'invalid' as any,
            label: '测试',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('无效的字段类型');
    });

    it('should handle circular references', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'field1',
            name: 'field1',
            type: 'text',
            label: 'Field 1',
            condition: {
              fieldId: 'field2',
              operator: 'equals',
              value: 'test',
            },
          },
          {
            id: 'field2',
            name: 'field2',
            type: 'text',
            label: 'Field 2',
            condition: {
              fieldId: 'field1',
              operator: 'equals',
              value: 'test',
            },
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('CIRCULAR_REFERENCE');
      expect(result.errors[0].message).toContain('循环引用');
    });
  });

  describe('validate', () => {
    const metadata: FormMetadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          required: true,
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
          required: false,
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          required: false,
        },
      ],
    };

    it('should validate valid data', () => {
      const data = {
        name: '张三',
        age: 25,
        email: 'zhangsan@example.com',
      };

      const result = compiler.validate(data, metadata);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle validation errors - missing required field', () => {
      const data = {
        age: 25,
        email: 'zhangsan@example.com',
      };

      const result = compiler.validate(data, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toContain('不能为空');
    });

    it('should handle validation errors - invalid number type', () => {
      const data = {
        name: '张三',
        age: 'not-a-number',
      };

      const result = compiler.validate(data, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('age');
    });

    it('should handle empty strings as undefined for optional fields', () => {
      const data = {
        name: '张三',
        age: 25,
        email: '',
      };

      const result = compiler.validate(data, metadata);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: '张三',
        age: 25,
        email: undefined,
      });
    });
  });

  describe('computeVisibility', () => {
    const fields: FormField[] = [
      {
        id: 'hasExperience',
        name: 'hasExperience',
        type: 'checkbox',
        label: '有经验',
      },
      {
        id: 'experience',
        name: 'experience',
        type: 'textarea',
        label: '经验描述',
        condition: {
          fieldId: 'hasExperience',
          operator: 'equals',
          value: true,
        },
      },
      {
        id: 'noExperience',
        name: 'noExperience',
        type: 'textarea',
        label: '无经验原因',
        condition: {
          fieldId: 'hasExperience',
          operator: 'not_equals',
          value: true,
        },
      },
    ];

    it('should show conditional field when condition is met', () => {
      const values = {
        hasExperience: true,
      };

      const visibility = compiler.computeVisibility(fields, values);

      expect(visibility.hasExperience).toBe(true);
      expect(visibility.experience).toBe(true);
      expect(visibility.noExperience).toBe(false);
    });

    it('should hide conditional field when condition is not met', () => {
      const values = {
        hasExperience: false,
      };

      const visibility = compiler.computeVisibility(fields, values);

      expect(visibility.hasExperience).toBe(true);
      expect(visibility.experience).toBe(false);
      expect(visibility.noExperience).toBe(true);
    });

    it('should show all fields when no conditions', () => {
      const simpleFields: FormField[] = [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
        },
      ];

      const visibility = compiler.computeVisibility(simpleFields, {});

      expect(visibility.name).toBe(true);
      expect(visibility.email).toBe(true);
    });
  });

  describe('field type mapping', () => {
    it('should handle text fields', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'text',
            name: 'text',
            type: 'text',
            label: '文本',
            required: true,
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      const schema = result.schema!;

      // Valid text
      expect(schema.safeParse({ text: 'hello' }).success).toBe(true);

      // Empty string should fail for required field
      expect(schema.safeParse({ text: '' }).success).toBe(false);

      // Optional text field
      const optionalMetadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'text',
            name: 'text',
            type: 'text',
            label: '文本',
            required: false,
          },
        ],
      };

      const optionalResult = compiler.compile(optionalMetadata);
      expect(optionalResult.success).toBe(true);
      const optionalSchema = optionalResult.schema!;
      expect(optionalSchema.safeParse({}).success).toBe(true);
    });

    it('should handle number fields', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'number',
            name: 'number',
            type: 'number',
            label: '数字',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      const schema = result.schema!;

      // Valid numbers
      expect(schema.safeParse({ number: 25 }).success).toBe(true);
      expect(schema.safeParse({ number: '25' }).success).toBe(true); // Should coerce

      // Invalid numbers
      expect(schema.safeParse({ number: 'not-a-number' }).success).toBe(false);
    });

    it('should handle select fields', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'select',
            name: 'select',
            type: 'select',
            label: '选择',
            options: [
              { label: '选项1', value: 'option1' },
              { label: '选项2', value: 'option2' },
            ],
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      const schema = result.schema!;

      // Valid options
      expect(schema.safeParse({ select: 'option1' }).success).toBe(true);
      expect(schema.safeParse({ select: 'option2' }).success).toBe(true);

      // Invalid option
      expect(schema.safeParse({ select: 'option3' }).success).toBe(false);
    });

    it('should handle checkbox fields', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'checkbox',
            name: 'checkbox',
            type: 'checkbox',
            label: '复选框',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      const schema = result.schema!;

      // Valid boolean values
      expect(schema.safeParse({ checkbox: true }).success).toBe(true);
      expect(schema.safeParse({ checkbox: false }).success).toBe(true);

      // Should coerce truthy/falsy values
      expect(schema.safeParse({ checkbox: 'true' }).success).toBe(true);
      expect(schema.safeParse({ checkbox: 'false' }).success).toBe(true);
    });

    it('should handle date fields', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'date',
            name: 'date',
            type: 'date',
            label: '日期',
          },
        ],
      };

      const result = compiler.compile(metadata);

      expect(result.success).toBe(true);
      const schema = result.schema!;

      // Valid date
      const date = new Date();
      expect(schema.safeParse({ date }).success).toBe(true);

      // Should coerce date strings
      expect(schema.safeParse({ date: date.toISOString() }).success).toBe(true);

      // Invalid date
      expect(schema.safeParse({ date: 'invalid-date' }).success).toBe(false);
    });
  });

  describe('caching', () => {
    it('should cache compiled schemas', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
          },
        ],
      };

      const compilerWithCache = new SchemaCompiler({ enableCache: true });

      // First compilation
      const result1 = compilerWithCache.compile(metadata);
      const schema1 = result1.schema;

      // Second compilation should use cache
      const result2 = compilerWithCache.compile(metadata);
      const schema2 = result2.schema;

      expect(schema1).toBe(schema2); // Same object reference
    });

    it('should respect cache size limits', () => {
      const compilerWithCache = new SchemaCompiler({ enableCache: true, cacheMaxSize: 2 });

      // Create 3 different metadata objects
      const metadata1: FormMetadata = {
        version: '1.0.0',
        fields: [{ id: 'field1', name: 'field1', type: 'text', label: 'Field 1' }],
      };

      const metadata2: FormMetadata = {
        version: '1.0.0',
        fields: [{ id: 'field2', name: 'field2', type: 'text', label: 'Field 2' }],
      };

      const metadata3: FormMetadata = {
        version: '1.0.0',
        fields: [{ id: 'field3', name: 'field3', type: 'text', label: 'Field 3' }],
      };

      // Compile all three
      compilerWithCache.compile(metadata1);
      compilerWithCache.compile(metadata2);
      compilerWithCache.compile(metadata3);

      // First one should be evicted from cache
      const result1 = compilerWithCache.compile(metadata1);
      const result2 = compilerWithCache.compile(metadata2);
      const result3 = compilerWithCache.compile(metadata3);

      // Should have different schema objects for the first one (recompiled)
      expect(result1.schema).not.toBe(result2.schema);
      expect(result2.schema).toBe(result2.schema); // Same object (cached)
      expect(result3.schema).toBe(result3.schema); // Same object (cached)
    });
  });

  describe('convenience functions', () => {
    it('buildZodSchema should work', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
          },
        ],
      };

      const schema = buildZodSchema(metadata);

      expect(schema).toBeInstanceOf(z.ZodObject);
      expect(schema.safeParse({ name: 'test' }).success).toBe(true);
    });

    it('buildZodSchema should throw on compilation error', () => {
      const metadata = {
        version: '',
        fields: [],
      } as FormMetadata;

      expect(() => buildZodSchema(metadata)).toThrow();
    });

    it('compileFormMetadata should work', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
          },
        ],
      };

      const result = compileFormMetadata(metadata);

      expect(result.success).toBe(true);
      expect(result.schema).toBeDefined();
    });

    it('validateFormData should work', () => {
      const metadata: FormMetadata = {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text',
            label: '姓名',
            required: true,
          },
        ],
      };

      const result = validateFormData({ name: 'test' }, metadata);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('computeFieldVisibility should work', () => {
      const fields: FormField[] = [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
        },
      ];

      const visibility = computeFieldVisibility(fields, {});

      expect(visibility.name).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle large forms efficiently', () => {
      const largeMetadata: FormMetadata = {
        version: '1.0.0',
        fields: Array.from({ length: 100 }, (_, i) => ({
          id: `field${i}`,
          name: `field${i}`,
          type: 'text',
          label: `字段 ${i}`,
          required: i < 50,
        })),
      };

      const startTime = Date.now();
      const result = compiler.compile(largeMetadata);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should compile in under 100ms
    });
  });
});