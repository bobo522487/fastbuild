import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";

/**
 * 测试数据生成工具
 */
export class TestDataFactory {
  /**
   * 生成测试用户数据
   */
  static createUser(overrides: Partial<{ email: string; name: string; emailVerified: boolean; image?: string }> = {}) {
    return {
      email: `test-${Math.random().toString(36).substring(7)}@example.com`,
      name: `Test User ${Math.random().toString(36).substring(7)}`,
      emailVerified: false,
      ...overrides,
    };
  }

  /**
   * 生成测试文章数据
   */
  static createPost(userId: string, overrides: Partial<{ title: string; content: string }> = {}) {
    return {
      title: `Test Post ${Math.random().toString(36).substring(7)}`,
      content: `Test content ${Math.random().toString(36).substring(7)}`,
      userId,
      ...overrides,
    };
  }

  /**
   * 生成测试会话数据
   */
  static createSession(userId: string, overrides: Partial<{ token: string; expiresAt: Date }> = {}) {
    return {
      token: `test-token-${Math.random().toString(36).substring(7)}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      userId,
      ...overrides,
    };
  }

  /**
   * 生成测试账户数据
   */
  static createAccount(userId: string, overrides: Partial<{ providerId: string; accountId: string }> = {}) {
    return {
      providerId: `provider-${Math.random().toString(36).substring(7)}`,
      accountId: `account-${Math.random().toString(36).substring(7)}`,
      userId,
      ...overrides,
    };
  }

  /**
   * 批量生成测试数据
   */
  static createBatch<T>(
    count: number,
    factory: (index: number) => T
  ): T[] {
    return Array.from({ length: count }, (_, index) => factory(index));
  }
}

/**
 * 数据库清理工具
 */
export class DatabaseCleaner {
  /**
   * 清理所有测试数据
   */
  static async cleanAll(client: PrismaClient = prisma) {
    const tables = ["verification", "account", "session", "post", "user"];

    for (const table of tables) {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    }
  }

  /**
   * 清理特定表的数据
   */
  static async cleanTable(tableName: string, client: PrismaClient = prisma) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
  }

  /**
   * 清理特定用户相关的所有数据
   */
  static async cleanUserData(userId: string, client: PrismaClient = prisma) {
    await client.$transaction(async (tx) => {
      await tx.verification.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.post.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  }
}

/**
 * 测试数据库工具
 */
export class TestDatabase {
  private client: PrismaClient;

  constructor() {
    this.client = new PrismaClient();
  }

  /**
   * 连接测试数据库
   */
  async connect() {
    await this.client.$connect();
    return this.client;
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    await this.client.$disconnect();
  }

  /**
   * 重置数据库到干净状态
   */
  async reset() {
    await DatabaseCleaner.cleanAll(this.client);
  }

  /**
   * 创建测试数据种子
   */
  async seed() {
    const users = await Promise.all([
      this.client.user.create({ data: TestDataFactory.createUser() }),
      this.client.user.create({ data: TestDataFactory.createUser() }),
      this.client.user.create({ data: TestDataFactory.createUser() }),
    ]);

    const posts = await Promise.all(
      users.flatMap((user, userIndex) =>
        TestDataFactory.createBatch(
          3,
          (postIndex) => TestDataFactory.createPost(user.id, {
            title: `User ${userIndex} Post ${postIndex}`,
            content: `Content for post ${postIndex} by user ${userIndex}`,
          })
        ).map(postData =>
          this.client.post.create({ data: postData })
        )
      )
    );

    return { users, posts };
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    const [userCount, postCount, sessionCount, accountCount] = await Promise.all([
      this.client.user.count(),
      this.client.post.count(),
      this.client.session.count(),
      this.client.account.count(),
    ]);

    return {
      users: userCount,
      posts: postCount,
      sessions: sessionCount,
      accounts: accountCount,
    };
  }
}

/**
 * 性能测试工具
 */
export class PerformanceTester {
  /**
   * 测量查询执行时间
   */
  static async measureQuery<T>(
    query: () => Promise<T>,
    name: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await query();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Query "${name}" took ${duration.toFixed(2)}ms`);
    return { result, duration };
  }

  /**
   * 批量测试查询性能
   */
  static async benchmarkQueries<T>(
    queries: Array<{ name: string; query: () => Promise<T> }>,
    iterations: number = 10
  ): Promise<Array<{ name: string; avgDuration: number; minDuration: number; maxDuration: number }>> {
    const results = [];

    for (const { name, query } of queries) {
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await this.measureQuery(query, `${name} - iteration ${i}`);
        durations.push(duration);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      results.push({
        name,
        avgDuration,
        minDuration,
        maxDuration,
      });
    }

    return results;
  }

  /**
   * 测试并发查询性能
   */
  static async testConcurrentQueries<T>(
    queryFactory: (index: number) => Promise<T>,
    concurrency: number = 10
  ): Promise<{ results: T[]; totalTime: number; avgTime: number }> {
    const startTime = performance.now();
    const results = await Promise.all(
      Array.from({ length: concurrency }, (_, index) => queryFactory(index))
    );
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / concurrency;

    return { results, totalTime, avgTime };
  }
}

/**
 * 缓存测试工具
 */
export class CacheMock {
  private cache: Map<string, { value: string; expiresAt: number | null }>;
  private hitCount = 0;
  private missCount = 0;

  constructor() {
    this.cache = new Map();
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);

    if (!item) {
      this.missCount++;
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      size: this.cache.size,
    };
  }
}

/**
 * 数据验证工具
 */
export class DataValidator {
  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证字符串长度
   */
  static isValidLength(value: string, min: number, max: number): boolean {
    return value.length >= min && value.length <= max;
  }

  /**
   * 验证日期是否在未来
   */
  static isFutureDate(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * 验证日期是否在过去
   */
  static isPastDate(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * 验证UUID格式
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 验证数据库记录结构
   */
  static validateRecordStructure<T>(
    record: any,
    requiredFields: (keyof T)[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!(field in record)) {
        missingFields.push(String(field));
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

/**
 * 错误处理工具
 */
export class ErrorHandler {
  /**
   * 处理数据库错误并转换为用户友好的消息
   */
  static handleDatabaseError(error: any): { message: string; code: string; isRetryable: boolean } {
    if (error.code === 'P2002') {
      return {
        message: 'Record already exists',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        isRetryable: false,
      };
    }

    if (error.code === 'P2025') {
      return {
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
        isRetryable: false,
      };
    }

    if (error.code === 'P2003') {
      return {
        message: 'Foreign key constraint violation',
        code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        isRetryable: false,
      };
    }

    return {
      message: error.message || 'Unknown database error',
      code: error.code || 'UNKNOWN_ERROR',
      isRetryable: true,
    };
  }

  /**
   * 重试机制
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError;
  }
}