/**
 * 测试环境变量 mock
 *
 * 这个文件提供了测试环境所需的环境变量 mock，
 * 避免 NextAuth 配置在测试中访问真实环境变量
 */

export const testEnv = {
	AUTH_SECRET: "test-secret-key-for-testing-only",
	AUTH_GITHUB_ID: "test-github-client-id",
	AUTH_GITHUB_SECRET: "test-github-client-secret",
	AUTH_RESEND_KEY: "test-resend-key",
	AUTH_EMAIL: "test@example.com",
	DATABASE_URL: "postgresql://postgres:password@localhost:5432/fastbuild_test",
	NODE_ENV: "test",
	SKIP_ENV_VALIDATION: "true",
};

// Mock process.env for tests
export const mockProcessEnv = {
	...process.env,
	...testEnv,
};
