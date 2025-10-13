import type { TRPCError } from '@trpc/server';
import { createLogger, type Logger } from '@acme/logger';

// Create structured loggers for different components
export const authLogger: Logger = createLogger({ component: 'auth' });
export const dbLogger: Logger = createLogger({ component: 'database' });
export const apiLogger: Logger = createLogger({ component: 'api' });

// Global logger instance
export const logger: Logger = createLogger();

// Error logging helper
export function logError(error: unknown, context?: Record<string, any>): void {
  const errorInfo = {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  logger.error({ ...errorInfo }, 'Unhandled error occurred');
}

// tRPC error logging helper
export function logTRPCError(error: TRPCError, context?: Record<string, any>): void {
  logger.error({
    code: error.code,
    message: error.message,
    cause: error.cause,
    ...context,
  }, 'tRPC Error');
}

// Utility function to create contextual loggers
export function createComponentLogger(component: string, context?: Record<string, any>): Logger {
  return createLogger({ component, ...context });
}