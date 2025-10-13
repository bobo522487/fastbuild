import { createLogger, generateCorrelationId } from './index';

// Alert severity levels
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Alert types
export enum AlertType {
  ERROR_RATE = 'error_rate',
  RESPONSE_TIME = 'response_time',
  DATABASE_SLOW_QUERY = 'database_slow_query',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  SECURITY = 'security',
  BUSINESS = 'business',
}

// Alert interface
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  context: Record<string, any>;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolutionNote?: string;
}

// Alert rule interface
export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  message: string;
  enabled: boolean;
  cooldownPeriod: number; // in milliseconds
}

// Alert manager class
export class AlertManager {
  private logger: ReturnType<typeof createLogger>;
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private alertCallbacks: ((alert: Alert) => void)[] = [];

  constructor() {
    this.logger = createLogger({ component: 'alert-manager' });
    this.setupDefaultRules();
  }

  // Add alert callback (for webhook, email, Slack, etc.)
  addAlertCallback(callback: (alert: Alert) => void) {
    this.alertCallbacks.push(callback);
  }

  // Create a new alert
  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    description: string,
    context: Record<string, any> = {}
  ): Alert {
    const alert: Alert = {
      id: generateCorrelationId(),
      type,
      severity,
      title,
      description,
      context,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.set(alert.id, alert);

    this.logger.warn({
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
    }, 'New alert created');

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error.message : String(error),
          alertId: alert.id,
        }, 'Failed to execute alert callback');
      }
    });

    return alert;
  }

  // Resolve an alert
  resolveAlert(alertId: string, resolutionNote?: string) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    alert.resolutionNote = resolutionNote;

    this.logger.info({
      alertId: alert.id,
      resolutionNote,
      duration: alert.resolvedAt ?
        new Date(alert.resolvedAt).getTime() - new Date(alert.timestamp).getTime() : 0,
    }, 'Alert resolved');
  }

  // Add alert rule
  addAlertRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
    this.logger.info({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
    }, 'Alert rule added');
  }

  // Remove alert rule
  removeAlertRule(ruleId: string) {
    this.rules.delete(ruleId);
    this.logger.info({ ruleId }, 'Alert rule removed');
  }

  // Evaluate all rules
  evaluateRules(data: Record<string, any> = {}) {
    const now = Date.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      const lastTriggered = this.lastTriggered.get(rule.id) || 0;
      if (now - lastTriggered < rule.cooldownPeriod) {
        continue;
      }

      try {
        if (rule.condition(data)) {
          this.createAlert(
            rule.type,
            rule.severity,
            rule.name,
            rule.message,
            {
              ...data,
              ruleId: rule.id,
            }
          );

          this.lastTriggered.set(rule.id, now);
        }
      } catch (error) {
        this.logger.error({
          error: error instanceof Error ? error.message : String(error),
          ruleId: rule.id,
        }, 'Failed to evaluate alert rule');
      }
    }
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Get alert history
  getAlertHistory(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Get alert statistics
  getAlertStats() {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(alert => !alert.resolved);

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      resolved: allAlerts.length - activeAlerts.length,
      byType: this.groupAlertsByType(allAlerts),
      bySeverity: this.groupAlertsBySeverity(allAlerts),
    };
  }

  private groupAlertsByType(alerts: Alert[]) {
    const groups: Record<AlertType, number> = {
      [AlertType.ERROR_RATE]: 0,
      [AlertType.RESPONSE_TIME]: 0,
      [AlertType.DATABASE_SLOW_QUERY]: 0,
      [AlertType.MEMORY_USAGE]: 0,
      [AlertType.CPU_USAGE]: 0,
      [AlertType.SECURITY]: 0,
      [AlertType.BUSINESS]: 0,
    };

    alerts.forEach(alert => {
      groups[alert.type]++;
    });

    return groups;
  }

  private groupAlertsBySeverity(alerts: Alert[]) {
    const groups: Record<AlertSeverity, number> = {
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    alerts.forEach(alert => {
      groups[alert.severity]++;
    });

    return groups;
  }

  // Setup default alert rules
  private setupDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        type: AlertType.ERROR_RATE,
        condition: (data) => {
          const errorRate = data.errorRate || 0;
          return errorRate > 0.05; // 5% error rate
        },
        severity: AlertSeverity.HIGH,
        message: 'Error rate exceeds 5%',
        enabled: true,
        cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'response-time-slow',
        name: 'Slow Response Time',
        type: AlertType.RESPONSE_TIME,
        condition: (data) => {
          const avgResponseTime = data.avgResponseTime || 0;
          return avgResponseTime > 2000; // 2 seconds
        },
        severity: AlertSeverity.MEDIUM,
        message: 'Average response time exceeds 2 seconds',
        enabled: true,
        cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'database-slow-query',
        name: 'Slow Database Query',
        type: AlertType.DATABASE_SLOW_QUERY,
        condition: (data) => {
          const slowQueryCount = data.slowQueryCount || 0;
          return slowQueryCount > 10; // More than 10 slow queries
        },
        severity: AlertSeverity.MEDIUM,
        message: 'High number of slow database queries detected',
        enabled: true,
        cooldownPeriod: 10 * 60 * 1000, // 10 minutes
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        type: AlertType.MEMORY_USAGE,
        condition: (data) => {
          const memoryUsage = data.memoryUsage || 0;
          return memoryUsage > 0.9; // 90% memory usage
        },
        severity: AlertSeverity.HIGH,
        message: 'Memory usage exceeds 90%',
        enabled: true,
        cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'security-breach',
        name: 'Security Breach Detected',
        type: AlertType.SECURITY,
        condition: (data) => {
          return data.securityEvent === true;
        },
        severity: AlertSeverity.CRITICAL,
        message: 'Potential security breach detected',
        enabled: true,
        cooldownPeriod: 1 * 60 * 1000, // 1 minute
      },
    ];

    defaultRules.forEach(rule => {
      this.addAlertRule(rule);
    });
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();

// Utility functions for common alert scenarios
export function alertOnError(error: Error, context: Record<string, any> = {}) {
  alertManager.createAlert(
    AlertType.ERROR_RATE,
    AlertSeverity.HIGH,
    'Application Error',
    error.message,
    {
      errorName: error.name,
      stack: error.stack,
      ...context,
    }
  );
}

export function alertOnSlowOperation(
  operation: string,
  duration: number,
  threshold: number,
  context: Record<string, any> = {}
) {
  if (duration > threshold) {
    alertManager.createAlert(
      AlertType.RESPONSE_TIME,
      AlertSeverity.MEDIUM,
      'Slow Operation Detected',
      `${operation} took ${duration}ms (threshold: ${threshold}ms)`,
      {
        operation,
        duration,
        threshold,
        ...context,
      }
    );
  }
}

export function alertOnSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: AlertSeverity = AlertSeverity.CRITICAL
) {
  alertManager.createAlert(
    AlertType.SECURITY,
    severity,
    `Security Event: ${event}`,
    `Security event detected: ${event}`,
    {
      event,
      ...details,
    }
  );
}