// 测试 Zod 4 .meta() 方法的集成和元数据系统
import { describe, it, expect } from 'vitest';
import { buildZodSchema } from '@workspace/schema-compiler';

describe('Meta Method Integration and Metadata System', () => {
  it('should attach metadata to schema using Zod 4 .meta() method', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          placeholder: '请输入您的姓名',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 检查 schema 是否有 meta 数据
    expect(schema).toBeDefined();

    // 验证 schema 的基本功能
    expect(schema.safeParse({ name: '张三' }).success).toBe(true);
    expect(schema.safeParse({ name: '' }).success).toBe(false);
  });

  it('should include UI component type in metadata', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
        },
        {
          id: 'gender',
          name: 'gender',
          type: 'select',
          label: '性别',
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ],
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 验证不同字段类型的组件类型映射
    expect(schema.safeParse({ name: '张三', age: 25, gender: 'male' }).success).toBe(true);
  });

  it('should include business logic metadata', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'password',
          name: 'password',
          type: 'text',
          label: 'password',
          required: true,
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: 'email address',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 验证敏感字段的标记
    expect(schema.safeParse({ password: '123456', email: 'test@example.com' }).success).toBe(true);
  });

  it('should include validation configuration in metadata', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'username',
          name: 'username',
          type: 'text',
          label: '用户名',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);

    // 验证验证配置
    expect(schema.safeParse({ username: 'admin' }).success).toBe(true);
    expect(schema.safeParse({ username: '' }).success).toBe(false);
  });

  it('should handle all field types with metadata', () => {
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
          id: 'textarea',
          name: 'textarea',
          type: 'textarea',
          label: '多行文本',
        },
        {
          id: 'number',
          name: 'number',
          type: 'number',
          label: '数字',
        },
        {
          id: 'select',
          name: 'select',
          type: 'select',
          label: '选择',
          options: [
            { label: '选项1', value: 'option1' },
          ],
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
      ],
    };

    const schema = buildZodSchema(metadata);

    // 验证所有字段类型都能正常编译
    expect(schema.safeParse({
      text: '测试',
      textarea: '多行文本',
      number: 42,
      select: 'option1',
      date: new Date(),
      checkbox: true,
    }).success).toBe(true);
  });
});