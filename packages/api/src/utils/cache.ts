// Simple in-memory cache with TTL
// In production, use Redis or external cache store
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class SimpleCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instances
export const postCache = new SimpleCache(5 * 60 * 1000); // 5 minutes
export const userCache = new SimpleCache(10 * 60 * 1000); // 10 minutes
export const staticCache = new SimpleCache(60 * 60 * 1000); // 1 hour

// Cache helper functions
export function createCacheKey(prefix: string, ...parts: (string | number | undefined)[]): string {
  return [prefix, ...parts.filter(Boolean)].join(':');
}

// Cache middleware factory
export function createCacheMiddleware<TInput, TOutput>(
  cache: SimpleCache,
  keyGenerator: (input: TInput) => string,
  ttl?: number
) {
  return async ({ input, next }: { input: TInput; next: () => Promise<TOutput> }) => {
    const cacheKey = keyGenerator(input);

    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute the procedure
    const result = await next();

    // Cache the result
    cache.set(cacheKey, result, ttl);

    return result;
  };
}

// Periodic cleanup
setInterval(() => {
  postCache.cleanup();
  userCache.cleanup();
  staticCache.cleanup();
}, 60 * 1000); // Clean up every minute
