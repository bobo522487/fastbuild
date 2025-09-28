import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.base.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    setupFiles: ['./tests/performance/setup.ts'],
    include: ['tests/performance/**/*.test.ts'],
    exclude: ['tests/unit/**', 'tests/integration/**', 'tests/e2e/**', 'tests/contract/**'],
    globals: true,
    // 性能测试配置
    hookTimeout: 30000, // 30秒超时
  },
  // 性能监控
  benchmark: {
    include: ['tests/performance/**/*.benchmark.ts'],
    exclude: ['tests/**/!(*.benchmark.ts)'],
  },
});