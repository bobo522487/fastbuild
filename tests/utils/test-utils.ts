/**
 * 测试辅助工具
 * 提供通用的测试辅助函数
 */

import { testDb } from './test-database';

/**
 * 重置测试数据库
 */
export async function resetTestDatabase() {
  await testDb.reset();
}

/**
 * 创建测试用的Prisma客户端
 */
export function createTestPrismaClient() {
  return testDb.getClient();
}

/**
 * 等待指定时间（用于异步测试）
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建模拟的NextRequest对象
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * 解析JSON响应
 */
export async function parseJSONResponse<T = any>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * 验证响应状态码
 */
export function expectStatus(response: Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
}

/**
 * 验证响应头
 */
export function expectHeader(response: Response, name: string, value: string) {
  expect(response.headers.get(name)).toBe(value);
}

/**
 * 验证响应包含特定字段
 */
export function expectResponseContains<T>(data: T, field: string, value?: any) {
  expect(data).toHaveProperty(field);
  if (value !== undefined) {
    expect((data as any)[field]).toBe(value);
  }
}

/**
 * 验证错误响应格式
 */
export function expectErrorResponse(
  data: any,
  expectedCode?: string,
  expectedMessage?: string
) {
  expect(data).toHaveProperty('code');
  expect(data).toHaveProperty('message');

  if (expectedCode) {
    expect(data.code).toBe(expectedCode);
  }

  if (expectedMessage) {
    expect(data.message).toBe(expectedMessage);
  }
}

/**
 * 验证分页响应格式
 */
export function expectPaginatedResponse(
  data: any,
  expectedPage?: number,
  expectedLimit?: number
) {
  expect(data).toHaveProperty('data');
  expect(data).toHaveProperty('pagination');
  expect(data.pagination).toHaveProperty('page');
  expect(data.pagination).toHaveProperty('limit');
  expect(data.pagination).toHaveProperty('total');
  expect(data.pagination).toHaveProperty('totalPages');
  expect(data.pagination).toHaveProperty('hasNext');
  expect(data.pagination).toHaveProperty('hasPrev');

  if (expectedPage !== undefined) {
    expect(data.pagination.page).toBe(expectedPage);
  }

  if (expectedLimit !== undefined) {
    expect(data.pagination.limit).toBe(expectedLimit);
  }
}

/**
 * 生成随机测试数据
 */
export function generateRandomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机测试邮箱
 */
export function generateRandomEmail(): string {
  return `test-${generateRandomString(8)}-${Date.now()}@example.com`;
}

/**
 * 验证日期格式
 */
export function isValidDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 验证ID格式（FastBuild短ID格式）
 */
export function isValidShortId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  if (prefix) {
    const regex = new RegExp(`^${prefix}_[\\w~-]{8}$`);
    return regex.test(id);
  } else {
    return /^[a-z]{3,4}_[\\w~-]{8}$/.test(id);
  }
}

/**
 * 模拟用户认证
 */
export function createMockAuth(user: {
  id: string;
  email: string;
  name?: string;
}) {
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
  };
}

/**
 * 创建批量测试请求
 */
export function createBatchRequests(
  baseUrl: string,
  count: number,
  options: {
    method?: string;
    headers?: Record<string, string>;
    bodyGenerator?: (index: number) => any;
  } = {}
): Request[] {
  const { method = 'GET', headers = {}, bodyGenerator } = options;

  return Array.from({ length: count }, (_, index) => {
    const body = bodyGenerator ? bodyGenerator(index) : undefined;
    return createMockRequest(`${baseUrl}?batch=${index}`, {
      method,
      headers,
      body,
    });
  });
}

/**
 * 捕获并验证错误
 */
export async function expectError<T>(
  promise: Promise<T>,
  expectedErrorType?: new (...args: any[]) => Error
): Promise<Error> {
  try {
    await promise;
    throw new Error('Expected promise to throw an error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);

    if (expectedErrorType) {
      expect(error).toBeInstanceOf(expectedErrorType);
    }

    return error as Error;
  }
}

/**
 * 测试数据清理工具
 */
export class TestDataCleaner {
  private createdIds: Array<{
    type: string;
    id: string;
  }> = [];

  addId(type: string, id: string) {
    this.createdIds.push({ type, id });
  }

  async cleanup() {
    const prisma = createTestPrismaClient();

    try {
      // 逆序删除（避免外键约束问题）
      for (let i = this.createdIds.length - 1; i >= 0; i--) {
        const item = this.createdIds[i];
        if (!item) continue;
        const { type, id } = item;

        try {
          switch (type) {
            case 'user':
              await prisma.user.delete({ where: { id } });
              break;
            case 'project':
              await prisma.project.delete({ where: { id } });
              break;
            case 'projectMember':
              await prisma.projectMember.delete({ where: { id } });
              break;
            case 'auditLog':
              await prisma.auditLog.delete({ where: { id } });
              break;
          }
        } catch (error) {
          // 忽略删除错误（可能已经被删除）
          console.warn(`Failed to delete ${type} with id ${id}:`, error);
        }
      }
    } finally {
      await prisma.$disconnect();
      this.createdIds = [];
    }
  }
}

/**
 * 性能测试辅助工具
 */
export class PerformanceTester {
  private startTime: number = 0;
  private measurements: number[] = [];

  start() {
    this.startTime = performance.now();
  }

  stop(): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    this.measurements.push(duration);
    return duration;
  }

  getAverageTime(): number {
    if (this.measurements.length === 0) return 0;
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;
  }

  getMinTime(): number {
    if (this.measurements.length === 0) return 0;
    return Math.min(...this.measurements);
  }

  getMaxTime(): number {
    if (this.measurements.length === 0) return 0;
    return Math.max(...this.measurements);
  }

  reset() {
    this.measurements = [];
  }
}

/**
 * 环境变量测试工具
 */
export function getTestEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}