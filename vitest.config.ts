import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./tests/setup/test-setup.ts"],
		globalSetup: "./tests/setup/global-setup.ts",
		include: [
			"src/**/*.test.{js,ts,jsx,tsx}",
			"tests/integration/**/*.test.{js,ts,jsx,tsx}",
		],
		exclude: [
			"node_modules",
			"dist",
			".idea",
			".git",
			".cache",
			"tests/e2e/**",
			"**/*.config.{js,ts}",
		],
		// 测试匹配模式
		includeSource: ['src/**/*.ts'],
		// 环境变量配置
		env: {
			NODE_ENV: 'test',
			DATABASE_URL: process.env.DATABASE_URL || 'postgresql://prisma:prisma@localhost:5433/fastbuild_test',
			PRISMA_QUERY_LOGGING: 'false',
		},
		// 覆盖率配置
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"node_modules/",
				"tests/**",
				"**/*.config.{js,ts}",
				"**/coverage/**",
				"**/dist/**",
				"**/.next/**",
				// 排除路由文件（通常包含复杂的业务逻辑）
				"src/app/api/**/route.ts",
				// 排除中间件文件
				"src/server/api/middleware/**",
				// 排除配置文件
				"src/env.ts",
				"src/server/auth/config.ts",
			],
			// 设置覆盖率阈值
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},
			// 覆盖率水位标记
			watermarks: {
				lines: [50, 80],
				functions: [50, 80],
				branches: [50, 75],
				statements: [50, 80],
			},
			// 包含的目录
			include: [
				"src/lib/**",
				"src/components/**",
				"tests/utils/**",
			],
		},
		// 测试超时设置
		testTimeout: 10000,
		hookTimeout: 10000,
		// 并行测试配置
		pool: "threads",
		poolOptions: {
			threads: {
				maxThreads: 4,
				minThreads: 1,
			},
		},
		// 测试报告
		reporters: ["verbose", "html"],
		outputFile: {
			html: "./coverage/report.html",
		},
		// 模拟文件配置
		clearMocks: true,
		restoreMocks: true,
		// 监视模式配置
		watch: process.env.NODE_ENV !== 'production' && !process.env.CI,
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
			"@tests": resolve(__dirname, "./tests"),
			"@test-utils": resolve(__dirname, "./tests/utils"),
			"@mocks": resolve(__dirname, "./tests/__mocks__"),
		},
	},
});
