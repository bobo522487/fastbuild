import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      // Workspace packages
      '@workspace/api': resolve(__dirname, 'packages/api/src'),
      '@workspace/database': resolve(__dirname, 'packages/database/src'),
      '@workspace/errors': resolve(__dirname, 'packages/errors/src'),
      '@workspace/schema-compiler': resolve(__dirname, 'packages/schema-compiler/src'),
      '@workspace/types': resolve(__dirname, 'packages/types/src'),
      '@workspace/ui': resolve(__dirname, 'packages/ui/src'),
      '@workspace/typescript-config': resolve(__dirname, 'packages/typescript-config'),
      '@workspace/eslint-config': resolve(__dirname, 'packages/eslint-config'),
      // Application alias
      '@': resolve(__dirname, 'apps/web/src'),
    }
  }
});