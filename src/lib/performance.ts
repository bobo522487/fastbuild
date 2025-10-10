import React from "react";

// 性能监控和优化工具

export interface PerformanceMetrics {
	renderTime: number;
	loadTime: number;
	apiResponseTime: number;
	memoryUsage?: number;
	fps?: number;
	timestamp: number;
}

export interface PerformanceOptions {
	sampleRate?: number; // 采样率 (0-1)
	maxSamples?: number; // 最大样本数
	reportThreshold?: number; // 上报阈值（毫秒）
}

class PerformanceMonitor {
	private metrics: PerformanceMetrics[] = [];
	private observers: PerformanceObserver[] = [];
	private options: Required<PerformanceOptions>;
	private reportCallback?: (metrics: PerformanceMetrics[]) => void;

	constructor(options: PerformanceOptions = {}) {
		this.options = {
			sampleRate: options.sampleRate || 1.0,
			maxSamples: options.maxSamples || 100,
			reportThreshold: options.reportThreshold || 1000,
		};
	}

	start(): void {
		// 监控页面加载性能
		this.observeNavigation();

		// 监控资源加载性能
		this.observeResources();

		// 监控长任务
		this.observeLongTasks();

		// 监控FPS
		this.observeFPS();
	}

	stop(): void {
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
	}

	private observeNavigation(): void {
		if (!("PerformanceObserver" in window)) return;

		try {
			const observer = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.entryType === "navigation") {
						const navEntry = entry as PerformanceNavigationTiming;
						this.recordMetric({
							renderTime: navEntry.loadEventEnd - navEntry.loadEventStart,
							loadTime: navEntry.loadEventEnd - navEntry.fetchStart,
							apiResponseTime: 0,
							timestamp: Date.now(),
						});
					}
				});
			});

			observer.observe({ entryTypes: ["navigation"] });
			this.observers.push(observer);
		} catch (error) {
			console.warn("Navigation performance observation failed:", error);
		}
	}

	private observeResources(): void {
		if (!("PerformanceObserver" in window)) return;

		try {
			const observer = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.entryType === "resource") {
						const resourceEntry = entry as PerformanceResourceTiming;
						const responseTime =
							resourceEntry.responseEnd - resourceEntry.requestStart;

						if (responseTime > this.options.reportThreshold) {
							this.recordMetric({
								renderTime: 0,
								loadTime: 0,
								apiResponseTime: responseTime,
								timestamp: Date.now(),
							});
						}
					}
				});
			});

			observer.observe({ entryTypes: ["resource"] });
			this.observers.push(observer);
		} catch (error) {
			console.warn("Resource performance observation failed:", error);
		}
	}

	private observeLongTasks(): void {
		if (!("PerformanceObserver" in window)) return;

		try {
			const observer = new PerformanceObserver((list) => {
				const entries = list.getEntries();
				entries.forEach((entry) => {
					if (entry.entryType === "longtask") {
						const duration = entry.duration;

						if (duration > this.options.reportThreshold) {
							this.recordMetric({
								renderTime: duration,
								loadTime: 0,
								apiResponseTime: 0,
								timestamp: Date.now(),
							});
						}
					}
				});
			});

			observer.observe({ entryTypes: ["longtask"] });
			this.observers.push(observer);
		} catch (error) {
			console.warn("Long task performance observation failed:", error);
		}
	}

	private observeFPS(): void {
		let lastTime = performance.now();
		let frameCount = 0;
		let fps = 0;

		const measureFPS = (currentTime: number) => {
			frameCount++;

			if (currentTime - lastTime >= 1000) {
				fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

				if (fps < 30) {
					// FPS低于30时记录
					this.recordMetric({
						renderTime: 0,
						loadTime: 0,
						apiResponseTime: 0,
						fps,
						timestamp: Date.now(),
					});
				}

				frameCount = 0;
				lastTime = currentTime;
			}

			requestAnimationFrame(measureFPS);
		};

		requestAnimationFrame(measureFPS);
	}

	recordMetric(metric: PerformanceMetrics): void {
		if (Math.random() > this.options.sampleRate) {
			return; // 采样控制
		}

		// 添加内存使用信息
		if ("memory" in performance) {
			const memory = (performance as any).memory;
			metric.memoryUsage = memory.usedJSHeapSize;
		}

		this.metrics.push(metric);

		// 限制样本数量
		if (this.metrics.length > this.options.maxSamples) {
			this.metrics = this.metrics.slice(-this.options.maxSamples);
		}

		// 触发报告回调
		if (this.reportCallback) {
			this.reportCallback(this.metrics.slice(-1));
		}
	}

	setReportCallback(callback: (metrics: PerformanceMetrics[]) => void): void {
		this.reportCallback = callback;
	}

	getMetrics(): PerformanceMetrics[] {
		return [...this.metrics];
	}

	getAverageMetrics(): Partial<PerformanceMetrics> {
		if (this.metrics.length === 0) return {};

		const sum = this.metrics.reduce(
			(acc, metric) => ({
				renderTime: acc.renderTime + metric.renderTime,
				loadTime: acc.loadTime + metric.loadTime,
				apiResponseTime: acc.apiResponseTime + metric.apiResponseTime,
				memoryUsage: (acc.memoryUsage || 0) + (metric.memoryUsage || 0),
				fps: (acc.fps || 0) + (metric.fps || 0),
			}),
			{
				renderTime: 0,
				loadTime: 0,
				apiResponseTime: 0,
				memoryUsage: 0,
				fps: 0,
			},
		);

		const count = this.metrics.length;

		return {
			renderTime: sum.renderTime / count,
			loadTime: sum.loadTime / count,
			apiResponseTime: sum.apiResponseTime / count,
			memoryUsage: sum.memoryUsage / count,
			fps: sum.fps / count,
		};
	}

	clear(): void {
		this.metrics = [];
	}
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor({
	sampleRate: 0.1, // 10%采样率
	maxSamples: 50,
	reportThreshold: 500, // 500ms阈值
});

// React组件性能监控Hook
export function useComponentPerformance(componentName: string) {
	const renderStart = React.useRef<number | undefined>(undefined);
	const renderCount = React.useRef(0);

	React.useEffect(() => {
		renderStart.current = performance.now();
		renderCount.current++;

		return () => {
			if (renderStart.current) {
				const renderTime = performance.now() - renderStart.current;

				if (renderTime > 16) {
					// 超过一帧时间(16ms)的渲染
					performanceMonitor.recordMetric({
						renderTime,
						loadTime: 0,
						apiResponseTime: 0,
						timestamp: Date.now(),
					});

					console.warn(
						`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`,
					);
				}
			}
		};
	});
}

// API性能监控装饰器
export function measureAPICall(
	target: any,
	propertyName: string,
	descriptor: PropertyDescriptor,
) {
	const method = descriptor.value;

	descriptor.value = async function (...args: any[]) {
		const startTime = performance.now();

		try {
			const result = await method.apply(this, args);

			const duration = performance.now() - startTime;
			performanceMonitor.recordMetric({
				renderTime: 0,
				loadTime: 0,
				apiResponseTime: duration,
				timestamp: Date.now(),
			});

			return result;
		} catch (error) {
			const duration = performance.now() - startTime;

			// 即使失败也记录性能指标
			performanceMonitor.recordMetric({
				renderTime: 0,
				loadTime: 0,
				apiResponseTime: duration,
				timestamp: Date.now(),
			});

			throw error;
		}
	};

	return descriptor;
}

// 函数节流
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let lastCall = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();

		if (now - lastCall >= delay) {
			lastCall = now;
			return func(...args);
		}
	};
}

// 函数防抖
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	};
}

// 内存优化工具
export class MemoryOptimizer {
	private static cleanupTasks: (() => void)[] = [];

	static registerCleanupTask(task: () => void): void {
		MemoryOptimizer.cleanupTasks.push(task);
	}

	static runCleanup(): void {
		MemoryOptimizer.cleanupTasks.forEach((task) => {
			try {
				task();
			} catch (error) {
				console.warn("Cleanup task failed:", error);
			}
		});

		MemoryOptimizer.cleanupTasks = [];
	}

	static forceGarbageCollection(): void {
		// 在开发环境中提示手动GC
		if (process.env.NODE_ENV === "development" && "gc" in window) {
			(window as any).gc();
		}
	}

	static getMemoryUsage(): {
		used: number;
		total: number;
		limit: number;
		percentage: number;
	} | null {
		if (!("memory" in performance)) return null;

		const memory = (performance as any).memory;
		const used = memory.usedJSHeapSize;
		const total = memory.totalJSHeapSize;
		const limit = memory.jsHeapSizeLimit;

		return {
			used,
			total,
			limit,
			percentage: (used / limit) * 100,
		};
	}
}

// 资源预加载工具
export class ResourcePreloader {
	private static preloadedResources = new Set<string>();

	static preloadImage(src: string): Promise<void> {
		if (ResourcePreloader.preloadedResources.has(src)) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const img = new Image();

			img.onload = () => {
				ResourcePreloader.preloadedResources.add(src);
				resolve();
			};

			img.onerror = reject;
			img.src = src;
		});
	}

	static preloadScript(src: string): Promise<void> {
		if (ResourcePreloader.preloadedResources.has(src)) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "script";
			link.href = src;

			link.onload = () => {
				ResourcePreloader.preloadedResources.add(src);
				resolve();
			};

			link.onerror = reject;
			document.head.appendChild(link);
		});
	}

	static preloadStylesheet(href: string): Promise<void> {
		if (ResourcePreloader.preloadedResources.has(href)) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "style";
			link.href = href;

			link.onload = () => {
				ResourcePreloader.preloadedResources.add(href);
				resolve();
			};

			link.onerror = reject;
			document.head.appendChild(link);
		});
	}

	static preloadFont(href: string): Promise<void> {
		if (ResourcePreloader.preloadedResources.has(href)) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "font";
			link.type = "font/woff2";
			link.crossOrigin = "anonymous";
			link.href = href;

			link.onload = () => {
				ResourcePreloader.preloadedResources.add(href);
				resolve();
			};

			link.onerror = reject;
			document.head.appendChild(link);
		});
	}
}

// 批量操作优化
export class BatchProcessor<T> {
	private queue: T[] = [];
	private processing = false;
	private batchSize: number;
	private delay: number;
	private processor: (items: T[]) => Promise<void>;

	constructor(
		processor: (items: T[]) => Promise<void>,
		options: { batchSize?: number; delay?: number } = {},
	) {
		this.processor = processor;
		this.batchSize = options.batchSize || 10;
		this.delay = options.delay || 100;
	}

	add(item: T): void {
		this.queue.push(item);

		if (this.queue.length >= this.batchSize && !this.processing) {
			this.process();
		} else if (!this.processing) {
			setTimeout(() => this.process(), this.delay);
		}
	}

	private async process(): Promise<void> {
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;
		const batch = this.queue.splice(0, this.batchSize);

		try {
			await this.processor(batch);
		} catch (error) {
			console.error("Batch processing failed:", error);
			// 重新加入队列进行重试
			this.queue.unshift(...batch);
		} finally {
			this.processing = false;

			// 如果还有待处理的项目，继续处理
			if (this.queue.length > 0) {
				setTimeout(() => this.process(), this.delay);
			}
		}
	}

	async flush(): Promise<void> {
		while (this.queue.length > 0) {
			await this.process();
		}
	}

	size(): number {
		return this.queue.length;
	}
}

// 虚拟滚动辅助函数
export function useVirtualScroll<T>(
	items: T[],
	itemHeight: number,
	containerHeight: number,
	overscan = 5,
) {
	const [scrollTop, setScrollTop] = React.useState(0);

	const visibleCount = Math.ceil(containerHeight / itemHeight);
	const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
	const endIndex = Math.min(
		items.length - 1,
		startIndex + visibleCount + overscan * 2,
	);

	const visibleItems = items
		.slice(startIndex, endIndex + 1)
		.map((item, index) => ({
			item,
			index: startIndex + index,
		}));

	const totalHeight = items.length * itemHeight;

	const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
		setScrollTop(e.currentTarget.scrollTop);
	}, []);

	return {
		visibleItems,
		totalHeight,
		startIndex,
		endIndex,
		handleScroll,
	};
}
