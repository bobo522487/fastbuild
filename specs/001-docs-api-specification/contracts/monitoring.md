# 系统监控 API 契约示例

**创建日期**: 2025-10-12
**功能模块**: 系统健康监控 (/sys/health/*)

## 1. 基础健康检查

### 请求契约

```http
GET /sys/health/basic
X-API-Key: your-api-key-here
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "系统状态正常",
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "version": "4.0.1",
    "uptime": 86400,
    "environment": "production",
    "region": "us-west-2",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 15,
        "connectionPool": {
          "active": 8,
          "idle": 12,
          "total": 20,
          "max": 50
        }
      },
      "cache": {
        "status": "healthy",
        "responseTime": 3,
        "hitRate": 0.95,
        "memoryUsage": "256MB"
      },
      "queue": {
        "status": "healthy",
        "pendingJobs": 0,
        "processingJobs": 2
      }
    }
  }
}
```

### 警告状态响应契约 (200 OK)

```json
{
  "success": true,
  "message": "系统运行正常，但存在性能警告",
  "data": {
    "status": "warning",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "version": "4.0.1",
    "uptime": 86400,
    "environment": "production",
    "warnings": [
      {
        "service": "database",
        "type": "HIGH_RESPONSE_TIME",
        "message": "数据库响应时间偏高",
        "currentValue": 150,
        "threshold": 100,
        "unit": "ms"
      }
    ],
    "services": {
      "database": {
        "status": "warning",
        "responseTime": 150,
        "connectionPool": {
          "active": 15,
          "idle": 5,
          "total": 20,
          "max": 50
        }
      },
      "cache": {
        "status": "healthy",
        "responseTime": 3,
        "hitRate": 0.95,
        "memoryUsage": "256MB"
      }
    }
  }
}
```

### 错误状态响应契约 (503 Service Unavailable)

```json
{
  "success": false,
  "error": "SERVICE_UNHEALTHY",
  "message": "系统服务异常",
  "data": {
    "status": "unhealthy",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "version": "4.0.1",
    "uptime": 86400,
    "errors": [
      {
        "service": "database",
        "type": "CONNECTION_FAILED",
        "message": "数据库连接失败",
        "details": "Connection timeout after 30 seconds",
        "lastHealthyAt": "2025-10-12T11:45:00.000Z"
      }
    ],
    "services": {
      "database": {
        "status": "unhealthy",
        "error": "Connection timeout"
      },
      "cache": {
        "status": "healthy",
        "responseTime": 3
      }
    }
  }
}
```

## 2. 详细健康检查

### 请求契约

```http
GET /sys/health/detailed
X-API-Key: your-api-key-here
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "系统详细状态正常",
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "version": "4.0.1",
    "uptime": 86400,
    "environment": "production",
    "region": "us-west-2",
    "deployment": {
      "version": "4.0.1",
      "deployedAt": "2025-10-11T08:00:00.000Z",
      "commit": "a1b2c3d4e5f6",
      "branch": "main"
    },
    "infrastructure": {
      "hostname": "web-server-01",
      "instanceType": "t3.large",
      "availabilityZone": "us-west-2a",
      "loadBalancer": "healthy"
    },
    "performance": {
      "responseTime": {
        "p50": 45,
        "p95": 120,
        "p99": 250
      },
      "throughput": {
        "requestsPerSecond": 1250,
        "requestsPerMinute": 75000
      },
      "errorRate": 0.001
    },
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 15,
        "connectionPool": {
          "active": 8,
          "idle": 12,
          "total": 20,
          "max": 50,
          "utilization": 0.4
        },
        "metrics": {
          "connections": 20,
          "queriesPerSecond": 350,
          "slowQueries": 2,
          "cacheHitRate": 0.98
        },
        "diskUsage": {
          "total": "100GB",
          "used": "45GB",
          "available": "55GB",
          "usagePercentage": 45
        }
      },
      "cache": {
        "status": "healthy",
        "responseTime": 3,
        "hitRate": 0.95,
        "memoryUsage": {
          "total": "1GB",
          "used": "256MB",
          "free": "768MB",
          "usagePercentage": 25
        },
        "keyCount": 125000,
        "evictions": 15
      },
      "queue": {
        "status": "healthy",
        "pendingJobs": 0,
        "processingJobs": 2,
        "completedJobs": 15420,
        "failedJobs": 3
      },
      "storage": {
        "status": "healthy",
        "responseTime": 25,
        "usage": {
          "total": "1TB",
          "used": "350GB",
          "available": "650GB",
          "usagePercentage": 35
        }
      },
      "external_apis": {
        "payment_gateway": {
          "status": "healthy",
          "responseTime": 120,
          "successRate": 0.999
        },
        "email_service": {
          "status": "healthy",
          "responseTime": 85,
          "successRate": 0.998
        }
      }
    },
    "security": {
      "authentication": "healthy",
      "authorization": "healthy",
      "rateLimiting": {
        "active": true,
        "blockedRequests": 25,
        "whitelistedIPs": 15
      }
    },
    "monitoring": {
      "alerts": {
        "active": 0,
        "critical": 0,
        "warning": 1
      },
      "logs": {
        "errorRate": 0.001,
        "warningRate": 0.005
      }
    }
  }
}
```

## 3. 系统版本信息

### 请求契约

```http
GET /sys/health/version
X-API-Key: your-api-key-here
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取版本信息成功",
  "data": {
    "application": {
      "name": "FastBuild",
      "version": "4.0.1",
      "buildNumber": "20251011-0800",
      "buildDate": "2025-10-11T08:00:00.000Z",
      "gitCommit": "a1b2c3d4e5f6789abcdef123456789",
      "gitBranch": "main",
      "environment": "production"
    },
    "dependencies": {
      "node": "18.19.0",
      "next": "15.5.4",
      "react": "19.2.0",
      "prisma": "6.17.0",
      "postgresql": "18.0"
    },
    "runtime": {
      "platform": "linux",
      "architecture": "x64",
      "uptime": 86400,
      "processId": 12345,
      "memoryUsage": {
        "rss": "256MB",
        "heapTotal": "128MB",
        "heapUsed": "95MB",
        "external": "15MB"
      }
    },
    "features": {
      "dynamicTables": true,
      "rbac": true,
      "auditLogging": true,
      "multiTenancy": true,
      "apiV4": true
    },
    "maintenance": {
      "nextScheduledMaintenance": "2025-10-15T02:00:00.000Z",
      "estimatedDuration": "30 minutes",
      "maintenanceWindow": {
        "start": "01:00",
        "end": "04:00",
        "timezone": "UTC"
      }
    }
  }
}
```

## 4. 性能指标

### 请求契约

```http
GET /sys/health/metrics?period=1h&granularity=5m
X-API-Key: your-api-key-here
```

**查询参数**:
- `period`: 时间周期 (5m, 15m, 1h, 6h, 24h, 7d)
- `granularity`: 数据粒度 (1m, 5m, 15m, 1h)
- `metrics`: 指标类型筛选 (response_time, throughput, error_rate, cpu, memory)

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取性能指标成功",
  "data": {
    "period": "1h",
    "granularity": "5m",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "metrics": {
      "response_time": {
        "unit": "milliseconds",
        "dataPoints": [
          {
            "timestamp": "2025-10-12T11:00:00.000Z",
            "p50": 42,
            "p95": 115,
            "p99": 230
          },
          {
            "timestamp": "2025-10-12T11:05:00.000Z",
            "p50": 45,
            "p95": 120,
            "p99": 250
          }
        ],
        "summary": {
          "min": 38,
          "max": 280,
          "average": 85,
          "trend": "stable"
        }
      },
      "throughput": {
        "unit": "requests_per_second",
        "dataPoints": [
          {
            "timestamp": "2025-10-12T11:00:00.000Z",
            "value": 1180
          },
          {
            "timestamp": "2025-10-12T11:05:00.000Z",
            "value": 1250
          }
        ],
        "summary": {
          "min": 980,
          "max": 1450,
          "average": 1215,
          "trend": "increasing"
        }
      },
      "error_rate": {
        "unit": "percentage",
        "dataPoints": [
          {
            "timestamp": "2025-10-12T11:00:00.000Z",
            "value": 0.08
          },
          {
            "timestamp": "2025-10-12T11:05:00.000Z",
            "value": 0.12
          }
        ],
        "summary": {
          "min": 0.05,
          "max": 0.25,
          "average": 0.11,
          "trend": "stable"
        }
      },
      "cpu": {
        "unit": "percentage",
        "dataPoints": [
          {
            "timestamp": "2025-10-12T11:00:00.000Z",
            "value": 45.2
          },
          {
            "timestamp": "2025-10-12T11:05:00.000Z",
            "value": 52.8
          }
        ],
        "summary": {
          "min": 32.1,
          "max": 68.9,
          "average": 48.5,
          "trend": "increasing"
        }
      },
      "memory": {
        "unit": "percentage",
        "dataPoints": [
          {
            "timestamp": "2025-10-12T11:00:00.000Z",
            "value": 65.4
          },
          {
            "timestamp": "2025-10-12T11:05:00.000Z",
            "value": 67.2
          }
        ],
        "summary": {
          "min": 61.8,
          "max": 71.3,
          "average": 66.8,
          "trend": "stable"
        }
      }
    },
    "alerts": [
      {
        "type": "warning",
        "metric": "cpu",
        "message": "CPU 使用率持续偏高",
        "threshold": 60,
        "currentValue": 68.9,
        "duration": "15m"
      }
    ]
  }
}
```

## 5. 服务依赖状态

### 请求契约

```http
GET /sys/health/dependencies
X-API-Key: your-api-key-here
```

### 成功响应契约 (200 OK)

```json
{
  "success": true,
  "message": "获取服务依赖状态成功",
  "data": {
    "overallStatus": "healthy",
    "timestamp": "2025-10-12T12:00:00.000Z",
    "dependencies": {
      "database": {
        "status": "healthy",
        "type": "postgresql",
        "version": "18.0",
        "endpoint": "fastbuild-db.cluster-abc123.us-west-2.rds.amazonaws.com:5432",
        "responseTime": 15,
        "lastCheck": "2025-10-12T11:59:45.000Z",
        "sslEnabled": true,
        "connectionPool": {
          "active": 8,
          "idle": 12,
          "total": 20,
          "max": 50
        },
        "metrics": {
          "connections": 20,
          "queriesPerSecond": 350,
          "slowQueries": 2,
          "cacheHitRate": 0.98
        }
      },
      "redis_cache": {
        "status": "healthy",
        "type": "redis",
        "version": "7.2.3",
        "endpoint": "fastbuild-redis.abc123.cache.amazonaws.com:6379",
        "responseTime": 3,
        "lastCheck": "2025-10-12T11:59:58.000Z",
        "clusterMode": false,
        "memoryUsage": {
          "total": "1GB",
          "used": "256MB",
          "usagePercentage": 25
        },
        "keyCount": 125000,
        "hitRate": 0.95
      },
      "object_storage": {
        "status": "healthy",
        "type": "s3",
        "region": "us-west-2",
        "bucket": "fastbuild-storage-prod",
        "responseTime": 25,
        "lastCheck": "2025-10-12T11:59:50.000Z",
        "permissions": {
          "read": true,
          "write": true,
          "delete": true
        },
        "usage": {
          "objectCount": 15420,
          "totalSize": "350GB"
        }
      },
      "email_service": {
        "status": "healthy",
        "type": "sendgrid",
        "responseTime": 85,
        "lastCheck": "2025-10-12T11:59:30.000Z",
        "apiQuota": {
          "used": 2850,
          "limit": 10000,
          "resetDate": "2025-10-13T00:00:00.000Z"
        },
        "deliveryRate": 0.998
      },
      "payment_gateway": {
        "status": "healthy",
        "type": "stripe",
        "responseTime": 120,
        "lastCheck": "2025-10-12T11:59:25.000Z",
        "webhookStatus": "active",
        "latestWebhook": "2025-10-12T11:45:00.000Z"
      },
      "cdn": {
        "status": "healthy",
        "type": "cloudfront",
        "distributionId": "E123ABCDEF456G",
        "responseTime": 45,
        "lastCheck": "2025-10-12T11:59:40.000Z",
        "cacheHitRate": 0.92,
        "edgeLocations": 12
      }
    },
    "healthChecks": [
      {
        "name": "database_connectivity",
        "status": "pass",
        "duration": "15ms",
        "timestamp": "2025-10-12T11:59:45.000Z"
      },
      {
        "name": "cache_connectivity",
        "status": "pass",
        "duration": "3ms",
        "timestamp": "2025-10-12T11:59:58.000Z"
      },
      {
        "name": "storage_permissions",
        "status": "pass",
        "duration": "25ms",
        "timestamp": "2025-10-12T11:59:50.000Z"
      }
    ]
  }
}
```

## 系统监控实现示例

### JavaScript/TypeScript 客户端

```typescript
interface HealthStatus {
  status: 'healthy' | 'warning' | 'unhealthy';
  timestamp: string;
  services: Record<string, any>;
  warnings?: Array<{
    service: string;
    type: string;
    message: string;
    currentValue: number;
    threshold: number;
    unit: string;
  }>;
  errors?: Array<{
    service: string;
    type: string;
    message: string;
    details?: string;
  }>;
}

interface PerformanceMetrics {
  period: string;
  granularity: string;
  metrics: {
    response_time: MetricSeries;
    throughput: MetricSeries;
    error_rate: MetricSeries;
    cpu: MetricSeries;
    memory: MetricSeries;
  };
  alerts: Alert[];
}

interface MetricSeries {
  unit: string;
  dataPoints: DataPoint[];
  summary: {
    min: number;
    max: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

interface DataPoint {
  timestamp: string;
  value?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

interface Alert {
  type: 'warning' | 'critical';
  metric: string;
  message: string;
  threshold: number;
  currentValue: number;
  duration: string;
}

export class SystemMonitoringClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getBasicHealth(): Promise<HealthStatus> {
    const response = await this.makeRequest('/health/basic');
    return response.data;
  }

  async getDetailedHealth(): Promise<HealthStatus> {
    const response = await this.makeRequest('/health/detailed');
    return response.data;
  }

  async getVersion(): Promise<any> {
    const response = await this.makeRequest('/health/version');
    return response.data;
  }

  async getMetrics(
    period: string = '1h',
    granularity: string = '5m',
    metrics?: string
  ): Promise<PerformanceMetrics> {
    const params = new URLSearchParams({
      period,
      granularity,
    });

    if (metrics) {
      params.append('metrics', metrics);
    }

    const response = await this.makeRequest(`/health/metrics?${params}`);
    return response.data;
  }

  async getDependencies(): Promise<any> {
    const response = await this.makeRequest('/health/dependencies');
    return response.data;
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/sys${endpoint}`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  // 健康状态监控器
  async startHealthMonitoring(
    interval: number = 60000,
    onStatusChange?: (status: HealthStatus) => void
  ): Promise<() => void> {
    let lastStatus: HealthStatus | null = null;

    const checkHealth = async () => {
      try {
        const currentStatus = await this.getBasicHealth();

        if (onStatusChange && (!lastStatus || lastStatus.status !== currentStatus.status)) {
          onStatusChange(currentStatus);
        }

        lastStatus = currentStatus;
      } catch (error) {
        console.error('健康检查失败:', error);

        if (onStatusChange) {
          onStatusChange({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {},
            errors: [{
              service: 'monitoring',
              type: 'CHECK_FAILED',
              message: '健康检查失败',
              details: error instanceof Error ? error.message : '未知错误'
            }]
          });
        }
      }
    };

    // 立即执行一次
    await checkHealth();

    // 设置定时检查
    const intervalId = setInterval(checkHealth, interval);

    // 返回清理函数
    return () => clearInterval(intervalId);
  }

  // 性能阈值监控
  async startPerformanceMonitoring(
    thresholds: {
      responseTime?: number;
      errorRate?: number;
      cpu?: number;
      memory?: number;
    },
    interval: number = 300000,
    onAlert?: (alert: Alert) => void
  ): Promise<() => void> {
    const checkPerformance = async () => {
      try {
        const metrics = await this.getMetrics('1h', '5m');

        for (const alert of metrics.alerts) {
          const isThresholdExceeded =
            (alert.metric === 'response_time' && thresholds.responseTime && alert.currentValue > thresholds.responseTime) ||
            (alert.metric === 'error_rate' && thresholds.errorRate && alert.currentValue > thresholds.errorRate) ||
            (alert.metric === 'cpu' && thresholds.cpu && alert.currentValue > thresholds.cpu) ||
            (alert.metric === 'memory' && thresholds.memory && alert.currentValue > thresholds.memory);

          if (isThresholdExceeded && onAlert) {
            onAlert(alert);
          }
        }
      } catch (error) {
        console.error('性能检查失败:', error);
      }
    };

    const intervalId = setInterval(checkPerformance, interval);

    return () => clearInterval(intervalId);
  }
}

// React Hook 示例
export const useSystemMonitoring = (apiKey: string) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () => new SystemMonitoringClient('https://api.fastbuild.dev', apiKey),
    [apiKey]
  );

  useEffect(() => {
    const loadHealthStatus = async () => {
      try {
        setLoading(true);
        const status = await client.getDetailedHealth();
        setHealthStatus(status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '健康检查失败');
      } finally {
        setLoading(false);
      }
    };

    loadHealthStatus();

    // 启动实时监控
    const stopMonitoring = client.startHealthMonitoring(60000, (status) => {
      setHealthStatus(status);
    });

    return () => stopMonitoring();
  }, [client]);

  const refreshHealth = useCallback(async () => {
    try {
      setLoading(true);
      const status = await client.getDetailedHealth();
      setHealthStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '健康检查失败');
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    healthStatus,
    loading,
    error,
    refreshHealth,
    client,
  };
};

// 监控仪表板组件
export const SystemHealthDashboard = ({ apiKey }: { apiKey: string }) => {
  const { healthStatus, loading, error, refreshHealth } = useSystemMonitoring(apiKey);

  if (loading) return <div>加载系统状态中...</div>;
  if (error) return <div>获取系统状态失败: {error}</div>;
  if (!healthStatus) return <div>无系统状态数据</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="system-health-dashboard">
      <div className="dashboard-header">
        <h2>系统健康状态</h2>
        <button onClick={refreshHealth}>刷新</button>
      </div>

      <div className={`overall-status ${getStatusColor(healthStatus.status)}`}>
        <span className="status-icon">{getStatusIcon(healthStatus.status)}</span>
        <span className="status-text">
          系统状态: {healthStatus.status.toUpperCase()}
        </span>
        <span className="last-update">
          最后更新: {new Date(healthStatus.timestamp).toLocaleString()}
        </span>
      </div>

      {healthStatus.warnings && healthStatus.warnings.length > 0 && (
        <div className="warnings-section">
          <h3>⚠️ 警告</h3>
          {healthStatus.warnings.map((warning, index) => (
            <div key={index} className="warning-item">
              <strong>{warning.service}:</strong> {warning.message}
              <span className="metric-value">
                {warning.currentValue}{warning.unit} (阈值: {warning.threshold}{warning.unit})
              </span>
            </div>
          ))}
        </div>
      )}

      {healthStatus.errors && healthStatus.errors.length > 0 && (
        <div className="errors-section">
          <h3>❌ 错误</h3>
          {healthStatus.errors.map((error, index) => (
            <div key={index} className="error-item">
              <strong>{error.service}:</strong> {error.message}
              {error.details && <div className="error-details">{error.details}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="services-status">
        <h3>服务状态</h3>
        {Object.entries(healthStatus.services).map(([service, info]: [string, any]) => (
          <div key={service} className="service-item">
            <span className={`service-status ${getStatusColor(info.status)}`}>
              {getStatusIcon(info.status)}
            </span>
            <span className="service-name">{service}</span>
            <span className="service-details">
              {info.responseTime && `响应时间: ${info.responseTime}ms`}
              {info.hitRate && `命中率: ${(info.hitRate * 100).toFixed(1)}%`}
              {info.connectionPool && `连接池: ${info.connectionPool.active}/${info.connectionPool.max}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

这些契约示例提供了完整的系统监控功能接口规范，包括基础健康检查、详细状态信息、性能指标监控和服务依赖状态检查。开发者可以根据这些契约快速集成 FastBuild 的系统监控功能，实现对平台运行状态的全面监控。