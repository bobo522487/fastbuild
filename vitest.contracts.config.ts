import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/contract/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['packages/api/src/**/*.ts'],
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
      '@workspace/schema-compiler': resolve(__dirname, 'packages/schema-compiler/src')
    }
  }
});