import { createLogger } from './index';

// Log retention policy interface
export interface RetentionPolicy {
  environment: string;
  maxAgeDays: number;
  maxSizeGB?: number;
  compressionEnabled: boolean;
  archiveEnabled: boolean;
  archiveAfterDays: number;
  deleteAfterDays: number;
  logLevels: {
    debug: number; // days to keep
    info: number;
    warn: number;
    error: number;
  };
}

// Default retention policies for different environments
const defaultRetentionPolicies: Record<string, RetentionPolicy> = {
  development: {
    environment: 'development',
    maxAgeDays: 7, // Keep logs for 7 days in dev
    compressionEnabled: false,
    archiveEnabled: false,
    archiveAfterDays: 0,
    deleteAfterDays: 7,
    logLevels: {
      debug: 3,
      info: 7,
      warn: 7,
      error: 30, // Keep errors longer even in dev
    },
  },
  staging: {
    environment: 'staging',
    maxAgeDays: 30,
    compressionEnabled: true,
    archiveEnabled: true,
    archiveAfterDays: 7,
    deleteAfterDays: 90,
    logLevels: {
      debug: 7,
      info: 30,
      warn: 60,
      error: 180,
    },
  },
  production: {
    environment: 'production',
    maxAgeDays: 365, // Keep logs for 1 year
    maxSizeGB: 100, // 100GB max storage
    compressionEnabled: true,
    archiveEnabled: true,
    archiveAfterDays: 30,
    deleteAfterDays: 1095, // 3 years for compliance
    logLevels: {
      debug: 30,
      info: 90,
      warn: 180,
      error: 1095, // Keep errors for 3 years
    },
  },
};

// Log entry interface for retention management
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
  component?: string;
  size: number; // in bytes
}

// Log retention manager
export class LogRetentionManager {
  private logger: ReturnType<typeof createLogger>;
  private policy: RetentionPolicy;
  private storageMetrics: {
    totalSize: number;
    entryCount: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  };

  constructor(policy?: Partial<RetentionPolicy>) {
    this.logger = createLogger({ component: 'log-retention' });
    const env = process.env.NODE_ENV || 'development';

    // Get base policy with fallback to development
    const basePolicy = defaultRetentionPolicies[env] || defaultRetentionPolicies.development;

    // Ensure all required fields have proper default values
    this.policy = {
      ...basePolicy!,
      environment: env,
      maxAgeDays: policy?.maxAgeDays ?? basePolicy!.maxAgeDays,
      compressionEnabled: policy?.compressionEnabled ?? basePolicy!.compressionEnabled,
      archiveEnabled: policy?.archiveEnabled ?? basePolicy!.archiveEnabled,
      archiveAfterDays: policy?.archiveAfterDays ?? basePolicy!.archiveAfterDays,
      deleteAfterDays: policy?.deleteAfterDays ?? basePolicy!.deleteAfterDays,
      logLevels: policy?.logLevels ?? basePolicy!.logLevels,
      maxSizeGB: policy?.maxSizeGB ?? basePolicy!.maxSizeGB,
    };

    this.storageMetrics = {
      totalSize: 0,
      entryCount: 0,
    };
  }

  // Check if a log entry should be kept based on retention policy
  shouldKeepLog(entry: LogEntry): boolean {
    const entryDate = new Date(entry.timestamp);
    const now = new Date();
    const daysSinceEntry = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

    // Check age-based retention
    if (daysSinceEntry > this.policy.maxAgeDays) {
      return false;
    }

    // Check level-based retention
    const retentionDays = this.policy.logLevels[entry.level];
    if (daysSinceEntry > retentionDays) {
      return false;
    }

    return true;
  }

  // Check if a log entry should be archived
  shouldArchiveLog(entry: LogEntry): boolean {
    if (!this.policy.archiveEnabled) {
      return false;
    }

    const entryDate = new Date(entry.timestamp);
    const now = new Date();
    const daysSinceEntry = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceEntry > this.policy.archiveAfterDays;
  }

  // Get retention policy
  getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  // Update retention policy
  updatePolicy(updates: Partial<RetentionPolicy>) {
    this.policy = {
      ...this.policy,
      ...updates,
    };

    this.logger.info({
      environment: this.policy.environment,
      maxAgeDays: this.policy.maxAgeDays,
      compressionEnabled: this.policy.compressionEnabled,
    }, 'Log retention policy updated');
  }

  // Simulate log cleanup (in real implementation, this would interact with storage)
  async cleanupOldLogs(): Promise<{
    deletedCount: number;
    deletedSize: number;
    archivedCount: number;
    archivedSize: number;
  }> {
    this.logger.info('Starting log cleanup process');

    // In a real implementation, this would:
    // 1. Query log storage for old entries
    // 2. Delete entries that exceed retention policy
    // 3. Archive entries that should be archived
    // 4. Update storage metrics

    const result = {
      deletedCount: 0,
      deletedSize: 0,
      archivedCount: 0,
      archivedSize: 0,
    };

    // Simulate some cleanup activity
    if (this.policy.environment === 'production') {
      result.deletedCount = Math.floor(Math.random() * 1000);
      result.deletedSize = result.deletedCount * 1024; // Average 1KB per log
      result.archivedCount = Math.floor(Math.random() * 500);
      result.archivedSize = result.archivedCount * 1024;
    }

    this.logger.info({
      deletedCount: result.deletedCount,
      deletedSize: result.deletedSize,
      archivedCount: result.archivedCount,
      archivedSize: result.archivedSize,
    }, 'Log cleanup completed');

    return result;
  }

  // Get storage usage statistics
  getStorageMetrics() {
    return {
      ...this.storageMetrics,
      policy: this.policy,
      usagePercentage: this.policy.maxSizeGB ?
        (this.storageMetrics.totalSize / (this.policy.maxSizeGB * 1024 * 1024 * 1024)) * 100 :
        undefined,
    };
  }

  // Check if storage is approaching limits
  isStorageNearLimit(): boolean {
    if (!this.policy.maxSizeGB) {
      return false;
    }

    const maxSizeBytes = this.policy.maxSizeGB * 1024 * 1024 * 1024;
    const usagePercentage = (this.storageMetrics.totalSize / maxSizeBytes) * 100;

    return usagePercentage > 80; // Alert at 80% capacity
  }

  // Generate retention report
  generateRetentionReport() {
    const now = new Date();
    const report = {
      generatedAt: now.toISOString(),
      policy: this.policy,
      metrics: this.getStorageMetrics(),
      recommendations: [] as string[],
    };

    // Generate recommendations based on current state
    if (this.isStorageNearLimit()) {
      report.recommendations.push('Storage usage is approaching limits. Consider adjusting retention policy or increasing storage.');
    }

    if (this.policy.maxAgeDays > 365 && this.policy.environment === 'development') {
      report.recommendations.push('Consider reducing log retention for development environment.');
    }

    if (!this.policy.compressionEnabled && this.policy.environment === 'production') {
      report.recommendations.push('Enable log compression to reduce storage costs.');
    }

    return report;
  }
}

// Global retention manager instance
export const logRetentionManager = new LogRetentionManager();

// Environment-specific retention configuration
export function configureRetentionFromEnvironment() {
  const config: Partial<RetentionPolicy> = {};

  // Override with environment variables
  if (process.env.LOG_MAX_AGE_DAYS) {
    config.maxAgeDays = parseInt(process.env.LOG_MAX_AGE_DAYS, 10);
  }

  if (process.env.LOG_MAX_SIZE_GB) {
    config.maxSizeGB = parseInt(process.env.LOG_MAX_SIZE_GB, 10);
  }

  if (process.env.LOG_COMPRESSION_ENABLED) {
    config.compressionEnabled = process.env.LOG_COMPRESSION_ENABLED === 'true';
  }

  if (process.env.LOG_ARCHIVE_ENABLED) {
    config.archiveEnabled = process.env.LOG_ARCHIVE_ENABLED === 'true';
  }

  if (process.env.LOG_ARCHIVE_AFTER_DAYS) {
    config.archiveAfterDays = parseInt(process.env.LOG_ARCHIVE_AFTER_DAYS, 10);
  }

  if (process.env.LOG_DELETE_AFTER_DAYS) {
    config.deleteAfterDays = parseInt(process.env.LOG_DELETE_AFTER_DAYS, 10);
  }

  logRetentionManager.updatePolicy(config);
}

// Schedule automatic cleanup
export function scheduleLogCleanup() {
  const cleanupInterval = 24 * 60 * 60 * 1000; // Run daily
  const logger = createLogger({ component: 'log-cleanup-scheduler' });

  setInterval(async () => {
    try {
      await logRetentionManager.cleanupOldLogs();

      // Check if storage is near limits
      if (logRetentionManager.isStorageNearLimit()) {
        logger.warn(logRetentionManager.getStorageMetrics(), 'Log storage is approaching limits');
      }
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to execute scheduled log cleanup');
    }
  }, cleanupInterval);

  logger.info({
    intervalMs: cleanupInterval,
    nextRun: new Date(Date.now() + cleanupInterval).toISOString(),
  }, 'Scheduled log cleanup configured');
}

// Initialize retention management
if (typeof window === 'undefined') { // Server-side only
  try {
    configureRetentionFromEnvironment();

    // Schedule cleanup if in production or staging
    if (['production', 'staging'].includes(process.env.NODE_ENV || '')) {
      scheduleLogCleanup();
    }
  } catch (error) {
    console.error('Failed to initialize log retention management:', error);
  }
}