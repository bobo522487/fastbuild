// 测试 JSON Schema 转换功能
import { describe, it, expect } from 'vitest';
import {
  buildZodSchema,
  convertFormMetadataToJsonSchema,
  convertZodSchemaToJsonSchema,
  validateJsonSchema,
  JsonSchemaConverter,
} from '@workspace/schema-compiler';
import { z } from 'zod';

describe('JSON Schema Converter', () => {
  let converter: JsonSchemaConverter;

  beforeEach(() => {
    converter = new JsonSchemaConverter();
  });

  it('should convert FormMetadata to JSON Schema', () => {
    const metadata = {
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
          required: true,
        },
      ],
    };

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata);

    expect(jsonSchema).toBeDefined();
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties).toBeDefined();
    expect(jsonSchema.required).toBeDefined();
    expect(jsonSchema.required).toContain('name');
    expect(jsonSchema.required).toContain('email');
    expect(jsonSchema.required).not.toContain('age');

    // 验证字段属性
    expect(jsonSchema.properties.name.type).toBe('string');
    expect(jsonSchema.properties.age.type).toBe('number');
    expect(jsonSchema.properties.email.type).toBe('string');
  });

  it('should handle all field types correctly', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'text',
          name: 'text',
          type: 'text',
          label: '文本',
        },
        {
          id: 'number',
          name: 'number',
          type: 'number',
          label: '数字',
        },
        {
          id: 'date',
          name: 'date',
          type: 'date',
          label: '日期',
        },
        {
          id: 'checkbox',
          name: 'checkbox',
          type: 'checkbox',
          label: '复选框',
        },
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

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata);

    expect(jsonSchema.properties.text.type).toBe('string');
    expect(jsonSchema.properties.number.type).toBe('number');
    expect(jsonSchema.properties.date.type).toBe('string');
    expect(jsonSchema.properties.date.format).toBe('date-time');
    expect(jsonSchema.properties.checkbox.type).toBe('boolean');
    expect(jsonSchema.properties.select.type).toBe('string');
    expect(jsonSchema.properties.select.enum).toEqual(['option1', 'option2']);
  });

  it('should convert Zod Schema to JSON Schema', () => {
    const zodSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(120),
      email: z.string().email(),
      active: z.boolean(),
    });

    const jsonSchema = converter.convertZodSchemaToJsonSchema(zodSchema, {
      title: 'User Schema',
      description: 'User information schema',
    });

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.title).toBe('User Schema');
    expect(jsonSchema.description).toBe('User information schema');
    expect(jsonSchema.properties).toBeDefined();

    // 验证属性转换
    expect(jsonSchema.properties.name.type).toBe('string');
    expect(jsonSchema.properties.name.minLength).toBe(1);
    expect(jsonSchema.properties.age.type).toBe('number');
    expect(jsonSchema.properties.age.minimum).toBe(0);
    expect(jsonSchema.properties.age.maximum).toBe(120);
    expect(jsonSchema.properties.email.type).toBe('string');
    expect(jsonSchema.properties.email.format).toBe('email');
    expect(jsonSchema.properties.active.type).toBe('boolean');
  });

  it('should include examples when requested', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          placeholder: '请输入姓名',
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
        },
      ],
    };

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata, {
      includeExamples: true,
    });

    expect((jsonSchema as any).examples).toBeDefined();
    expect(Array.isArray((jsonSchema as any).examples)).toBe(true);
    expect((jsonSchema as any).examples.length).toBeGreaterThan(0);
  });

  it('should handle required fields correctly', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'requiredField',
          name: 'requiredField',
          type: 'text',
          label: '必填字段',
          required: true,
        },
        {
          id: 'optionalField',
          name: 'optionalField',
          type: 'text',
          label: '可选字段',
          required: false,
        },
      ],
    };

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata);

    expect(jsonSchema.required).toBeDefined();
    expect(jsonSchema.required).toContain('requiredField');
    expect(jsonSchema.required).not.toContain('optionalField');
  });

  it('should validate JSON Schema correctly', () => {
    const validSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    };

    const invalidSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name', 'age'], // age 不在 properties 中
    };

    const validResult = converter.validateJsonSchema(validSchema as any);
    const invalidResult = converter.validateJsonSchema(invalidSchema as any);

    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  it('should handle complex Zod schemas', () => {
    const complexSchema = z.object({
      user: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(18).optional(),
      }),
      preferences: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean().default(true),
      }),
      tags: z.array(z.string()).optional(),
    });

    const jsonSchema = converter.convertZodSchemaToJsonSchema(complexSchema);

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties.user).toBeDefined();
    expect(jsonSchema.properties.user.type).toBe('object');
    expect(jsonSchema.properties.preferences).toBeDefined();
    expect(jsonSchema.properties.tags).toBeDefined();
  });

  it('should work with convenience functions', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'test',
          name: 'test',
          type: 'text',
          label: '测试',
        },
      ],
    };

    const jsonSchema1 = convertFormMetadataToJsonSchema(metadata);
    const jsonSchema2 = converter.convertFormMetadataToJsonSchema(metadata);

    expect(jsonSchema1).toEqual(jsonSchema2);
  });

  it('should handle edge cases', () => {
    // 空表单
    const emptyMetadata = {
      version: '1.0.0',
      fields: [],
    };

    const emptySchema = converter.convertFormMetadataToJsonSchema(emptyMetadata);
    expect(emptySchema.type).toBe('object');
    expect(emptySchema.properties).toEqual({});
    expect(emptySchema.required).toBeUndefined();

    // 只有可选字段
    const optionalOnlyMetadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'optional',
          name: 'optional',
          type: 'text',
          label: '可选',
          required: false,
        },
      ],
    };

    const optionalSchema = converter.convertFormMetadataToJsonSchema(optionalOnlyMetadata);
    expect(optionalSchema.required).toBeUndefined();
  });

  it('should generate documentation', () => {
    const metadata = {
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

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata, {
      title: '用户表单',
      description: '用户信息表单',
    });

    const documentation = converter.generateSchemaDocumentation(jsonSchema);

    expect(typeof documentation).toBe('string');
    expect(documentation).toContain('# JSON Schema Documentation');
    expect(documentation).toContain('用户表单');
    expect(documentation).toContain('姓名');
  });

  it('should handle select fields without options', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'select',
          name: 'select',
          type: 'select',
          label: '选择',
          // 没有 options
        },
      ],
    };

    const jsonSchema = converter.convertFormMetadataToJsonSchema(metadata);

    expect(jsonSchema.properties.select.type).toBe('string');
    expect(jsonSchema.properties.select.enum).toBeUndefined();
  });

  it('should preserve additional settings', () => {
    const metadata = {
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

    const strictSchema = converter.convertFormMetadataToJsonSchema(metadata, {
      strictMode: true,
    });

    const laxSchema = converter.convertFormMetadataToJsonSchema(metadata, {
      strictMode: false,
    });

    expect(strictSchema.additionalProperties).toBe(false);
    expect(laxSchema.additionalProperties).toBe(true);
  });
});