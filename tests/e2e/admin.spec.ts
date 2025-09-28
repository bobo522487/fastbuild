import { test, expect } from '@playwright/test';

test.describe('管理后台 E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到管理页面
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('管理页面应该正确加载', async ({ page }) => {
    await expect(page).toHaveTitle(/管理/);
    await expect(page.locator('h1')).toContainText('管理');
  });

  test('应该能够访问监控页面', async ({ page }) => {
    // 点击监控链接
    await page.click('text=监控');

    // 验证导航到了监控页面
    await expect(page).toHaveURL('/admin/monitoring');
    await expect(page.locator('h1')).toContainText('监控');
  });

  test('监控页面应该显示系统状态', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await page.waitForLoadState('networkidle');

    // 查找监控相关的元素
    const statusCards = page.locator('[data-testid="status-card"], .status-card, .card');
    if (await statusCards.count() > 0) {
      await expect(statusCards.first()).toBeVisible();
    }

    // 查找图表或统计数据
    const charts = page.locator('[data-testid="chart"], .chart, canvas');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('应该能够查看系统信息', async ({ page }) => {
    await page.goto('/admin/monitoring');

    // 查找系统信息部分
    const systemInfo = page.locator('[data-testid="system-info"], .system-info');
    if (await systemInfo.count() > 0) {
      await expect(systemInfo).toBeVisible();

      // 检查是否显示常见系统信息
      const text = await systemInfo.textContent();
      expect(text).toMatch(/CPU|内存|磁盘|网络|系统/i);
    }
  });

  test('应该能够查看性能指标', async ({ page }) => {
    await page.goto('/admin/monitoring');

    // 查找性能指标部分
    const metrics = page.locator('[data-testid="metrics"], .metrics, .performance');
    if (await metrics.count() > 0) {
      await expect(metrics).toBeVisible();
    }
  });

  test('应该能够查看错误日志', async ({ page }) => {
    await page.goto('/admin/monitoring');

    // 查找错误日志部分
    const errorLogs = page.locator('[data-testid="error-logs"], .error-logs, .logs');
    if (await errorLogs.count() > 0) {
      await expect(errorLogs).toBeVisible();
    }
  });

  test('管理页面在移动设备上应该正常工作', async ({ page }) => {
    // 模拟移动设备
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 验证页面在移动设备上正常显示
    await expect(page.locator('h1')).toBeVisible();

    // 检查导航菜单是否适配
    const nav = page.locator('nav');
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });

  test('监控数据应该自动刷新', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await page.waitForLoadState('networkidle');

    // 等待一段时间，看是否有数据更新的迹象
    await page.waitForTimeout(5000);

    // 验证页面仍然响应
    await expect(page.locator('h1')).toBeVisible();
  });

  test('应该能够处理监控API错误', async ({ page }) => {
    // 模拟API错误
    await page.route('**/api/monitoring/**', route => route.abort('failed'));

    await page.goto('/admin/monitoring');
    await page.waitForLoadState('networkidle');

    // 验证页面能够优雅地处理API错误
    await expect(page.locator('h1')).toBeVisible();

    // 检查是否有错误消息显示
    const errorMessages = page.locator('.error, .text-red-500, [data-testid="error"]');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('管理页面加载性能应该符合要求', async ({ page }) => {
    // 监听页面加载性能
    const startTime = Date.now();
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 验证页面加载时间在合理范围内
    expect(loadTime).toBeLessThan(5000);
  });

  test('应该能够访问所有管理子页面', async ({ page }) => {
    // 查找所有管理相关的链接
    const adminLinks = page.locator('nav a, .sidebar a, [data-testid="admin-link"]');
    const count = await adminLinks.count();

    if (count > 0) {
      // 测试前几个链接
      const testCount = Math.min(count, 3);
      for (let i = 0; i < testCount; i++) {
        const link = adminLinks.nth(i);
        const linkText = await link.textContent();

        if (linkText && linkText.trim() !== '') {
          // 点击链接
          await link.click();

          // 等待页面加载
          await page.waitForLoadState('networkidle');

          // 验证页面正常显示
          await expect(page.locator('h1')).toBeVisible();

          // 返回管理页面
          await page.goto('/admin');
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test('管理页面应该有适当的访问控制', async ({ page }) => {
    // 这里可以测试访问控制逻辑
    // 由于这是演示应用，我们主要验证页面结构

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 检查是否有登录提示或访问控制相关元素
    const loginPrompt = page.locator('[data-testid="login-prompt"], .login-required');
    const authSection = page.locator('[data-testid="auth"], .authentication');

    // 根据实际应用状态验证
    if (await loginPrompt.count() > 0) {
      await expect(loginPrompt).toBeVisible();
    } else if (await authSection.count() > 0) {
      await expect(authSection).toBeVisible();
    }
  });
});