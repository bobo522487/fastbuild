import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      '**/*.spec.ts'
    ],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/api/src/**/*.ts',
        'packages/database/src/**/*.ts',
        'packages/errors/src/**/*.ts',
        'packages/schema-compiler/src/**/*.ts'
      ],
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
      '@workspace/api': resolve(__dirname, 'packages/api/src'),
      '@workspace/database': resolve(__dirname, 'packages/database/src'),
      '@workspace/errors': resolve(__dirname, 'packages/errors/src'),
      '@workspace/schema-compiler': resolve(__dirname, 'packages/schema-compiler/src'),
      '@workspace/ui': resolve(__dirname, 'packages/ui/src'),
      '@workspace/typescript-config': resolve(__dirname, 'packages/typescript-config'),
      '@workspace/eslint-config': resolve(__dirname, 'packages/eslint-config')
    }
  }
});