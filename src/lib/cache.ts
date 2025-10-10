import React from "react";

// 缓存工具类
export interface CacheEntry<T = unknown> {
	data: T;
	timestamp: number;
	ttl?: number;
	key: string;
}

export interface CacheOptions {
	ttl?: number; // 生存时间（毫秒）
	maxSize?: number; // 最大缓存条目数
	namespace?: string; // 命名空间
}

export class MemoryCache {
	private cache = new Map<string, CacheEntry>();
	private maxSize: number;
	private namespace: string;

	constructor(options: CacheOptions = {}) {
		this.maxSize = options.maxSize || 100;
		this.namespace = options.namespace || "default";
	}

	private getKey(key: string): string {
		return `${this.namespace}:${key}`;
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (entry.ttl && now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
			}
		}
	}

	private evictLRU(): void {
		if (this.cache.size >= this.maxSize) {
			let oldestKey = "";
			let oldestTime = Number.POSITIVE_INFINITY;

			for (const [key, entry] of this.cache.entries()) {
				if (entry.timestamp < oldestTime) {
					oldestTime = entry.timestamp;
					oldestKey = key;
				}
			}

			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}
	}

	set<T>(key: string, data: T, options: CacheOptions = {}): void {
		this.cleanup();

		const fullKey = this.getKey(key);
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: options.ttl,
			key: fullKey,
		};

		this.evictLRU();
		this.cache.set(fullKey, entry);
	}

	get<T>(key: string): T | null {
		this.cleanup();

		const fullKey = this.getKey(key);
		const entry = this.cache.get(fullKey);

		if (!entry) {
			return null;
		}

		const now = Date.now();
		if (entry.ttl && now - entry.timestamp > entry.ttl) {
			this.cache.delete(fullKey);
			return null;
		}

		// 更新访问时间（简单的LRU实现）
		entry.timestamp = now;
		this.cache.set(fullKey, entry);

		return entry.data as T;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	delete(key: string): boolean {
		const fullKey = this.getKey(key);
		return this.cache.delete(fullKey);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		this.cleanup();
		return this.cache.size;
	}

	keys(): string[] {
		this.cleanup();
		return Array.from(this.cache.keys()).map((key) =>
			key.replace(`${this.namespace}:`, ""),
		);
	}

	entries(): Array<{
		key: string;
		data: unknown;
		timestamp: number;
		ttl?: number;
	}> {
		this.cleanup();
		return Array.from(this.cache.entries()).map(([key, entry]) => ({
			key: key.replace(`${this.namespace}:`, ""),
			data: entry.data,
			timestamp: entry.timestamp,
			ttl: entry.ttl,
		}));
	}
}

// 全局缓存实例
export const globalCache = new MemoryCache({ maxSize: 200 });

// API响应缓存
export const apiCache = new MemoryCache({
	maxSize: 100,
	namespace: "api",
	ttl: 5 * 60 * 1000, // 5分钟
});

// 用户数据缓存
export const userCache = new MemoryCache({
	maxSize: 50,
	namespace: "user",
	ttl: 10 * 60 * 1000, // 10分钟
});

// 项目数据缓存
export const projectCache = new MemoryCache({
	maxSize: 100,
	namespace: "project",
	ttl: 15 * 60 * 1000, // 15分钟
});

// 缓存装饰器
export function cached(options: CacheOptions = {}) {
	return (
		target: unknown,
		propertyName: string,
		descriptor: PropertyDescriptor,
	) => {
		const method = descriptor.value;
		const cache = new MemoryCache(options);

		descriptor.value = async function (...args: unknown[]) {
			const key = `${propertyName}:${JSON.stringify(args)}`;

			let result = cache.get(key);
			if (result !== null) {
				return result;
			}

			result = await method.apply(this, args);
			cache.set(key, result, options);

			return result;
		};

		return descriptor;
	};
}

// React Hook for caching
export function useCache<T>(
	key: string,
	fetcher: () => Promise<T>,
	options: CacheOptions & {
		enabled?: boolean;
		refetchInterval?: number;
		onSuccess?: (data: T) => void;
		onError?: (error: Error) => void;
	} = {},
) {
	const [data, setData] = React.useState<T | null>(() => {
		// 初始化时尝试从缓存获取
		const cache = new MemoryCache(options);
		return cache.get(key);
	});
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<Error | null>(null);

	const {
		ttl = 5 * 60 * 1000,
		enabled = true,
		refetchInterval,
		onSuccess,
		onError,
	} = options;

	const execute = React.useCallback(async () => {
		if (!enabled) return;

		try {
			setLoading(true);
			setError(null);

			const cache = new MemoryCache(options);
			let result = cache.get<T>(key);

			if (result === null) {
				result = await fetcher();
				cache.set(key, result, { ttl });
			}

			setData(result);
			onSuccess?.(result);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Unknown error");
			setError(error);
			onError?.(error);
		} finally {
			setLoading(false);
		}
	}, [key, fetcher, ttl, enabled, onSuccess, onError]);

	React.useEffect(() => {
		execute();
	}, [execute]);

	React.useEffect(() => {
		if (refetchInterval && refetchInterval > 0) {
			const interval = setInterval(execute, refetchInterval);
			return () => clearInterval(interval);
		}
	}, [execute, refetchInterval]);

	return {
		data,
		loading,
		error,
		refetch: execute,
	};
}

// LocalStorage缓存（持久化缓存）
export class LocalStorageCache {
	private namespace: string;

	constructor(namespace = "app") {
		this.namespace = namespace;
	}

	private getKey(key: string): string {
		return `${this.namespace}:${key}`;
	}

	set<T>(key: string, data: T, options: CacheOptions = {}): void {
		try {
			const entry: CacheEntry<T> = {
				data,
				timestamp: Date.now(),
				ttl: options.ttl,
				key: this.getKey(key),
			};

			localStorage.setItem(this.getKey(key), JSON.stringify(entry));
		} catch (error) {
			console.warn("LocalStorage cache write failed:", error);
		}
	}

	get<T>(key: string): T | null {
		try {
			const item = localStorage.getItem(this.getKey(key));
			if (!item) return null;

			const entry: CacheEntry<T> = JSON.parse(item);
			const now = Date.now();

			if (entry.ttl && now - entry.timestamp > entry.ttl) {
				this.delete(key);
				return null;
			}

			return entry.data;
		} catch (error) {
			console.warn("LocalStorage cache read failed:", error);
			return null;
		}
	}

	delete(key: string): boolean {
		try {
			localStorage.removeItem(this.getKey(key));
			return true;
		} catch {
			return false;
		}
	}

	clear(): void {
		try {
			const keys = Object.keys(localStorage).filter((key) =>
				key.startsWith(`${this.namespace}:`),
			);
			keys.forEach((key) => localStorage.removeItem(key));
		} catch (error) {
			console.warn("LocalStorage cache clear failed:", error);
		}
	}

	size(): number {
		try {
			return Object.keys(localStorage).filter((key) =>
				key.startsWith(`${this.namespace}:`),
			).length;
		} catch {
			return 0;
		}
	}
}

// 持久化缓存实例
export const persistentCache = new LocalStorageCache("fastbuild");

// 缓存策略工具
export class CacheStrategy {
	static memory(options?: CacheOptions): MemoryCache {
		return new MemoryCache(options);
	}

	static persistent(namespace: string): LocalStorageCache {
		return new LocalStorageCache(namespace);
	}

	static multiLevel(): {
		memory: MemoryCache;
		persistent: LocalStorageCache;
		get: <T>(key: string) => Promise<T | null>;
		set: <T>(key: string, data: T, options?: CacheOptions) => Promise<void>;
		delete: (key: string) => Promise<void>;
	} {
		const memoryCache = new MemoryCache();
		const persistentCache = new LocalStorageCache();

		return {
			memory: memoryCache,
			persistent: persistentCache,
			get: async <T>(key: string): Promise<T | null> => {
				// 先查内存缓存
				let data = memoryCache.get<T>(key);
				if (data !== null) return data;

				// 再查持久化缓存
				data = persistentCache.get<T>(key);
				if (data !== null) {
					// 将数据加载到内存缓存
					memoryCache.set(key, data);
				}

				return data;
			},
			set: async <T>(
				key: string,
				data: T,
				options?: CacheOptions,
			): Promise<void> => {
				memoryCache.set(key, data, options);
				persistentCache.set(key, data, options);
			},
			delete: async (key: string): Promise<void> => {
				memoryCache.delete(key);
				persistentCache.delete(key);
			},
		};
	}
}

// 缓存失效工具
export class CacheInvalidation {
	static invalidateByPattern(cache: MemoryCache, pattern: RegExp): void {
		const keys = cache.keys();
		keys.forEach((key) => {
			if (pattern.test(key)) {
				cache.delete(key);
			}
		});
	}

	static invalidateByNamespace(cache: MemoryCache, namespace: string): void {
		const pattern = new RegExp(`^${namespace}:`);
		CacheInvalidation.invalidateByPattern(cache, pattern);
	}

	static invalidateExpired(cache: MemoryCache): void {
		// MemoryCache的cleanup方法会自动处理
		cache.cleanup();
	}
}
