// Lazy import logger to avoid circular dependencies during initialization

// Simplified logging middleware that works with any tRPC context
export const loggerMiddleware = () =>
  async ({ ctx, path, type, next }: {
    ctx: any;
    path: string;
    type: string;
    next: () => Promise<any>;
  }) => {
    try {
      const { createLogger, generateCorrelationId } = require('@fastbuild/logger');
      const start = Date.now();
      const correlationId = ctx.request?.headers?.get('x-correlation-id') ||
                             ctx.request?.headers?.get('x-request-id') ||
                             generateCorrelationId();

      const logger = createLogger({
        correlationId,
        type: 'tRPC',
        path,
        procedure: type,
        userId: ctx.session?.user?.id,
      });

      logger.info({ correlationId, path, type }, 'tRPC request started');

      try {
        const result = await next();
        const duration = Date.now() - start;

        logger.info({
          duration,
          success: true,
          hasData: !!result?.data
        }, 'tRPC request completed');

        return result;
      } catch (error) {
        const duration = Date.now() - start;

        logger.error({
          duration,
          error: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined }),
          }
        }, 'tRPC request failed');

        throw error;
      }
    } catch (loggerError) {
      console.warn('Failed to initialize logger middleware:', loggerError);
      return next();
    }
  };

// Simple performance middleware
export const performanceMiddleware = () =>
  async ({ ctx, path, type, next }: {
    ctx: any;
    path: string;
    type: string;
    next: () => Promise<any>;
  }) => {
    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;

    if (duration > 1000) {
      try {
        const { createLogger } = require('@fastbuild/logger');
        const logger = createLogger({
          type: 'performance',
          path,
          procedure: type,
          userId: ctx.session?.user?.id,
        });

        logger.warn({ duration, threshold: 1000 }, 'Slow tRPC operation');
      } catch (error) {
        console.warn('Failed to log slow operation:', error);
      }
    }

    return result;
  };

// Main middleware that combines logging and performance
export const logging = () =>
  async ({ ctx, path, type, next }: {
    ctx: any;
    path: string;
    type: string;
    next: () => Promise<any>;
  }) => {
    try {
      const { createLogger, generateCorrelationId } = require('@fastbuild/logger');
      const start = Date.now();
      const correlationId = ctx.request?.headers?.get('x-correlation-id') ||
                             ctx.request?.headers?.get('x-request-id') ||
                             generateCorrelationId();

      const logger = createLogger({
        correlationId,
        type: 'tRPC',
        path,
        procedure: type,
        userId: ctx.session?.user?.id,
      });

      logger.info({ correlationId, path, type }, 'tRPC request started');

      try {
        const result = await next();
        const duration = Date.now() - start;

        // Log slow operations
        if (duration > 1000) {
          logger.warn({ duration, threshold: 1000 }, 'Slow tRPC operation');
        }

        logger.info({
          duration,
          success: true,
          hasData: !!result?.data
        }, 'tRPC request completed');

        return result;
      } catch (error) {
        const duration = Date.now() - start;

        logger.error({
          duration,
          error: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined }),
          }
        }, 'tRPC request failed');

        throw error;
      }
    } catch (loggerError) {
      console.warn('Failed to initialize logging middleware:', loggerError);
      return next();
    }
  };

// Export simplified middleware for easy usage
export { logging as standard, performanceMiddleware as performance };