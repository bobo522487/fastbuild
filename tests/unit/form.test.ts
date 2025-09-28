import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';
import { prisma } from '@workspace/database';

describe('tRPC Form Router 单元测试', () => {
  let caller: any;
  let authCaller: any;
  let adminCaller: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = require('@workspace/database').prisma;

    // Create different callers for different auth scenarios
    caller = createCaller({
      user: null,
      prisma: mockPrisma,
    });

    authCaller = createCaller({
      user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
      prisma: mockPrisma,
    });

    adminCaller = createCaller({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      prisma: mockPrisma,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('应该获取表单列表', async () => {
      const mockForms = [
        {
          id: 'form-1',
          name: 'Test Form 1',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
        {
          id: 'form-2',
          name: 'Test Form 2',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrisma.form.findMany.mockResolvedValue(mockForms);
      mockPrisma.form.count.mockResolvedValue(2);

      const result = await caller.form.list({
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].name).toBe('Test Form 1');
    });

    it('应该支持搜索功能', async () => {
      const mockForms = [
        {
          id: 'form-1',
          name: 'Contact Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      ];

      mockPrisma.form.findMany.mockResolvedValue(mockForms);
      mockPrisma.form.count.mockResolvedValue(1);

      const result = await caller.form.list({
        limit: 10,
        search: 'contact',
      });

      expect(mockPrisma.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'contact', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('应该支持按创建者过滤', async () => {
      const mockForms = [
        {
          id: 'form-1',
          name: 'User Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      ];

      mockPrisma.form.findMany.mockResolvedValue(mockForms);
      mockPrisma.form.count.mockResolvedValue(1);

      const result = await caller.form.list({
        limit: 10,
        createdBy: 'user-1',
      });

      expect(mockPrisma.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdById: 'user-1',
          },
        })
      );
    });

    it('应该支持分页功能', async () => {
      const mockForms = [
        {
          id: 'form-2',
          name: 'Form 2',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      ];

      mockPrisma.form.findMany.mockResolvedValue(mockForms);
      mockPrisma.form.count.mockResolvedValue(3);

      const result = await caller.form.list({
        limit: 1,
        cursor: 'form-1',
      });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('getById', () => {
    it('应该获取表单详情', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);

      const result = await caller.form.getById({
        id: 'form-1',
      });

      expect(result.id).toBe('form-1');
      expect(result.name).toBe('Test Form');
      expect(result.createdBy.id).toBe('user-1');
    });

    it('应该抛出表单未找到错误', async () => {
      mockPrisma.form.findUnique.mockResolvedValue(null);

      await expect(
        caller.form.getById({
          id: 'nonexistent-form',
        })
      ).rejects.toThrow('FORM_NOT_FOUND');
    });
  });

  describe('create', () => {
    it('认证用户应该成功创建表单', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'New Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
      };

      mockPrisma.form.create.mockResolvedValue(mockForm);

      const result = await authCaller.form.create({
        name: 'New Form',
        metadata: { version: '1.0.0', fields: [] },
      });

      expect(result.name).toBe('New Form');
      expect(result.createdById).toBe('user-1');
      expect(mockPrisma.form.create).toHaveBeenCalledWith({
        data: {
          name: 'New Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('未认证用户应该被拒绝创建表单', async () => {
      await expect(
        caller.form.create({
          name: 'New Form',
          metadata: { version: '1.0.0', fields: [] },
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('应该验证表单名称长度', async () => {
      await expect(
        authCaller.form.create({
          name: '', // 空名称
          metadata: { version: '1.0.0', fields: [] },
        })
      ).rejects.toThrow('Name must be at least 1 character(s)');
    });

    it('应该验证表单元数据结构', async () => {
      await expect(
        authCaller.form.create({
          name: 'Valid Name',
          metadata: { version: '1.0.0', fields: 'invalid' }, // 无效字段
        })
      ).rejects.toThrow('fields must be an array');
    });
  });

  describe('update', () => {
    it('表单创建者应该成功更新表单', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Old Name',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedForm = {
        id: 'form-1',
        name: 'Updated Name',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.update.mockResolvedValue(updatedForm);

      const result = await authCaller.form.update({
        id: 'form-1',
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('管理员应该成功更新任何表单', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Old Name',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-2', // 不同用户创建
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedForm = {
        id: 'form-1',
        name: 'Admin Updated Name',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.update.mockResolvedValue(updatedForm);

      const result = await adminCaller.form.update({
        id: 'form-1',
        name: 'Admin Updated Name',
      });

      expect(result.name).toBe('Admin Updated Name');
    });

    it('非创建者非管理员应该被拒绝更新', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Old Name',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-2', // 不同用户创建
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);

      await expect(
        authCaller.form.update({
          id: 'form-1',
          name: 'Updated Name',
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('应该拒绝更新不存在的表单', async () => {
      mockPrisma.form.findUnique.mockResolvedValue(null);

      await expect(
        authCaller.form.update({
          id: 'nonexistent-form',
          name: 'Updated Name',
        })
      ).rejects.toThrow('FORM_NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('表单创建者应该成功删除表单', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.delete.mockResolvedValue(existingForm);

      const result = await authCaller.form.delete({
        id: 'form-1',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.form.delete).toHaveBeenCalledWith({
        where: { id: 'form-1' },
      });
    });

    it('管理员应该成功删除任何表单', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-2', // 不同用户创建
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);
      mockPrisma.form.delete.mockResolvedValue(existingForm);

      const result = await adminCaller.form.delete({
        id: 'form-1',
      });

      expect(result.success).toBe(true);
    });

    it('非创建者非管理员应该被拒绝删除', async () => {
      const existingForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-2', // 不同用户创建
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.form.findUnique.mockResolvedValue(existingForm);

      await expect(
        authCaller.form.delete({
          id: 'form-1',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getSubmissions', () => {
    it('应该获取表单的提交列表', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'Test Submission', email: 'test@example.com' },
          createdById: 'user-1',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
        {
          id: 'submission-2',
          formId: 'form-1',
          data: { name: 'Another Submission', email: 'another@example.com' },
          createdById: 'user-2',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(2);

      const result = await caller.form.getSubmissions({
        formId: 'form-1',
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].formId).toBe('form-1');
    });

    it('应该限制返回的提交数量', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'Test Submission' },
          createdById: 'user-1',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
        },
      ];

      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(1);

      const result = await caller.form.getSubmissions({
        formId: 'form-1',
        limit: 5,
      });

      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { formId: 'form-1' },
          take: 5,
        })
      );
    });
  });

  describe('validation', () => {
    it('应该验证表单字段类型', () => {
      const validFieldTypes = ['text', 'number', 'select', 'date', 'checkbox', 'textarea'];

      validFieldTypes.forEach(type => {
        expect(() =>
          authCaller.form.create({
            name: 'Test Form',
            metadata: {
              version: '1.0.0',
              fields: [{
                id: 'field-1',
                name: 'test_field',
                type: type as any,
                label: 'Test Field',
              }],
            },
          })
        ).not.toThrow();
      });
    });

    it('应该拒绝无效的字段类型', () => {
      expect(() =>
        authCaller.form.create({
          name: 'Test Form',
          metadata: {
            version: '1.0.0',
            fields: [{
              id: 'field-1',
              name: 'test_field',
              type: 'invalid_type' as any,
              label: 'Test Field',
            }],
          },
        })
      ).rejects.toThrow('Invalid enum value');
    });

    it('应该验证必填字段', () => {
      expect(() =>
        authCaller.form.create({
          name: 'Test Form',
          metadata: {
            version: '1.0.0',
            fields: [{
              id: 'field-1',
              name: 'test_field',
              type: 'text',
              required: true,
            } as any], // 缺少 label
          },
        })
      ).rejects.toThrow();
    });
  });
});