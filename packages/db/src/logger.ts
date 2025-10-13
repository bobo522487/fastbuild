import { createLogger, dbQueryLogger } from '@acme/logger';

// Prisma query event handler
export const prismaLogger = (event: any) => {
  const { query, params, duration } = event;
  dbQueryLogger(query, params, duration);
};

// Prisma middleware for logging
export const prismaLoggingMiddleware = async (params: any, next: () => Promise<any>) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  const logger = createLogger({
    type: 'database',
    model: params.model,
    action: params.action,
    argsCount: Object.keys(params.args || {}).length,
  });

  // Log slow queries
  if (duration > 1000) {
    logger.warn({ duration, model: params.model, action: params.action, threshold: 1000 }, 'Slow Prisma query');
  } else {
    logger.debug({ duration, model: params.model, action: params.action }, 'Prisma query executed');
  }

  return result;
};

// Simple Prisma client extension
export const extendPrismaWithLogging = (prisma: any) => {
  return prisma.$extends({
    name: 'logging',
    query: {
      async $allOperations({ model, operation, args, query }: any) {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;

        const logger = createLogger({
          type: 'database',
          model,
          operation,
        });

        logger.debug({ duration, operation, model }, 'Prisma model query');

        return result;
      },
    },
  });
};

// Health check logger
export const logDatabaseHealth = async (prisma: any) => {
  const logger = createLogger({
    type: 'database',
    operation: 'health-check',
  });

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    logger.info({ duration, status: 'healthy' }, 'Database health check passed');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      status: 'unhealthy'
    }, 'Database health check failed');
    throw error;
  }
};

// Connection pool monitoring
export const logConnectionPoolStats = (poolStats: any) => {
  const logger = createLogger({
    type: 'database',
    operation: 'connection-pool',
  });

  logger.info({ ...poolStats, timestamp: new Date().toISOString() }, 'Database connection pool stats');
};

// Transaction logger
export const createTransactionLogger = (operation: string) => {
  const logger = createLogger({
    type: 'database',
    operation,
  });

  const start = Date.now();

  return {
    start: () => {
      logger.info({ operation, timestamp: new Date().toISOString() }, 'Database transaction started');
    },
    commit: () => {
      const duration = Date.now() - start;
      logger.info({ operation, duration, status: 'committed' }, 'Database transaction committed');
    },
    rollback: (error?: Error) => {
      const duration = Date.now() - start;
      logger.warn({ operation, duration, status: 'rolled_back', error: error?.message }, 'Database transaction rolled back');
    },
  };
};

// Schema migration logger
export const logMigration = (migration: {
  name: string;
  startTime: number;
  endTime?: number;
  status: 'started' | 'completed' | 'failed';
  error?: string;
}) => {
  const logger = createLogger({
    type: 'database',
    operation: 'migration',
  });

  const duration = migration.endTime ? migration.endTime - migration.startTime : null;

  switch (migration.status) {
    case 'started':
      logger.info({ migrationName: migration.name, timestamp: new Date().toISOString() }, 'Database migration started');
      break;
    case 'completed':
      logger.info({ migrationName: migration.name, duration, status: 'success' }, 'Database migration completed');
      break;
    case 'failed':
      logger.error({ migrationName: migration.name, duration, error: migration.error, status: 'failed' }, 'Database migration failed');
      break;
  }
};

// Batch operation logger
export const logBatchOperation = (operation: string, count: number, duration: number) => {
  const logger = createLogger({
    type: 'database',
    operation,
  });

  const avgDuration = duration / count;

  logger.info({ operation, count, totalDuration: duration, averageDuration: avgDuration }, 'Database batch operation completed');

  // Log if average duration is too high
  if (avgDuration > 100) {
    logger.warn({ operation, count, avgDuration, threshold: 100 }, 'Slow batch operation detected');
  }
};

// Export utilities for easy integration
export const createPrismaLoggingConfig = () => ({
  log: ['query', 'info', 'warn', 'error'],
});