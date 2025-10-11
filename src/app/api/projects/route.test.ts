import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from '~/app/api/projects/route';
import { MockSetup } from '../../utils/mock-setup';
import { createMockRequest, validateApiResponse, createTestContext } from '../../utils/test-helpers';
import { TestDataFactory } from '../../utils/factory';

describe('项目 API - 集成测试', () => {
  const mockUser = TestDataFactory.createTestUser();

  beforeEach(() => {
    MockSetup.setupAllMocks();
    MockSetup.mockAuthenticatedUser(mockUser);
  });

  afterEach(() => {
    MockSetup.resetAllMocks();
  });

  describe('POST /api/projects', () => {
    it('AC1: 应该成功创建新项目', async () => {
      // Arrange
      const projectData = {
        name: '测试项目',
        description: '这是一个测试项目',
        visibility: 'PRIVATE' as const,
      };

      const mockProject = {
        id: 'project-id',
        slug: 'test-project',
        name: projectData.name,
        description: projectData.description,
        visibility: projectData.visibility,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: mockUser.id,
      };

      const { mockPrismaClient } = await import('../../__mocks__/prisma');

      // Mock transaction
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue(mockProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const request = createMockRequest('POST', '/api/projects', projectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: 'project-id',
        slug: 'test-project',
        name: '测试项目',
        description: '这是一个测试项目',
        visibility: 'PRIVATE',
      });
    });

    it('AC1: 应该验证项目名称长度', async () => {
      // Arrange
      const invalidProjectData = {
        name: 'a'.repeat(101), // 名称太长
        description: '测试描述',
        visibility: 'PRIVATE' as const,
      };

      // Act
      const request = createMockRequest('POST', '/api/projects', invalidProjectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details[0].message).toContain('项目名称不能超过100个字符');
    });

    it('AC1: 应该验证项目名称必填', async () => {
      // Arrange
      const invalidProjectData = {
        name: '',
        description: '测试描述',
        visibility: 'PRIVATE' as const,
      };

      // Act
      const request = createMockRequest('POST', '/api/projects', invalidProjectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.details[0].message).toContain('项目名称是必填项');
    });

    it('AC1: 应该自动生成项目slug', async () => {
      // Arrange
      const projectData = {
        name: '我的 Awesome 项目',
        description: '测试项目',
        visibility: 'PUBLIC' as const,
      };

      const mockProject = {
        id: 'project-id',
        slug: 'my-awesome-project',
        name: projectData.name,
        description: projectData.description,
        visibility: projectData.visibility,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: mockUser.id,
      };

      const { mockPrismaClient } = await import('../../__mocks__/prisma');

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue(mockProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const request = createMockRequest('POST', '/api/projects', projectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(data.data.slug).toBe('my-awesome-project');
    });

    it('AC1: 应该设置默认可见性为PRIVATE', async () => {
      // Arrange
      const projectData = {
        name: '测试项目',
        description: '测试描述',
        // 不提供 visibility
      };

      const mockProject = {
        id: 'project-id',
        slug: 'test-project',
        name: projectData.name,
        description: projectData.description,
        visibility: 'PRIVATE', // 默认值
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: mockUser.id,
      };

      const { mockPrismaClient } = await import('../../__mocks__/prisma');

      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue(mockProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const request = createMockRequest('POST', '/api/projects', projectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(data.data.visibility).toBe('PRIVATE');
    });

    it('AC1: 应该处理数据库事务失败', async () => {
      // Arrange
      const projectData = {
        name: '测试项目',
        description: '测试描述',
        visibility: 'PRIVATE' as const,
      };

      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.$transaction.mockRejectedValue(new Error('数据库事务失败'));

      // Act
      const request = createMockRequest('POST', '/api/projects', projectData, {
        'x-user-id': mockUser.id,
        'x-user-email': mockUser.email,
        'x-user-name': mockUser.name,
      });

      const response = await POST(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('创建项目失败');
    });

    it('AC1: 应该要求用户认证', async () => {
      // Arrange
      const projectData = {
        name: '测试项目',
        description: '测试描述',
        visibility: 'PRIVATE' as const,
      };

      MockSetup.mockUnauthenticatedSession();

      // Act
      const request = createMockRequest('POST', '/api/projects', projectData);

      const response = await POST(request);
      const result = validateApiResponse(response);

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe('GET /api/projects', () => {
    it('AC1: 应该返回项目列表', async () => {
      // Arrange
      const mockProjects = [
        {
          id: 'project-1',
          slug: 'project-1',
          name: '项目1',
          description: '描述1',
          visibility: 'PRIVATE',
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: {
            id: 'user-1',
            name: '用户1',
            email: 'user1@example.com',
          },
        },
        {
          id: 'project-2',
          slug: 'project-2',
          name: '项目2',
          description: '描述2',
          visibility: 'PUBLIC',
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: {
            id: 'user-2',
            name: '用户2',
            email: 'user2@example.com',
          },
        },
      ];

      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaClient.project.count.mockResolvedValue(2);

      // Act
      const request = createMockRequest('GET', '/api/projects?page=1&limit=10');
      const response = await GET(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.projects).toHaveLength(2);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('AC1: 应该支持分页', async () => {
      // Arrange
      const mockProjects = [
        {
          id: 'project-1',
          name: '项目1',
          owner: { id: 'user-1', name: '用户1' },
        },
      ];

      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaClient.project.count.mockResolvedValue(15);

      // Act
      const request = createMockRequest('GET', '/api/projects?page=2&limit=5');
      const response = await GET(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(data.data.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 15,
        totalPages: 3,
      });
    });

    it('AC1: 应该支持搜索', async () => {
      // Arrange
      const mockProjects = [
        {
          id: 'project-1',
          name: '搜索项目',
          description: '包含搜索关键词的项目',
          owner: { id: 'user-1', name: '用户1' },
        },
      ];

      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaClient.project.count.mockResolvedValue(1);

      // Act
      const request = createMockRequest('GET', '/api/projects?search=搜索');
      const response = await GET(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(data.data.projects).toHaveLength(1);
      expect(data.data.projects[0].name).toBe('搜索项目');
    });

    it('AC1: 应该支持可见性过滤', async () => {
      // Arrange
      const mockProjects = [
        {
          id: 'project-1',
          name: '公开项目',
          visibility: 'PUBLIC',
          owner: { id: 'user-1', name: '用户1' },
        },
      ];

      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);
      mockPrismaClient.project.count.mockResolvedValue(1);

      // Act
      const request = createMockRequest('GET', '/api/projects?visibility=PUBLIC');
      const response = await GET(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(data.data.projects).toHaveLength(1);
      expect(data.data.projects[0].visibility).toBe('PUBLIC');
    });

    it('AC1: 应该处理查询参数错误', async () => {
      // Arrange
      const { mockPrismaClient } = await import('../../__mocks__/prisma');
      mockPrismaClient.project.findMany.mockRejectedValue(new Error('查询参数错误'));

      // Act
      const request = createMockRequest('GET', '/api/projects?page=-1');
      const response = await GET(request);
      const result = validateApiResponse(response);
      const data = await response.json();

      // Assert
      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});