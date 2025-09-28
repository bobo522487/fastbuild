import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc/routers/index';
import { prisma } from '@workspace/database';

describe('tRPC Submission Router 单元测试', () => {
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

  describe('create', () => {
    it('应该成功创建表单提交', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe', email: 'john@example.com' },
        submittedById: null,
        createdAt: new Date(),
        submittedBy: null,
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.create.mockResolvedValue(mockSubmission);

      const result = await caller.submission.create({
        formId: 'form-1',
        data: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(result.submissionId).toBe('submission-1');
      expect(result.message).toBe('表单提交成功');
      expect(result.validationErrors).toBeUndefined();
    });

    it('应该拒绝提交到不存在的表单', async () => {
      mockPrisma.form.findUnique.mockResolvedValue(null);

      await expect(
        caller.submission.create({
          formId: 'nonexistent-form',
          data: { name: 'John Doe' },
        })
      ).rejects.toThrow('FORM_NOT_FOUND');
    });

    it('应该支持已认证用户提交', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        metadata: { version: '1.0.0', fields: [] },
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe', email: 'john@example.com' },
        submittedById: 'user-1',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
        },
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.create.mockResolvedValue(mockSubmission);

      const result = await authCaller.submission.create({
        formId: 'form-1',
        data: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(mockPrisma.submission.create).toHaveBeenCalledWith({
        data: {
          formId: 'form-1',
          data: { name: 'John Doe', email: 'john@example.com' },
          submittedById: 'user-1',
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
              metadata: true,
            },
          },
        },
      });
    });

    it('应该验证提交数据格式', () => {
      // 测试空数据
      expect(() =>
        caller.submission.create({
          formId: 'form-1',
          data: null as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('提交者应该能查看自己的提交详情', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-1',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-2',
          createdBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      const result = await authCaller.submission.getById({
        id: 'submission-1',
      });

      expect(result.id).toBe('submission-1');
      expect(result.submittedById).toBe('user-1');
    });

    it('表单创建者应该能查看表单的提交详情', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-1', // 当前用户是表单创建者
          createdBy: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      const result = await authCaller.submission.getById({
        id: 'submission-1',
      });

      expect(result.id).toBe('submission-1');
    });

    it('管理员应该能查看任何提交详情', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-3',
          createdBy: {
            id: 'user-3',
            name: 'User 3',
            email: 'user3@example.com',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      const result = await adminCaller.submission.getById({
        id: 'submission-1',
      });

      expect(result.id).toBe('submission-1');
    });

    it('非相关用户应该被拒绝查看提交详情', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2', // 不是当前用户
        createdAt: new Date(),
        submittedBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
          createdById: 'user-3', // 不是当前用户
          createdBy: {
            id: 'user-3',
            name: 'User 3',
            email: 'user3@example.com',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      await expect(
        authCaller.submission.getById({
          id: 'submission-1',
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('应该拒绝查看不存在的提交', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        authCaller.submission.getById({
          id: 'nonexistent-submission',
        })
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('getByFormId', () => {
    it('表单创建者应该能查看表单的所有提交', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        createdById: 'user-1',
      };

      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'John Doe' },
          createdById: 'user-2',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(1);

      const result = await authCaller.submission.getByFormId({
        formId: 'form-1',
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('管理员应该能查看任何表单的所有提交', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        createdById: 'user-2',
      };

      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'John Doe' },
          createdById: 'user-2',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(1);

      const result = await adminCaller.submission.getByFormId({
        formId: 'form-1',
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
    });

    it('非表单创建者应该被拒绝查看提交列表', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        createdById: 'user-2', // 不是当前用户
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);

      await expect(
        authCaller.submission.getByFormId({
          formId: 'form-1',
          limit: 10,
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('应该支持按日期范围过滤', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        createdById: 'user-1',
      };

      const mockSubmissions = [
        {
          id: 'submission-1',
          formId: 'form-1',
          data: { name: 'John Doe' },
          createdById: 'user-2',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
          },
        },
      ];

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(1);

      await adminCaller.submission.getByFormId({
        formId: 'form-1',
        limit: 10,
        startDate,
        endDate,
      });

      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            formId: 'form-1',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        })
      );
    });

    it('应该支持分页功能', async () => {
      const mockForm = {
        id: 'form-1',
        name: 'Test Form',
        createdById: 'user-1',
      };

      const mockSubmissions = [
        {
          id: 'submission-2',
          formId: 'form-1',
          data: { name: 'Jane Doe' },
          createdById: 'user-3',
          createdAt: new Date(),
          submittedBy: {
            id: 'user-3',
            name: 'User 3',
            email: 'user3@example.com',
          },
        },
      ];

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.count.mockResolvedValue(2);

      const result = await adminCaller.submission.getByFormId({
        formId: 'form-1',
        limit: 1,
        cursor: 'submission-1',
      });

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('update', () => {
    it('表单创建者应该能更新提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-1', // 当前用户是表单创建者
        },
      };

      const updatedSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Smith' }, // 更新后的数据
        submittedById: 'user-2',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.submission.update.mockResolvedValue(updatedSubmission);

      const result = await authCaller.submission.update({
        id: 'submission-1',
        data: { name: 'John Smith' },
      });

      expect(result.data.name).toBe('John Smith');
    });

    it('管理员应该能更新任何提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-3', // 不是管理员创建的表单
        },
      };

      const updatedSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'Admin Updated' },
        submittedById: 'user-2',
        createdAt: new Date(),
        submittedBy: {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
        },
        form: {
          id: 'form-1',
          name: 'Test Form',
          metadata: { version: '1.0.0', fields: [] },
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.submission.update.mockResolvedValue(updatedSubmission);

      const result = await adminCaller.submission.update({
        id: 'submission-1',
        data: { name: 'Admin Updated' },
      });

      expect(result.data.name).toBe('Admin Updated');
    });

    it('非相关用户应该被拒绝更新提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-3', // 不是当前用户
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      await expect(
        authCaller.submission.update({
          id: 'submission-1',
          data: { name: 'Updated Name' },
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('delete', () => {
    it('提交者应该能删除自己的提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-1', // 当前用户是提交者
        createdAt: new Date(),
        form: {
          createdById: 'user-2',
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.submission.delete.mockResolvedValue(mockSubmission);

      const result = await authCaller.submission.delete({
        id: 'submission-1',
      });

      expect(result.success).toBe(true);
    });

    it('表单创建者应该能删除表单的提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-1', // 当前用户是表单创建者
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.submission.delete.mockResolvedValue(mockSubmission);

      const result = await authCaller.submission.delete({
        id: 'submission-1',
      });

      expect(result.success).toBe(true);
    });

    it('管理员应该能删除任何提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-3',
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      mockPrisma.submission.delete.mockResolvedValue(mockSubmission);

      const result = await adminCaller.submission.delete({
        id: 'submission-1',
      });

      expect(result.success).toBe(true);
    });

    it('非相关用户应该被拒绝删除提交', async () => {
      const mockSubmission = {
        id: 'submission-1',
        formId: 'form-1',
        data: { name: 'John Doe' },
        submittedById: 'user-2',
        createdAt: new Date(),
        form: {
          createdById: 'user-3', // 不是当前用户
        },
      };

      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);

      await expect(
        authCaller.submission.delete({
          id: 'submission-1',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('getStats', () => {
    it('应该获取提交统计信息', async () => {
      mockPrisma.submission.count.mockResolvedValueOnce(100); // totalSubmissions
      mockPrisma.submission.count.mockResolvedValueOnce(20); // recentSubmissions
      mockPrisma.submission.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);

      const result = await adminCaller.submission.getStats({
        days: 30,
      });

      expect(result.totalSubmissions).toBe(100);
      expect(result.recentSubmissions).toBe(20);
      expect(result.statusDistribution.total).toBe(100);
      expect(result.statusDistribution.recent).toBe(20);
    });

    it('应该支持按表单过滤统计', async () => {
      const mockForm = {
        id: 'form-1',
        createdById: 'user-1',
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);
      mockPrisma.submission.count.mockResolvedValueOnce(50); // totalSubmissions
      mockPrisma.submission.count.mockResolvedValueOnce(10); // recentSubmissions
      mockPrisma.submission.findMany.mockResolvedValue([
        { createdAt: new Date() },
      ]);

      const result = await authCaller.submission.getStats({
        formId: 'form-1',
        days: 7,
      });

      expect(result.totalSubmissions).toBe(50);
      expect(result.recentSubmissions).toBe(10);
    });

    it('非相关用户应该被拒绝获取表单统计', async () => {
      const mockForm = {
        id: 'form-1',
        createdById: 'user-2', // 不是当前用户
      };

      mockPrisma.form.findUnique.mockResolvedValue(mockForm);

      await expect(
        authCaller.submission.getStats({
          formId: 'form-1',
          days: 30,
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('bulkDelete', () => {
    it('管理员应该能批量删除提交', async () => {
      const mockSubmissions = [
        { id: 'submission-1', formId: 'form-1' },
        { id: 'submission-2', formId: 'form-1' },
        { id: 'submission-3', formId: 'form-1' },
      ];

      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.deleteMany.mockResolvedValue({ count: 3 });

      const result = await adminCaller.submission.bulkDelete({
        submissionIds: ['submission-1', 'submission-2', 'submission-3'],
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.failedIds).toEqual([]);
    });

    it('应该处理部分失败的情况', async () => {
      const mockSubmissions = [
        { id: 'submission-1', formId: 'form-1' },
        { id: 'submission-2', formId: 'form-1' },
      ];

      mockPrisma.submission.findMany.mockResolvedValue(mockSubmissions);
      mockPrisma.submission.deleteMany.mockResolvedValue({ count: 2 });

      const result = await adminCaller.submission.bulkDelete({
        submissionIds: ['submission-1', 'submission-2', 'nonexistent-submission'],
      });

      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toEqual(['nonexistent-submission']);
    });

    it('非管理员应该被拒绝批量删除', async () => {
      await expect(
        authCaller.submission.bulkDelete({
          submissionIds: ['submission-1'],
        })
      ).rejects.toThrow('FORBIDDEN');
    });

    it('应该验证提交ID数量限制', async () => {
      // 创建超过100个提交ID的数组
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `submission-${i + 1}`);

      await expect(
        adminCaller.submission.bulkDelete({
          submissionIds: tooManyIds,
        })
      ).rejects.toThrow('Array must contain at most 100 element(s)');
    });
  });

  describe('validation', () => {
    it('应该验证表单ID格式', async () => {
      await expect(
        caller.submission.create({
          formId: '', // 空ID
          data: { name: 'John Doe' },
        })
      ).rejects.toThrow();
    });

    it('应该验证提交数据为对象', async () => {
      await expect(
        caller.submission.create({
          formId: 'form-1',
          data: 'invalid-data' as any, // 应该是对象
        })
      ).rejects.toThrow();
    });

    it('应该验证分页参数', async () => {
      await expect(
        authCaller.submission.getByFormId({
          formId: 'form-1',
          limit: 0, // 太小
        })
      ).rejects.toThrow();

      await expect(
        authCaller.submission.getByFormId({
          formId: 'form-1',
          limit: 101, // 太大
        })
      ).rejects.toThrow();
    });

    it('应该验证日期范围参数', async () => {
      await expect(
        authCaller.submission.getByFormId({
          formId: 'form-1',
          limit: 10,
          startDate: 'invalid-date' as any, // 无效日期
        })
      ).rejects.toThrow();
    });
  });
});