// 测试统一错误处理系统
import { describe, it, expect } from 'vitest';
import { SchemaCompiler, validateFormData, setErrorLocale } from '@workspace/schema-compiler';

describe('Unified Error Handling System', () => {
  let compiler: SchemaCompiler;

  beforeEach(() => {
    compiler = new SchemaCompiler();
  });

  it('should provide localized error messages in Chinese', () => {
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
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          required: true,
        },
      ],
    };

    const result = compiler.validate({ name: '', email: 'invalid-email' }, metadata);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);

    // 验证中文错误消息
    const nameError = result.errors.find(e => e.field === 'name');
    const emailError = result.errors.find(e => e.field === 'email');

    expect(nameError?.message).toContain('不能为空');
    expect(emailError?.message).toContain('邮箱');
  });

  it('should support English error messages', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: 'Name',
          required: true,
        },
      ],
    };

    // 设置语言为英文
    compiler.setErrorLocale('en-US');

    const result = compiler.validate({ name: '' }, metadata);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);

    const error = result.errors[0];
    expect(error.message).toContain('Required');
  });

  it('should handle different error types appropriately', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
          required: true,
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

    const result = compiler.validate({ age: 'not-a-number', email: 'invalid-email' }, metadata);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);

    // 验证不同类型的错误
    const ageError = result.errors.find(e => e.field === 'age');
    const emailError = result.errors.find(e => e.field === 'email');

    expect(ageError?.code).toBe('invalid_type');
    expect(emailError?.code).toBe('invalid_string');
  });

  it('should provide detailed error information', () => {
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

    const result = compiler.validate({ username: '' }, metadata);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);

    const error = result.errors[0];
    expect(error.field).toBe('username');
    expect(error.message).toBeDefined();
    expect(error.code).toBeDefined();
  });

  it('should handle compilation errors', () => {
    const invalidMetadata = {
      version: '',
      fields: [],
    };

    const result = compiler.compile(invalidMetadata as any);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);

    const error = result.errors[0];
    expect(error.field).toBe('version');
    expect(error.type).toBe('VALIDATION');
  });

  it('should work with convenience functions', () => {
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

    // 测试全局设置语言
    setErrorLocale('en-US');
    let result = validateFormData({ name: '' }, metadata);
    expect(result.errors[0].message).toContain('Required');

    // 切换回中文
    setErrorLocale('zh-CN');
    result = validateFormData({ name: '' }, metadata);
    expect(result.errors[0].message).toContain('不能为空');
  });

  it('should handle complex validation scenarios', () => {
    const metadata = {
      version: '1.0.0',
      fields: [
        {
          id: 'password',
          name: 'password',
          type: 'text',
          label: '密码',
          required: true,
        },
        {
          id: 'confirmPassword',
          name: 'confirmPassword',
          type: 'text',
          label: '确认密码',
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

    const result = compiler.validate({
      password: '',
      confirmPassword: 'short',
      age: 'not-a-number'
    }, metadata);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // 验证错误分类
    const passwordError = result.errors.find(e => e.field === 'password');
    const ageError = result.errors.find(e => e.field === 'age');

    expect(passwordError?.message).toContain('不能为空');
    expect(ageError?.code).toBe('invalid_type');
  });

  it('should maintain error handling consistency', () => {
    const metadata = {
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

    // 测试多次验证的一致性
    const result1 = compiler.validate({ email: '' }, metadata);
    const result2 = compiler.validate({ email: '' }, metadata);

    expect(result1.success).toBe(result2.success);
    expect(result1.errors).toHaveLength(result2.errors.length);
    expect(result1.errors[0].message).toBe(result2.errors[0].message);
  });

  it('should handle edge cases gracefully', () => {
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

    // 测试各种边界情况
    const testCases = [
      { input: { checkbox: 'invalid' }, expectError: true },
      { input: { checkbox: null }, expectError: true },
      { input: { checkbox: undefined }, expectError: true },
      { input: { checkbox: true }, expectError: false },
      { input: { checkbox: false }, expectError: false },
    ];

    testCases.forEach(({ input, expectError }) => {
      const result = compiler.validate(input, metadata);
      if (expectError) {
        expect(result.success).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });
  });
});