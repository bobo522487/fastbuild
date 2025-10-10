import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

// 扩展 expect 匹配器
expect.extend(matchers);

// 清理每个测试后的DOM
afterEach(() => {
	cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}));

// Mock Next.js environment
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver
Object.defineProperty(window, "ResizeObserver", {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	})),
});

// Mock IntersectionObserver
Object.defineProperty(window, "IntersectionObserver", {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	})),
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock crypto
Object.defineProperty(global, "crypto", {
	value: {
		randomUUID: vi.fn(
			() => `mock-uuid-${Math.random().toString(36).substr(2, 9)}`,
		),
	},
});

// Mock console methods to avoid noise in tests
global.console = {
	...console,
	// Uncomment to silence specific console methods during tests
	// log: vi.fn(),
	// warn: vi.fn(),
	// error: vi.fn(),
};
