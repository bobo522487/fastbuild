import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from './factory';

export class DatabaseTestHelpers {
  private static instance: PrismaClient;

  /**
   * 获取Prisma客户端实例
   */
  static getInstance(): PrismaClient {
    if (!DatabaseTestHelpers.instance) {
      DatabaseTestHelpers.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    return DatabaseTestHelpers.instance;
  }

  /**
   * 清理所有测试数据
   */
  static async cleanupTestData(): Promise<void> {
    const db = DatabaseTestHelpers.getInstance();

    // 按照外键依赖关系清理数据
    await db.projectMember.deleteMany();
    await db.auditLog.deleteMany();
    await db.project.deleteMany();
    await db.account.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  }

  /**
   * 创建测试用户并返回记录
   */
  static async createTestUser(overrides: Partial<any> = {}) {
    const db = DatabaseTestHelpers.getInstance();
    const userData = TestDataFactory.createTestUser(overrides);

    const user = await db.user.create({
      data: userData,
    });

    return user;
  }

  /**
   * 创建测试项目并返回记录
   */
  static async createTestProject(ownerId: string, overrides: Partial<any> = {}) {
    const db = DatabaseTestHelpers.getInstance();
    const projectData = TestDataFactory.createTestProject({ ownerId, ...overrides });

    const project = await db.project.create({
      data: projectData,
    });

    // 自动添加创建者为项目所有者
    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    });

    return project;
  }

  /**
   * 设置测试环境数据库连接
   */
  static async setupTestDatabase(): Promise<void> {
    const db = DatabaseTestHelpers.getInstance();

    try {
      await db.$connect();
      console.log('✅ Test database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  }

  /**
   * 断开测试数据库连接
   */
  static async teardownTestDatabase(): Promise<void> {
    const db = DatabaseTestHelpers.getInstance();

    try {
      await db.$disconnect();
      console.log('✅ Test database disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect from test database:', error);
      throw error;
    }
  }

  /**
   * 检查数据库是否为空
   */
  static async isDatabaseEmpty(): Promise<boolean> {
    const db = DatabaseTestHelpers.getInstance();

    const userCount = await db.user.count();
    const projectCount = await db.project.count();

    return userCount === 0 && projectCount === 0;
  }

  /**
   * 获取测试数据统计
   */
  static async getTestDataStats(): Promise<{
    users: number;
    projects: number;
    projectMembers: number;
    auditLogs: number;
  }> {
    const db = DatabaseTestHelpers.getInstance();

    const [users, projects, projectMembers, auditLogs] = await Promise.all([
      db.user.count(),
      db.project.count(),
      db.projectMember.count(),
      db.auditLog.count(),
    ]);

    return { users, projects, projectMembers, auditLogs };
  }
}