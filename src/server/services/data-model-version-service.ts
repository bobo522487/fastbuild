import { PrismaClient } from '@prisma/client';
import { hashSensitiveConfig, verifySensitiveConfig, generateDataIntegrityHash } from '~/server/auth/password';

/**
 * 数据模型版本管理服务 - 利用 PostgreSQL 18 新特性
 * 提供增强的版本控制、变更追踪和数据完整性验证
 */
export class DataModelVersionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 创建数据模型版本（使用 RETURNING 语法和完整性校验）
   */
  async createDataModelVersion(data: {
    projectId: string;
    version: string;
    environment: 'PREVIEW' | 'PRODUCTION';
    tableSnapshots: any;
    changeLog?: any;
    metadata?: any;
    deployedBy: string;
  }) {
    try {
      // 生成数据完整性哈希
      const integrityHash = generateDataIntegrityHash({
        tableSnapshots: data.tableSnapshots,
        version: data.version,
        timestamp: new Date()
      });

      // 使用 RETURNING 语法创建版本并返回完整信息
      const [result] = await this.prisma.$queryRaw`
        INSERT INTO "DataModelDeployment" (
          "projectId",
          version,
          environment,
          status,
          "deployedAt",
          "deployedBy",
          "tableSnapshots",
          "changeLog",
          "metadata"
        ) VALUES (
          ${data.projectId},
          ${data.version},
          ${data.environment},
          'BUILDING',
          NOW(),
          ${data.deployedBy},
          ${JSON.stringify(data.tableSnapshots)},
          ${JSON.stringify(data.changeLog || {})},
          ${JSON.stringify({
            ...data.metadata,
            integrityHash,
            pgFeatures: {
              returningSyntax: true,
              crc32Validation: true,
              sha512Hashing: true
            }
          })}
        )
        RETURNING
          old.* as "before",
          new.* as "after",
          EXTRACT(EPOCH FROM NOW() - new."deployedAt") as creation_time_seconds,
          EXTRACT(MILLISECONDS FROM NOW() - new."deployedAt") as creation_time_ms
      ` as any[];

      const version = result?.after;
      const auditData = result;

      // 记录审计日志
      await this.prisma.auditLog.create({
        action: 'CREATE',
        resourceType: 'DataModelDeployment',
        resourceId: version.id,
        oldValues: null,
        newValues: {
          ...version,
          creationTimeMs: auditData.creation_time_ms,
          integrityHash: integrityHash
        },
        metadata: {
          version: data.version,
          environment: data.environment,
          deployedBy: data.deployedBy
        },
        userId: data.deployedBy
      });

      return version;
    } catch (error) {
      console.error('❌ 创建数据模型版本失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据模型版本状态
   */
  async updateDataModelVersionStatus(
    id: string,
    status: 'BUILDING' | 'DEPLOYED' | 'FAILED' | 'ARCHIVED',
    buildLog?: string,
    buildTime?: number,
    userId: string
  ) {
    try {
      const result = await this.prisma.$queryRaw`
        UPDATE "DataModelDeployment"
        SET
          status = ${status},
          buildLog = ${buildLog || null},
          buildTime = ${buildTime || null},
          ${status === 'DEPLOYED' ? '"schemaName" = CONCAT(\'schema_\', version)' : ''}
        WHERE id = ${id}
        RETURNING
          old.* as "before",
          new.* as "after",
          EXTRACT(EPOCH FROM NOW() - new."deployedAt") as update_time_seconds
      ` as any[];

      const version = result?.after;
      const auditData = result;

      if (auditData) {
        // 记录状态变更审计
        await this.prisma.auditLog.create({
          action: 'UPDATE',
          resourceType: 'DataModelDeployment',
          resourceId: id,
          oldValues: {
            status: auditData.before.status,
            buildLog: auditData.before.buildLog
          },
          newValues: {
            status: auditData.after.status,
            buildLog: auditData.after.buildLog
          },
          metadata: {
            updateTimeSeconds: auditData.update_time_seconds,
            buildTime: buildTime
          },
          userId
        });
      }

      return version;
    } catch (error) {
      console.error('❌ 更新数据模型版本状态失败:', error);
      throw error;
    }
  }

  /**
   * 验证数据模型版本完整性
   */
  async validateDataModelIntegrity(versionId: string): Promise<{
    isValid: boolean;
    issues: string[];
    integrityHash?: any;
    recommendations: string[];
  }> {
    try {
      const version = await this.prisma.dataModelDeployment.findUnique({
        where: { id: versionId }
      });

      if (!version) {
        return {
          isValid: false,
          issues: ['版本不存在'],
          recommendations: ['请检查版本ID是否正确']
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      // 1. 验证完整性哈希
      if (version.metadata?.integrityHash) {
        const expectedHash = version.metadata.integrityHash;
        const currentHash = generateDataIntegrityHash({
          tableSnapshots: version.tableSnapshots,
          version: version.version,
          timestamp: version.deployedAt
        });

        if (currentHash.sha512 !== expectedHash.sha512) {
          issues.push('数据完整性哈希不匹配');
          recommendations.push('数据可能已被篡改，请检查安全性');
        }
      } else {
        issues.push('缺少完整性哈希');
        recommendations.push('建议启用数据完整性验证');
      }

      // 2. 验证表快照结构
      if (!version.tableSnapshots || Object.keys(version.tableSnapshots).length === 0) {
        issues.push('缺少表快照数据');
        recommendations.push('请确保包含完整的表结构定义');
      }

      // 3. 验证版本号格式
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(version.version)) {
        issues.push('版本号格式不正确');
        recommendations.push('请使用语义化版本号格式 (如 1.0.0)');
      }

      // 4. 验证变更日志
      if (!version.changeLog || Object.keys(version.changeLog).length === 0) {
        recommendations.push('建议添加详细的变更日志');
      }

      return {
        isValid: issues.length === 0,
        issues,
        integrityHash: version.metadata?.integrityHash,
        recommendations
      };
    } catch (error) {
      console.error('❌ 验证数据模型完整性失败:', error);
      return {
        isValid: false,
        issues: ['验证过程中发生错误'],
        recommendations: ['请检查数据完整性']
      };
    }
  }

  /**
   * 比较两个数据模型版本
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: any;
    version2: any;
    differences: {
      added: string[];
      removed: string[];
      modified: string[];
      unchanged: string[];
    };
    compatibilityIssues: string[];
    upgradeRequired: boolean;
  }> {
    try {
      const [version1, version2] = await Promise.all([
        this.prisma.dataModelDeployment.findUnique({
          where: { id: versionId1 }
        }),
        this.prisma.dataModelDeployment.findUnique({
          where: { id: versionId2 }
        })
      ]);

      if (!version1 || !version2) {
        throw new Error('版本不存在');
      }

      const snapshots1 = version1.tableSnapshots || {};
      const snapshots2 = version2.tableSnapshots || {};

      const tables1 = new Set(Object.keys(snapshots1));
      const tables2 = new Set(Object.keys(snapshots2));

      // 分析差异
      const added = [...tables2].filter(table => !tables1.has(table));
      const removed = [...tables1].filter(table => !tables2.has(table));
      const common = [...tables1].filter(table => tables2.has(table));

      const modified = common.filter(table => {
        return JSON.stringify(snapshots1[table]) !== JSON.stringify(snapshots2[table]);
      });

      const unchanged = common.filter(table => {
        return JSON.stringify(snapshots1[table]) === JSON.stringify(snapshots2[table]);
      });

      // 检查兼容性问题
      const compatibilityIssues: string[] = [];

      // 检查是否有表被删除（不兼容）
      if (removed.length > 0) {
        compatibilityIssues.push(`删除了 ${removed.length} 个表，可能导致数据丢失`);
      }

      // 检查关键字段变更
      for (const tableName of modified) {
        const table1 = snapshots1[tableName];
        const table2 = snapshots2[tableName];

        if (table1?.columns && table2?.columns) {
          const fields1 = new Set(Object.keys(table1.columns));
          const fields2 = new Set(Object.keys(table2.columns));

          const removedFields = [...fields1].filter(field => !fields2.has(field));
          if (removedFields.length > 0) {
            compatibilityIssues.push(`表 ${tableName} 删除了 ${removedFields.length} 个字段`);
          }
        }
      }

      const upgradeRequired = compatibilityIssues.length > 0 || removed.length > 0;

      return {
        version1,
        version2,
        differences: {
          added,
          removed,
          modified,
          unchanged
        },
        compatibilityIssues,
        upgradeRequired
      };
    } catch (error) {
      console.error('❌ 比较版本失败:', error);
      throw error;
    }
  }

  /**
   * 获取版本变更历史
   */
  async getVersionHistory(projectId: string, limit: number = 20): Promise<{
    versions: Array<{
      id: string;
      version: string;
      environment: string;
      status: string;
      deployedAt: Date;
      deployedBy: string;
      buildTime?: number;
      changeLog?: any;
      differences?: any;
    }>;
    total: number;
  }> {
    try {
      const versions = await this.prisma.dataModelDeployment.findMany({
        where: { projectId },
        orderBy: { deployedAt: 'desc' },
        take: limit,
        include: {
          deployer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const total = await this.prisma.dataModelDeployment.count({
        where: { projectId }
      });

      // 计算每个版本的差异（与上一个版本比较）
      const versionsWithDifferences = await Promise.all(
        versions.map(async (version, index) => {
          let differences = null;

          if (index < versions.length - 1) {
            try {
              const comparison = await this.compareVersions(
                versions[index + 1].id,
                version.id
              );
              differences = comparison.differences;
            } catch (error) {
              console.error('计算版本差异失败:', error);
            }
          }

          return {
            id: version.id,
            version: version.version,
            environment: version.environment,
            status: version.status,
            deployedAt: version.deployedAt,
            deployedBy: version.deployedBy,
            buildTime: version.buildTime,
            changeLog: version.changeLog,
            differences
          };
        })
      );

      return {
        versions: versionsWithDifferences,
        total
      };
    } catch (error) {
      console.error('❌ 获取版本历史失败:', error);
      return {
        versions: [],
        total: 0
      };
    }
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(versionId: string, userId: string): Promise<{
    success: boolean;
    rollbackVersion: any;
    message: string;
    issues: string[];
  }> {
    try {
      // 验证目标版本
      const validation = await this.validateDataModelIntegrity(versionId);
      if (!validation.isValid) {
        return {
          success: false,
          rollbackVersion: null,
          message: '目标版本验证失败',
          issues: validation.issues
        };
      }

      const targetVersion = await this.prisma.dataModelDeployment.findUnique({
        where: { id: versionId }
      });

      if (!targetVersion) {
        return {
          success: false,
          rollbackVersion: null,
          message: '目标版本不存在',
          issues: ['版本ID无效']
        };
      }

      // 创建新的回滚版本
      const rollbackVersion = await this.createDataModelVersion({
        projectId: targetVersion.projectId,
        version: this.generateRollbackVersion(targetVersion.version),
        environment: targetVersion.environment,
        tableSnapshots: targetVersion.tableSnapshots,
        changeLog: {
          type: 'ROLLBACK',
          reason: 'Manual rollback',
          fromVersion: targetVersion.version,
          rollbackAt: new Date()
        },
        metadata: {
          rollbackFrom: versionId,
          originalVersion: targetVersion.version
        },
        deployedBy: userId
      });

      // 更新状态为已部署
      await this.updateDataModelVersionStatus(
        rollbackVersion.id,
        'DEPLOYED',
        'Rollback completed successfully',
        0,
        userId
      );

      // 记录回滚审计
      await this.prisma.auditLog.create({
        action: 'ROLLBACK',
        resourceType: 'DataModelDeployment',
        resourceId: rollbackVersion.id,
        oldValues: { rollbackFrom: versionId },
        newValues: { rollbackTo: targetVersion.id },
        metadata: {
          rollbackReason: 'Manual rollback requested',
          originalVersion: targetVersion.version
        },
        userId
      });

      return {
        success: true,
        rollbackVersion,
        message: `成功回滚到版本 ${targetVersion.version}`,
        issues: []
      };
    } catch (error) {
      console.error('❌ 版本回滚失败:', error);
      return {
        success: false,
        rollbackVersion: null,
        message: '回滚失败',
        issues: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }

  /**
   * 生成回滚版本号
   */
  private generateRollbackVersion(originalVersion: string): string {
    const parts = originalVersion.split('.');
    const patch = parseInt(parts[2] || '0');
    return `${parts[0]}.${parts[1]}.${patch + 1}-rollback`;
  }

  /**
   * 获取数据模型使用统计
   */
  async getDataModelUsageStats(projectId: string): Promise<{
    totalVersions: number;
    deployedVersions: number;
    environments: {
      PREVIEW: number;
      PRODUCTION: number;
    };
    latestVersions: {
      latestPreview?: any;
      latestProduction?: any;
    };
    deploymentFrequency: {
      avgDaysBetweenDeploys: number;
      totalDeploysLast30Days: number;
    };
  }> {
    try {
      const [
        totalCount,
        deployedCount,
        environments,
        latestPreview,
        latestProduction,
        recentDeploys
      ] = await Promise.all([
        this.prisma.dataModelDeployment.count({
          where: { projectId }
        }),

        this.prisma.dataModelDeployment.count({
          where: { projectId, status: 'DEPLOYED' }
        }),

        this.prisma.dataModelDeployment.groupBy({
          by: ['environment'],
          where: { projectId },
          _count: true
        }),

        this.prisma.dataModelDeployment.findFirst({
          where: { projectId, environment: 'PREVIEW' },
          orderBy: { deployedAt: 'desc' }
        }),

        this.prisma.dataModelDeployment.findFirst({
          where: { projectId, environment: 'PRODUCTION' },
          orderBy: { deployedAt: 'desc' }
        }),

        this.prisma.dataModelDeployment.findMany({
          where: {
            projectId,
            deployedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { deployedAt: 'asc' }
        })
      ]);

      // 计算部署频率
      let avgDaysBetweenDeploys = 0;
      let totalDeploysLast30Days = recentDeploys.length;

      if (recentDeploys.length > 1) {
        const timeDiff = recentDeploys[recentDeploys.length - 1].deployedAt.getTime() -
                        recentDeploys[0].deployedAt.getTime();
        avgDaysBetweenDeploys = timeDiff / (recentDeploys.length - 1) / (24 * 60 * 60 * 1000);
      }

      const envCounts = environments.reduce((acc, env) => {
        acc[env.environment] = env._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalVersions: totalCount,
        deployedVersions: deployedCount,
        environments: {
          PREVIEW: envCounts.PREVIEW || 0,
          PRODUCTION: envCounts.PRODUCTION || 0
        },
        latestVersions: {
          latestPreview,
          latestProduction
        },
        deploymentFrequency: {
          avgDaysBetweenDeploys: Math.round(avgDaysBetweenDeploys * 100) / 100,
          totalDeploysLast30Days
        }
      };
    } catch (error) {
      console.error('❌ 获取数据模型使用统计失败:', error);
      return {
        totalVersions: 0,
        deployedVersions: 0,
        environments: { PREVIEW: 0, PRODUCTION: 0 },
        latestVersions: {},
        deploymentFrequency: {
          avgDaysBetweenDeploys: 0,
          totalDeploysLast30Days: 0
        }
      };
    }
  }
}