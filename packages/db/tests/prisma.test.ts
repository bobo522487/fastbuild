import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../prisma";

describe("Prisma schema", () => {
  beforeAll(async () => {
    // Clean database for tests
    await prisma.$executeRaw`TRUNCATE TABLE "post" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "user" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "session" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "account" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "verification" RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Post 与 User 关系正常工作", async () => {
    const user = await prisma.user.create({
      data: { email: "test@example.com", name: "Test User" },
    });

    const post = await prisma.post.create({
      data: { title: "Hello", content: "World", userId: user.id },
      include: { user: true },
    });

    expect(post.user.id).toBe(user.id);
  });

  it("User 表字段约束验证", async () => {
      // 测试必填字段
      await expect(
        prisma.user.create({
          data: {
            // email 缺失，应该失败
            name: "Test User",
          },
        })
      ).rejects.toThrow();

      // 测试唯一性约束
      const userData = { email: "unique@test.com", name: "Test User" };
      await prisma.user.create({ data: userData });

      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow();

      // 测试邮箱格式验证
      await expect(
        prisma.user.create({
          data: { email: "invalid-email", name: "Test User" },
        })
      ).rejects.toThrow();
  });

  it("Post 表字段约束验证", async () => {
      const user = await prisma.user.create({
        data: { email: "post-test@example.com", name: "Post Test User" },
      });

      // 测试必填字段
      await expect(
        prisma.post.create({
          data: {
            // title 缺失，应该失败
            content: "Test content",
            userId: user.id,
          },
        })
      ).rejects.toThrow();

      // 测试外键约束
      await expect(
        prisma.post.create({
          data: {
            title: "Orphan Post",
            content: "Test content",
            userId: "non-existent-user-id",
          },
        })
      ).rejects.toThrow();

      // 测试字段长度限制（如果schema中有定义）
      const longTitle = "a".repeat(300); // 超过可能的最大长度
      await expect(
        prisma.post.create({
          data: {
            title: longTitle,
            content: "Test content",
            userId: user.id,
          },
        })
      ).rejects.toThrow();
  });

  it("Session 表约束验证", async () => {
      const user = await prisma.user.create({
        data: { email: "session-test@example.com", name: "Session Test User" },
      });

      // 测试必填字段
      await expect(
        prisma.session.create({
          data: {
            // expiresAt 缺失，应该失败
            token: "test-token",
            userId: user.id,
          },
        })
      ).rejects.toThrow();

      // 测试唯一性约束
      const sessionData = {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        token: "unique-session-token",
        userId: user.id,
      };
      await prisma.session.create({ data: sessionData });

      await expect(
        prisma.session.create({ data: sessionData })
      ).rejects.toThrow();

      // 测试过期时间约束
      await expect(
        prisma.session.create({
          data: {
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 已过期
            token: "expired-token",
            userId: user.id,
          },
        })
      ).rejects.toThrow();
  });

  it("Account 表约束验证", async () => {
      const user = await prisma.user.create({
        data: { email: "account-test@example.com", name: "Account Test User" },
      });

      // 测试必填字段
      await expect(
        prisma.account.create({
          data: {
            // providerId 缺失，应该失败
            accountId: "test-account",
            userId: user.id,
          },
        })
      ).rejects.toThrow();

      // 测试唯一性复合约束 (providerId + accountId)
      const accountData = {
        providerId: "github",
        accountId: "test-account-id",
        userId: user.id,
      };
      await prisma.account.create({ data: accountData });

      await expect(
        prisma.account.create({ data: accountData })
      ).rejects.toThrow();
  });

  it("数据库索引性能测试", async () => {
      const user = await prisma.user.create({
        data: { email: "index-test@example.com", name: "Index Test User" },
      });

      // 创建多个用户用于索引测试
      const users = [];
      for (let i = 0; i < 10; i++) {
        const userData = {
          email: `index-test-${i}@example.com`,
          name: `Index Test User ${i}`,
          emailVerified: i % 2 === 0,
        };
        users.push(await prisma.user.create({ data: userData }));
      }

      // 测试按邮箱索引查询性能
      const startTime = Date.now();
      const foundUser = await prisma.user.findUnique({
        where: { email: "index-test-5@example.com" },
      });
      const endTime = Date.now();

      expect(foundUser).toBeDefined();
      expect(foundUser?.name).toBe("Index Test User 5");
      expect(endTime - startTime).toBeLessThan(100); // 应该很快

      // 清理
      await prisma.user.deleteMany({
        where: { id: { in: users.map(u => u.id) } },
      });
      await prisma.user.delete({ where: { id: user.id } });
  });

  it("表关系级联删除测试", async () => {
      const user = await prisma.user.create({
        data: { email: "cascade-delete@example.com", name: "Cascade Delete User" },
      });

      // 创建关联数据
      const session = await prisma.session.create({
        data: {
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          token: "cascade-session-token",
          userId: user.id,
        },
      });

      const post = await prisma.post.create({
        data: {
          title: "Cascade Test Post",
          content: "Content for cascade test",
          userId: user.id,
        },
      });

      const account = await prisma.account.create({
        data: {
          providerId: "github",
          accountId: "cascade-account",
          userId: user.id,
        },
      });

      // 删除用户（应该级联删除相关数据）
      await prisma.user.delete({ where: { id: user.id } });

      // 验证级联删除
      const remainingSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(remainingSession).toBeNull();

      const remainingPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(remainingPost).toBeNull();

      const remainingAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(remainingAccount).toBeNull();
  });

  it("数据类型验证", async () => {
      const user = await prisma.user.create({
        data: { email: "type-test@example.com", name: "Type Test User" },
      });

      // 验证返回的数据类型
      expect(typeof user.id).toBe("string");
      expect(typeof user.name).toBe("string");
      expect(typeof user.email).toBe("string");
      expect(typeof user.emailVerified).toBe("boolean");
      expect(user.image === null || typeof user.image === "string").toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // 验证布尔字段
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });

      expect(typeof updatedUser.emailVerified).toBe("boolean");
      expect(updatedUser.emailVerified).toBe(true);

      // 测试可选字段为null的情况
      const userWithNulls = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(userWithNulls?.image).toBeNull();
      expect(userWithNulls?.emailVerified).toBe(false); // 默认值
  });

  it("时间戳字段自动管理测试", async () => {
      const beforeCreate = new Date();

      const user = await prisma.user.create({
        data: { email: "timestamp-test@example.com", name: "Timestamp Test User" },
      });

      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());

      // 更新用户应该更新 updatedAt
      const beforeUpdate = new Date();
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: "Updated Name" },
      });

      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(updatedUser.createdAt.getTime()).toBe(user.createdAt.getTime()); // createdAt 不应该改变
  });
});