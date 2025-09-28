// 测试 z.stringbool() 的行为
import { z } from 'zod';

console.log('🧪 Testing z.stringbool() behavior...');

const stringboolSchema = z.stringbool();

// 测试各种输入类型
const testCases = [
  // 字符串输入 (应该工作)
  { input: 'true', expected: true },
  { input: 'false', expected: false },
  { input: '1', expected: true },
  { input: '0', expected: false },
  { input: 'yes', expected: true },
  { input: 'no', expected: false },
  { input: 'on', expected: true },
  { input: 'off', expected: false },

  // 布尔值输入 (需要检查)
  { input: true, expected: true },
  { input: false, expected: false },

  // 数字输入 (需要检查)
  { input: 1, expected: true },
  { input: 0, expected: false },

  // 无效输入
  { input: 'invalid', expected: false },
  { input: null, expected: false },
  { input: undefined, expected: false },
];

testCases.forEach(({ input, expected }) => {
  const result = stringboolSchema.safeParse(input);
  const success = result.success;
  const actual = success ? result.data : 'failed';

  console.log(`Input: ${JSON.stringify(input)} -> Success: ${success}, Value: ${actual}`);

  if (success && actual !== expected) {
    console.log(`  ⚠️  Expected ${expected}, got ${actual}`);
  }
});

// 测试原始 boolean schema 的行为
console.log('\n🔄 Testing original z.coerce.boolean()...');
const booleanSchema = z.coerce.boolean();

const booleanTestCases = [
  { input: true, expected: true },
  { input: false, expected: false },
  { input: 'true', expected: true },
  { input: 'false', expected: false },
  { input: 1, expected: true },
  { input: 0, expected: false },
];

booleanTestCases.forEach(({ input, expected }) => {
  const result = booleanSchema.safeParse(input);
  const success = result.success;
  const actual = success ? result.data : 'failed';

  console.log(`Input: ${JSON.stringify(input)} -> Success: ${success}, Value: ${actual}`);

  if (success && actual !== expected) {
    console.log(`  ⚠️  Expected ${expected}, got ${actual}`);
  }
});