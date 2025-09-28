import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc';
import { createTestUser, createTestForm, createTestSubmission } from '../setup';

describe('表单提交集成测试', () => {
  let caller: any;
  let testUser: any;
  let testForm: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testForm = await createTestForm(testUser.id);

    caller = createCaller({
      user: { id: testUser.id, email: testUser.email, role: testUser.role },
      prisma: require('@workspace/database').prisma,
    });
  });

  describe('提交创建', () => {
    it('应该能够创建新提交', async () => {
      const submissionData = {
        formId: testForm.id,
        data: {
          name: '张三',
          email: 'zhangsan@example.com',
        },
      };

      const result = await caller.submission.create(submissionData);

      expect(result.formId).toBe(testForm.id);
      expect(result.data.name).toBe('张三');
      expect(result.data.email).toBe('zhangsan@example.com');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('应该验证必需字段', async () => {
      const submissionData = {
        formId: testForm.id,
        data: {
          // 缺少必需的 name 字段
          email: 'test@example.com',
        },
      };

      await expect(caller.submission.create(submissionData)).rejects.toThrow();
    });

    it('应该验证表单是否存在', async () => {
      const submissionData = {
        formId: 'non-existent-form-id',
        data: {
          name: 'Test',
        },
      };

      await expect(caller.submission.create(submissionData)).rejects.toThrow();
    });

    it('匿名用户应该能够提交表单', async () => {
      // 使用未认证的调用者
      const anonymousCaller = createCaller({
        user: null,
        prisma: require('@workspace/database').prisma,
      });

      const submissionData = {
        formId: testForm.id,
        data: {
          name: '匿名用户',
        },
      };

      const result = await anonymousCaller.submission.create(submissionData);

      expect(result.formId).toBe(testForm.id);
      expect(result.data.name).toBe('匿名用户');
    });
  });

  describe('提交查询', () => {
    let testSubmission: any;

    beforeEach(async () => {
      testSubmission = await createTestSubmission(testForm.id, testUser.id, {
        name: '测试提交',
      });
    });

    it('应该能够获取提交详情', async () => {
      const result = await caller.submission.getById({ id: testSubmission.id });

      expect(result.id).toBe(testSubmission.id);
      expect(result.formId).toBe(testForm.id);
      expect(result.data.name).toBe('测试提交');
    });

    it('应该能够获取表单的所有提交', async () => {
      const result = await caller.submission.getByFormId({
        formId: testForm.id,
      });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].formId).toBe(testForm.id);
    });

    it('应该能够分页获取提交列表', async () => {
      const result = await caller.submission.getByFormId({
        formId: testForm.id,
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
      expect(result.total).toBeDefined();
      expect(result.page).toBeDefined();
      expect(result.pageSize).toBeDefined();
    });

    it('应该能够搜索提交内容', async () => {
      const result = await caller.submission.getByFormId({
        formId: testForm.id,
        search: '测试',
      });

      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        expect(result.items[0].data.name).toContain('测试');
      }
    });

    it('应该能够按用户筛选提交', async () => {
      const result = await caller.submission.getByFormId({
        formId: testForm.id,
        userId: testUser.id,
      });

      expect(Array.isArray(result.items)).toBe(true);
      result.items.forEach((item: any) => {
        expect(item.createdById).toBe(testUser.id);
      });
    });
  });

  describe('提交更新', () => {
    let testSubmission: any;

    beforeEach(async () => {
      testSubmission = await createTestSubmission(testForm.id, testUser.id, {
        name: '原始数据',
      });
    });

    it('应该能够更新提交数据', async () => {
      const updateData = {
        id: testSubmission.id,
        data: {
          name: '更新后的数据',
          email: 'updated@example.com',
        },
      };

      const result = await caller.submission.update(updateData);

      expect(result.id).toBe(testSubmission.id);
      expect(result.data.name).toBe('更新后的数据');
      expect(result.data.email).toBe('updated@example.com');
    });

    it('应该只能更新自己创建的提交', async () => {
      // 创建另一个用户
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        name: 'Another User',
      });

      // 用另一个用户尝试更新提交
      const anotherCaller = createCaller({
        user: { id: anotherUser.id, email: anotherUser.email, role: anotherUser.role },
        prisma: require('@workspace/database').prisma,
      });

      await expect(
        anotherCaller.submission.update({
          id: testSubmission.id,
          data: { name: 'Hacked Data' },
        })
      ).rejects.toThrow();
    });

    it('应该拒绝更新不存在的提交', async () => {
      await expect(
        caller.submission.update({
          id: 'non-existent-submission-id',
          data: { name: 'Non-existent' },
        })
      ).rejects.toThrow();
    });
  });

  describe('提交删除', () => {
    let testSubmission: any;

    beforeEach(async () => {
      testSubmission = await createTestSubmission(testForm.id, testUser.id, {
        name: '待删除的数据',
      });
    });

    it('应该能够删除提交', async () => {
      const result = await caller.submission.delete({ id: testSubmission.id });

      expect(result.success).toBe(true);

      // 验证提交已被删除
      await expect(
        caller.submission.getById({ id: testSubmission.id })
      ).rejects.toThrow();
    });

    it('应该只能删除自己创建的提交', async () => {
      // 创建另一个用户
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        name: 'Another User',
      });

      // 用另一个用户尝试删除提交
      const anotherCaller = createCaller({
        user: { id: anotherUser.id, email: anotherUser.email, role: anotherUser.role },
        prisma: require('@workspace/database').prisma,
      });

      await expect(
        anotherCaller.submission.delete({ id: testSubmission.id })
      ).rejects.toThrow();
    });

    it('管理员应该能够删除任何提交', async () => {
      // 创建管理员用户
      const adminUser = await createTestUser({
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      });

      // 用管理员用户删除提交
      const adminCaller = createCaller({
        user: { id: adminUser.id, email: adminUser.email, role: adminUser.role },
        prisma: require('@workspace/database').prisma,
      });

      const result = await adminCaller.submission.delete({ id: testSubmission.id });

      expect(result.success).toBe(true);
    });
  });

  describe('提交统计', () => {
    let testSubmission: any;

    beforeEach(async () => {
      testSubmission = await createTestSubmission(testForm.id, testUser.id, {
        name: '统计测试',
      });
    });

    it('应该能够获取提交统计信息', async () => {
      const result = await caller.submission.getStats({
        formId: testForm.id,
      });

      expect(result.formId).toBe(testForm.id);
      expect(result.totalSubmissions).toBeGreaterThan(0);
      expect(result.recentSubmissions).toBeDefined();
      expect(result.submissionTrend).toBeDefined();
    });

    it('应该能够获取用户提交统计', async () => {
      const result = await caller.submission.getUserStats({
        userId: testUser.id,
      });

      expect(result.userId).toBe(testUser.id);
      expect(result.totalSubmissions).toBeGreaterThan(0);
      expect(result.recentForms).toBeDefined();
    });
  });
});