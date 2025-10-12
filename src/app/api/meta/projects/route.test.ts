/**
 * 项目API端点测试
 * 测试项目的创建、查询功能
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { createAuditLog } from '~/server/api/middleware/audit';

// Mock dependencies
vi.mock('~/server/db', () => ({
  db: {
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    projectMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('~/lib/server-utils', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('~/server/api/middleware/audit', () => ({
  createAuditLog: vi.fn(),
}));

describe('/api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('returns projects for authenticated user', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const mockProjects = [
        {
          id: 'proj-123',
          name: 'Test Project',
          slug: 'test-project',
          description: 'A test project',
          visibility: 'PRIVATE' as const,
          deletedAt: null,
          createdBy: 'user-123',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-01T00:00:00Z'),
          ProjectMember: [],
          _count: { ProjectMember: 1, Application: 0, DataModelDeployment: 0 },
        },
      ];

      vi.mocked(db.project.count).mockResolvedValue(1);
      vi.mocked(db.project.findMany).mockResolvedValue(mockProjects);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Test Project');
    });

    it('handles search query parameter', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      vi.mocked(db.project.count).mockResolvedValue(0);
      vi.mocked(db.project.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/projects?search=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'test', mode: 'insensitive' },
          }),
        })
      );
    });

    it('handles pagination parameters', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      vi.mocked(db.project.count).mockResolvedValue(25);
      vi.mocked(db.project.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/projects?page=2&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.totalPages).toBe(3);
      expect(db.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        })
      );
    });

    it('handles visibility filter', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      vi.mocked(db.project.count).mockResolvedValue(0);
      vi.mocked(db.project.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/projects?visibility=PUBLIC');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: 'PUBLIC',
          }),
        })
      );
    });

    it('validates query parameters', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/projects?page=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('handles database errors gracefully', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      vi.mocked(db.project.count).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'INTERNAL_ERROR');
    });
  });

  describe('POST /api/projects', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Project' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('creates a new project successfully', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const newProject = {
        id: 'proj-123',
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        visibility: 'PRIVATE' as const,
        deletedAt: null,
        createdBy: 'user-123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        ProjectMember: [],
        _count: { ProjectMember: 1, Application: 0, DataModelDeployment: 0 },
      };

      vi.mocked(db.project.findFirst).mockResolvedValue(null);
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue(newProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const requestBody = {
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        visibility: 'PRIVATE',
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data.name).toBe('Test Project');
    });

    it('handles duplicate project names', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      vi.mocked(db.project.findFirst).mockResolvedValueOnce({
        id: 'existing-proj',
        name: 'Existing Project',
        slug: 'existing-project',
        deletedAt: null,
        visibility: 'PRIVATE' as const,
        createdBy: 'user-123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });

      const requestBody = {
        name: 'Existing Project',
        slug: 'existing-project',
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'ALREADY_EXISTS');
    });

    it('handles duplicate slugs by generating new ones', async () => {
      const { getCurrentUser, generateSlug } = await Promise.all([
        import('~/lib/server-utils'),
        import('~/lib/utils'),
      ]);

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      // First call finds existing project with same slug
      vi.mocked(db.project.findFirst).mockResolvedValueOnce({
        id: 'existing-proj',
        slug: 'test-project',
        deletedAt: null,
        name: 'Existing Project',
        visibility: 'PRIVATE' as const,
        createdBy: 'user-123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });

      // Second call checks if new slug exists (it doesn't)
      vi.mocked(db.project.findFirst).mockResolvedValueOnce(null);

      const newProject = {
        id: 'proj-123',
        name: 'Test Project',
        slug: 'test-project-abc123', // Generated slug
        description: 'A test project',
        visibility: 'PRIVATE',
        createdBy: 'user-123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        members: [],
        _count: { members: 1, applications: 0, dataModelDeployments: 0 },
      };

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValue(newProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const requestBody = {
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        visibility: 'PRIVATE',
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.slug).not.toBe('test-project'); // Should be different
    });

    it('validates request body', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const invalidRequestBody = {
        name: '', // Empty name should fail validation
        slug: 'test-project',
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('handles malformed JSON', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('code', 'INTERNAL_ERROR');
    });

    it('creates audit log on project creation', async () => {
      const { getCurrentUser } = await import('~/lib/server-utils');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const newProject = {
        id: 'proj-123',
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        visibility: 'PRIVATE' as const,
        deletedAt: null,
        createdBy: 'user-123',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        ProjectMember: [],
        _count: { ProjectMember: 1, Application: 0, DataModelDeployment: 0 },
      };

      vi.mocked(db.project.findFirst).mockResolvedValue(null);
      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          project: {
            create: vi.fn().mockResolvedValue(newProject),
          },
          projectMember: {
            create: vi.fn().mockResolvedValue({}),
          },
        };

        await callback(mockTx);
        return newProject;
      });

      const requestBody = {
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        visibility: 'PRIVATE',
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(createAuditLog).toHaveBeenCalledWith({
        projectId: 'proj-123',
        action: 'CREATE_PROJECT',
        resourceType: 'PROJECT',
        resourceId: 'proj-123',
        message: 'Created project "Test Project"',
        metadata: {
          projectName: 'Test Project',
          visibility: 'PRIVATE',
        },
      });
    });
  });
});