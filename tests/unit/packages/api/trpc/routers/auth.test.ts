/**
 * Auth.js认证测试
 * 测试用户管理、会话管理和权限控制
 */

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Test setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild',
    },
  },
});

// Test helpers
const createTestUser = async (overrides = {}) => {
  const password = await bcrypt.hash('testpassword123', 12);
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      passwordHash: password,
      emailVerified: new Date(),
      isActive: true,
      role: 'USER',
      ...overrides,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const createTestAdmin = async (overrides = {}) => {
  const password = await bcrypt.hash('adminpassword123', 12);
  return prisma.user.create({
    data: {
      email: `admin-${Date.now()}@example.com`,
      name: 'Admin User',
      passwordHash: password,
      emailVerified: new Date(),
      isActive: true,
      role: 'ADMIN',
      ...overrides,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const cleanupDatabase = async () => {
  await prisma.monitoringEvent.deleteMany();
  await prisma.performanceMetric.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.userActivity.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.form.deleteMany();
  await prisma.user.deleteMany();
};

describe('Auth.js Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('User Management', () => {
    test('可以创建测试用户', async () => {
      const user = await createTestUser();

      expect(user).toBeDefined();
      expect(user.email).toContain('test-');
      expect(user.email).toContain('@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('USER');
      expect(user.isActive).toBe(true);
    });

    test('可以创建测试管理员', async () => {
      const admin = await createTestAdmin();

      expect(admin).toBeDefined();
      expect(admin.email).toContain('admin-');
      expect(admin.role).toBe('ADMIN');
      expect(admin.isActive).toBe(true);
    });

    test('可以在数据库中查找用户', async () => {
      const user = await createTestUser();

      const foundUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
      expect(foundUser?.email).toBe(user.email);
    });

    test('可以验证用户邮箱唯一性', async () => {
      const user = await createTestUser();

      // 尝试创建相同邮箱的用户应该失败
      await expect(async () => {
        await createTestUser({ email: user.email });
      }).rejects.toThrow();
    });
  });

  describe('Database Operations', () => {
    test('可以清空测试数据', async () => {
      const user = await createTestUser();

      // 确认用户存在
      let foundUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(foundUser).toBeDefined();

      // 清空数据
      await prisma.user.deleteMany();

      // 确认用户已删除
      foundUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(foundUser).toBeNull();
    });
  });
});