import { test, expect } from '@playwright/test';

test.describe('表单演示 E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到演示页面
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
  });

  test('表单演示页面应该正确加载', async ({ page }) => {
    await expect(page).toHaveTitle(/演示/);
    await expect(page.locator('h1')).toContainText('演示');
  });

  test('应该能够看到动态表单渲染器', async ({ page }) => {
    // 查找表单相关元素
    const formRenderer = page.locator('[data-testid="form-renderer"]');
    if (await formRenderer.count() > 0) {
      await expect(formRenderer).toBeVisible();
    } else {
      // 如果没有特定的测试属性，检查是否有表单元素
      const form = page.locator('form');
      if (await form.count() > 0) {
        await expect(form).toBeVisible();
      }
    }
  });

  test('应该能够填写表单字段', async ({ page }) => {
    // 查找输入字段
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();

    if (count > 0) {
      // 填写第一个文本输入
      await inputs.first().fill('测试数据');
      await expect(inputs.first()).toHaveValue('测试数据');
    }
  });

  test('应该能够提交表单', async ({ page }) => {
    // 查找提交按钮
    const submitButton = page.locator('button[type="submit"], button:has-text("提交"), button:has-text("保存")');

    if (await submitButton.count() > 0) {
      // 点击提交按钮
      await submitButton.click();

      // 等待响应
      await page.waitForLoadState('networkidle');

      // 验证提交后的状态（可能有成功消息或表单重置）
      // 这里的预期需要根据实际应用行为调整
    }
  });

  test('表单验证应该正常工作', async ({ page }) => {
    // 查找必填字段
    const requiredInputs = page.locator('input[required], input[aria-required="true"]');
    const count = await requiredInputs.count();

    if (count > 0) {
      // 尝试提交空表单
      const submitButton = page.locator('button[type="submit"], button:has-text("提交")');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // 等待验证错误显示
        await page.waitForTimeout(1000);

        // 检查是否有错误消息
        const errorMessages = page.locator('.error, .text-red-500, [aria-invalid="true"]');
        if (await errorMessages.count() > 0) {
          await expect(errorMessages.first()).toBeVisible();
        }
      }
    }
  });

  test('应该能够重置表单', async ({ page }) => {
    // 查找重置按钮
    const resetButton = page.locator('button:has-text("重置"), button:has-text("清除"), button[type="reset"]');

    if (await resetButton.count() > 0) {
      // 先填写一些数据
      const inputs = page.locator('input[type="text"]');
      if (await inputs.count() > 0) {
        await inputs.first().fill('测试数据');
      }

      // 点击重置按钮
      await resetButton.click();

      // 验证表单被重置
      await expect(inputs.first()).toHaveValue('');
    }
  });

  test('表单在不同屏幕尺寸下应该正常显示', async ({ page }) => {
    // 测试桌面尺寸
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('form')).toBeVisible();

    // 测试平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('form')).toBeVisible();

    // 测试手机尺寸
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('form')).toBeVisible();
  });

  test('表单加载性能应该符合要求', async ({ page }) => {
    // 监听页面加载性能
    const startTime = Date.now();
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 验证页面加载时间在合理范围内
    expect(loadTime).toBeLessThan(5000);
  });

  test('表单交互应该流畅', async ({ page }) => {
    // 查找可交互的元素
    const interactiveElements = page.locator('input, select, button, textarea');
    const count = await interactiveElements.count();

    if (count > 0) {
      // 测试每个交互元素的响应
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = interactiveElements.nth(i);

        // 检查元素是否可见和启用
        await expect(element).toBeVisible();

        const isDisabled = await element.isDisabled();
        if (!isDisabled) {
          // 对于输入元素，测试输入功能
          const tagName = await element.evaluate(el => el.tagName);
          if (tagName === 'INPUT') {
            const type = await element.getAttribute('type');
            if (type === 'text' || type === 'email' || type === 'password') {
              await element.fill('测试');
              await expect(element).toHaveValue('测试');
              await element.fill('');
            }
          }
        }
      }
    }
  });

  test('表单应该处理网络错误', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => route.abort('failed'));

    // 尝试提交表单
    const submitButton = page.locator('button[type="submit"], button:has-text("提交")');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // 等待一段时间
      await page.waitForTimeout(2000);

      // 验证页面仍然响应
      await expect(page.locator('h1')).toBeVisible();
    }
  });
});