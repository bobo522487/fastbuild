import Redis from 'ioredis'

// 内存缓存作为后备方案
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null

    if (item.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const expires = Date.now() + ttl * 1000
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false

    if (item.expires < Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key)
    if (!item) return -1

    const remaining = Math.floor((item.expires - Date.now()) / 1000)
    return remaining > 0 ? remaining : -1
  }
}

/**
 * 缓存管理器
 * 支持 Redis 和内存缓存
 */
export class CacheManager {
  private redis: Redis | null = null
  private memoryCache: MemoryCache
  private isRedisConnected = false

  constructor() {
    this.memoryCache = new MemoryCache()
    this.initializeRedis()
  }

  private initializeRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })

        this.redis.on('connect', () => {
          console.log('Redis connected successfully')
          this.isRedisConnected = true
        })

        this.redis.on('error', (error) => {
          console.warn('Redis connection failed, falling back to memory cache:', error)
          this.isRedisConnected = false
        })

        this.redis.on('close', () => {
          console.log('Redis connection closed')
          this.isRedisConnected = false
        })

        // 尝试连接
        this.redis.connect().catch(() => {
          // 连接失败，使用内存缓存
        })
      } catch (error: any) {
        console.warn('Redis initialization failed, using memory cache:', error)
        this.redis = null
      }
    } else {
      console.log('Redis URL not provided, using memory cache')
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redis) {
        const value = await this.redis.get(key)
        return value ? JSON.parse(value) : null
      }
    } catch (error) {
      console.warn('Redis get failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    return this.memoryCache.get<T>(key)
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value))
        return
      }
    } catch (error) {
      console.warn('Redis set failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    await this.memoryCache.set(key, value, ttl)
  }

  /**
   * 删除缓存值
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.del(key)
        return
      }
    } catch (error) {
      console.warn('Redis del failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    await this.memoryCache.del(key)
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisConnected && this.redis) {
        return await this.redis.exists(key) === 1
      }
    } catch (error) {
      console.warn('Redis exists failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    return this.memoryCache.exists(key)
  }

  /**
   * 获取剩余时间
   */
  async ttl(key: string): Promise<number> {
    try {
      if (this.isRedisConnected && this.redis) {
        return await this.redis.ttl(key)
      }
    } catch (error) {
      console.warn('Redis ttl failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    return this.memoryCache.ttl(key)
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb()
        return
      }
    } catch (error) {
      console.warn('Redis clear failed, falling back to memory cache:', error)
    }

    // 降级到内存缓存
    await this.memoryCache.clear()
  }

  /**
   * 模式匹配删除
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redis) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
        return
      }
    } catch (error) {
      console.warn('Redis delPattern failed:', error)
    }

    // 内存缓存不支持模式匹配，跳过
  }

  /**
   * 获取缓存状态
   */
  getStatus() {
    return {
      redisConnected: this.isRedisConnected,
      redisUrl: process.env.REDIS_URL || null,
      fallbackToMemory: !this.isRedisConnected
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// 创建单例实例
export const cacheManager = new CacheManager()

// 缓存键生成器
export const cacheKeys = {
  // 表单相关
  form: (id: string) => `form:${id}`,
  formSubmissions: (formId: string) => `form:${formId}:submissions`,
  formStats: (formId: string) => `form:${formId}:stats`,

  // 用户相关
  user: (id: string) => `user:${id}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  userActivity: (userId: string) => `user:${userId}:activity`,

  // 系统相关
  systemStats: () => 'system:stats',
  monitoringEvents: (type?: string) => type ? `monitoring:${type}` : 'monitoring:all',
  errorLogs: (level?: string) => level ? `errors:${level}` : 'errors:all',

  // API 速率限制
  rateLimit: (identifier: string, endpoint: string) => `rate_limit:${identifier}:${endpoint}`,

  // 会话相关
  session: (token: string) => `session:${token}`,

  // 性能指标
  performance: (operation: string) => `performance:${operation}`,

  // 通用键生成
  custom: (...parts: string[]) => parts.join(':')
}

// 缓存装饰器
export function cached<T>(key: string, ttl: number = 3600) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cacheKey = typeof key === 'function' ? (key as Function)(...args) : key

      // 尝试从缓存获取
      const cachedValue = await cacheManager.get<T>(cacheKey)
      if (cachedValue !== null) {
        return cachedValue
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      await cacheManager.set(cacheKey, result, ttl)

      return result
    }

    return descriptor
  }
}

// 自动缓存失效装饰器
export function cacheInvalidator(pattern: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]): Promise<any> {
      const result = await originalMethod.apply(this, args)

      // 使缓存失效
      await cacheManager.delPattern(pattern)

      return result
    }

    return descriptor
  }
}