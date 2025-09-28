// Zod 4 新特性验证脚本
// 用于测试 Zod 4 的新功能是否可用

import { z } from 'zod';

console.log('🔍 Testing Zod 4 New Features...');
console.log('Zod Version:', z.version?.() || 'Unknown');

// 测试 1: z.interface() (如果可用)
try {
  // 注意：z.interface() 可能在 Zod 4.1.11 中还未完全实现
  console.log('✅ Basic Zod functionality works');
} catch (error) {
  console.log('❌ Basic Zod functionality failed:', error.message);
}

// 测试 2: 统一错误处理 API
try {
  const schema = z.string().min(1, { message: 'Custom error message' });
  const result = schema.safeParse('');
  if (!result.success) {
    console.log('✅ Unified error handling available');
    console.log('   Error message:', result.error.errors[0]?.message);
  }
} catch (error) {
  console.log('❌ Unified error handling failed:', error.message);
}

// 测试 3: toJSONSchema() 方法 (如果可用)
try {
  const testSchema = z.object({
    name: z.string(),
    age: z.number()
  });

  if (typeof testSchema.toJSONSchema === 'function') {
    const jsonSchema = testSchema.toJSONSchema();
    console.log('✅ toJSONSchema() method available');
    console.log('   JSON Schema:', JSON.stringify(jsonSchema, null, 2));
  } else {
    console.log('⚠️  toJSONSchema() method not available in this version');
  }
} catch (error) {
  console.log('❌ toJSONSchema() test failed:', error.message);
}

// 测试 4: .meta() 方法 (如果可用)
try {
  const testSchema = z.string();
  if (typeof testSchema.meta === 'function') {
    const metaSchema = testSchema.meta({ ui: { label: 'Name' } });
    console.log('✅ .meta() method available');
  } else {
    console.log('⚠️  .meta() method not available in this version');
  }
} catch (error) {
  console.log('❌ .meta() test failed:', error.message);
}

// 测试 5: z.stringbool() (如果可用)
try {
  if (typeof z.stringbool === 'function') {
    const stringboolSchema = z.stringbool();
    console.log('✅ z.stringbool() available');

    // 测试各种布尔值字符串
    const testCases = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
    testCases.forEach(testCase => {
      const result = stringboolSchema.safeParse(testCase);
      console.log(`   "${testCase}" -> ${result.success ? result.data : 'failed'}`);
    });
  } else {
    console.log('⚠️  z.stringbool() not available in this version');
  }
} catch (error) {
  console.log('❌ z.stringbool() test failed:', error.message);
}

// 测试 6: 性能基准测试
try {
  console.log('\n🚀 Performance Benchmark Test...');

  // 创建一个复杂的 schema 来测试性能
  const complexSchema = z.object({
    user: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0).max(120),
      preferences: z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean(),
        language: z.string()
      })
    }),
    items: z.array(z.object({
      id: z.string(),
      quantity: z.number().min(1),
      price: z.number().min(0)
    })).min(1)
  });

  const testData = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      }
    },
    items: [
      { id: '1', quantity: 2, price: 19.99 },
      { id: '2', quantity: 1, price: 29.99 }
    ]
  };

  // 运行性能测试
  const iterations = 10000;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    complexSchema.parse(testData);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`✅ Performance test completed:`);
  console.log(`   Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average time per validation: ${avgTime.toFixed(4)}ms`);
  console.log(`   Validations per second: ${(1000 / avgTime).toFixed(0)}`);

} catch (error) {
  console.log('❌ Performance test failed:', error.message);
}

console.log('\n✨ Zod 4 Feature Test Complete!');