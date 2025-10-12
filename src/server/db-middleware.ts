/**
 * FastBuild Database Middleware
 *
 * 自动ID分配中间件
 * 在创建新记录时自动生成短ID，替代数据库端的函数生成
 */

import { PrismaClient } from '@prisma/client';
import { FastBuildIdGenerator } from '~/lib/id-generator';

/**
 * 中间件配置类型
 */
interface MiddlewareConfig {
  enableAutoId: boolean;
  enableLogging: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MiddlewareConfig = {
  enableAutoId: true,
  enableLogging: false, // 生产环境建议关闭
};

/**
 * 实体类型到ID生成器的映射
 */
const ENTITY_ID_GENERATORS = {
  user: () => FastBuildIdGenerator.generateUserId(),
  project: () => FastBuildIdGenerator.generateProjectId(),
  application: () => FastBuildIdGenerator.generateAppId(),
  appPage: () => FastBuildIdGenerator.generatePageId(),
  appDeployment: () => FastBuildIdGenerator.generateDeploymentId(),
  dataModelDeployment: () => FastBuildIdGenerator.generateDeploymentId(),
  dataTable: () => FastBuildIdGenerator.generateTableId(),
  dataColumn: () => FastBuildIdGenerator.generateColumnId(),
  tableView: () => FastBuildIdGenerator.generateViewId(),
  projectMember: () => FastBuildIdGenerator.generateMemberId(),
  auditLog: () => FastBuildIdGenerator.generateAuditLogId(),
};

/**
 * 创建数据库中间件
 */
export function createDatabaseMiddleware(
  prisma: PrismaClient,
  config: Partial<MiddlewareConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  prisma.$use(async (params, next) => {
    // 只处理创建操作
    if (params.action === 'create' && finalConfig.enableAutoId) {
      const modelName = params.model;

      if (modelName && ENTITY_ID_GENERATORS[modelName as keyof typeof ENTITY_ID_GENERATORS]) {
        // 如果没有提供ID，则自动生成
        if (!params.args.data.id) {
          const generator = ENTITY_ID_GENERATORS[modelName as keyof typeof ENTITY_ID_GENERATORS];
          const generatedId = generator();

          params.args.data.id = generatedId;

          if (finalConfig.enableLogging) {
            console.log(`🆔 Generated ID for ${modelName}: ${generatedId}`);
          }
        }
      }
    }

    // 处理批量创建操作
    if (params.action === 'createMany' && finalConfig.enableAutoId) {
      const modelName = params.model;

      if (modelName && ENTITY_ID_GENERATORS[modelName as keyof typeof ENTITY_ID_GENERATORS]) {
        const generator = ENTITY_ID_GENERATORS[modelName as keyof typeof ENTITY_ID_GENERATORS];

        // 为每个记录生成ID（如果没有提供）
        params.args.data = params.args.data.map((record: any) => {
          if (!record.id) {
            return {
              ...record,
              id: generator(),
            };
          }
          return record;
        });

        if (finalConfig.enableLogging) {
          console.log(`🆔 Generated IDs for ${modelName} batch create: ${params.args.data.length} records`);
        }
      }
    }

    return next(params);
  });

  return prisma;
}

/**
 * 为Prisma客户端添加ID生成中间件的便捷函数
 */
export function withIdGeneration(
  prisma: PrismaClient,
  config?: Partial<MiddlewareConfig>
): PrismaClient {
  return createDatabaseMiddleware(prisma, config);
}

/**
 * 开发环境专用中间件（带详细日志）
 */
export function createDevelopmentMiddleware(prisma: PrismaClient): PrismaClient {
  return createDatabaseMiddleware(prisma, {
    enableAutoId: true,
    enableLogging: true,
  });
}

/**
 * 生产环境专用中间件（性能优化，无日志）
 */
export function createProductionMiddleware(prisma: PrismaClient): PrismaClient {
  return createDatabaseMiddleware(prisma, {
    enableAutoId: true,
    enableLogging: false,
  });
}

/**
 * 测试环境专用中间件（确定性ID生成）
 * 用于单元测试和集成测试，确保ID的可预测性
 */
export function createTestMiddleware(prisma: PrismaClient): PrismaClient {
  let counter = 1;

  // 重写ID生成器为确定性生成
  const testGenerators = {
    user: () => `user_test${String(counter++).padStart(8, '0')}`,
    project: () => `proj_test${String(counter++).padStart(8, '0')}`,
    application: () => `app_test${String(counter++).padStart(8, '0')}`,
    appPage: () => `page_test${String(counter++).padStart(8, '0')}`,
    appDeployment: () => `dep_test${String(counter++).padStart(8, '0')}`,
    dataModelDeployment: () => `dep_test${String(counter++).padStart(8, '0')}`,
    dataTable: () => `tbl_test${String(counter++).padStart(8, '0')}`,
    dataColumn: () => `col_test${String(counter++).padStart(8, '0')}`,
    tableView: () => `view_test${String(counter++).padStart(8, '0')}`,
    projectMember: () => `mem_test${String(counter++).padStart(8, '0')}`,
    auditLog: () => `log_test${String(counter++).padStart(8, '0')}`,
  };

  prisma.$use(async (params, next) => {
    if (params.action === 'create') {
      const modelName = params.model;

      if (modelName && testGenerators[modelName as keyof typeof testGenerators]) {
        if (!params.args.data.id) {
          const generator = testGenerators[modelName as keyof typeof testGenerators];
          params.args.data.id = generator();
        }
      }
    }

    if (params.action === 'createMany') {
      const modelName = params.model;

      if (modelName && testGenerators[modelName as keyof typeof testGenerators]) {
        const generator = testGenerators[modelName as keyof typeof testGenerators];

        params.args.data = params.args.data.map((record: any) => {
          if (!record.id) {
            return {
              ...record,
              id: generator(),
            };
          }
          return record;
        });
      }
    }

    return next(params);
  });

  return prisma;
}

/**
 * 中间件工厂 - 根据环境自动选择合适的中间件
 */
export function createEnvironmentMiddleware(
  prisma: PrismaClient,
  env: string = process.env.NODE_ENV || 'development'
): PrismaClient {
  switch (env) {
    case 'production':
      return createProductionMiddleware(prisma);
    case 'test':
      return createTestMiddleware(prisma);
    case 'development':
    default:
      return createDevelopmentMiddleware(prisma);
  }
}