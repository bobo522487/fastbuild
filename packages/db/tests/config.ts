import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 测试环境
    environment: "node",

    // 测试文件匹配模式
    include: ["**/*.test.ts", "**/*.spec.ts"],

    // 测试文件排除模式
    exclude: ["node_modules", "dist"],

    // 全局设置文件
    setupFiles: ["./setup.ts"],

    // 测试超时时间（30秒）
    testTimeout: 30000,

    // 并发测试
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
      },
    },

    // 测试覆盖率
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "tests/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // 报告器
    reporter: ["default", "junit"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },

    // 监听模式配置
    watch: false,

    // 静默模式（除非设置环境变量）
    silent: process.env.CI !== "true",

    // 传递给测试文件的环境变量
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },

    // 全局变量
    globals: true,
  },

  // 路径别名（如果使用）
  resolve: {
    alias: {
      "@": "./src",
      "~": "./tests",
    },
  },
});