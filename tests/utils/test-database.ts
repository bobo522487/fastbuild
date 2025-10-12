/**
 * Test Database Utilities
 *
 * This module provides utilities for managing test database state,
 * ensuring proper isolation between test runs and implementing
 * cleanup strategies.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Test Database Manager
 *
 * Handles database setup, cleanup, and transaction management for tests.
 * Implements different isolation strategies based on test requirements.
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private prisma: PrismaClient;
  private isSetup = false;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://prisma:prisma@localhost:5433/fastbuild_test',
        },
      },
      log: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'error', 'warn'],
    });
  }

  /**
   * Get singleton instance of TestDatabaseManager
   */
  public static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * Get Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Setup test database
   * This should be called once before running tests
   */
  public async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    try {
      // Test database connection
      await this.prisma.$connect();

      // Ensure database schema is up to date
      await this.prisma.$executeRaw`SELECT 1`; // Simple connection test

      this.isSetup = true;
      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Reset test database to clean state
   * This removes all data while preserving schema
   */
  public async reset(): Promise<void> {
    try {
      // Delete data in correct order to respect foreign key constraints
      await this.prisma.auditLog.deleteMany();
      await this.prisma.projectMember.deleteMany();
      await this.prisma.project.deleteMany();
      await this.prisma.user.deleteMany();

      console.log('🧹 Test database reset completed');
    } catch (error) {
      console.error('❌ Failed to reset test database:', error);
      throw error;
    }
  }

  /**
   * Cleanup specific test data
   * Useful for cleaning up after individual tests
   */
  public async cleanupTestData(options: {
    userId?: string;
    projectId?: string;
    keepUsers?: boolean;
  } = {}): Promise<void> {
    try {
      const { userId, projectId, keepUsers = false } = options;

      if (projectId) {
        // Clean up specific project and related data
        await this.prisma.auditLog.deleteMany({
          where: { projectId },
        });
        await this.prisma.projectMember.deleteMany({
          where: { projectId },
        });
        await this.prisma.project.delete({
          where: { id: projectId },
        });
      }

      if (userId && !keepUsers) {
        // Clean up specific user and related data
        await this.prisma.auditLog.deleteMany({
          where: { userId },
        });
        await this.prisma.projectMember.deleteMany({
          where: { userId },
        });
        await this.prisma.project.deleteMany({
          where: { createdBy: userId },
        });
        await this.prisma.user.delete({
          where: { id: userId },
        });
      }

      if (!keepUsers && !userId && !projectId) {
        // Full cleanup
        await this.reset();
      }

    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error);
      throw error;
    }
  }

  /**
   * Run operations within a database transaction
   * Provides automatic rollback for test isolation
   */
  public async withTransaction<T>(
    callback: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(callback);
  }

  /**
   * Create test data with proper relationships
   */
  public async createTestData(data: {
    user?: { email: string; name: string };
    project?: { name: string; slug: string; description?: string };
    includeMembers?: boolean;
  }) {
    const { user, project, includeMembers = true } = data;
    const result: any = {};

    try {
      if (user) {
        const { FastBuildIdGenerator } = await import('~/lib/id-generator');
        result.user = await this.prisma.user.create({
          data: {
            id: FastBuildIdGenerator.generateUserId(),
            email: user.email,
            name: user.name,
            passwordHash: 'test-password-hash',
            updatedAt: new Date(),
          },
        });
      }

      if (project && result.user) {
        const { FastBuildIdGenerator } = await import('~/lib/id-generator');
        result.project = await this.prisma.project.create({
          data: {
            id: FastBuildIdGenerator.generateProjectId(),
            name: project.name,
            slug: project.slug,
            description: project.description || `Test project: ${project.name}`,
            visibility: 'PRIVATE',
            createdBy: result.user.id,
            updatedAt: new Date(),
          },
        });

        if (includeMembers) {
          const { FastBuildIdGenerator } = await import('~/lib/id-generator');
          await this.prisma.projectMember.create({
            data: {
              id: FastBuildIdGenerator.generateMemberId(),
              projectId: result.project.id,
              userId: result.user.id,
              role: 'OWNER',
            },
          });
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to create test data:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  public async disconnect(): Promise<void> {
    if (this.isSetup) {
      await this.prisma.$disconnect();
      this.isSetup = false;
      console.log('🔌 Test database disconnected');
    }
  }

  /**
   * Get database statistics for debugging
   */
  public async getStats(): Promise<{
    users: number;
    projects: number;
    projectMembers: number;
    auditLogs: number;
  }> {
    const [users, projects, projectMembers, auditLogs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.projectMember.count(),
      this.prisma.auditLog.count(),
    ]);

    return { users, projects, projectMembers, auditLogs };
  }

  /**
   * Health check for test database
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }
}

/**
 * Global test database manager instance
 */
export const testDb = TestDatabaseManager.getInstance();

/**
 * Helper function to setup test database before tests
 */
export async function setupTestDatabase(): Promise<void> {
  await testDb.setup();
}

/**
 * Helper function to cleanup test database after tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  await testDb.cleanupTestData();
}

/**
 * Helper function to reset test database completely
 */
export async function resetTestDatabase(): Promise<void> {
  await testDb.reset();
}

/**
 * Helper function to disconnect from test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  await testDb.disconnect();
}

/**
 * Helper function to create a test user with password
 */
export async function createTestUserWithPassword(data?: {
  email?: string;
  name?: string;
}) {
  const { FastBuildIdGenerator } = await import('~/lib/id-generator');
  const timestamp = Date.now();
  const email = data?.email || `test-user-${timestamp}@example.com`;
  const name = data?.name || `Test User ${timestamp}`;
  const plainPassword = `password-${timestamp}`;

  const user = await testDb.getClient().user.create({
    data: {
      id: FastBuildIdGenerator.generateUserId(),
      email,
      name,
      passwordHash: plainPassword, // Store plain password for test purposes
      updatedAt: new Date(),
    },
  });

  // Add plainPassword as a non-persisted property for test use
  (user as any).plainPassword = plainPassword;

  return user;
}

/**
 * Helper function to create a test project
 */
export async function createTestProject(createdBy: string, data?: {
  name?: string;
  slug?: string;
  description?: string;
}) {
  const { FastBuildIdGenerator } = await import('~/lib/id-generator');
  const timestamp = Date.now();
  const name = data?.name || `Test Project ${timestamp}`;
  const slug = data?.slug || `test-project-${timestamp}`;

  return await testDb.getClient().project.create({
    data: {
      id: FastBuildIdGenerator.generateProjectId(),
      name,
      slug,
      description: data?.description || `Test project: ${name}`,
      visibility: 'PRIVATE',
      createdBy,
      updatedAt: new Date(),
    },
  });
}