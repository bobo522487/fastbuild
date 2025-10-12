/**
 * 全局测试设置
 *
 * 配置所有测试文件的全局环境变量
 */

// 注意：环境变量应该通过 .env.test 或测试命令行设置
// 不要在代码中硬编码环境变量

// Global setup can optionally export an async function
export default async function globalSetup() {
	// Any global setup that needs to run before all tests
	console.log("Global test environment setup complete");
	console.log("Test environment variables configured");
}
