import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/trpc/routers';
import { createTestUser, createTestForm } from '../setup';

describe('API 性能测试', () => {
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

  describe('认证性能', () => {
    it('登录响应时间应该小于 500ms', async () => {
      const startTime = Date.now();

      await caller.auth.login({
        email: testUser.email,
        password: 'testpassword123',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
    });

    it('注册响应时间应该小于 1000ms', async () => {
      const startTime = Date.now();

      await caller.auth.register({
        email: 'performance-test@example.com',
        password: 'password123',
        name: 'Performance Test User',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
    });

    it('用户信息获取响应时间应该小于 200ms', async () => {
      const startTime = Date.now();

      await caller.auth.me();

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('表单性能', () => {
    it('表单创建响应时间应该小于 300ms', async () => {
      const startTime = Date.now();

      await caller.form.create({
        name: '性能测试表单',
        metadata: {
          version: '1.0.0',
          fields: Array(50).fill(null).map((_, index) => ({
            id: `field-${index}`,
            name: `field-${index}`,
            type: 'text',
            label: `字段 ${index}`,
            required: index < 10, // 前10个字段为必需
          })),
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
    });

    it('表单列表查询响应时间应该小于 200ms', async () => {
      const startTime = Date.now();

      await caller.form.list({
        limit: 50,
        offset: 0,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    it('表单详情查询响应时间应该小于 100ms', async () => {
      const startTime = Date.now();

      await caller.form.getById({ id: testForm.id });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('提交性能', () => {
    it('表单提交响应时间应该小于 200ms', async () => {
      const startTime = Date.now();

      await caller.submission.create({
        formId: testForm.id,
        data: {
          name: '性能测试提交',
          email: 'performance-test@example.com',
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
    });

    it('提交列表查询响应时间应该小于 300ms', async () => {
      // 创建多个提交来测试查询性能
      const submissions = Array(100).fill(null).map((_, index) => ({
        formId: testForm.id,
        data: {
          name: `提交 ${index}`,
          email: `test-${index}@example.com`,
        },
      }));

      // 批量创建提交
      for (const submission of submissions) {
        await caller.submission.create(submission);
      }

      const startTime = Date.now();

      await caller.submission.getByFormId({
        formId: testForm.id,
        limit: 50,
        offset: 0,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('并发性能', () => {
    it('应该能够处理 10 个并发登录请求', async () => {
      const loginPromises = Array(10).fill(null).map(async (_, index) => {
        const user = await createTestUser({
          email: `concurrent-user-${index}@example.com`,
          name: `Concurrent User ${index}`,
        });

        const startTime = Date.now();
        await caller.auth.login({
          email: user.email,
          password: 'testpassword123',
        });
        return Date.now() - startTime;
      });

      const responseTimes = await Promise.all(loginPromises);

      // 所有请求都应该在 1 秒内完成
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });

      // 平均响应时间应该小于 500ms
      const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      expect(avgTime).toBeLessThan(500);
    });

    it('应该能够处理 20 个并发表单提交', async () => {
      const submissionPromises = Array(20).fill(null).map(async (_, index) => {
        const startTime = Date.now();
        await caller.submission.create({
          formId: testForm.id,
          data: {
            name: `并发提交 ${index}`,
            email: `concurrent-${index}@example.com`,
          },
        });
        return Date.now() - startTime;
      });

      const responseTimes = await Promise.all(submissionPromises);

      // 所有请求都应该在 500ms 内完成
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });

      // 平均响应时间应该小于 200ms
      const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('数据库性能', () => {
    it('批量创建用户性能测试', async () => {
      const batchSize = 100;
      const startTime = Date.now();

      const userPromises = Array(batchSize).fill(null).map(async (_, index) => {
        return createTestUser({
          email: `batch-user-${index}@example.com`,
          name: `Batch User ${index}`,
        });
      });

      await Promise.all(userPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerUser = totalTime / batchSize;

      console.log(`批量创建 ${batchSize} 个用户总耗时: ${totalTime}ms`);
      console.log(`平均每个用户创建耗时: ${avgTimePerUser}ms`);

      // 平均每个用户创建时间应该小于 50ms
      expect(avgTimePerUser).toBeLessThan(50);
    });

    it('批量表单查询性能测试', async () => {
      // 创建多个表单
      const formIds = [];
      for (let i = 0; i < 50; i++) {
        const form = await createTestForm(testUser.id, {
          name: `批量测试表单 ${i}`,
        });
        formIds.push(form.id);
      }

      const startTime = Date.now();

      // 并发查询所有表单
      const queryPromises = formIds.map(formId =>
        caller.form.getById({ id: formId })
      );

      await Promise.all(queryPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerQuery = totalTime / formIds.length;

      console.log(`批量查询 ${formIds.length} 个表单总耗时: ${totalTime}ms`);
      console.log(`平均每个表单查询耗时: ${avgTimePerQuery}ms`);

      // 平均每个表单查询时间应该小于 50ms
      expect(avgTimePerQuery).toBeLessThan(50);
    });
  });

  describe('内存使用监控', () => {
    it('内存使用应该在合理范围内', async () => {
      const initialMemory = process.memoryUsage();

      // 执行一些内存密集型操作
      const forms = [];
      for (let i = 0; i < 100; i++) {
        const form = await createTestForm(testUser.id, {
          name: `内存测试表单 ${i}`,
          metadata: {
            version: '1.0.0',
            fields: Array(100).fill(null).map((_, index) => ({
              id: `field-${index}`,
              name: `field-${index}`,
              type: 'text',
              label: `字段 ${index}`,
            })),
          },
        });
        forms.push(form);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`内存使用增加: ${memoryIncreaseMB.toFixed(2)} MB`);

      // 内存增加应该小于 100MB
      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });
});