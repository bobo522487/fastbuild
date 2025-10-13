import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../prisma";
import { DatabaseCleaner } from "./utils/test-helpers";

// 全局测试设置
beforeAll(async () => {
  // 确保数据库连接正常
  await prisma.$connect();

  // 清理数据库
  await DatabaseCleaner.cleanAll(prisma);

  console.log("✅ Database connected and cleaned for testing");
});

afterAll(async () => {
  // 断开数据库连接
  await prisma.$disconnect();

  console.log("✅ Database disconnected after testing");
});

// 每个测试前的清理
beforeEach(async () => {
  // 确保每个测试都在干净的环境中开始
  await DatabaseCleaner.cleanAll(prisma);
});

// 每个测试后的清理
afterEach(async () => {
  // 可选：检查是否有未清理的数据
  const stats = await prisma.user.count();
  if (stats > 0) {
    console.warn(`⚠️  Test left behind ${stats} users in database`);
  }
});

// 设置测试超时时间
vi.setConfig({ testTimeout: 30000 });