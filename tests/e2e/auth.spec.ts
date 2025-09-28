import { test, expect } from '@playwright/test';

test.describe('FastBuild E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 在每个测试前导航到首页
    await page.goto('/');
  });

  test('首页应该正确加载', async ({ page }) => {
    await expect(page).toHaveTitle(/FastBuild/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('应该能够导航到演示页面', async ({ page }) => {
    // 点击演示链接
    await page.click('text=演示');

    // 验证导航到了演示页面
    await expect(page).toHaveURL('/demo');
    await expect(page.locator('h1')).toContainText('演示');
  });

  test('应该能够导航到简单演示页面', async ({ page }) => {
    // 点击简单演示链接
    await page.click('text=简单演示');

    // 验证导航到了简单演示页面
    await expect(page).toHaveURL('/demo-simple');
    await expect(page.locator('h1')).toContainText('简单演示');
  });

  test('应该能够访问管理页面', async ({ page }) => {
    // 点击管理链接
    await page.click('text=管理');

    // 验证导航到了管理页面
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('管理');
  });

  test('应该能够访问监控页面', async ({ page }) => {
    // 点击监控链接
    await page.click('text=监控');

    // 验证导航到了监控页面
    await expect(page).toHaveURL('/admin/monitoring');
    await expect(page.locator('h1')).toContainText('监控');
  });

  test('响应式设计应该在移动设备上正常工作', async ({ page }) => {
    // 模拟移动设备
    await page.setViewportSize({ width: 375, height: 667 });

    // 验证页面在移动设备上正常显示
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('页面加载性能应该符合要求', async ({ page }) => {
    // 监听页面加载性能
    const metrics = await page.metrics();

    // 验证性能指标
    expect(metrics.LayoutDuration).toBeLessThan(100);
    expect(metrics.RecalculateStyleDuration).toBeLessThan(50);
    expect(metrics.ScriptDuration).toBeLessThan(200);
  });

  test('应该没有控制台错误', async ({ page }) => {
    // 监听控制台错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 刷新页面
    await page.reload();

    // 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 验证没有控制台错误
    expect(consoleErrors).toHaveLength(0);
  });

  test('应该能够处理网络错误', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => route.abort('failed'));

    // 刷新页面
    await page.reload();

    // 验证页面能够优雅地处理网络错误
    await expect(page.locator('h1')).toBeVisible();
  });
});