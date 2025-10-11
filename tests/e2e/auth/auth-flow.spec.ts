import { test, expect } from '@playwright/test';
import { E2ETestHelpers } from '../utils/e2e-helpers';

test.describe('认证流程 - E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清理测试环境
    await page.goto('/');
    await E2ETestHelpers.waitForLoadingComplete(page);
  });

  test('AC1.1: 用户注册流程', async ({ page }) => {
    const testUser = {
      name: 'E2E测试用户',
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    };

    // 导航到注册页面
    await page.goto('/auth');
    await E2ETestHelpers.waitForElement(page, '[data-testid="register-tab"]');
    await page.click('[data-testid="register-tab"]');

    // 填写注册表单
    await page.fill('[data-testid="name-input"]', testUser.name);
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);

    // 提交注册
    await page.click('[data-testid="register-button"]');

    // 验证注册成功
    await page.waitForURL('/projects', { timeout: 10000 });
    await E2ETestHelpers.waitForElement(page, '[data-testid="user-menu"]');

    // 验证Toast消息
    const toastMessage = await E2ETestHelpers.getToastMessage(page);
    expect(toastMessage).toContain('注册成功');

    // 验证用户已登录
    const isLoggedIn = await E2ETestHelpers.isLoggedIn(page);
    expect(isLoggedIn).toBe(true);

    // 验证导航菜单显示用户相关项目
    const hasProjectsNav = await E2ETestHelpers.isNavItemVisible(page, 'projects');
    expect(hasProjectsNav).toBe(true);
  });

  test('AC1.1: 用户登录流程', async ({ page }) => {
    // 使用预创建的测试用户登录
    await E2ETestHelpers.login(page);

    // 验证登录成功
    const isLoggedIn = await E2ETestHelpers.isLoggedIn(page);
    expect(isLoggedIn).toBe(true);

    // 验证页面标题
    const pageTitle = await E2ETestHelpers.getPageTitle(page);
    expect(pageTitle).toContain('项目');

    // 验证用户菜单显示
    await E2ETestHelpers.waitForElement(page, '[data-testid="user-menu"]');

    // 测试登出功能
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // 验证登出后跳转到认证页面
    await page.waitForURL('/auth', { timeout: 10000 });
    const loggedOut = await E2ETestHelpers.isLoggedIn(page);
    expect(loggedOut).toBe(false);
  });

  test('AC1.1: 注册表单验证', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="register-tab"]');

    // 测试必填字段验证
    await page.click('[data-testid="register-button"]');

    const validationErrors = await E2ETestHelpers.getFormValidationErrors(page);
    expect(validationErrors.length).toBeGreaterThan(0);
    expect(validationErrors.some(error => error.includes('姓名'))).toBe(true);
    expect(validationErrors.some(error => error.includes('邮箱'))).toBe(true);
    expect(validationErrors.some(error => error.includes('密码'))).toBe(true);

    // 测试邮箱格式验证
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="register-button"]');

    const emailError = await E2ETestHelpers.getFormValidationErrors(page);
    expect(emailError.some(error => error.includes('邮箱格式'))).toBe(true);

    // 测试密码长度验证
    await page.fill('[data-testid="email-input"]', 'valid@example.com');
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="register-button"]');

    const passwordError = await E2ETestHelpers.getFormValidationErrors(page);
    expect(passwordError.some(error => error.includes('密码长度'))).toBe(true);
  });

  test('AC1.1: 登录表单验证', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="login-tab"]');

    // 测试必填字段验证
    await page.click('[data-testid="login-button"]');

    const validationErrors = await E2ETestHelpers.getFormValidationErrors(page);
    expect(validationErrors.length).toBeGreaterThan(0);

    // 测试错误凭证处理
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    const hasError = await E2ETestHelpers.hasError(page);
    expect(hasError).toBe(true);

    const errorMessage = await E2ETestHelpers.getErrorMessage(page);
    expect(errorMessage).toContain('邮箱或密码错误');
  });

  test('AC1.1: GitHub OAuth 登录', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="login-tab"]');

    // 点击GitHub登录按钮
    await page.click('[data-testid="github-login-button"]');

    // 在实际测试中，这里会被重定向到GitHub
    // 由于是测试环境，我们验证重定向行为
    await expect(page).toHaveURL(/github\.com/, { timeout: 5000 });
  });

  test('AC1.1: 注册后自动登录', async ({ page }) => {
    const testUser = {
      name: '自动登录测试',
      email: `auto-login-${Date.now()}@example.com`,
      password: 'AutoLogin123!',
    };

    // 注册新用户
    await E2ETestHelpers.register(page, testUser.email, testUser.password, testUser.name);

    // 验证自动登录
    await E2ETestHelpers.waitForElement(page, '[data-testid="user-menu"]');
    const isLoggedIn = await E2ETestHelpers.isLoggedIn(page);
    expect(isLoggedIn).toBe(true);

    // 验证会话持久化
    await page.reload();
    await E2ETestHelpers.waitForLoadingComplete(page);

    const stillLoggedIn = await E2ETestHelpers.isLoggedIn(page);
    expect(stillLoggedIn).toBe(true);
  });

  test('AC1.1: 认证页面响应式设计', async ({ page }) => {
    await page.goto('/auth');

    // 测试桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    let authContainer = await page.locator('[data-testid="auth-container"]');
    await expect(authContainer).toBeVisible();

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    authContainer = await page.locator('[data-testid="auth-container"]');
    await expect(authContainer).toBeVisible();

    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    authContainer = await page.locator('[data-testid="auth-container"]');
    await expect(authContainer).toBeVisible();

    // 验证移动端菜单按钮（如果存在）
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
  });

  test('AC1.1: 网络错误处理', async ({ page }) => {
    // 模拟网络离线
    await E2ETestHelpers.setOfflineMode(page, true);

    await page.goto('/auth');
    await page.click('[data-testid="register-tab"]');

    // 填写表单
    await page.fill('[data-testid="name-input"]', '网络测试用户');
    await page.fill('[data-testid="email-input"]', 'network@test.com');
    await page.fill('[data-testid="password-input"]', 'NetworkTest123!');

    // 尝试提交
    await page.click('[data-testid="register-button"]');

    // 验证网络错误提示
    await E2ETestHelpers.waitForElement(page, '[data-testid="network-error"]', 5000);
    const hasError = await E2ETestHelpers.hasError(page);
    expect(hasError).toBe(true);

    // 恢复网络连接
    await E2ETestHelpers.setOfflineMode(page, false);
  });

  test('AC1.1: 性能测试 - 页面加载时间', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/auth');
    await E2ETestHelpers.waitForLoadingComplete(page);

    const loadTime = Date.now() - startTime;
    console.log(`认证页面加载时间: ${loadTime}ms`);

    // 验证页面加载时间在合理范围内（小于3秒）
    expect(loadTime).toBeLessThan(3000);
  });

  test('AC1.1: 无障碍访问测试', async ({ page }) => {
    await page.goto('/auth');

    // 验证表单字段的ARIA属性
    const nameInput = page.locator('[data-testid="name-input"]');
    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    await expect(nameInput).toHaveAttribute('aria-invalid', 'false');

    // 测试键盘导航
    await page.keyboard.press('Tab');
    expect(await page.locator('[data-testid="name-input"]:focus')).isVisible();

    await page.keyboard.press('Tab');
    expect(await page.locator('[data-testid="email-input"]:focus')).isVisible();

    await page.keyboard.press('Tab');
    expect(await page.locator('[data-testid="password-input"]:focus')).isVisible();

    // 测试屏幕阅读器支持
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveAttribute('role', 'heading');
  });
});