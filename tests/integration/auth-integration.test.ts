/**
 * Auth.js 集成测试
 * 测试完整的认证流程和数据库集成
 */

import { describe, expect, test } from 'vitest';
import { createTestUser, createTestAdmin, createTestContext } from '../setup';
import { authRouter } from '@workspace/api/src/trpc/routers/auth';
import { createCallerFactory } from '@workspace/api/src/trpc/trpc';
import { prisma } from '@workspace/database';

describe('Auth.js Integration Tests', () => {
  const createCaller = createCallerFactory(authRouter);

  describe('Database Integration', () => {
    test('创建用户应该正确存储在数据库中', async () => {
      const admin = await createTestAdmin();
      const ctx = await createTestContext(admin);
      const caller = createCaller(ctx);

      const userData = {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        role: 'USER' as const,
        password: 'testpassword123',
      };

      const createdUser = await caller.createUser(userData);

      // 验证用户存储在数据库中
      const dbUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
        include: {
          accounts: true,
          sessions: true,
        },
      });

      expect(dbUser).toBeTruthy();
      expect(dbUser?.email).toBe(userData.email);
      expect(dbUser?.name).toBe(userData.name);
      expect(dbUser?.role).toBe(userData.role);
      expect(dbUser?.passwordHash).toBeTruthy(); // 密码应该被哈希
      expect(dbUser?.isActive).toBe(true);

      // 初始创建时应该没有账户或会话
      expect(dbUser?.accounts).toHaveLength(0);
      expect(dbUser?.sessions).toHaveLength(0);
    });

    test('用户会话应该正确关联到用户', async () => {
      const user = await createTestUser();

      // 创建会话
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `integration-test-session-${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 验证会话关联正确
      const userWithSessions = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          sessions: true,
        },
      });

      expect(userWithSessions?.sessions).toHaveLength(1);
      expect(userWithSessions?.sessions[0].sessionToken).toBe(session.sessionToken);
    });

    test('用户删除应该级联删除相关数据', async () => {
      const admin = await createTestAdmin();
      const ctx = await createTestContext(admin);
      const caller = createCaller(ctx);

      // 创建一个测试用户
      const user = await createTestUser();

      // 创建一些相关数据
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `cascade-test-session-${Date.now()}`,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 删除用户
      await caller.deleteUser({ userId: user.id });

      // 验证用户被删除
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();

      // 验证会话也被级联删除
      const orphanedSessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(orphanedSessions).toHaveLength(0);
    });
  });

  describe('Authentication Flow', () => {
    test('完整的用户信息更新流程', async () => {
      const user = await createTestUser();
      const ctx = await createTestContext(user);
      const caller = createCaller(ctx);

      // 获取初始用户信息
      const initialInfo = await caller.me();
      expect(initialInfo.name).toBe('Test User');

      // 更新用户信息
      const updatedInfo = await caller.updateProfile({
        name: 'Updated Integration User',
      });

      expect(updatedInfo.name).toBe('Updated Integration User');
      expect(updatedInfo.email).toBe(user.email); // 邮箱不变

      // 验证数据库中的更新
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(dbUser?.name).toBe('Updated Integration User');
    });

    test('密码设置和验证流程', async () => {
      // 创建OAuth用户（无密码）
      const oauthUser = await prisma.user.create({
        data: {
          email: `oauth-integration-${Date.now()}@example.com`,
          name: 'OAuth Integration User',
          emailVerified: new Date(),
          isActive: true,
          role: 'USER',
        },
      });

      // 添加OAuth账户
      await prisma.account.create({
        data: {
          userId: oauthUser.id,
          type: 'oauth',
          provider: 'github',
          providerAccountId: `github-${oauthUser.id}`,
          access_token: 'mock-token',
        },
      });

      const ctx = await createTestContext({
        id: oauthUser.id,
        email: oauthUser.email,
        role: oauthUser.role,
        isActive: oauthUser.isActive,
      });
      const caller = createCaller(ctx);

      // 设置密码
      await caller.setPassword({
        newPassword: 'integration-password-123',
      });

      // 验证密码哈希已存储
      const userWithPassword = await prisma.user.findUnique({
        where: { id: oauthUser.id },
        select: { passwordHash: true },
      });
      expect(userWithPassword?.passwordHash).toBeTruthy();
    });
  });

  describe('Access Control Integration', () => {
    test('管理员权限验证', async () => {
      const admin = await createTestAdmin();
      const regularUser = await createTestUser();

      const adminCtx = await createTestContext(admin);
      const userCtx = await createTestContext(regularUser);

      const adminCaller = createCaller(adminCtx);
      const userCaller = createCaller(userCtx);

      // 管理员可以访问
      const adminResult = await adminCaller.listUsers({ limit: 5 });
      expect(adminResult.items.length).toBeGreaterThan(0);

      // 普通用户被拒绝
      await expect(userCaller.listUsers({ limit: 5 }))
        .rejects.toThrow('UNAUTHORIZED');
    });

    test('用户只能访问自己的数据', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const ctx1 = await createTestContext(user1);
      const ctx2 = await createTestContext(user2);

      const caller1 = createCaller(ctx1);
      const caller2 = createCaller(ctx2);

      // 用户1获取自己的信息
      const info1 = await caller1.me();
      expect(info1.id).toBe(user1.id);

      // 用户2获取自己的信息
      const info2 = await caller2.me();
      expect(info2.id).toBe(user2.id);

      // 信息不应该相同
      expect(info1.id).not.toBe(info2.id);
    });
  });

  describe('Error Handling', () => {
    test('数据库约束错误处理', async () => {
      const admin = await createTestAdmin();
      const ctx = await createTestContext(admin);
      const caller = createCaller(ctx);

      // 尝试创建重复邮箱的用户
      const userData = {
        email: 'duplicate-test@example.com',
        name: 'First User',
        role: 'USER' as const,
        password: 'password123',
      };

      // 第一次创建应该成功
      await caller.createUser(userData);

      // 第二次创建应该失败
      await expect(caller.createUser(userData))
        .rejects.toThrow('USER_ALREADY_EXISTS');
    });

    test('无效用户ID处理', async () => {
      const admin = await createTestAdmin();
      const ctx = await createTestContext(admin);
      const caller = createCaller(ctx);

      // 尝试操作不存在的用户
      await expect(caller.updateUserStatus({
        userId: 'non-existent-user-id',
        isActive: false,
      })).rejects.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('批量用户创建性能', async () => {
      const admin = await createTestAdmin();
      const ctx = await createTestContext(admin);
      const caller = createCaller(ctx);

      const startTime = Date.now();

      // 批量创建用户
      const userPromises = Array.from({ length: 5 }, (_, i) =>
        caller.createUser({
          email: `batch-user-${i}-${Date.now()}@example.com`,
          name: `Batch User ${i}`,
          role: 'USER' as const,
          password: 'password123',
        })
      );

      const results = await Promise.all(userPromises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成

      // 验证所有用户都被创建
      const userList = await caller.listUsers({ limit: 10 });
      expect(userList.items.length).toBeGreaterThanOrEqual(5);
    });
  });
});