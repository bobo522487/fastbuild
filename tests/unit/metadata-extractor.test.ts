// 测试元数据提取工具
import { describe, it, expect } from 'vitest';
import { buildZodSchema, extractMetadata, generateUIConfig, generateDocumentation, validateMetadata } from '@workspace/schema-compiler';

describe('Metadata Extractor', () => {
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
        {
          id: 'password',
          name: 'password',
          type: 'text',
          label: 'password',
          placeholder: '请输入密码',
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
    const extractedMetadata = extractMetadata(schema);

    expect(extractedMetadata).toBeDefined();
    expect(typeof extractedMetadata).toBe('object');

    // 验证字段存在
    expect(extractedMetadata.username).toBeDefined();
    expect(extractedMetadata.password).toBeDefined();
    expect(extractedMetadata.age).toBeDefined();

    // 验证元数据结构
    expect(extractedMetadata.username.fieldId).toBe('username');
    expect(extractedMetadata.username.fieldType).toBe('text');
    expect(extractedMetadata.username.label).toBe('用户名');
    expect(extractedMetadata.username.required).toBe(true);
    expect(extractedMetadata.username.ui.component).toBe('input');

    // 验证敏感字段标记
    expect(extractedMetadata.password.business.sensitive).toBe(true);
    expect(extractedMetadata.password.business.encrypted).toBe(true);
  });

  it('should generate UI configuration', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          placeholder: 'your@email.com',
          required: true,
        },
        {
          id: 'preferences',
          name: 'preferences',
          type: 'select',
          label: '偏好设置',
          options: [
            { label: '选项 A', value: 'a' },
            { label: '选项 B', value: 'b' },
          ],
        },
      ],
    };

    const schema = buildZodSchema(metadata);
    const extractedMetadata = extractMetadata(schema);
    const uiConfig = generateUIConfig(extractedMetadata);

    expect(uiConfig).toBeDefined();
    expect(uiConfig.email).toBeDefined();
    expect(uiConfig.preferences).toBeDefined();

    expect(uiConfig.email.component).toBe('input');
    expect(uiConfig.email.label).toBe('邮箱');
    expect(uiConfig.email.required).toBe(true);

    expect(uiConfig.preferences.component).toBe('select');
    expect(uiConfig.preferences.label).toBe('偏好设置');
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

    const schema = buildZodSchema(metadata);
    const extractedMetadata = extractMetadata(schema);
    const documentation = generateDocumentation(extractedMetadata);

    expect(typeof documentation).toBe('string');
    expect(documentation).toContain('# 表单字段文档');
    expect(documentation).toContain('## name');
    expect(documentation).toContain('**类型**: text');
    expect(documentation).toContain('**标签**: 姓名');
    expect(documentation).toContain('**必填**: 是');
  });

  it('should validate metadata', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'valid',
          name: 'valid',
          type: 'text',
          label: '有效字段',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);
    const extractedMetadata = extractMetadata(schema);
    const validation = validateMetadata(extractedMetadata);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should handle complex schemas with union types', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'checkbox',
          name: 'checkbox',
          type: 'checkbox',
          label: '复选框',
          required: true,
        },
      ],
    };

    const schema = buildZodSchema(metadata);
    const extractedMetadata = extractMetadata(schema);

    expect(extractedMetadata.checkbox).toBeDefined();
    expect(extractedMetadata.checkbox.fieldType).toBe('checkbox');
    expect(extractedMetadata.checkbox.ui.component).toBe('checkbox');
  });

  it('should preserve all metadata across different field types', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'text_field',
          name: 'text_field',
          type: 'text',
          label: '文本字段',
          placeholder: '输入文本',
          required: true,
        },
        {
          id: 'number_field',
          name: 'number_field',
          type: 'number',
          label: '数字字段',
          required: false,
        },
        {
          id: 'select_field',
          name: 'select_field',
          type: 'select',
          label: '选择字段',
          options: [
            { label: '选项1', value: 'option1' },
            { label: '选项2', value: 'option2' },
          ],
        },
        {
          id: 'date_field',
          name: 'date_field',
          type: 'date',
          label: '日期字段',
          required: false,
        },
      ],
    };

    const schema = buildZodSchema(metadata);
    const extractedMetadata = extractMetadata(schema);

    // 验证所有字段类型都有正确的元数据
    expect(extractedMetadata.text_field.ui.component).toBe('input');
    expect(extractedMetadata.number_field.ui.component).toBe('input');
    expect(extractedMetadata.select_field.ui.component).toBe('select');
    expect(extractedMetadata.date_field.ui.component).toBe('date-picker');
  });
});