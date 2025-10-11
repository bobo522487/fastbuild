import { FullConfig } from '@playwright/test';
import { DatabaseTestHelpers } from '../../utils/database-helpers';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // 清理测试数据
    await DatabaseTestHelpers.cleanupTestData();
    console.log('✅ Test data cleaned up');

    // 断开数据库连接
    await DatabaseTestHelpers.teardownTestDatabase();
    console.log('✅ Database disconnected');

    // 关闭浏览器
    if (process.browser) {
      await process.browser.close();
      console.log('✅ Browser closed');
    }

    // 清理全局变量
    delete process.browser;
    delete process.testContext;

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }

  console.log('✅ E2E test global teardown completed');
}

export default globalTeardown;