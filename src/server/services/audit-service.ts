import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

/**
 * 审计服务 - 利用 PostgreSQL 18 RETURNING old/new 语法
 * 自动记录数据变更，提升审计效率和完整性
 */
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 创建项目并自动记录审计日志
   */
  async createProjectWithAudit(data: {
    name: string;
    slug: string;
    description?: string;
    visibility: 'PUBLIC' | 'PRIVATE';
    createdBy: string;
  }) {
    try {
      const result = await this.prisma.$queryRaw`
        INSERT INTO "Project" (name, slug, description, "createdBy", "visibility", "createdAt", "updatedAt")
        VALUES (
          ${data.name},
          ${data.slug},
          ${data.description},
          ${data.createdBy},
          ${data.visibility},
          NOW(),
          NOW()
        )
        RETURNING
          old.* as "before",
          new.* as "after",
          EXTRACT(EPOCH FROM NOW() - new."createdAt") as creation_time_seconds,
          EXTRACT(MILLISECONDS FROM NOW() - new."createdAt") as creation_time_ms
      ` as any[];

      const project = result[0]?.after;
      const auditData = result[0];

      // 记录审计日志
      await this.createAuditLog({
        action: 'CREATE',
        resourceType: 'Project',
        resourceId: project.id,
        oldValues: null,
        newValues: auditData.after,
        metadata: {
          creationTimeMs: auditData.creation_time_ms,
          creationTimeSeconds: auditData.creation_time_seconds,
          userAgent: await this.getUserAgent(),
          ipAddress: await this.getClientIP()
        }
      }, data.createdBy);

      return project;
    } catch (error) {
      console.error('❌ 创建项目审计失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目并自动记录变更审计
   */
  async updateProjectWithAudit(
    id: string,
    data: {
      name?: string;
      description?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
    },
    userId: string
  ) {
    try {
      const updateFields = [];
      const values = [];

      if (data.name !== undefined) {
        updateFields.push(`name = $${values.length + 2}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${values.length + 2}`);
        values.push(data.description);
      }
      if (data.visibility !== undefined) {
        updateFields.push(`visibility = $${values.length + 2}`);
        values.push(data.visibility);
      }

      if (updateFields.length === 0) {
        throw new Error('没有要更新的字段');
      }

      updateFields.push(`"updatedAt" = NOW()`);

      const result = await this.prisma.$queryRaw`
        UPDATE "Project"
        SET ${updateFields.join(', ')}
        WHERE id = ${id}
        RETURNING
          old.* as "before",
          new.* as "after",
          EXTRACT(EPOCH FROM new."updatedAt" - old."updatedAt") as update_time_seconds,
          EXTRACT(MILLISECONDS FROM new."updatedAt" - old."updatedAt") as update_time_ms
      ` as any[];

      const project = result[0]?.after;
      const auditData = result[0];

      if (auditData) {
        // 分析变更内容
        const changes = this.analyzeChanges(auditData.before, auditData.after);

        // 记录审计日志
        await this.createAuditLog({
          action: 'UPDATE',
          resourceType: 'Project',
          resourceId: id,
          oldValues: auditData.before,
          newValues: auditData.after,
          metadata: {
            updateTimeMs: auditData.update_time_ms,
            updateTimeSeconds: auditData.update_time_seconds,
            changes,
            userAgent: await this.getUserAgent(),
            ipAddress: await this.getClientIP()
          }
        }, userId);
      }

      return project;
    } catch (error) {
      console.error('❌ 更新项目审计失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目并记录审计
   */
  async deleteProjectWithAudit(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        DELETE FROM "Project"
        WHERE id = ${id}
        RETURNING
          old.* as "deleted_data",
          EXTRACT(EPOCH FROM NOW() - old."createdAt") as lifecycle_seconds
      ` as any[];

      if (result.length > 0) {
        const deletedData = result[0]?.deleted_data;

        // 记录删除审计
        await this.createAuditLog({
          action: 'DELETE',
          resourceType: 'Project',
          resourceId: id,
          oldValues: deletedData,
          newValues: null,
          metadata: {
            lifecycleSeconds: result[0]?.lifecycle_seconds,
            deletedAt: new Date(),
            userAgent: await this.getUserAgent(),
            ipAddress: await this.getClientIP()
          }
        }, userId);

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 删除项目审计失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作审计（使用 MERGE 语法）
   */
  async bulkUpdateProjectsStatus(
    updates: Array<{ id: string; status: string }>,
    userId: string
  ) {
    try {
      // PostgreSQL 18 MERGE 语法进行批量更新
      const auditResults = [];

      for (const update of updates) {
        const result = await this.prisma.$queryRaw`
          MERGE INTO "Project" p
          USING (SELECT ${update.id} as id, ${update.status} as new_status) AS updates
          ON p.id = updates.id
          WHEN MATCHED THEN
            UPDATE SET "updatedAt" = NOW()
            RETURNING
              old.* as "before",
              new.* as "after",
              updates.new_status as "applied_status"
        ` as any[];

        if (result.length > 0) {
          const auditData = result[0];
          auditResults.push(auditData);

          await this.createAuditLog({
            action: 'BULK_UPDATE',
            resourceType: 'Project',
            resourceId: update.id,
            oldValues: auditData.before,
            newValues: {
              ...auditData.after,
              appliedStatus: auditData.applied_status
            },
            metadata: {
              bulkOperation: true,
              appliedStatus: update.status,
              userAgent: await this.getUserAgent(),
              ipAddress: await this.getClientIP()
            }
          }, userId);
        }
      }

      return auditResults;
    } catch (error) {
      console.error('❌ 批量更新审计失败:', error);
      throw error;
    }
  }

  /**
   * 创建审计日志记录
   */
  private async createAuditLog(
    auditData: {
      action: string;
      resourceType: string;
      resourceId: string;
      oldValues: any;
      newValues: any;
      metadata?: any;
    },
    userId?: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: auditData.action,
          resourceType: auditData.resourceType,
          resourceId: auditData.resourceId,
          oldValues: auditData.oldValues,
          newValues: auditData.newValues,
          metadata: auditData.metadata,
          userId: userId,
          ipAddress: await this.getClientIP(),
          userAgent: await this.getUserAgent()
        }
      });
    } catch (error) {
      console.error('❌ 创建审计日志失败:', error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 分析数据变更
   */
  private analyzeChanges(oldData: any, newData: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    for (const key in newData) {
      if (key in oldData && oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    }

    return changes;
  }

  /**
   * 获取客户端 IP 地址
   */
  private async getClientIP(): Promise<string> {
    try {
      const headersList = await headers();
      const forwarded = headersList.get('x-forwarded-for');
      const realIP = headersList.get('x-real-ip');

      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }

      if (realIP) {
        return realIP;
      }

      return '127.0.0.1';
    } catch {
      return '127.0.0.1';
    }
  }

  /**
   * 获取用户代理
   */
  private async getUserAgent(): Promise<string> {
    try {
      const headersList = await headers();
      return headersList.get('user-agent') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * 查询审计日志
   */
  async getAuditLogs(filters: {
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      take: filters.limit || 50,
      skip: filters.offset || 0
    });
  }

  /**
   * 获取审计统计信息
   */
  async getAuditStatistics(timeRange: 'day' | 'week' | 'month' = 'week') {
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const [totalLogs, actionStats, resourceStats] = await Promise.all([
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      }),

      this.prisma.auditLog.groupBy({
        by: ['resourceType'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      })
    ]);

    return {
      totalLogs,
      timeRange,
      actionBreakdown: actionStats,
      resourceBreakdown: resourceStats,
      startDate,
      endDate: new Date()
    };
  }
}