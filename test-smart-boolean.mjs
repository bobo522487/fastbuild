// 测试新的智能布尔值转换功能
import { buildZodSchema } from '@workspace/schema-compiler';

console.log('🧪 Testing Smart Boolean Conversion...');

// 创建一个复选框字段的表单元数据
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

// 测试各种输入类型
const testCases = [
  // 原生布尔值（应该直接工作）
  { input: true, expected: true, description: '原生 true' },
  { input: false, expected: false, description: '原生 false' },

  // 数字输入
  { input: 1, expected: true, description: '数字 1' },
  { input: 0, expected: false, description: '数字 0' },
  { input: 2, expected: false, description: '数字 2（应该为 false）' },

  // 字符串输入（智能转换）
  { input: 'true', expected: true, description: '字符串 "true"' },
  { input: 'false', expected: false, description: '字符串 "false"' },
  { input: '1', expected: true, description: '字符串 "1"' },
  { input: '0', expected: false, description: '字符串 "0"' },
  { input: 'yes', expected: true, description: '字符串 "yes"' },
  { input: 'no', expected: false, description: '字符串 "no"' },
  { input: 'on', expected: true, description: '字符串 "on"' },
  { input: 'off', expected: false, description: '字符串 "off"' },
  { input: 'TRUE', expected: true, description: '字符串 "TRUE"（大小写不敏感）' },
  { input: 'FALSE', expected: false, description: '字符串 "FALSE"（大小写不敏感）' },
  { input: '', expected: false, description: '空字符串（应该为 false）' },

  // 无效输入
  { input: 'invalid', expected: 'error', description: '无效字符串 "invalid"' },
  { input: 'maybe', expected: 'error', description: '无效字符串 "maybe"' },
  { input: null, expected: 'error', description: 'null 值' },
  { input: undefined, expected: 'error', description: 'undefined 值' },
];

console.log('\n📊 Test Results:\n');

testCases.forEach(({ input, expected, description }) => {
  const result = schema.safeParse({ checkbox: input });
  const success = result.success;
  const actual = success ? result.data.checkbox : 'failed';

  if (expected === 'error') {
    if (!success) {
      console.log(`✅ ${description}: 输入 ${JSON.stringify(input)} -> 正确拒绝`);
    } else {
      console.log(`❌ ${description}: 输入 ${JSON.stringify(input)} -> 应该拒绝但通过了，得到 ${actual}`);
    }
  } else {
    if (success && actual === expected) {
      console.log(`✅ ${description}: 输入 ${JSON.stringify(input)} -> ${actual}`);
    } else if (success) {
      console.log(`❌ ${description}: 输入 ${JSON.stringify(input)} -> 期望 ${expected}，得到 ${actual}`);
    } else {
      console.log(`❌ ${description}: 输入 ${JSON.stringify(input)} -> 验证失败`);
    }
  }
});

console.log('\n🎯 Smart Boolean Conversion Features:');
console.log('• 支持原生布尔值（true/false）');
console.log('• 支持数字转换（1=true, 0=false, 其他=false）');
console.log('• 智能字符串转换：true/false, 1/0, yes/no, on/off, y/n');
console.log('• 大小写不敏感');
console.log('• 空字符串转为 false');
console.log('• 无效输入正确拒绝');

console.log('\n✨ Test Complete!');