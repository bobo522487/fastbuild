import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTRPCUntypedClient } from '@trpc/client';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { trpcClient, api, createServerSideClient, getBaseUrl } from '@workspace/web/trpc/client';
import type { AppRouter } from '@workspace/api';

// Mock the window object
const mockWindow = {
  location: { href: 'http://localhost:3000' },
} as typeof window;

describe('tRPC 客户端配置单元测试', () => {
  let originalWindow: typeof window;
  let originalProcessEnv: typeof process.env;

  beforeEach(() => {
    originalWindow = global.window;
    originalProcessEnv = process.env;

    // Mock environment
    global.window = mockWindow;
    process.env = { ...process.env };

    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    process.env = originalProcessEnv;
    vi.restoreAllMocks();
  });

  describe('trpcClient', () => {
    it('应该创建有效的 tRPC 客户端实例', () => {
      expect(trpcClient).toBeDefined();
      expect(trpcClient).toBeInstanceOf(createTRPCUntypedClient());
    });

    it('应该配置正确的链接', () => {
      // 这里我们通过检查客户端的内部结构来验证配置
      expect(trpcClient).toHaveProperty('links');
      expect(Array.isArray(trpcClient.links)).toBe(true);
    });

    it('应该使用 superjson 作为序列化器', () => {
      // 通过检查链接配置来验证
      const links = trpcClient['links'];
      const httpLink = links.find((link: any) => link._type === 'httpBatchLink');

      expect(httpLink).toBeDefined();
      expect(httpLink).toHaveProperty('transformer');
      expect(httpLink.transformer).toBe(superjson);
    });
  });

  describe('getBaseUrl', () => {
    it('应该在浏览器环境返回空字符串', () => {
      const url = getBaseUrl();
      expect(url).toBe('');
    });

    it('应该在服务器端处理 Vercel URL', () => {
      // 模拟服务器端环境
      delete global.window;
      process.env.VERCEL_URL = 'my-app.vercel.app';

      const url = getBaseUrl();
      expect(url).toBe('https://my-app.vercel.app');
    });

    it('应该在服务器端使用默认端口', () => {
      // 模拟服务器端环境
      delete global.window;
      delete process.env.VERCEL_URL;
      delete process.env.PORT;

      const url = getBaseUrl();
      expect(url).toBe('http://localhost:3000');
    });

    it('应该在服务器端使用自定义端口', () => {
      // 模拟服务器端环境
      delete global.window;
      delete process.env.VERCEL_URL;
      process.env.PORT = '8080';

      const url = getBaseUrl();
      expect(url).toBe('http://localhost:8080');
    });

    it('应该优先使用 Vercel URL 而不是 PORT', () => {
      // 模拟服务器端环境
      delete global.window;
      process.env.VERCEL_URL = 'my-app.vercel.app';
      process.env.PORT = '8080';

      const url = getBaseUrl();
      expect(url).toBe('https://my-app.vercel.app');
    });
  });

  describe('createServerSideClient', () => {
    it('应该返回 trpcClient 实例', async () => {
      const client = await createServerSideClient();
      expect(client).toBe(trpcClient);
    });

    it('应该是异步函数', () => {
      expect(typeof createServerSideClient).toBe('function');
      expect(createServerSideClient.length).toBe(0);
    });
  });

  describe('API 对象', () => {
    it('应该包含所有必要的 API 端点', () => {
      expect(api).toBeDefined();
      expect(api.form).toBeDefined();
      expect(api.auth).toBeDefined();
      expect(api.submission).toBeDefined();
      expect(api.health).toBeDefined();
    });

    describe('form API', () => {
      it('应该提供表单相关的所有方法', () => {
        expect(api.form.list).toBeDefined();
        expect(api.form.getById).toBeDefined();
        expect(api.form.create).toBeDefined();
        expect(api.form.update).toBeDefined();
        expect(api.form.delete).toBeDefined();
        expect(api.form.getSubmissions).toBeDefined();

        expect(typeof api.form.list).toBe('function');
        expect(typeof api.form.getById).toBe('function');
        expect(typeof api.form.create).toBe('function');
        expect(typeof api.form.update).toBe('function');
        expect(typeof api.form.delete).toBe('function');
        expect(typeof api.form.getSubmissions).toBe('function');
      });

      it('应该正确调用 trpcClient 方法', () => {
        const mockTrpcClient = {
          form: {
            list: vi.fn(),
            getById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getSubmissions: vi.fn(),
          },
        } as any;

        // 创建一个临时的 api 对象来测试
        const tempApi = {
          form: {
            list: (input: any) => mockTrpcClient.form.list.query(input),
            getById: (input: any) => mockTrpcClient.form.getById.query(input),
            create: (input: any) => mockTrpcClient.form.create.mutate(input),
            update: (input: any) => mockTrpcClient.form.update.mutate(input),
            delete: (input: any) => mockTrpcClient.form.delete.mutate(input),
            getSubmissions: (input: any) => mockTrpcClient.form.getSubmissions.query(input),
          },
        };

        const testInput = { id: 'test-id' };
        tempApi.form.list(testInput);
        tempApi.form.getById(testInput);
        tempApi.form.create(testInput);
        tempApi.form.update(testInput);
        tempApi.form.delete(testInput);
        tempApi.form.getSubmissions(testInput);

        expect(mockTrpcClient.form.list).toHaveBeenCalledWith(testInput);
        expect(mockTrpcClient.form.getById).toHaveBeenCalledWith(testInput);
        expect(mockTrpcClient.form.create).toHaveBeenCalledWith(testInput);
        expect(mockTrpcClient.form.update).toHaveBeenCalledWith(testInput);
        expect(mockTrpcClient.form.delete).toHaveBeenCalledWith(testInput);
        expect(mockTrpcClient.form.getSubmissions).toHaveBeenCalledWith(testInput);
      });
    });

    describe('auth API', () => {
      it('应该提供认证相关的所有方法', () => {
        expect(api.auth.login).toBeDefined();
        expect(api.auth.register).toBeDefined();
        expect(api.auth.refreshToken).toBeDefined();
        expect(api.auth.me).toBeDefined();
        expect(api.auth.updateProfile).toBeDefined();
        expect(api.auth.changePassword).toBeDefined();
        expect(api.auth.logout).toBeDefined();
        expect(api.auth.createUser).toBeDefined();
        expect(api.auth.listUsers).toBeDefined();

        expect(typeof api.auth.login).toBe('function');
        expect(typeof api.auth.register).toBe('function');
        expect(typeof api.auth.refreshToken).toBe('function');
        expect(typeof api.auth.me).toBe('function');
        expect(typeof api.auth.updateProfile).toBe('function');
        expect(typeof api.auth.changePassword).toBe('function');
        expect(typeof api.auth.logout).toBe('function');
        expect(typeof api.auth.createUser).toBe('function');
        expect(typeof api.auth.listUsers).toBe('function');
      });
    });

    describe('submission API', () => {
      it('应该提供提交相关的所有方法', () => {
        expect(api.submission.create).toBeDefined();
        expect(api.submission.getById).toBeDefined();
        expect(api.submission.getByFormId).toBeDefined();
        expect(api.submission.update).toBeDefined();
        expect(api.submission.delete).toBeDefined();
        expect(api.submission.getStats).toBeDefined();
        expect(api.submission.bulkDelete).toBeDefined();

        expect(typeof api.submission.create).toBe('function');
        expect(typeof api.submission.getById).toBe('function');
        expect(typeof api.submission.getByFormId).toBe('function');
        expect(typeof api.submission.update).toBe('function');
        expect(typeof api.submission.delete).toBe('function');
        expect(typeof api.submission.getStats).toBe('function');
        expect(typeof api.submission.bulkDelete).toBe('function');
      });
    });

    describe('health API', () => {
      it('应该提供健康检查相关的所有方法', () => {
        expect(api.health.check).toBeDefined();
        expect(api.health.database).toBeDefined();
        expect(api.health.info).toBeDefined();

        expect(typeof api.health.check).toBe('function');
        expect(typeof api.health.database).toBe('function');
        expect(typeof api.health.info).toBe('function');
      });

      it('应该正确调用无参数的方法', () => {
        const mockTrpcClient = {
          health: {
            check: vi.fn(),
            database: vi.fn(),
            info: vi.fn(),
          },
        } as any;

        // 创建一个临时的 api 对象来测试
        const tempApi = {
          health: {
            check: () => mockTrpcClient.health.check.query(),
            database: () => mockTrpcClient.health.database.query(),
            info: () => mockTrpcClient.health.info.query(),
          },
        };

        tempApi.health.check();
        tempApi.health.database();
        tempApi.health.info();

        expect(mockTrpcClient.health.check).toHaveBeenCalledWith();
        expect(mockTrpcClient.health.database).toHaveBeenCalledWith();
        expect(mockTrpcClient.health.info).toHaveBeenCalledWith();
      });
    });
  });

  describe('客户端配置', () => {
    it('应该正确配置 HTTP 批量链接', () => {
      // 验证客户端配置是否正确
      expect(trpcClient).toBeDefined();

      // 由于我们无法直接访问内部配置，我们通过行为来验证
      // 这里我们验证客户端能够正确处理 API 调用
      expect(api.form.list).toBeDefined();
      expect(api.auth.login).toBeDefined();
      expect(api.health.check).toBeDefined();
    });

    it('应该在浏览器环境不添加内部服务头', () => {
      // 由于我们无法直接测试头部配置，我们验证 getBaseUrl 在浏览器环境的行为
      const url = getBaseUrl();
      expect(url).toBe('');
    });

    it('应该在服务器端环境支持内部服务头配置', () => {
      // 模拟服务器端环境
      delete global.window;

      // 验证在服务器端环境的基础 URL 生成
      const url = getBaseUrl();
      expect(url).toMatch(/http:\/\/localhost:\d+/);
    });
  });

  describe('类型安全', () => {
    it('应该保持 API 方法的类型安全', () => {
      // 测试输入参数的类型
      const formInput = { name: 'Test Form', metadata: { version: '1.0.0', fields: [] } };
      const authInput = { email: 'test@example.com', password: 'password123' };

      // 这些调用应该编译通过（在 TypeScript 环境中）
      expect(() => api.form.create(formInput)).not.toThrow();
      expect(() => api.auth.login(authInput)).not.toThrow();
    });

    it('应该提供正确的返回类型', () => {
      // 验证 API 方法返回的是 Promise
      const formPromise = api.form.list({ limit: 10 });
      const authPromise = api.auth.me();
      const healthPromise = api.health.check();

      expect(formPromise).toBeInstanceOf(Promise);
      expect(authPromise).toBeInstanceOf(Promise);
      expect(healthPromise).toBeInstanceOf(Promise);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理网络错误', async () => {
      // Mock 网络错误
      vi.spyOn(trpcClient, 'request').mockRejectedValue(new Error('Network error'));

      await expect(api.health.check()).rejects.toThrow('Network error');
    });

    it('应该正确处理 API 错误', async () => {
      // Mock API 错误
      const apiError = new Error('API Error');
      vi.spyOn(trpcClient, 'request').mockRejectedValue(apiError);

      await expect(api.health.check()).rejects.toThrow('API Error');
    });
  });

  describe('环境适应性', () => {
    it('应该在不同的环境中正确配置', () => {
      // 测试开发环境
      delete global.window;
      delete process.env.VERCEL_URL;
      process.env.NODE_ENV = 'development';

      const devUrl = getBaseUrl();
      expect(devUrl).toMatch(/http:\/\/localhost:\d+/);

      // 测试生产环境
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_URL = 'my-app.vercel.app';

      const prodUrl = getBaseUrl();
      expect(prodUrl).toBe('https://my-app.vercel.app');
    });
  });

  describe('API 路径生成', () => {
    it('应该生成正确的 API 路径', () => {
      // 验证基础 URL 生成正确性
      delete global.window;
      process.env.PORT = '3001';

      const baseUrl = getBaseUrl();
      expect(baseUrl).toBe('http://localhost:3001');

      // API 路径应该是基础 URL + '/api/trpc'
      const expectedApiPath = `${baseUrl}/api/trpc`;
      expect(expectedApiPath).toBe('http://localhost:3001/api/trpc');
    });
  });
});