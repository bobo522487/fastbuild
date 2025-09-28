import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.base.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: [
      'node_modules',
      'dist',
      '**/*.spec.ts'
    ],
    setupFiles: ['./tests/setup.ts'],
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