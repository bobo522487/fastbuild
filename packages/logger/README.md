# @fastbuild/logger - Structured Logging System

A comprehensive, production-ready structured logging system built with Pino for T3 Turbo projects. Provides both server-side and client-side logging with monitoring integration, alert management, and log retention policies.

## Features

- 🚀 **High Performance** - Powered by Pino, one of the fastest JSON loggers for Node.js
- 🌐 **Universal** - Works seamlessly in both server and client environments
- 📊 **Structured JSON** - Consistent, machine-readable log format for easy parsing
- 🔍 **Request Tracing** - Automatic correlation ID tracking across services
- 📈 **Performance Monitoring** - Built-in slow operation detection and metrics
- 🚨 **Alert Management** - Configurable alerts with multiple notification channels
- 🗄️ **Log Retention** - Environment-based retention policies with automatic cleanup
- 🔌 **Monitoring Integration** - Ready for Datadog, New Relic, and other observability platforms
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive type definitions

## Installation

The package is already included in your T3 Turbo workspace. No additional installation required.

## Quick Start

### Basic Usage

```typescript
import { createLogger } from '@fastbuild/logger';

// Create a logger with context
const logger = createLogger({
  component: 'user-service',
  version: '1.0.0'
});

// Log messages with structured data
logger.info({ userId: '123', action: 'login' }, 'User logged in successfully');
logger.warn({ threshold: 1000, duration: 1500 }, 'Slow API call detected');
logger.error({
  error: 'Database connection failed',
  stack: 'Error: Connection timeout...',
  code: 'DB_CONN_ERROR'
}, 'Database operation failed');
```

### Server-Side Features

#### Performance Monitoring

```typescript
import { performanceLogger } from '@fastbuild/logger';

// Automatic performance logging
performanceLogger.time('database-query', async () => {
  // Your database operation here
  const result = await db.query('SELECT * FROM users');
  return result;
});
```

#### HTTP Request Logging

```typescript
import { httpRequestLogger, httpResponseLogger } from '@fastbuild/logger';

// Log HTTP requests
httpRequestLogger({
  method: 'GET',
  url: '/api/users',
  headers: { 'user-agent': 'curl/7.68.0' },
  ip: '192.168.1.100'
});

// Log HTTP responses
httpResponseLogger({
  statusCode: 200,
  duration: 45,
  responseSize: 1024
});
```

#### Error Handling

```typescript
import { logError } from '@fastbuild/logger';

try {
  // Your operation that might fail
  await riskyOperation();
} catch (error) {
  logError(error, {
    operation: 'riskyOperation',
    userId: '123',
    context: 'user-profile-update'
  });
}
```

### Client-Side Features

#### Browser Logging

```typescript
import { createBrowserLogger } from '@fastbuild/logger/client';

// Create browser logger with batching
const logger = createBrowserLogger({
  component: 'checkout-page',
  batchInterval: 5000, // Send logs every 5 seconds
  maxBatchSize: 10    // Or when 10 logs are accumulated
});

// Log user interactions
logger.info({
  element: 'checkout-button',
  action: 'click'
}, 'User initiated checkout');

// Log errors with full context
logger.error({
  error: 'Payment failed',
  userId: '123',
  cartValue: 99.99,
  paymentMethod: 'stripe'
}, 'Checkout process failed');
```

#### React Integration

```typescript
import { useLogger, LoggerErrorBoundary } from '@fastbuild/logger/client';

// Use logger in React components
function MyComponent() {
  const logger = useLogger({ component: 'MyComponent' });

  const handleClick = () => {
    logger.info({ button: 'submit' }, 'Form submitted');
  };

  return (
    <LoggerErrorBoundary logger={logger}>
      <button onClick={handleClick}>Submit</button>
    </LoggerErrorBoundary>
  );
}
```

### Database Integration

#### Prisma Middleware (Automatic)

The logging system automatically integrates with Prisma when you use the configured database client:

```typescript
import { prisma } from '@fastbuild/db';

// All Prisma operations are automatically logged with:
// - Query execution time
// - Slow query detection
// - Error logging
// - Performance metrics

const users = await prisma.user.findMany({
  where: { active: true }
});
// Automatically logs: "Prisma query executed" with duration and context
```

#### Manual Database Logging

```typescript
import {
  logDatabaseHealth,
  createTransactionLogger,
  logMigration
} from '@fastbuild/logger';

// Check database health
await logDatabaseHealth(prisma);

// Log transactions
const transactionLogger = createTransactionLogger('user-creation');
transactionLogger.start();
try {
  await prisma.user.create({ data: userData });
  transactionLogger.commit();
} catch (error) {
  transactionLogger.rollback(error);
}

// Log migrations
logMigration({
  name: 'add-user-preferences',
  startTime: Date.now(),
  status: 'started'
});
```

### tRPC Integration

#### Automatic Middleware

Add logging middleware to your tRPC procedures:

```typescript
import { logging } from '@fastbuild/api/middleware/logger';
import { publicProcedure, protectedProcedure } from '../trpc';

// Apply logging middleware
const loggedPublicProcedure = publicProcedure.use(logging());
const loggedProtectedProcedure = protectedProcedure.use(logging());

// All procedures will automatically log:
// - Request details
// - Response times
// - Authentication status
// - Error information
// - Performance metrics
```

#### Manual tRPC Logging

```typescript
import { apiLogger, logTRPCError } from '@fastbuild/api/utils/logger';

// Manual logging in procedures
export const updateUser = protectedProcedure
  .input(UpdateUserSchema)
  .mutation(async ({ ctx, input }) => {
    apiLogger.info({
      userId: ctx.user.id,
      updates: Object.keys(input)
    }, 'User update initiated');

    try {
      const updatedUser = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input
      });

      apiLogger.info({
        userId: ctx.user.id,
        success: true
      }, 'User updated successfully');

      return updatedUser;
    } catch (error) {
      logTRPCError(error, { userId: ctx.user.id });
      throw error;
    }
  });
```

## Monitoring Integration

### Datadog Integration

```typescript
import {
  createDatadogLogger,
  DatadogLoggerConfig
} from '@fastbuild/logger/monitoring';

const config: DatadogLoggerConfig = {
  apiKey: process.env.DATADOG_API_KEY,
  service: 'my-app',
  env: process.env.NODE_ENV,
  hostname: 'web-01'
};

const datadogLogger = createDatadogLogger(config);

// Logs will be automatically sent to Datadog
datadogLogger.info({ metric: 'user.login' }, 'User login event');
```

### New Relic Integration

```typescript
import {
  createNewRelicLogger,
  NewRelicLoggerConfig
} from '@fastbuild/logger/monitoring';

const config: NewRelicLoggerConfig = {
  licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
  appName: 'my-app',
  environment: process.env.NODE_ENV
};

const newRelicLogger = createNewRelicLogger(config);
```

## Alert Management

### Creating Alerts

```typescript
import {
  createAlertManager,
  AlertRule,
  AlertSeverity
} from '@fastbuild/logger/alerts';

const alertManager = createAlertManager();

// Define custom alert rules
const errorRateRule: AlertRule = {
  id: 'high-error-rate',
  name: 'High Error Rate',
  condition: {
    field: 'error_rate',
    operator: '>',
    threshold: 0.05, // 5%
    window: '5m'
  },
  severity: AlertSeverity.CRITICAL,
  actions: [
    {
      type: 'email',
      recipients: ['devops@example.com']
    },
    {
      type: 'slack',
      webhook: process.env.SLACK_WEBHOOK_URL
    }
  ]
};

alertManager.addRule(errorRateRule);
```

### Triggering Manual Alerts

```typescript
import { triggerAlert } from '@fastbuild/logger/alerts';

// Trigger alert for specific events
triggerAlert({
  ruleId: 'security-breach',
  message: 'Suspicious login attempt detected',
  severity: AlertSeverity.HIGH,
  data: {
    userId: '123',
    ip: '192.168.1.100',
    attempts: 5
  }
});
```

## Log Retention

### Configuration

```typescript
import {
  createLogRetentionManager,
  RetentionPolicy
} from '@fastbuild/logger/retention';

const policy: RetentionPolicy = {
  environment: 'production',
  maxAgeDays: 365,
  compressionEnabled: true,
  archiveEnabled: true,
  archiveAfterDays: 30,
  deleteAfterDays: 365,
  maxSizeGB: 50,
  logLevels: {
    error: 1095,    // 3 years for errors
    warn: 180,     // 6 months for warnings
    info: 90,      // 3 months for info
    debug: 7       // 1 week for debug
  }
};

const retentionManager = createLogRetentionManager(policy);
await retentionManager.cleanup(); // Clean old logs
```

### Automatic Cleanup

```typescript
import { startLogCleanupScheduler } from '@fastbuild/logger/retention';

// Start automatic cleanup (runs daily at 2 AM)
startLogCleanupScheduler('0 2 * * *');
```

## Configuration

### Environment Variables

```bash
# Logger Configuration
LOG_LEVEL=debug                    # Minimum log level to display
LOG_PRETTY=true                   # Enable pretty printing in development
LOG_CORRELATION_ID=true           # Enable correlation ID generation
LOG_BATCH_INTERVAL=5000           # Client log batching interval (ms)

# Monitoring Integration
DATADOG_API_KEY=your-api-key      # Datadog API key
DATADOG_SERVICE=app-name          # Datadog service name
NEW_RELIC_LICENSE_KEY=your-key   # New Relic license key

# Alert Configuration
ALERT_EMAIL_ENABLED=true          # Enable email alerts
ALERT_SLACK_WEBHOOK=your-webhook  # Slack webhook URL
ALERT_THRESHOLD_ERROR_RATE=0.05   # Error rate threshold (5%)

# Retention Policy
RETENTION_MAX_DAYS=365             # Maximum log retention days
RETENTION_MAX_SIZE_GB=50          # Maximum log storage size (GB)
RETENTION_ARCHIVE_DAYS=30         # Days before archiving logs
```

### Custom Configuration

```typescript
import { configureLogger } from '@fastbuild/logger';

configureLogger({
  level: 'info',
  pretty: process.env.NODE_ENV === 'development',
  correlationId: {
    enabled: true,
    header: 'X-Request-ID',
    generator: 'uuid'
  },
  performance: {
    slowThreshold: 1000,
    enableMetrics: true
  },
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: './logs/app.log' }
      }
    ]
  }
});
```

## Log Output Examples

### Development (Pretty Output)

```
[2024-01-15 10:30:45.123] INFO (user-service): User logged in successfully
    level: "info"
    time: 1705305045123
    component: "user-service"
    userId: "123"
    action: "login"
    correlationId: "req_123456"
    duration: 45ms

[2024-01-15 10:30:45.234] WARN (user-service): Slow API call detected
    level: "warn"
    time: 1705305045234
    component: "user-service"
    threshold: 1000
    duration: 1500
    correlationId: "req_123456"
```

### Production (JSON Output)

```json
{
  "level": 30,
  "time": 1705305045123,
  "component": "user-service",
  "userId": "123",
  "action": "login",
  "correlationId": "req_123456",
  "duration": 45,
  "msg": "User logged in successfully"
}
```

## Testing

### Unit Tests

```typescript
import { createLogger } from '@fastbuild/logger';

// Mock logger for testing
const mockLogger = createLogger({
  component: 'test',
  transport: {
    target: 'pino/test'
  }
});

// Test logging
mockLogger.info({ test: true }, 'Test message');
```

### Integration Tests

```typescript
import { createTestLogger } from '@fastbuild/logger/test';

// Create logger with test configuration
const testLogger = createTestLogger({
  silent: false,  // Set to true to suppress output
  level: 'debug'
});

// Use in your tests
test('logs user actions', () => {
  const spy = vi.spyOn(testLogger, 'info');

  testLogger.info({ action: 'click' }, 'Button clicked');

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ action: 'click' }),
    'Button clicked'
  );
});
```

## Performance Considerations

- **Batching**: Client logs are batched to minimize network requests
- **Async**: All logging operations are non-blocking
- **Levels**: Use appropriate log levels to reduce output volume
- **Sampling**: Consider sampling debug logs in high-traffic scenarios
- **Transport**: Use file streams in production for better performance

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check `LOG_LEVEL` environment variable
2. **Pretty printing not working**: Ensure `LOG_PRETTY=true` in development
3. **Correlation IDs missing**: Verify `LOG_CORRELATION_ID=true`
4. **Performance impact**: Adjust batching and sampling settings
5. **Memory usage**: Monitor log retention and cleanup processes

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Enable verbose transport logging
DEBUG=pino:* pnpm dev
```

## API Reference

### Core Functions

- `createLogger(context)` - Create a new logger instance
- `configureLogger(config)` - Configure global logger settings
- `logError(error, context)` - Log errors with context
- `performanceLogger` - Performance monitoring utilities

### Server-Side Functions

- `httpRequestLogger(data)` - Log HTTP requests
- `httpResponseLogger(data)` - Log HTTP responses
- `dbQueryLogger(query, params, duration)` - Log database queries

### Client-Side Functions

- `createBrowserLogger(config)` - Create browser-compatible logger
- `useLogger()` - React hook for component logging
- `LoggerErrorBoundary` - React error boundary with logging

### Monitoring Functions

- `createDatadogLogger(config)` - Datadog integration
- `createNewRelicLogger(config)` - New Relic integration
- `triggerAlert(alert)` - Trigger manual alerts

### Retention Functions

- `createLogRetentionManager(policy)` - Configure log retention
- `startLogCleanupScheduler(cron)` - Schedule automatic cleanup

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:
- Create an issue in the project repository
- Check the troubleshooting section above
- Review the API reference for detailed usage information