// 性能测试设置
import { vi } from 'vitest';

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fastbuild_test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock Prisma
vi.mock('@workspace/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    form: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(() => 'hashed-password'),
  compare: vi.fn(() => Promise.resolve(true)),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-token'),
  verify: vi.fn(() => ({ userId: 'test-user-id', email: 'test@example.com', role: 'USER' })),
}));

// 性能测试全局变量
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// 性能监控工具
global.performanceUtils = {
  /**
   * 测量函数执行时间
   */
  async measureExecutionTime<T>(fn: () => Promise<T>, name: string): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log(`${name} 执行时间: ${executionTime.toFixed(2)}ms`);
    return { result, executionTime };
  },

  /**
   * 测量内存使用
   */
  measureMemoryUsage(): NodeJS.MemoryUsage {
    const memory = process.memoryUsage();
    console.log('内存使用情况:');
    console.log(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External: ${(memory.external / 1024 / 1024).toFixed(2)} MB`);
    return memory;
  },

  /**
   * 执行并发测试
   */
  async runConcurrentTest<T>(
    fn: () => Promise<T>,
    concurrentCount: number,
    name: string
  ): Promise<{ results: T[]; totalTime: number; avgTime: number }> {
    console.log(`开始并发测试: ${name} (${concurrentCount}个并发请求)`);

    const startTime = performance.now();
    const promises = Array.from({ length: concurrentCount }, () => fn());
    const results = await Promise.all(promises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / concurrentCount;

    console.log(`${name} 并发测试结果:`);
    console.log(`  总时间: ${totalTime.toFixed(2)}ms`);
    console.log(`  平均时间: ${avgTime.toFixed(2)}ms`);
    console.log(`  QPS: ${(concurrentCount / totalTime * 1000).toFixed(2)}`);

    return { results, totalTime, avgTime };
  },

  /**
   * 性能断言
   */
  assertPerformance(
    actualTime: number,
    maxExpectedTime: number,
    operationName: string
  ): void {
    if (actualTime > maxExpectedTime) {
      console.warn(`性能警告: ${operationName} 耗时 ${actualTime.toFixed(2)}ms, 超过预期最大值 ${maxExpectedTime}ms`);
    } else {
      console.log(`✓ ${operationName} 性能良好 (${actualTime.toFixed(2)}ms < ${maxExpectedTime}ms)`);
    }
  },

  /**
   * 生成性能报告
   */
  generateReport(results: Record<string, number>): void {
    console.log('\n=== 性能测试报告 ===');
    Object.entries(results).forEach(([operation, time]) => {
      console.log(`${operation}: ${time.toFixed(2)}ms`);
    });
    console.log('==================\n');
  },
};

// 设置全局类型
declare global {
  var performanceUtils: {
    measureExecutionTime<T>(fn: () => Promise<T>, name: string): Promise<{ result: T; executionTime: number }>;
    measureMemoryUsage(): NodeJS.MemoryUsage;
    runConcurrentTest<T>(fn: () => Promise<T>, concurrentCount: number, name: string): Promise<{ results: T[]; totalTime: number; avgTime: number }>;
    assertPerformance(actualTime: number, maxExpectedTime: number, operationName: string): void;
    generateReport(results: Record<string, number>): void;
  };
}