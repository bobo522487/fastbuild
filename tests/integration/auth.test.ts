import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '@workspace/api/src/trpc';
import { createTestUser } from '../setup';

describe('认证集成测试', () => {
  let caller: any;
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();

    caller = createCaller({
      user: null,
      prisma: require('@workspace/database').prisma,
    });
  });

  describe('登录流程', () => {
    it('应该能够成功登录', async () => {
      const result = await caller.auth.login({
        email: testUser.email,
        password: 'testpassword123',
      });

      expect(result.user.email).toBe(testUser.email);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('应该拒绝错误密码', async () => {
      await expect(
        caller.auth.login({
          email: testUser.email,
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('应该拒绝不存在的用户', async () => {
      await expect(
        caller.auth.login({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('注册流程', () => {
    it('应该能够注册新用户', async () => {
      const result = await caller.auth.register({
        email: 'newuser@example.com',
        password: 'newpassword123',
        name: 'New User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.name).toBe('New User');
      expect(result.user.emailVerified).toBe(false);
      expect(result.user.isActive).toBe(true);
    });

    it('应该拒绝重复邮箱注册', async () => {
      await expect(
        caller.auth.register({
          email: testUser.email,
          password: 'anypassword',
          name: 'Duplicate User',
        })
      ).rejects.toThrow();
    });

    it('应该验证密码强度', async () => {
      await expect(
        caller.auth.register({
          email: 'weak@example.com',
          password: '123', // 密码太短
          name: 'Weak Password User',
        })
      ).rejects.toThrow();
    });
  });

  describe('令牌刷新', () => {
    it('应该能够刷新访问令牌', async () => {
      // 先登录获取刷新令牌
      const loginResult = await caller.auth.login({
        email: testUser.email,
        password: 'testpassword123',
      });

      // 使用刷新令牌
      const refreshResult = await caller.auth.refreshToken({
        refreshToken: loginResult.refreshToken,
      });

      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined();
    });

    it('应该拒绝无效的刷新令牌', async () => {
      await expect(
        caller.auth.refreshToken({
          refreshToken: 'invalid-refresh-token',
        })
      ).rejects.toThrow();
    });
  });

  describe('用户信息获取', () => {
    it('应该能够获取当前用户信息', async () => {
      // 登录后设置认证用户
      const loginResult = await caller.auth.login({
        email: testUser.email,
        password: 'testpassword123',
      });

      caller = createCaller({
        user: { id: testUser.id, email: testUser.email, role: testUser.role },
        prisma: require('@workspace/database').prisma,
      });

      const result = await caller.auth.me();

      expect(result.email).toBe(testUser.email);
      expect(result.name).toBe(testUser.name);
      expect(result.role).toBe(testUser.role);
    });

    it('未认证用户应该无法获取用户信息', async () => {
      await expect(caller.auth.me()).rejects.toThrow();
    });
  });

  describe('登出流程', () => {
    it('应该能够成功登出', async () => {
      // 先登录
      const loginResult = await caller.auth.login({
        email: testUser.email,
        password: 'testpassword123',
      });

      // 登出
      const result = await caller.auth.logout({
        refreshToken: loginResult.refreshToken,
      });

      expect(result.success).toBe(true);
    });
  });
});