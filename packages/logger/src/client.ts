// Client-side logging utilities
// This provides a lightweight logging solution for browser environments

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  correlationId?: string;
}

class ClientLogger {
  private batch: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private endpoint: string;
  private correlationId: string;

  constructor(endpoint: string = '/api/log') {
    this.endpoint = endpoint;
    this.correlationId = this.generateCorrelationId();
    this.startBatchTimer();
  }

  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private startBatchTimer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush() {
    if (this.batch.length === 0) return;

    try {
      const logsToSend = [...this.batch];
      this.batch = [];

      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': this.correlationId,
        },
        body: JSON.stringify({ logs: logsToSend }),
        // Use keepalive for better performance
        keepalive: true,
      });
    } catch (error) {
      // If the endpoint is unavailable, fall back to console
      console.warn('Failed to send logs to server:', error);
      this.batch.forEach(log => {
        console.log(`[${log.level.toUpperCase()}]`, log.message, log.context);
      });
    }
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, any>) {
    const browserContext = typeof window !== 'undefined' ? {
      url: window.location.href,
      userAgent: navigator.userAgent,
    } : {};

    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        ...browserContext,
        timestamp: new Date().toISOString(),
        correlationId: this.correlationId,
      },
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
    };

    this.batch.push(entry);

    // Immediately flush if batch size reached
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}]`, message, context);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  // Set correlation ID (e.g., after server-side rendering)
  setCorrelationId(id: string) {
    this.correlationId = id;
  }
}

// Create singleton instance
const clientLogger = new ClientLogger();

// Export for React hooks and components
export const logger = {
  info: (message: string, context?: Record<string, any>) => clientLogger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => clientLogger.warn(message, context),
  error: (message: string, context?: Record<string, any>) => clientLogger.error(message, context),
  debug: (message: string, context?: Record<string, any>) => clientLogger.debug(message, context),
  setCorrelationId: (id: string) => clientLogger.setCorrelationId(id),
};

// React hook for logging
export const useLogger = () => {
  return logger;
};

// Error boundary utility
export const logReactError = (error: Error, errorInfo: any) => {
  logger.error('React error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo.componentStack,
  });
};

// Performance monitoring
export const logPerformance = (operation: string, startTime: number, context?: Record<string, any>) => {
  const duration = Date.now() - startTime;
  logger.info('Performance metric', {
    operation,
    duration,
    ...context,
  });
};

// Export types
export type { LogEntry };
export type ClientLoggerInstance = typeof clientLogger;