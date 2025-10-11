import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./tests/setup/test-setup.ts", "./tests/setup/global-setup.ts"],
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
				"src/app/api/**/route.ts",
			],
			// 设置覆盖率阈值
			lines: 80,
			functions: 80,
			branches: 75,
			statements: 80,
			// 覆盖率水位标记
			watermarks: {
				lines: [80, 95],
				functions: [80, 95],
				branches: [75, 90],
				statements: [80, 95],
			},
		},
		// 测试超时设置
		timeout: 10000,
		// 并行测试
		pool: "forks",
		poolOptions: {
			forks: {
				maxForks: 4,
				// 隔离每个测试文件
				isolate: true,
			},
		},
		// 测试报告
		reporters: ["verbose"],
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
			"@tests": resolve(__dirname, "./tests"),
		},
	},
});
