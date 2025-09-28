import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**', 'tests/performance/**', 'tests/contract/**'],
  },
  resolve: {
    alias: {
      '@workspace/api': path.resolve(__dirname, 'packages/api/src'),
      '@workspace/database': path.resolve(__dirname, 'packages/database/src'),
      '@workspace/ui': path.resolve(__dirname, 'packages/ui/src'),
      '@workspace/schema-compiler': path.resolve(__dirname, 'packages/schema-compiler/src'),
      '@workspace/types': path.resolve(__dirname, 'packages/types/src'),
      '@workspace/errors': path.resolve(__dirname, 'packages/errors/src'),
      '@workspace/typescript-config': path.resolve(__dirname, 'packages/typescript-config'),
      '@workspace/eslint-config': path.resolve(__dirname, 'packages/eslint-config'),
    },
  },
});