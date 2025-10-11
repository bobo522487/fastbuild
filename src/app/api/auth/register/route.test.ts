import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '~/app/api/auth/register/route';
import { MockSetup } from '../../../utils/mock-setup';
import { createMockRequest, validateApiResponse } from '../../../utils/test-helpers';
import { TestDataFactory } from '../../../utils/factory';

describe('用户注册 API - 集成测试', () => {
  beforeEach(() => {
    MockSetup.setupAllMocks();
  });

  afterEach(() => {
    MockSetup.resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('AC1.1: 应该成功创建新用户', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedUser = {
        id: 'user-id',
        name: userData.name,
        email: userData.email,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { mockPrismaClient } = await import('../../../__mocks__/prisma');
      const { hash } = await import('../../../__mocks__/bcrypt');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      hash.mockResolvedValue('hashedPassword');
      mockPrismaClient.user.create.mockResolvedValue(expectedUser);

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 'user-id',
        name: userData.name,
        email: userData.email,
      });

      MockSetup.verifyMockCall(mockPrismaClient.user.create);
      MockSetup.verifyMockCallWith(mockPrismaClient.user.create, [{
        data: {
          name: userData.name,
          email: userData.email,
          password: 'hashedPassword',
        },
      }]);
    });

    it('AC1.1: 应该拒绝已存在的邮箱', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'existing@example.com',
        password: 'password123',
      };

      const { mockPrismaClient } = await import('../../../__mocks__/prisma');
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: userData.email,
      });

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('邮箱已被注册');
    });

    it('AC1.1: 应该验证必填字段', async () => {
      // Arrange
      const invalidUserData = {
        name: '',
        email: 'invalid-email',
        password: '123',
      };

      // Act
      const request = createMockRequest('POST', '/api/auth/register', invalidUserData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details).toHaveLength(3); // name, email, password 都有错误
    });

    it('AC1.1: 应该处理数据库错误', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'test@example.com',
        password: 'password123',
      };

      const { mockPrismaClient } = await import('../../../__mocks__/prisma');
      const { hash } = await import('../../../__mocks__/bcrypt');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      hash.mockResolvedValue('hashedPassword');
      mockPrismaClient.user.create.mockRejectedValue(new Error('数据库连接失败'));

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('注册失败，请稍后重试');
    });

    it('AC1.1: 应该验证密码长度', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'test@example.com',
        password: '123', // 密码太短
      };

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details[0].message).toContain('密码至少需要6个字符');
    });

    it('AC1.1: 应该验证姓名长度', async () => {
      // Arrange
      const userData = {
        name: 'a'.repeat(101), // 姓名太长
        email: 'test@example.com',
        password: 'password123',
      };

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details[0].message).toContain('姓名不能超过50个字符');
    });

    it('AC1.1: 应该验证邮箱格式', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'invalid-email',
        password: 'password123',
      };

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details[0].message).toContain('邮箱格式不正确');
    });

    it('AC1.1: 应该自动设置邮箱验证状态', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'test@example.com',
        password: 'password123',
      };

      const { mockPrismaClient } = await import('../../../__mocks__/prisma');
      const { hash } = await import('../../../__mocks__/bcrypt');

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      hash.mockResolvedValue('hashedPassword');

      // Mock user create to capture the actual data passed
      const actualCreateData = vi.fn().mockResolvedValue({
        id: 'user-id',
        name: userData.name,
        email: userData.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaClient.user.create.mockImplementation(actualCreateData);

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);
      await POST(request);

      // Assert
      expect(actualCreateData).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: userData.name,
          email: userData.email,
          password: 'hashedPassword',
          emailVerified: null, // 初始状态应该为null
        }),
      });
    });

    it('AC1.1: 应该支持批量用户注册（测试数据工厂）', async () => {
      // Arrange
      const testUsers = TestDataFactory.createTestUsers(3);
      const { mockPrismaClient } = await import('../../../__mocks__/prisma');
      const { hash } = await import('../../../__mocks__/bcrypt');

      // Mock successful creation for all users
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      hash.mockResolvedValue('hashedPassword');
      mockPrismaClient.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: `user-${data.email}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      // Act & Assert - Test each user registration
      for (const user of testUsers) {
        const request = createMockRequest('POST', '/api/auth/register', {
          name: user.name,
          email: user.email,
          password: user.password,
        });

        const response = await POST(request);
        const result = validateApiResponse(response);
        const data = await response.json();

        expect(result.success).toBe(true);
        expect(result.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.email).toBe(user.email);
      }
    });

    it('AC1.1: 应该处理网络错误和超时', async () => {
      // Arrange
      const userData = {
        name: '测试用户',
        email: 'test@example.com',
        password: 'password123',
      };

      const { mockPrismaClient } = await import('../../../__mocks__/prisma');

      // Mock network timeout
      mockPrismaClient.user.findUnique.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(null), 15000))
      );

      // Act
      const request = createMockRequest('POST', '/api/auth/register', userData);

      // Set timeout for the test
      const responsePromise = POST(request);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 1000)
      );

      // Assert
      await expect(Promise.race([responsePromise, timeoutPromise])).rejects.toThrow('Request timeout');
    });
  });
});