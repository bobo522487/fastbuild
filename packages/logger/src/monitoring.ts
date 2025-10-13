import { createLogger } from '@acme/logger';

// Monitoring configuration interface
interface MonitoringConfig {
  provider: 'datadog' | 'newrelic' | 'none';
  apiKey?: string;
  serviceName: string;
  environment: string;
  version?: string;
  enableTracing: boolean;
  sampleRate: number;
}

// Default monitoring configuration
const defaultConfig: MonitoringConfig = {
  provider: 'none',
  serviceName: process.env.npm_package_name || 'unknown-service',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
  enableTracing: process.env.NODE_ENV === 'production',
  sampleRate: 0.1, // 10% sampling rate
};

// Initialize monitoring based on environment
export function initializeMonitoring(config: Partial<MonitoringConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const logger = createLogger({ component: 'monitoring' });

  if (finalConfig.provider === 'none') {
    logger.info('Monitoring disabled');
    return;
  }

  try {
    switch (finalConfig.provider) {
      case 'datadog':
        initializeDatadog(finalConfig);
        break;
      case 'newrelic':
        initializeNewRelic(finalConfig);
        break;
    }

    logger.info({
      provider: finalConfig.provider,
      serviceName: finalConfig.serviceName,
      environment: finalConfig.environment,
      enableTracing: finalConfig.enableTracing,
    }, 'Monitoring initialized successfully');

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      provider: finalConfig.provider,
    }, 'Failed to initialize monitoring');
  }
}

// Initialize Datadog monitoring
function initializeDatadog(config: MonitoringConfig) {
  if (!config.apiKey) {
    throw new Error('Datadog API key is required');
  }

  // This would typically be done via environment variables and proper SDK
  // For now, we'll simulate the initialization
  const logger = createLogger({ component: 'datadog' });

  logger.info({
    serviceName: config.serviceName,
    environment: config.environment,
    enableTracing: config.enableTracing,
    sampleRate: config.sampleRate,
  }, 'Datadog monitoring configured');

  // In a real implementation, you would:
  // 1. Install @datadog/browser-rum and @datadog/browser-logs for frontend
  // 2. Install dd-trace for backend
  // 3. Configure proper APM and log forwarding
}

// Initialize New Relic monitoring
function initializeNewRelic(config: MonitoringConfig) {
  if (!config.apiKey) {
    throw new Error('New Relic API key is required');
  }

  const logger = createLogger({ component: 'newrelic' });

  logger.info({
    serviceName: config.serviceName,
    environment: config.environment,
    enableTracing: config.enableTracing,
    sampleRate: config.sampleRate,
  }, 'New Relic monitoring configured');

  // In a real implementation, you would:
  // 1. Install newrelic for Node.js backend
  // 2. Install @newrelic/browser for frontend
  // 3. Configure proper APM and log forwarding
}

// Custom metrics tracking
export class MetricsCollector {
  private logger: ReturnType<typeof createLogger>;
  private metrics: Map<string, number[]> = new Map();

  constructor(component: string) {
    this.logger = createLogger({ component: 'metrics' });
  }

  // Record a metric value
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(value);

    this.logger.debug({
      metric: name,
      value,
      tags,
      count: this.metrics.get(name)!.length,
    }, 'Metric recorded');
  }

  // Get metric statistics
  getMetricStats(name: string) {
    const values = this.metrics.get(name) || [];

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
    this.logger.debug({}, 'Metrics cleared');
  }

  // Export metrics for monitoring systems
  exportMetrics() {
    const exported: Record<string, any> = {};

    for (const [name, values] of this.metrics.entries()) {
      exported[name] = this.getMetricStats(name);
    }

    return exported;
  }
}

// Health check metrics
export const healthMetrics = new MetricsCollector('health');

// Performance metrics
export const performanceMetrics = new MetricsCollector('performance');

// Database metrics
export const databaseMetrics = new MetricsCollector('database');

// API metrics
export const apiMetrics = new MetricsCollector('api');

// Utility functions for common metrics
export function recordRequestDuration(duration: number, endpoint: string, method: string) {
  performanceMetrics.recordMetric('request_duration', duration, {
    endpoint,
    method,
  });
}

export function recordDatabaseQueryDuration(duration: number, operation: string, table: string) {
  databaseMetrics.recordMetric('query_duration', duration, {
    operation,
    table,
  });
}

export function recordError(error: Error, context: string) {
  apiMetrics.recordMetric('error_count', 1, {
    error_type: error.name,
    context,
  });
}

// Get monitoring status
export function getMonitoringStatus() {
  return {
    provider: defaultConfig.provider,
    serviceName: defaultConfig.serviceName,
    environment: defaultConfig.environment,
    enableTracing: defaultConfig.enableTracing,
    metrics: {
      performance: performanceMetrics.exportMetrics(),
      database: databaseMetrics.exportMetrics(),
      api: apiMetrics.exportMetrics(),
      health: healthMetrics.exportMetrics(),
    },
  };
}