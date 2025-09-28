import { test, expect } from '@playwright/test';

test.describe('API 端点测试', () => {
  test('健康检查端点', async ({ request }) => {
    const response = await request.get('/api/trpc/health.check');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('result', expect.any(Object));
    expect(body.result.data).toHaveProperty('status', 'healthy');
  });

  test('数据库连接检查', async ({ request }) => {
    const response = await request.get('/api/trpc/health.database');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.result.data).toHaveProperty('status', 'connected');
  });

  test('系统信息端点', async ({ request }) => {
    const response = await request.get('/api/trpc/health.info');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.result.data).toHaveProperty('service', 'FastBuild API');
  });

  test.describe('认证流程', () => {
    test('用户注册', async ({ request }) => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const response = await request.post('/api/trpc/auth.register', {
        data: userData,
      });

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.result.data).toHaveProperty('user');
        expect(body.result.data.user).toHaveProperty('email', userData.email);
      } else if (response.status() === 400) {
        // 用户可能已存在，这也是正常的
        const body = await response.json();
        expect(body.error).toHaveProperty('message');
      } else {
        throw new Error(`Unexpected status: ${response.status()}`);
      }
    });

    test('用户登录', async ({ request }) => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request.post('/api/trpc/auth.login', {
        data: loginData,
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('accessToken');
      expect(body.result.data).toHaveProperty('refreshToken');
      expect(body.result.data).toHaveProperty('user');
    });

    test('获取当前用户信息', async ({ request }) => {
      // 先登录获取 token
      const loginResponse = await request.post('/api/trpc/auth.login', {
        data: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      if (loginResponse.status() !== 200) {
        test.skip('登录失败，跳过用户信息测试');
        return;
      }

      const loginBody = await loginResponse.json();
      const token = loginBody.result.data.accessToken;

      // 使用 token 获取用户信息
      const response = await request.get('/api/trpc/auth.me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('email', 'test@example.com');
    });
  });

  test.describe('表单管理', () => {
    let authToken: string;
    let formId: string;

    test.beforeAll(async ({ request }) => {
      // 登录获取认证 token
      const loginResponse = await request.post('/api/trpc/auth.login', {
        data: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      if (loginResponse.status() !== 200) {
        throw new Error('Failed to login for form tests');
      }

      const loginBody = await loginResponse.json();
      authToken = loginBody.result.data.accessToken;
    });

    test('创建表单', async ({ request }) => {
      const formData = {
        name: 'Test Form',
        metadata: {
          version: '1.0.0',
          fields: [
            {
              id: 'name',
              name: 'name',
              type: 'text',
              label: '姓名',
              required: true,
            },
            {
              id: 'email',
              name: 'email',
              type: 'text',
              label: '邮箱',
              required: true,
            },
          ],
        },
      };

      const response = await request.post('/api/trpc/form.create', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: formData,
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('name', formData.name);
      expect(body.result.data).toHaveProperty('id');

      formId = body.result.data.id;
    });

    test('获取表单列表', async ({ request }) => {
      const response = await request.get('/api/trpc/form.list');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('items');
      expect(Array.isArray(body.result.data.items)).toBe(true);
    });

    test('获取表单详情', async ({ request }) => {
      if (!formId) {
        test.skip('No form ID available');
        return;
      }

      const response = await request.get(`/api/trpc/form.getById?input=${JSON.stringify({ id: formId })}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('id', formId);
    });

    test('更新表单', async ({ request }) => {
      if (!formId) {
        test.skip('No form ID available');
        return;
      }

      const updateData = {
        id: formId,
        name: 'Updated Test Form',
        metadata: {
          version: '1.0.0',
          fields: [
            {
              id: 'name',
              name: 'name',
              type: 'text',
              label: '姓名',
              required: true,
            },
          ],
        },
      };

      const response = await request.post('/api/trpc/form.update', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: updateData,
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('name', updateData.name);
    });

    test('删除表单', async ({ request }) => {
      if (!formId) {
        test.skip('No form ID available');
        return;
      }

      const response = await request.post('/api/trpc/form.delete', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: { id: formId },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('success', true);
    });
  });

  test.describe('表单提交', () => {
    let authToken: string;
    let formId: string;

    test.beforeAll(async ({ request }) => {
      // 登录获取认证 token
      const loginResponse = await request.post('/api/trpc/auth.login', {
        data: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      if (loginResponse.status() !== 200) {
        throw new Error('Failed to login for submission tests');
      }

      const loginBody = await loginResponse.json();
      authToken = loginBody.result.data.accessToken;

      // 创建测试表单
      const formData = {
        name: 'Test Submission Form',
        metadata: {
          version: '1.0.0',
          fields: [
            {
              id: 'name',
              name: 'name',
              type: 'text',
              label: '姓名',
              required: true,
            },
          ],
        },
      };

      const formResponse = await request.post('/api/trpc/form.create', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: formData,
      });

      const formBody = await formResponse.json();
      formId = formBody.result.data.id;
    });

    test('提交表单数据', async ({ request }) => {
      if (!formId) {
        test.skip('No form ID available');
        return;
      }

      const submissionData = {
        formId,
        data: {
          name: 'Test Submission',
        },
      };

      const response = await request.post('/api/trpc/submission.create', {
        data: submissionData,
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('id');
      expect(body.result.data).toHaveProperty('formId', formId);
    });

    test('获取表单提交列表', async ({ request }) => {
      if (!formId) {
        test.skip('No form ID available');
        return;
      }

      const response = await request.get(`/api/trpc/submission.getByFormId?input=${JSON.stringify({ formId })}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.result.data).toHaveProperty('items');
      expect(Array.isArray(body.result.data.items)).toBe(true);
    });
  });

  test.describe('错误处理', () => {
    test('无效的登录凭据', async ({ request }) => {
      const response = await request.post('/api/trpc/auth.login', {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('未授权访问受保护端点', async ({ request }) => {
      const response = await request.get('/api/trpc/auth.me');
      expect(response.status()).toBe(400);
    });

    test('访问不存在的表单', async ({ request }) => {
      const response = await request.get('/api/trpc/form.getById?input=' + JSON.stringify({ id: 'non-existent-id' }));
      expect(response.status()).toBe(400);
    });
  });
});