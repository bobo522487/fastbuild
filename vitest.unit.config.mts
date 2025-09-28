import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.base.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**', 'tests/performance/**', 'tests/contract/**'],
    globals: true,
    coverage: {
      ...baseConfig.test?.coverage,
      include: [
        'packages/api/src/**/*.ts',
        'packages/database/src/**/*.ts',
        'packages/errors/src/**/*.ts',
        'packages/schema-compiler/src/**/*.ts',
        'packages/ui/src/**/*.ts',
        'packages/types/src/**/*.ts',
      ],
    }
  },
});