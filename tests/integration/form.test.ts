import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc';
import { createTestUser, createTestForm } from '../setup';

describe('表单管理集成测试', () => {
  let caller: any;
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();

    caller = createCaller({
      user: { id: testUser.id, email: testUser.email, role: testUser.role },
      prisma: require('@workspace/database').prisma,
    });
  });

  describe('表单创建', () => {
    it('应该能够创建新表单', async () => {
      const formData = {
        name: '测试表单',
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
            {
              id: 'email',
              name: 'email',
              type: 'text' as const,
              label: '邮箱',
              required: true,
            },
          ],
        },
      };

      const result = await caller.form.create(formData);

      expect(result.name).toBe(formData.name);
      expect(result.metadata).toEqual(formData.metadata);
      expect(result.createdById).toBe(testUser.id);
      expect(result.id).toBeDefined();
    });

    it('应该验证表单名称', async () => {
      await expect(
        caller.form.create({
          name: '', // 空名称
          metadata: { version: '1.0.0', fields: [] },
        })
      ).rejects.toThrow();
    });

    it('应该验证表单元数据', async () => {
      await expect(
        caller.form.create({
          name: 'Invalid Form',
          metadata: null as any, // 无效元数据
        })
      ).rejects.toThrow();
    });
  });

  describe('表单查询', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await createTestForm(testUser.id);
    });

    it('应该能够获取表单详情', async () => {
      const result = await caller.form.getById({ id: testForm.id });

      expect(result.id).toBe(testForm.id);
      expect(result.name).toBe(testForm.name);
      expect(result.metadata).toEqual(testForm.metadata);
    });

    it('应该能够获取表单列表', async () => {
      const result = await caller.form.list();

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].id).toBeDefined();
    });

    it('应该能够搜索表单', async () => {
      const result = await caller.form.list({ search: 'Test' });

      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        expect(result.items[0].name.toLowerCase()).toContain('test');
      }
    });

    it('应该分页返回表单列表', async () => {
      const result = await caller.form.list({ limit: 10, offset: 0 });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
      expect(result.total).toBeDefined();
      expect(result.page).toBeDefined();
      expect(result.pageSize).toBeDefined();
    });
  });

  describe('表单更新', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await createTestForm(testUser.id);
    });

    it('应该能够更新表单信息', async () => {
      const updateData = {
        id: testForm.id,
        name: '更新后的表单名称',
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
      };

      const result = await caller.form.update(updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.id).toBe(testForm.id);
    });

    it('应该只能更新自己创建的表单', async () => {
      // 创建另一个用户
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        name: 'Another User',
      });

      // 用另一个用户尝试更新表单
      const anotherCaller = createCaller({
        user: { id: anotherUser.id, email: anotherUser.email, role: anotherUser.role },
        prisma: require('@workspace/database').prisma,
      });

      await expect(
        anotherCaller.form.update({
          id: testForm.id,
          name: 'Hacked Form Name',
          metadata: { version: '1.0.0', fields: [] },
        })
      ).rejects.toThrow();
    });

    it('应该拒绝更新不存在的表单', async () => {
      await expect(
        caller.form.update({
          id: 'non-existent-form-id',
          name: 'Non-existent Form',
          metadata: { version: '1.0.0', fields: [] },
        })
      ).rejects.toThrow();
    });
  });

  describe('表单删除', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await createTestForm(testUser.id);
    });

    it('应该能够删除表单', async () => {
      const result = await caller.form.delete({ id: testForm.id });

      expect(result.success).toBe(true);

      // 验证表单已被删除
      await expect(
        caller.form.getById({ id: testForm.id })
      ).rejects.toThrow();
    });

    it('应该只能删除自己创建的表单', async () => {
      // 创建另一个用户
      const anotherUser = await createTestUser({
        email: 'another@example.com',
        name: 'Another User',
      });

      // 用另一个用户尝试删除表单
      const anotherCaller = createCaller({
        user: { id: anotherUser.id, email: anotherUser.email, role: anotherUser.role },
        prisma: require('@workspace/database').prisma,
      });

      await expect(
        anotherCaller.form.delete({ id: testForm.id })
      ).rejects.toThrow();
    });
  });

  describe('表单统计', () => {
    let testForm: any;

    beforeEach(async () => {
      testForm = await createTestForm(testUser.id);
    });

    it('应该能够获取表单统计信息', async () => {
      const result = await caller.form.getStats({ id: testForm.id });

      expect(result.formId).toBe(testForm.id);
      expect(result.totalSubmissions).toBeDefined();
      expect(result.recentSubmissions).toBeDefined();
      expect(result.submissionTrend).toBeDefined();
    });
  });
});