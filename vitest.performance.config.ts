import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/performance/setup.ts'],
    include: ['tests/performance/**/*.test.ts'],
    exclude: ['tests/unit/**', 'tests/integration/**', 'tests/e2e/**', 'tests/contract/**'],
    // 性能测试配置
    timeout: 30000, // 30秒超时
    slowTestThreshold: 5000, // 5秒慢测试阈值
  },
  resolve: {
    alias: {
      '@workspace/api': resolve(__dirname, 'packages/api/src'),
      '@workspace/database': resolve(__dirname, 'packages/database/src'),
    },
  },
  // 性能监控
  benchmark: {
    include: ['tests/performance/**/*.benchmark.ts'],
    exclude: ['tests/**/!(*.benchmark.ts)'],
  },
});