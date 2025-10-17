import type { TRPCError } from '@trpc/server';
import type { Logger } from '@fastbuild/logger';

// Lazy logger factories to avoid circular dependencies during initialization
const createAuthLogger = (): Logger => {
  try {
    const { createLogger } = require('@fastbuild/logger');
    return createLogger({ component: 'auth' });
  } catch (error) {
    console.warn('Failed to create auth logger:', error);
    // Return a simple console logger fallback
    return {
      info: (msg: any, ctx?: any) => console.log('[AUTH INFO]', msg, ctx),
      warn: (msg: any, ctx?: any) => console.warn('[AUTH WARN]', msg, ctx),
      error: (msg: any, ctx?: any) => console.error('[AUTH ERROR]', msg, ctx),
      debug: (msg: any, ctx?: any) => console.debug('[AUTH DEBUG]', msg, ctx),
      fatal: (msg: any, ctx?: any) => console.error('[AUTH FATAL]', msg, ctx),
      child: () => createAuthLogger(),
    } as Logger;
  }
};

const createDbLogger = (): Logger => {
  try {
    const { createLogger } = require('@fastbuild/logger');
    return createLogger({ component: 'database' });
  } catch (error) {
    console.warn('Failed to create database logger:', error);
    return {
      info: (msg: any, ctx?: any) => console.log('[DB INFO]', msg, ctx),
      warn: (msg: any, ctx?: any) => console.warn('[DB WARN]', msg, ctx),
      error: (msg: any, ctx?: any) => console.error('[DB ERROR]', msg, ctx),
      debug: (msg: any, ctx?: any) => console.debug('[DB DEBUG]', msg, ctx),
      fatal: (msg: any, ctx?: any) => console.error('[DB FATAL]', msg, ctx),
      child: () => createDbLogger(),
    } as Logger;
  }
};

const createApiLogger = (): Logger => {
  try {
    const { createLogger } = require('@fastbuild/logger');
    return createLogger({ component: 'api' });
  } catch (error) {
    console.warn('Failed to create API logger:', error);
    return {
      info: (msg: any, ctx?: any) => console.log('[API INFO]', msg, ctx),
      warn: (msg: any, ctx?: any) => console.warn('[API WARN]', msg, ctx),
      error: (msg: any, ctx?: any) => console.error('[API ERROR]', msg, ctx),
      debug: (msg: any, ctx?: any) => console.debug('[API DEBUG]', msg, ctx),
      fatal: (msg: any, ctx?: any) => console.error('[API FATAL]', msg, ctx),
      child: () => createApiLogger(),
    } as Logger;
  }
};

const createGlobalLogger = (): Logger => {
  try {
    const { createLogger } = require('@fastbuild/logger');
    return createLogger();
  } catch (error) {
    console.warn('Failed to create global logger:', error);
    return {
      info: (msg: any, ctx?: any) => console.log('[GLOBAL INFO]', msg, ctx),
      warn: (msg: any, ctx?: any) => console.warn('[GLOBAL WARN]', msg, ctx),
      error: (msg: any, ctx?: any) => console.error('[GLOBAL ERROR]', msg, ctx),
      debug: (msg: any, ctx?: any) => console.debug('[GLOBAL DEBUG]', msg, ctx),
      fatal: (msg: any, ctx?: any) => console.error('[GLOBAL FATAL]', msg, ctx),
      child: () => createGlobalLogger(),
    } as Logger;
  }
};

// Export getters to create loggers on demand
export const getAuthLogger = () => createAuthLogger();
export const getDbLogger = () => createDbLogger();
export const getApiLogger = () => createApiLogger();
export const getLogger = () => createGlobalLogger();

// Error logging helper
export function logError(error: unknown, context?: Record<string, any>): void {
  try {
    const errorInfo = {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    };

    getLogger().error({ ...errorInfo }, 'Unhandled error occurred');
  } catch (loggerError) {
    console.warn('Failed to log error:', loggerError);
    console.error('Original error:', error);
  }
}

// tRPC error logging helper
export function logTRPCError(error: TRPCError, context?: Record<string, any>): void {
  try {
    getLogger().error({
      code: error.code,
      message: error.message,
      cause: error.cause,
      ...context,
    }, 'tRPC Error');
  } catch (loggerError) {
    console.warn('Failed to log tRPC error:', loggerError);
    console.error('Original tRPC error:', error);
  }
}

// Utility function to create contextual loggers
export function createComponentLogger(component: string, context?: Record<string, any>): Logger {
  try {
    const { createLogger } = require('@fastbuild/logger');
    return createLogger({ component, ...context });
  } catch (error) {
    console.warn('Failed to create component logger:', error);
    // Return a simple console logger fallback
    return {
      info: (msg: any, ctx?: any) => console.log(`[${component.toUpperCase()} INFO]`, msg, ctx),
      warn: (msg: any, ctx?: any) => console.warn(`[${component.toUpperCase()} WARN]`, msg, ctx),
      error: (msg: any, ctx?: any) => console.error(`[${component.toUpperCase()} ERROR]`, msg, ctx),
      debug: (msg: any, ctx?: any) => console.debug(`[${component.toUpperCase()} DEBUG]`, msg, ctx),
      fatal: (msg: any, ctx?: any) => console.error(`[${component.toUpperCase()} FATAL]`, msg, ctx),
      child: () => createComponentLogger(component, context),
    } as Logger;
  }
}