// 智能布尔值转换功能测试
import { describe, it, expect } from 'vitest';
import { buildZodSchema } from '@workspace/schema-compiler';

describe('Smart Boolean Conversion (Zod 4 Enhancement)', () => {
  it('should handle various boolean input types', () => {
    const metadata = {
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

    const schema = buildZodSchema(metadata);

    // 原生布尔值
    expect(schema.safeParse({ checkbox: true }).success).toBe(true);
    expect(schema.safeParse({ checkbox: false }).success).toBe(true);

    // 数字转换
    expect(schema.safeParse({ checkbox: 1 }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 0 }).success).toBe(true);

    // 智能字符串转换
    expect(schema.safeParse({ checkbox: 'true' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'false' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: '1' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: '0' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'yes' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'no' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'on' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'off' }).success).toBe(true);

    // 大小写不敏感
    expect(schema.safeParse({ checkbox: 'TRUE' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'FALSE' }).success).toBe(true);
  });

  it('should correctly convert values to boolean', () => {
    const metadata = {
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

    const schema = buildZodSchema(metadata);

    // 验证转换结果
    expect(schema.parse({ checkbox: true }).checkbox).toBe(true);
    expect(schema.parse({ checkbox: false }).checkbox).toBe(false);
    expect(schema.parse({ checkbox: 1 }).checkbox).toBe(true);
    expect(schema.parse({ checkbox: 0 }).checkbox).toBe(false);
    expect(schema.parse({ checkbox: 'true' }).checkbox).toBe(true);
    expect(schema.parse({ checkbox: 'false' }).checkbox).toBe(false);
    expect(schema.parse({ checkbox: '1' }).checkbox).toBe(true);
    expect(schema.parse({ checkbox: '0' }).checkbox).toBe(false);
    expect(schema.parse({ checkbox: 'yes' }).checkbox).toBe(true);
    expect(schema.parse({ checkbox: 'no' }).checkbox).toBe(false);
    expect(schema.parse({ checkbox: 'TRUE' }).checkbox).toBe(true);
  });

  it('should reject invalid inputs', () => {
    const metadata = {
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

    const schema = buildZodSchema(metadata);

    // 根据新的转换逻辑，只有完全无效的类型才会被拒绝
    expect(schema.safeParse({ checkbox: null }).success).toBe(false);
    expect(schema.safeParse({ checkbox: {} }).success).toBe(false);
    expect(schema.safeParse({ checkbox: [] }).success).toBe(false);

    // 字符串都会被转换（包括 'invalid' 和 'maybe' 会转为 false）
    expect(schema.safeParse({ checkbox: 'invalid' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: 'maybe' }).success).toBe(true);
    expect(schema.safeParse({ checkbox: undefined }).success).toBe(true); // 可选字段的默认值
  });

  it('should handle edge cases correctly', () => {
    const metadata = {
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

    const schema = buildZodSchema(metadata);

    // 边界情况
    expect(schema.parse({ checkbox: '' }).checkbox).toBe(false); // 空字符串转为 false
    expect(schema.parse({ checkbox: '2' }).checkbox).toBe(false); // 数字 2 转为 false
    expect(schema.parse({ checkbox: -1 }).checkbox).toBe(false); // 负数转为 false
    expect(schema.parse({ checkbox: '  true  ' }).checkbox).toBe(true); // 带空格的字符串
  });
});