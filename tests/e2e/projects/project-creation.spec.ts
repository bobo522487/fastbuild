import { test, expect } from '@playwright/test';
import { E2ETestHelpers } from '../utils/e2e-helpers';

test.describe('项目创建流程 - E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录测试用户
    await E2ETestHelpers.login(page);
    await E2ETestHelpers.waitForLoadingComplete(page);
  });

  test('AC1: 成功创建新项目', async ({ page }) => {
    const projectData = {
      name: `E2E测试项目-${Date.now()}`,
      description: '这是一个E2E测试项目',
      visibility: 'PRIVATE' as const,
    };

    // 导航到项目页面
    await page.goto('/projects');
    await E2ETestHelpers.waitForLoadingComplete(page);

    // 点击创建项目按钮
    await page.click('[data-testid="create-project-button"]');

    // 等待模态框显示
    await E2ETestHelpers.waitForElement(page, '[data-testid="project-modal"]');

    // 填写项目信息
    await page.fill('[data-testid="project-name-input"]', projectData.name);
    await page.fill('[data-testid="project-description-input"]', projectData.description);

    // 选择可见性
    if (projectData.visibility === 'PUBLIC') {
      await page.click('[data-testid="visibility-public"]');
    }

    // 提交创建
    await page.click('[data-testid="create-project-submit"]');

    // 验证创建成功
    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]', 10000);
    const toastMessage = await E2ETestHelpers.getToastMessage(page);
    expect(toastMessage).toContain('项目创建成功');

    // 验证项目卡片显示
    const projectSlug = projectData.name.toLowerCase().replace(/\\s+/g, '-');
    const projectCardExists = await E2ETestHelpers.verifyProjectCard(page, projectData.name);
    expect(projectCardExists).toBe(true);

    // 验证项目详情页面
    await page.click(`[data-testid="project-card-${projectSlug}"]`);
    await page.waitForURL(`/projects/${projectSlug}`, { timeout: 10000 });

    // 验证项目信息显示正确
    await expect(page.locator('[data-testid="project-title"]')).toHaveText(projectData.name);
    await expect(page.locator('[data-testid="project-description"]')).toHaveText(projectData.description);
  });

  test('AC1: 项目表单验证', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');

    // 测试必填字段
    await page.click('[data-testid="create-project-submit"]');

    const validationErrors = await E2ETestHelpers.getFormValidationErrors(page);
    expect(validationErrors.some(error => error.includes('项目名称'))).toBe(true);

    // 测试项目名称长度
    await page.fill('[data-testid="project-name-input"]', 'a'.repeat(101));
    await page.click('[data-testid="create-project-submit"]');

    const nameErrors = await E2ETestHelpers.getFormValidationErrors(page);
    expect(nameErrors.some(error => error.includes('项目名称不能超过'))).toBe(true);

    // 修复验证错误
    await page.fill('[data-testid="project-name-input"]', '有效项目名称');
    await page.fill('[data-testid="project-description-input"]', '有效的项目描述');

    // 应该不再有验证错误
    await page.click('[data-testid="create-project-submit"]');
    const noErrors = await E2ETestHelpers.getFormValidationErrors(page);
    expect(noErrors.length).toBe(0);
  });

  test('AC1: 项目可见性设置', async ({ page }) => {
    const privateProject = {
      name: '私有测试项目',
      visibility: 'PRIVATE' as const,
    };

    const publicProject = {
      name: '公开测试项目',
      visibility: 'PUBLIC' as const,
    };

    // 创建私有项目
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');

    await page.fill('[data-testid="project-name-input"]', privateProject.name);
    await page.click('[data-testid="create-project-submit"]');

    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]');

    // 创建公开项目
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name-input"]', publicProject.name);
    await page.click('[data-testid="visibility-public"]');
    await page.click('[data-testid="create-project-submit"]');

    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]');

    // 验证两个项目都显示在列表中
    const privateProjectExists = await E2ETestHelpers.verifyProjectCard(page, privateProject.name);
    const publicProjectExists = await E2ETestHelpers.verifyProjectCard(page, publicProject.name);

    expect(privateProjectExists).toBe(true);
    expect(publicProjectExists).toBe(true);
  });

  test('AC1: 项目列表分页', async ({ page }) => {
    // 创建多个项目用于测试分页
    const projects = [];
    for (let i = 1; i <= 15; i++) {
      const projectName = `分页测试项目-${i}`;
      await E2ETestHelpers.createProject(page, projectName, `项目${i}的描述`);
      projects.push(projectName);
    }

    await page.goto('/projects');
    await E2ETestHelpers.waitForLoadingComplete(page);

    // 验证第一页显示项目
    await expect(page.locator('[data-testid^="project-card-"]')).toHaveCount(10);

    // 点击下一页
    await page.click('[data-testid="pagination-next"]');
    await E2ETestHelpers.waitForLoadingComplete(page);

    // 验证第二页显示剩余项目
    const projectCards = await page.locator('[data-testid^="project-card-"]').count();
    expect(projectCards).toBe(5);

    // 验证分页信息
    const pageInfo = await page.locator('[data-testid="pagination-info"]').textContent();
    expect(pageInfo).toContain('第 2 页');
  });

  test('AC1: 项目搜索功能', async ({ page }) => {
    // 创建测试项目
    const searchProjects = [
      '前端开发项目',
      '后端API项目',
      '数据库设计项目',
      'UI/UX设计项目',
    ];

    for (const projectName of searchProjects) {
      await E2ETestHelpers.createProject(page, projectName, `${projectName}的描述`);
    }

    await page.goto('/projects');
    await E2ETestHelpers.waitForLoadingComplete(page);

    // 测试搜索功能
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('前端');
    await page.keyboard.press('Enter');

    await E2ETestHelpers.waitForLoadingComplete(page);

    // 验证搜索结果
    const searchResults = await page.locator('[data-testid^="project-card-"]').count();
    expect(searchResults).toBe(1);

    const resultProject = await page.locator('[data-testid="project-card-前端开发项目"]').isVisible();
    expect(resultProject).toBe(true);

    // 清空搜索
    await searchInput.fill('');
    await page.keyboard.press('Enter');

    await E2ETestHelpers.waitForLoadingComplete(page);

    // 验证所有项目显示
    const allProjects = await page.locator('[data-testid^="project-card-"]').count();
    expect(allProjects).toBe(searchProjects.length);
  });

  test('AC1: 项目操作功能', async ({ page }) => {
    const projectName = `操作测试项目-${Date.now()}`;
    await E2ETestHelpers.createProject(page, projectName, '用于测试项目操作');

    await page.goto('/projects');
    await E2ETestHelpers.waitForLoadingComplete(page);

    // 查找项目卡片
    const projectCard = page.locator(`[data-testid="project-card-${projectName.toLowerCase().replace(/\\s+/g, '-')}]`);
    await expect(projectCard).toBeVisible();

    // 测试项目编辑功能
    await projectCard.click('[data-testid="edit-project"]');
    await E2ETestHelpers.waitForElement(page, '[data-testid="project-modal"]');

    // 修改项目信息
    await page.fill('[data-testid="project-name-input"]', `${projectName} (已编辑)`);
    await page.click('[data-testid="update-project-submit"]');

    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]');

    // 验证编辑成功
    const editedProjectExists = await E2ETestHelpers.verifyProjectCard(page, `${projectName} (已编辑)`);
    expect(editedProjectExists).toBe(true);
  });

  test('AC1: 项目权限控制', async ({ page }) => {
    // 创建一个私有项目
    const privateProjectName = `权限测试项目-${Date.now()}`;
    await E2ETestHelpers.createProject(page, privateProjectName, '私有项目', 'PRIVATE');

    // 验证项目所有者可以看到项目
    await page.goto('/projects');
    const projectExists = await E2ETestHelpers.verifyProjectCard(page, privateProjectName);
    expect(projectExists).toBe(true);
  });

  test('AC1: 性能测试 - 项目创建响应时间', async ({ page }) => {
    const projectName = `性能测试项目-${Date.now()}`;

    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');

    const startTime = Date.now();

    await page.fill('[data-testid="project-name-input"]', projectName);
    await page.fill('[data-testid="project-description-input"]', '性能测试描述');
    await page.click('[data-testid="create-project-submit"]');

    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]', 10000);

    const responseTime = Date.now() - startTime;
    console.log(`项目创建响应时间: ${responseTime}ms`);

    // 验证响应时间在合理范围内（小于5秒）
    expect(responseTime).toBeLessThan(5000);
  });

  test('AC1: 移动端项目创建', async ({ page }) => {
    // 设置移动端视图
    await page.setViewportSize({ width: 375, height: 667 });

    const mobileProjectName = `移动端项目-${Date.now()}`;
    await E2ETestHelpers.createProject(page, mobileProjectName, '移动端创建的项目');

    // 验证项目创建成功
    const projectExists = await E2ETestHelpers.verifyProjectCard(page, mobileProjectName);
    expect(projectExists).toBe(true);

    // 验证移动端界面适配
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
  });

  test('AC1: 错误处理和恢复', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');

    // 尝试创建重复名称的项目
    const duplicateName = `重复项目-${Date.now()}`;

    // 第一次创建应该成功
    await E2ETestHelpers.createProject(page, duplicateName, '第一次创建');

    // 第二次创建应该失败
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name-input"]', duplicateName);
    await page.click('[data-testid="create-project-submit"]');

    // 验证错误提示
    const hasError = await E2ETestHelpers.hasError(page);
    expect(hasError).toBe(true);

    const errorMessage = await E2ETestHelpers.getErrorMessage(page);
    expect(errorMessage).toContain('项目名称已存在');

    // 用户应该能够恢复并创建新项目
    await page.fill('[data-testid="project-name-input"]', `恢复项目-${Date.now()}`);
    await page.click('[data-testid="create-project-submit"]');

    await E2ETestHelpers.waitForElement(page, '[data-testid="toast-message"]', 10000);
    const successMessage = await E2ETestHelpers.getToastMessage(page);
    expect(successMessage).toContain('项目创建成功');
  });

  test('AC1: 无障碍访问测试', async ({ page }) => {
    await page.goto('/projects');
    await page.click('[data-testid="create-project-button"]');

    // 验证表单字段的ARIA属性
    const nameInput = page.locator('[data-testid="project-name-input"]');
    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    await expect(nameInput).toHaveAttribute('aria-describedby');

    // 测试键盘导航
    await page.keyboard.press('Tab');
    expect(await page.locator('[data-testid="project-name-input"]:focus')).isVisible();

    await page.keyboard.press('Tab');
    expect(await page.locator('[data-testid="project-description-input"]:focus')).isVisible();

    // 测试屏幕阅读器标签
    const formLabels = ['项目名称', '项目描述', '可见性'];
    for (const label of formLabels) {
      const labelElement = page.locator(`text=${label}`);
      await expect(labelElement).toBeVisible();
    }
  });

  test('AC1: 批量项目创建压力测试', async ({ page }) => {
    const projectCount = 5;
    const projects = [];

    // 快速创建多个项目
    for (let i = 0; i < projectCount; i++) {
      const projectName = `压力测试项目-${i}-${Date.now()}`;
      projects.push(projectName);

      await E2ETestHelpers.createProject(page, projectName, `压力测试项目${i}的描述`);

      // 短暂等待避免过快请求
      await page.waitForTimeout(500);
    }

    // 验证所有项目都创建成功
    await page.goto('/projects');
    await E2ETestHelpers.waitForLoadingComplete(page);

    for (const projectName of projects) {
      const projectExists = await E2ETestHelpers.verifyProjectCard(page, projectName);
      expect(projectExists).toBe(true);
    }

    console.log(`成功创建 ${projectCount} 个项目`);
  });
});