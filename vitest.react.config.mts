import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.base.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'jsdom', // React 组件测试需要 jsdom 环境
    setupFiles: ['./tests/setup.ts', './tests/react.setup.ts'],
    include: [
      'tests/unit/components/**/*.test.ts',
      'tests/unit/components/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.test.tsx',
      'tests/performance/**/*.test.ts',
      'apps/web/**/*.test.ts',
      'apps/web/**/*.test.tsx',
    ],
  },
});