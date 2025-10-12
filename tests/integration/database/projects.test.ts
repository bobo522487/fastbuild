/**
 * 数据库集成测试 - 项目相关功能
 * 测试Prisma模型和数据库操作
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { testDb } from '../../utils/test-database';
import { FastBuildIdGenerator } from '~/lib/id-generator';

const prisma = testDb.getClient();

describe('Database Integration - Projects', () => {
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    // 完全重置测试数据库，清除所有种子数据
    await testDb.reset();

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        id: FastBuildIdGenerator.generateUserId(),
        email: 'test-projects@example.com',
        name: 'Test User',
        passwordHash: 'test-password-hash',
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await testDb.cleanupTestData({ userId: testUser.id });
  });

  beforeEach(async () => {
    // 每个测试前清理项目和成员数据
    await testDb.cleanupTestData({ userId: testUser.id, keepUsers: true });
  });

  describe('Project CRUD Operations', () => {
    it('creates a project with valid data', async () => {
      const projectData = {
        id: FastBuildIdGenerator.generateProjectId(),
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project for integration testing',
        visibility: 'PRIVATE' as const,
        createdBy: testUser.id,
        updatedAt: new Date(),
      };

      const project = await prisma.project.create({
        data: projectData,
      });

      expect(project.id).toBe(projectData.id);
      expect(project.name).toBe(projectData.name);
      expect(project.slug).toBe(projectData.slug);
      expect(project.description).toBe(projectData.description);
      expect(project.visibility).toBe(projectData.visibility);
      expect(project.createdBy).toBe(testUser.id);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('enforces unique slug constraint', async () => {
      const projectData = {
        id: FastBuildIdGenerator.generateProjectId(),
        name: 'Test Project',
        slug: 'duplicate-slug',
        visibility: 'PRIVATE' as const,
        createdBy: testUser.id,
        updatedAt: new Date(),
      };

      await prisma.project.create({ data: projectData });

      const duplicateProject = {
        id: FastBuildIdGenerator.generateProjectId(),
        name: 'Another Project',
        slug: 'duplicate-slug', // Same slug
        visibility: 'PRIVATE' as const,
        createdBy: testUser.id,
        updatedAt: new Date(),
      };

      await expect(prisma.project.create({ data: duplicateProject }))
        .rejects.toThrow();
    });

    it('queries projects with filters', async () => {
      // 创建测试项目
      const publicProject = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Public Project',
          slug: 'public-project',
          visibility: 'PUBLIC',
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      const privateProject = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Private Project',
          slug: 'private-project',
          visibility: 'PRIVATE',
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 测试可见性过滤
      const publicProjects = await prisma.project.findMany({
        where: { visibility: 'PUBLIC' },
      });

      expect(publicProjects).toHaveLength(1);
      expect(publicProjects[0]?.id).toBe(publicProject.id);

      // 测试创建者过滤
      const userProjects = await prisma.project.findMany({
        where: { createdBy: testUser.id },
      });

      expect(userProjects).toHaveLength(2);
    });

    it('updates project data', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Original Name',
          slug: 'original-slug',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          name: 'Updated Name',
          description: 'Updated description',
          visibility: 'PUBLIC',
          updatedAt: new Date(),
        },
      });

      expect(updatedProject.name).toBe('Updated Name');
      expect(updatedProject.description).toBe('Updated description');
      expect(updatedProject.visibility).toBe('PUBLIC');
    });

    it('soft deletes projects', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'To Delete',
          slug: 'to-delete',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 软删除
      await prisma.project.update({
        where: { id: project.id },
        data: { deletedAt: new Date() },
      });

      // 查询时应该找不到
      const foundProject = await prisma.project.findFirst({
        where: { id: project.id },
      });

      expect(foundProject).toBeNull();

      // 查询包含软删除记录时应该找到
      const deletedProject = await prisma.project.findFirst({
        where: { id: project.id, deletedAt: { not: null } },
      });

      expect(deletedProject).toBeTruthy();
      expect(deletedProject?.id).toBe(project.id);
    });
  });

  describe('Project Memberships', () => {
    let secondUser: any;

    beforeEach(async () => {
      // 创建第二个测试用户
      secondUser = await prisma.user.create({
        data: {
          id: FastBuildIdGenerator.generateUserId(),
          email: 'second-user@example.com',
          name: 'Second User',
          passwordHash: 'test-password-hash',
          updatedAt: new Date(),
        },
      });
    });

    afterEach(async () => {
      // 清理第二个用户
      await prisma.projectMember.deleteMany({
        where: { userId: secondUser.id },
      });
      await prisma.user.delete({
        where: { id: secondUser.id },
      });
    });

    it('creates project member relationships', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Team Project',
          slug: 'team-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 添加第二个用户为编辑者
      const member = await prisma.projectMember.create({
        data: {
          id: FastBuildIdGenerator.generateMemberId(),
          projectId: project.id,
          userId: secondUser.id,
          role: 'EDITOR',
        },
      });

      expect(member.id).toBeDefined();
      expect(member.projectId).toBe(project.id);
      expect(member.userId).toBe(secondUser.id);
      expect(member.role).toBe('EDITOR');
      expect(member.createdAt).toBeDefined();
    });

    it('enforces unique project-user constraint', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Unique Member Project',
          slug: 'unique-member-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      const memberData = {
        id: FastBuildIdGenerator.generateMemberId(),
        projectId: project.id,
        userId: secondUser.id,
        role: 'VIEWER' as const,
      };

      await prisma.projectMember.create({ data: memberData });

      // 尝试创建重复的成员关系
      await expect(prisma.projectMember.create({ data: memberData }))
        .rejects.toThrow();
    });

    it('queries projects with member relationships', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Member Test Project',
          slug: 'member-test-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      await prisma.projectMember.create({
        data: {
          id: FastBuildIdGenerator.generateMemberId(),
          projectId: project.id,
          userId: secondUser.id,
          role: 'ADMIN',
        },
      });

      // 查询项目及其成员
      const projectWithMembers = await prisma.project.findFirst({
        where: { id: project.id },
        include: {
          ProjectMember: {
            include: {
              User: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      expect(projectWithMembers?.ProjectMember).toHaveLength(2); // Owner + Admin
      expect(projectWithMembers?.ProjectMember.some(m => m.userId === secondUser.id)).toBe(true);
    });
  });

  describe('Audit Logs', () => {
    it('creates audit logs for project actions', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Audit Test Project',
          slug: 'audit-test-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      const auditLog = await prisma.auditLog.create({
        data: {
          id: FastBuildIdGenerator.generateAuditLogId(),
          projectId: project.id,
          userId: testUser.id,
          action: 'CREATE_PROJECT',
          resourceType: 'PROJECT',
          resourceId: project.id,
          metadata: {
            projectName: project.name,
            visibility: project.visibility,
          },
        },
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.projectId).toBe(project.id);
      expect(auditLog.userId).toBe(testUser.id);
      expect(auditLog.action).toBe('CREATE_PROJECT');
      expect(auditLog.resourceType).toBe('PROJECT');
      expect(auditLog.resourceId).toBe(project.id);
      expect(auditLog.metadata).toEqual({
        projectName: 'Audit Test Project',
        visibility: 'PRIVATE',
      });
      expect(auditLog.createdAt).toBeDefined();
    });

    it('queries audit logs with filters', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Filter Test Project',
          slug: 'filter-test-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 创建多个审计日志
      await prisma.auditLog.createMany({
        data: [
          {
            id: FastBuildIdGenerator.generateAuditLogId(),
            projectId: project.id,
            userId: testUser.id,
            action: 'CREATE_PROJECT',
            resourceType: 'PROJECT',
            resourceId: project.id,
          },
          {
            id: FastBuildIdGenerator.generateAuditLogId(),
            projectId: project.id,
            userId: testUser.id,
            action: 'UPDATE_PROJECT',
            resourceType: 'PROJECT',
            resourceId: project.id,
          },
          {
            id: FastBuildIdGenerator.generateAuditLogId(),
            projectId: project.id,
            userId: testUser.id,
            action: 'ADD_MEMBER',
            resourceType: 'PROJECT_MEMBER',
            resourceId: 'member-123',
          },
        ],
      });

      // 按动作类型过滤
      const projectLogs = await prisma.auditLog.findMany({
        where: {
          projectId: project.id,
          action: 'CREATE_PROJECT',
        },
      });

      expect(projectLogs).toHaveLength(1);
      expect(projectLogs[0]?.action).toBe('CREATE_PROJECT');

      // 按资源类型过滤
      const memberLogs = await prisma.auditLog.findMany({
        where: {
          projectId: project.id,
          resourceType: 'PROJECT_MEMBER',
        },
      });

      expect(memberLogs).toHaveLength(1);
      expect(memberLogs[0]?.resourceType).toBe('PROJECT_MEMBER');
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('validates ID formats', async () => {
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'ID Validation Project',
          slug: 'id-validation-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 验证ID格式
      expect(FastBuildIdGenerator.validateShortIdFormat(project.id, 'proj')).toBe(true);
      expect(FastBuildIdGenerator.extractPrefix(project.id)).toBe('proj');
    });

    it('handles concurrent operations', async () => {
      // 创建项目
      const project = await prisma.project.create({
        data: {
          id: FastBuildIdGenerator.generateProjectId(),
          name: 'Concurrent Test Project',
          slug: 'concurrent-test-project',
          visibility: 'PRIVATE' as const,
          createdBy: testUser.id,
          updatedAt: new Date(),
        },
      });

      // 并发创建多个审计日志
      const auditLogPromises = Array.from({ length: 5 }, () =>
        prisma.auditLog.create({
          data: {
            id: FastBuildIdGenerator.generateAuditLogId(),
            projectId: project.id,
            userId: testUser.id,
            action: 'TEST_ACTION',
            resourceType: 'PROJECT',
            resourceId: project.id,
          },
        })
      );

      const auditLogs = await Promise.all(auditLogPromises);

      expect(auditLogs).toHaveLength(5);
      expect(new Set(auditLogs.map(log => log.id)).size).toBe(5); // 所有ID都是唯一的
    });
  });
});