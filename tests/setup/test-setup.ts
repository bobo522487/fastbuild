import "@testing-library/jest-dom/vitest";
import { setupTestMocks } from "./test-config";
import { testDb } from "../utils/test-database";

// 设置测试 mocks
setupTestMocks();

// 设置测试数据库连接（全局设置，在每个测试文件之前运行）
beforeAll(async () => {
  // 只在集成测试中设置数据库
  if (process.env.NODE_ENV === 'test') {
    try {
      await testDb.setup();
      console.log('✅ Test database initialized for test suite');
    } catch (error) {
      console.warn('⚠️  Test database setup failed (non-db tests):', error);
    }
  }
});

// 在所有测试完成后清理
afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    try {
      await testDb.disconnect();
      console.log('✅ Test database disconnected after test suite');
    } catch (error) {
      console.warn('⚠️  Test database disconnect failed:', error);
    }
  }
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter() {
		return {
			push: vi.fn(),
			replace: vi.fn(),
			refresh: vi.fn(),
			back: vi.fn(),
			forward: vi.fn(),
			prefetch: vi.fn(),
		};
	},
	useSearchParams() {
		return new URLSearchParams();
	},
	usePathname() {
		return "/";
	},
}));
