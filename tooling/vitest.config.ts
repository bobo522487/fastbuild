import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const workspaceRoot = process.cwd();

const alias: Record<string, string> = {};
const srcDir = resolve(workspaceRoot, "src");
if (existsSync(srcDir)) {
  alias["~"] = srcDir;
}

const includePatterns = [
  "src/**/*.{test,spec}.{js,ts,jsx,tsx}",
  "tests/**/*.{test,spec}.{js,ts,jsx,tsx}",
  "**/__tests__/**/*.{js,ts,jsx,tsx}",
];

const coverageExclude = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/*.config.*",
  "**/playwright-report/**",
];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["apps/nextjs/**", "jsdom"],
      ["**/*.client.{test,spec}.{js,ts,jsx,tsx}", "jsdom"],
    ],
    include: includePatterns,
    exclude: ["node_modules", "dist"],
    setupFiles: [resolve(__dirname, "./vitest.setup.ts")],
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: coverageExclude,
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
  },
  resolve: {
    alias,
  },
});
