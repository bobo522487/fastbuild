import { initializeMonitoring } from './monitoring';

// Environment-based monitoring configuration
export function setupMonitoring() {
  const provider = process.env.MONITORING_PROVIDER || 'none';
  const apiKey = process.env.MONITORING_API_KEY;

  const config = {
    provider: provider as 'datadog' | 'newrelic' | 'none',
    apiKey,
    enableTracing: process.env.ENABLE_TRACING === 'true',
    sampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
  };

  initializeMonitoring(config);
}

// Export configuration helpers
export const monitoringConfig = {
  // Datadog configuration
  datadog: {
    apiKey: process.env.DATADOG_API_KEY,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    service: process.env.DATADOG_SERVICE || process.env.npm_package_name || 'unknown-service',
    env: process.env.DATADOG_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DATADOG_VERSION || process.env.npm_package_version || '1.0.0',
  },

  // New Relic configuration
  newrelic: {
    apiKey: process.env.NEW_RELIC_API_KEY,
    appName: process.env.NEW_RELIC_APP_NAME || process.env.npm_package_name || 'unknown-service',
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    enable: process.env.NEW_RELIC_ENABLED === 'true',
  },

  // General monitoring settings
  general: {
    enableTracing: process.env.ENABLE_TRACING === 'true',
    tracingSampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
    enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
  },
};

// Environment variable validation
export function validateMonitoringConfig() {
  const required = {
    datadog: ['DATADOG_API_KEY'],
    newrelic: ['NEW_RELIC_LICENSE_KEY'],
  };

  const provider = process.env.MONITORING_PROVIDER;
  if (provider && provider !== 'none') {
    const missing = required[provider as keyof typeof required] || [];
    const missingVars = missing.filter(
      envVar => !process.env[envVar]
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for ${provider}: ${missingVars.join(', ')}`
      );
    }
  }
}

// Initialize monitoring on module load
if (typeof window === 'undefined') { // Server-side only
  try {
    validateMonitoringConfig();
    setupMonitoring();
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
    // Don't crash the app, just continue without monitoring
  }
}