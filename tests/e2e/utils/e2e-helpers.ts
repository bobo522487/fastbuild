// import type { Page } from "@playwright/test"; // Playwright not installed - E2E tests disabled

// E2E Test Helpers disabled - Playwright not installed
// export class E2ETestHelpers {
// 	/**
// 	 * 登录用户
// 	 */
// 	static async login(
// 		page: Page,
// 		email = "admin@test.com",
// 		password = "AdminPassword123!",
// 	): Promise<void> {
// 		await page.goto("/auth");
// 		await page.click('[data-testid="login-tab"]');
// 		await page.fill('[data-testid="email-input"]', email);
// 		await page.fill('[data-testid="password-input"]', password);
// 		await page.click('[data-testid="login-button"]');

// 		// 等待登录完成
// 		await page.waitForURL("/projects", { timeout: 10000 });
// 		console.log(`✅ User ${email} logged in successfully`);
// 	}

// 	/**
// 	 * 注册新用户
// 	 */
// 	static async register(
// 		page: Page,
// 		email: string,
// 		passwordHash: string,
// 		name: string,
// 	): Promise<void> {
// 		await page.goto("/auth");
// 		await page.click('[data-testid="register-tab"]');
// 		await page.fill('[data-testid="name-input"]', name);
// 		await page.fill('[data-testid="email-input"]', email);
// 		await page.fill('[data-testid="password-input"]', password);
// 		await page.click('[data-testid="register-button"]');

// 		// 等待注册完成并跳转到项目页面
// 		await page.waitForURL("/projects", { timeout: 10000 });
// 		console.log(`✅ User ${email} registered successfully`);
// 	}

// 	/**
// 	 * 创建项目
// 	 */
// 	static async createProject(
// 		page: Page,
// 		projectName: string,
// 		description?: string,
// 		visibility: "PRIVATE" | "PUBLIC" = "PRIVATE",
// 	): Promise<void> {
// 		await page.goto("/projects");
// 		await page.click('[data-testid="create-project-button"]');

// 		await page.fill('[data-testid="project-name-input"]', projectName);

// 		if (description) {
// 			await page.fill('[data-testid="project-description-input"]', description);
// 		}

// 		if (visibility === "PUBLIC") {
// 			await page.click('[data-testid="visibility-public"]');
// 		}

// 		await page.click('[data-testid="create-project-submit"]');

// 		// 等待项目创建完成
// 		await page.waitForSelector(
// 			`[data-testid="project-card-${projectName.toLowerCase().replace(/\\s+/g, "-")}"]`,
// 			{
// 				timeout: 10000,
// 			},
// 		);

// 		console.log(`✅ Project "${projectName}" created successfully`);
// 	}

// 	/**
// 	 * 等待元素可见
// 	 */
// 	static async waitForElement(
// 		page: Page,
// 		selector: string,
// 		timeout = 5000,
// 	): Promise<void> {
// 		await page.waitForSelector(selector, {
// 			state: "visible",
// 			timeout,
// 		});
// 	}

// 	/**
// 	 * 获取Toast消息
// 	 */
// 	static async getToastMessage(page: Page): Promise<string> {
// 		const toast = await page.locator('[data-testid="toast-message"]');
// 		return (await toast.textContent()) || "";
// 	}

// 	/**
// 	 * 检查页面是否显示错误
// 	 */
// 	static async hasError(page: Page): Promise<boolean> {
// 		const errorSelector = '[data-testid="error-message"]';
// 		return await page.locator(errorSelector).isVisible();
// 	}

// 	/**
// 	 * 获取错误消息
// 	 */
// 	static async getErrorMessage(page: Page): Promise<string> {
// 		const error = await page.locator('[data-testid="error-message"]');
// 		return (await error.textContent()) || "";
// 	}

// 	/**
// 	 * 检查用户是否已登录
// 	 */
// 	static async isLoggedIn(page: Page): Promise<boolean> {
// 		try {
// 			await page.waitForSelector('[data-testid="user-menu"]', {
// 				timeout: 3000,
// 			});
// 			return true;
// 		} catch {
// 			return false;
// 		}
// 	}

// 	/**
// 	 * 等待加载完成
// 	 */
// 	static async waitForLoadingComplete(page: Page): Promise<void> {
// 		await page.waitForSelector('[data-testid="loading"]', {
// 			state: "hidden",
// 			timeout: 10000,
// 		});
// 	}

// 	/**
// 	 * 模拟网络延迟
// 	 */
// 	static async simulateNetworkDelay(
// 		page: Page,
// 		delayMs: number,
// 	): Promise<void> {
// 		await page.route("**/*", async (route) => {
// 			await new Promise((resolve) => setTimeout(resolve, delayMs));
// 			await route.continue();
// 		});
// 	}

// 	/**
// 	 * 离线模式测试
// 	 */
// 	static async setOfflineMode(page: Page, offline = true): Promise<void> {
// 		await page.context().setOffline(offline);
// 	}

// 	/**
// 	 * 验证项目卡片存在
// 	 */
// 	static async verifyProjectCard(
// 		page: Page,
// 		projectName: string,
// 	): Promise<boolean> {
// 		const selector = `[data-testid="project-card-${projectName.toLowerCase().replace(/\\s+/g, "-")}"]`;
// 		return await page.locator(selector).isVisible();
// 	}

// 	/**
// 	 * 验证表单验证错误
// 	 */
// 	static async getFormValidationErrors(page: Page): Promise<string[]> {
// 		const errorElements = await page.locator(
// 			'[data-testid^="validation-error"]',
// 		);
// 		const errors: string[] = [];

// 		const count = await errorElements.count();
// 		for (let i = 0; i < count; i++) {
// 			errors.push((await errorElements.nth(i).textContent()) || "");
// 		}

// 		return errors;
// 	}

// 	/**
// 	 * 截图调试
// 	 */
// 	static async takeScreenshot(page: Page, name: string): Promise<void> {
// 		await page.screenshot({
// 			path: `./test-results/screenshots/${name}-${Date.now()}.png`,
// 			fullPage: true,
// 		});
// 	}

// 	/**
// 	 * 获取页面标题
// 	 */
// 	static async getPageTitle(page: Page): Promise<string> {
// 		return await page.title();
// 	}

// 	/**
// 	 * 检查导航菜单项是否可见
// 	 */
// 	static async isNavItemVisible(page: Page, navItem: string): Promise<boolean> {
// 		const selector = `[data-testid="nav-${navItem.toLowerCase()}"]`;
// 		return await page.locator(selector).isVisible();
// 	}

// 	/**
// 	 * 点击导航菜单项
// 	 */
// 	static async clickNavItem(page: Page, navItem: string): Promise<void> {
// 		const selector = `[data-testid="nav-${navItem.toLowerCase()}"]`;
// 		await page.click(selector);
// 	}
// }

console.log("⚠️  E2E Test Helpers disabled - Playwright not installed");
