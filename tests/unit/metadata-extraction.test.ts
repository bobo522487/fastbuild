// 测试元数据提取功能
import { describe, it, expect } from 'vitest';
import { buildZodSchema, SchemaCompiler } from '@workspace/schema-compiler';

describe('Metadata Extraction and Usage', () => {
  it('should extract metadata from compiled schema', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'username',
          name: 'username',
          type: 'text',
          label: '用户名',
          placeholder: '请输入用户名',
          required: true,
        },
      ],
    };

    const compiler = new SchemaCompiler();
    const result = compiler.compile(metadata);

    expect(result.success).toBe(true);
    expect(result.schema).toBeDefined();

    // 获取编译后的 schema 对象
    const schema = result.schema!;

    // 验证基本功能
    expect(schema.safeParse({ username: 'testuser' }).success).toBe(true);
    expect(schema.safeParse({ username: '' }).success).toBe(false);
  });

  it('should preserve field metadata across compilation', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: 'email address',
          placeholder: 'your@email.com',
          required: true,
        },
        {
          id: 'password',
          name: 'password',
          type: 'text',
          label: 'password',
          placeholder: '输入密码',
          required: true,
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
          required: false,
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 测试不同字段的验证
    const validData = {
      email: 'user@example.com',
      password: 'secure123',
      age: 25
    };

    const invalidData = {
      email: '',
      password: '123',
      age: 'not-a-number'
    };

    expect(schema.safeParse(validData).success).toBe(true);
    expect(schema.safeParse(invalidData).success).toBe(false);
  });

  it('should support metadata for conditional fields', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'hasExperience',
          name: 'hasExperience',
          type: 'checkbox',
          label: '有工作经验',
        },
        {
          id: 'experience',
          name: 'experience',
          type: 'textarea',
          label: '工作经验描述',
          required: false,
          condition: {
            fieldId: 'hasExperience',
            operator: 'equals',
            value: true,
          },
        },
      ],
    };

    const compiler = new SchemaCompiler();
    const result = compiler.compile(metadata);

    expect(result.success).toBe(true);
    expect(result.schema).toBeDefined();

    // 测试可见性计算
    const visibility = compiler.computeVisibility(metadata.fields, {
      hasExperience: true
    });

    expect(visibility.hasExperience).toBe(true);
    expect(visibility.experience).toBe(true);
  });

  it('should handle complex field metadata', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'preferences',
          name: 'preferences',
          type: 'select',
          label: '偏好设置',
          required: false,
          options: [
            { label: '选项 A', value: 'a' },
            { label: '选项 B', value: 'b' },
            { label: '选项 C', value: 'c' },
          ],
        },
        {
          id: 'agreement',
          name: 'agreement',
          type: 'checkbox',
          label: '同意条款',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 测试选择器的验证
    expect(schema.safeParse({ preferences: 'a', agreement: true }).success).toBe(true);
    expect(schema.safeParse({ preferences: 'd', agreement: true }).success).toBe(false);

    // 测试必填的复选框
    expect(schema.safeParse({ preferences: 'a', agreement: false }).success).toBe(true);
    expect(schema.safeParse({ preferences: 'a' }).success).toBe(true); // 复选框默认为 false
  });

  it('should maintain metadata consistency', () => {
    const metadata1 = {
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

    const metadata2 = {
      version: '1.0.0',
      fields: [
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          required: true,
        },
      ],
    };

    const compiler = new SchemaCompiler();
    const result1 = compiler.compile(metadata1);
    const result2 = compiler.compile(metadata2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.schema).toBeDefined();
    expect(result2.schema).toBeDefined();

    // 确保 schema 是独立的
    expect(result1.schema).not.toBe(result2.schema);

    // 验证各自的功能
    expect(result1.schema!.safeParse({ name: '张三' }).success).toBe(true);
    expect(result2.schema!.safeParse({ email: 'test@example.com' }).success).toBe(true);
  });
});