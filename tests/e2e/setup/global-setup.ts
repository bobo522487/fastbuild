import { chromium, FullConfig } from '@playwright/test';
import { DatabaseTestHelpers } from '../../utils/database-helpers';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // 启动开发服务器（如果需要）
  const { baseURL } = config.projects[0].use;
  console.log(`🌐 Using base URL: ${baseURL}`);

  // 初始化测试数据库
  try {
    await DatabaseTestHelpers.setupTestDatabase();
    console.log('✅ Test database initialized');

    // 创建基础测试数据
    await createBaseTestData();
    console.log('✅ Base test data created');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }

  // 启动浏览器
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // 在全局范围内存储浏览器实例供测试使用
  process.browser = browser;
  process.testContext = context;

  console.log('✅ E2E test global setup completed');
}

async function createBaseTestData() {
  // 创建测试管理员用户
  const adminUser = await DatabaseTestHelpers.createTestUser({
    email: 'admin@test.com',
    name: 'Admin User',
    password: 'AdminPassword123!',
  });

  // 创建示例项目
  await DatabaseTestHelpers.createTestProject(adminUser.id, {
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project for E2E testing',
    visibility: 'PUBLIC',
  });

  // 创建普通测试用户
  await DatabaseTestHelpers.createTestUser({
    email: 'user@test.com',
    name: 'Regular User',
    password: 'UserPassword123!',
  });
}

export default globalSetup;

// 扩展NodeJS全局类型
declare global {
  namespace NodeJS {
    interface Global {
      browser?: import('playwright').Browser;
      testContext?: import('playwright').BrowserContext;
    }
  }
}