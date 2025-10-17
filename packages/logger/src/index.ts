// Browser environment detection - more robust check
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Create a minimal browser logger that doesn't require any external dependencies
const createBrowserLogger = (level: string = 'info') => {
  const shouldLog = (msgLevel: string) => {
    if (!isTest) {
      const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
      const currentIndex = levels.indexOf(level);
      const msgIndex = levels.indexOf(msgLevel);
      return msgIndex >= currentIndex;
    }
    return false;
  };

  return {
    level,
    child: (context: any) => {
      const childContext = { ...context };
      return createBrowserLogger(level);
    },
    info: (msg: any, context?: any) => {
      if (shouldLog('info')) {
        console.log(`[${new Date().toISOString()}] INFO:`, msg, context);
      }
    },
    warn: (msg: any, context?: any) => {
      if (shouldLog('warn')) {
        console.warn(`[${new Date().toISOString()}] WARN:`, msg, context);
      }
    },
    error: (msg: any, context?: any) => {
      if (shouldLog('error')) {
        console.error(`[${new Date().toISOString()}] ERROR:`, msg, context);
      }
    },
    debug: (msg: any, context?: any) => {
      if (shouldLog('debug')) {
        console.debug(`[${new Date().toISOString()}] DEBUG:`, msg, context);
      }
    },
    fatal: (msg: any, context?: any) => {
      if (shouldLog('fatal')) {
        console.error(`[${new Date().toISOString()}] FATAL:`, msg, context);
      }
    }
  };
};

// Create a simple Node.js logger for fallback cases
const createSimpleNodeLogger = (level: string = 'info') => {
  const shouldLog = (msgLevel: string) => {
    if (!isTest) {
      const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
      const currentIndex = levels.indexOf(level);
      const msgIndex = levels.indexOf(msgLevel);
      return msgIndex >= currentIndex;
    }
    return false;
  };

  return {
    level,
    child: (context: any) => {
      const childContext = { ...context };
      return createSimpleNodeLogger(level);
    },
    info: (msg: any, context?: any) => {
      if (shouldLog('info')) {
        console.log(`[${new Date().toISOString()}] INFO:`, msg, context);
      }
    },
    warn: (msg: any, context?: any) => {
      if (shouldLog('warn')) {
        console.warn(`[${new Date().toISOString()}] WARN:`, msg, context);
      }
    },
    error: (msg: any, context?: any) => {
      if (shouldLog('error')) {
        console.error(`[${new Date().toISOString()}] ERROR:`, msg, context);
      }
    },
    debug: (msg: any, context?: any) => {
      if (shouldLog('debug')) {
        console.debug(`[${new Date().toISOString()}] DEBUG:`, msg, context);
      }
    },
    fatal: (msg: any, context?: any) => {
      if (shouldLog('fatal')) {
        console.error(`[${new Date().toISOString()}] FATAL:`, msg, context);
      }
    }
  };
};

// Create logger instance based on environment
let logger: any;

if (isBrowser || !isNode) {
  // Browser environment - use simple console logger
  logger = createBrowserLogger(process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'));
} else {
  // Node.js environment - try to use pino, fallback to simple logger
  try {
    // Only attempt to require pino in Node.js environment
    const pino = eval('require')('pino');
    const pretty = eval('require')('pino-pretty');

    const prettyStream = pretty({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '{msg} {context}'
    });

    logger = pino(
      {
        level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        formatters: {
          level: (label: string) => {
            const levels = {
              fatal: 60,
              error: 50,
              warn: 40,
              info: 30,
              debug: 20,
              trace: 10
            };
            return { level: levels[label as keyof typeof levels] };
          },
          bindings: (bindings: any) => {
            return {
              pid: bindings.pid,
              hostname: bindings.hostname,
              service: process.env.npm_package_name || 'unknown',
              environment: process.env.NODE_ENV || 'unknown'
            };
          }
        },
        enabled: !isTest
      },
      isDevelopment ? prettyStream : undefined
    );
  } catch (error) {
    console.warn('Failed to import pino, falling back to console logging');
    logger = createSimpleNodeLogger(process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'));
  }
}

// Child logger factory with context
export const createLogger = (context: Record<string, any> = {}) => {
  return logger.child({
    ...context,
    correlationId: context.correlationId || generateCorrelationId()
  });
};

// Generate correlation ID
export const generateCorrelationId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

// HTTP request logging middleware factory
export const httpRequestLogger = (options: {
  ignorePaths?: string[];
  ignoreMethods?: string[];
} = {}) => {
  const { ignorePaths = ['/health'], ignoreMethods = ['GET'] } = options;

  return (req: any, res: any, next: () => void) => {
    const start = Date.now();
    const path = req.path || req.url;
    const method = req.method;

    // Skip logging for ignored paths and methods
    if (ignorePaths.includes(path) || ignoreMethods.includes(method)) {
      return next();
    }

    const correlationId = req.headers['x-correlation-id'] ||
                         req.headers['x-request-id'] ||
                         generateCorrelationId();

    // Add correlation ID to request headers for downstream use
    req.headers['x-correlation-id'] = correlationId;

    const requestLogger = createLogger({
      correlationId,
      type: 'http',
      method,
      path,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress
    });

    requestLogger.info({}, 'Request started');

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding?: any) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      requestLogger.info({ statusCode, duration, contentLength: res.get('content-length') }, 'Request completed');

      originalEnd.call(res, chunk, encoding);
    };

    next();
  };
};

// Database query logger
export const dbQueryLogger = (query: any, params: any, duration: number) => {
  const logger = createLogger({
    type: 'database',
    query: query.substring(0, 200), // Truncate long queries
    paramsCount: params?.length || 0,
    duration
  });

  if (duration > 1000) { // Log slow queries as warnings
    logger.warn({}, 'Slow database query');
  } else {
    logger.debug({}, 'Database query executed');
  }
};

// Error logger with context
export const logError = (error: Error, context: Record<string, any> = {}) => {
  const errorLogger = createLogger({
    ...context,
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  errorLogger.error({}, 'Application error occurred');
};

// Performance logger
export const logPerformance = (operation: string, duration: number, context: Record<string, any> = {}) => {
  const perfLogger = createLogger({
    ...context,
    type: 'performance',
    operation,
    duration
  });

  if (duration > 5000) { // 5 seconds threshold
    perfLogger.warn({}, 'Slow operation detected');
  } else {
    perfLogger.info({}, 'Operation completed');
  }
};

// Export monitoring utilities
export * from './monitoring';

// Export alert utilities
export * from './alerts';

// Export retention utilities
export * from './retention';

// Default export
export default logger;

// Export types
export type Logger = typeof logger;
export type LoggerContext = Record<string, any>;