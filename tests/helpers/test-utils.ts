import { vi } from 'vitest';

// 测试时间工具
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
  vi.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
};

// 测试数据生成器
export const generateTestData = {
  user: (overrides = {}) => ({
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
    role: 'USER',
    emailVerified: true,
    isActive: true,
    ...overrides,
  }),

  form: (overrides = {}) => ({
    name: 'Test Form',
    metadata: {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text' as const,
          label: '姓名',
          required: true,
        },
      ],
    },
    ...overrides,
  }),

  submission: (overrides = {}) => ({
    formId: 'test-form-id',
    data: {
      name: 'Test Submission',
    },
    ...overrides,
  }),

  // 生成随机字符串
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // 生成随机邮箱
  randomEmail: () => {
    const username = generateTestData.randomString(8);
    const domain = generateTestData.randomString(6);
    return `${username}@${domain}.com`;
  },

  // 生成随机用户数据
  randomUser: () => ({
    email: generateTestData.randomEmail(),
    name: generateTestData.randomString(10),
    password: generateTestData.randomString(12),
    role: 'USER',
    emailVerified: true,
    isActive: true,
  }),
};

// 测试断言辅助函数
export const assertApiResponse = {
  success: (response: any) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
  },

  error: (response: any, expectedError?: string) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    if (expectedError) {
      expect(response.message).toContain(expectedError);
    }
  },

  pagination: (response: any) => {
    expect(response).toBeDefined();
    expect(Array.isArray(response.items)).toBe(true);
    expect(response.total).toBeDefined();
    expect(response.page).toBeDefined();
    expect(response.pageSize).toBeDefined();
    expect(response.hasNext).toBeDefined();
    expect(response.hasPrev).toBeDefined();
  },

  user: (user: any) => {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.emailVerified).toBeDefined();
    expect(user.isActive).toBeDefined();
  },

  form: (form: any) => {
    expect(form).toBeDefined();
    expect(form.id).toBeDefined();
    expect(form.name).toBeDefined();
    expect(form.metadata).toBeDefined();
    expect(form.metadata.version).toBeDefined();
    expect(Array.isArray(form.metadata.fields)).toBe(true);
  },

  submission: (submission: any) => {
    expect(submission).toBeDefined();
    expect(submission.id).toBeDefined();
    expect(submission.formId).toBeDefined();
    expect(submission.data).toBeDefined();
    expect(submission.createdAt).toBeDefined();
  },
};

// 测试 HTTP 客户端模拟
export const createMockHttpClient = () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };

  return {
    client: mockClient,
    mockGet: (response: any, status = 200) => {
      mockClient.get.mockResolvedValue({
        status,
        json: () => Promise.resolve(response),
      });
    },
    mockPost: (response: any, status = 200) => {
      mockClient.post.mockResolvedValue({
        status,
        json: () => Promise.resolve(response),
      });
    },
    mockPut: (response: any, status = 200) => {
      mockClient.put.mockResolvedValue({
        status,
        json: () => Promise.resolve(response),
      });
    },
    mockDelete: (response: any, status = 200) => {
      mockClient.delete.mockResolvedValue({
        status,
        json: () => Promise.resolve(response),
      });
    },
    mockError: (error: any, status = 500) => {
      mockClient.get.mockRejectedValue({ status, message: error });
      mockClient.post.mockRejectedValue({ status, message: error });
      mockClient.put.mockRejectedValue({ status, message: error });
      mockClient.delete.mockRejectedValue({ status, message: error });
    },
  };
};

// 测试数据库工具
export const createTestDatabase = () => {
  const mockDb = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    form: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  return mockDb;
};

// 测试性能监控工具
export const createPerformanceMonitor = () => {
  const metrics = {
    requests: [] as Array<{
      endpoint: string;
      method: string;
      responseTime: number;
      timestamp: Date;
    }>,
    errors: [] as Array<{
      endpoint: string;
      method: string;
      error: string;
      timestamp: Date;
    }>,
  };

  return {
    recordRequest: (endpoint: string, method: string, responseTime: number) => {
      metrics.requests.push({
        endpoint,
        method,
        responseTime,
        timestamp: new Date(),
      });
    },
    recordError: (endpoint: string, method: string, error: string) => {
      metrics.errors.push({
        endpoint,
        method,
        error,
        timestamp: new Date(),
      });
    },
    getMetrics: () => metrics,
    getAverageResponseTime: () => {
      if (metrics.requests.length === 0) return 0;
      const totalTime = metrics.requests.reduce((sum, req) => sum + req.responseTime, 0);
      return totalTime / metrics.requests.length;
    },
    getErrorRate: () => {
      if (metrics.requests.length === 0) return 0;
      return (metrics.errors.length / metrics.requests.length) * 100;
    },
    reset: () => {
      metrics.requests = [];
      metrics.errors = [];
    },
  };
};

// 测试环境配置
export const setupTestEnvironment = () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fastbuild_test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

  // 模拟 console 方法
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
};

// 清理测试环境
export const cleanupTestEnvironment = () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
};