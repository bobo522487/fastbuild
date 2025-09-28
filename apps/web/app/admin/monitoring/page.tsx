'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import {
  AlertTriangle,
  Activity,
  Users,
  Zap,
  TrendingUp,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';

interface MonitoringStats {
  totalEvents: number;
  errorCount: number;
  performanceMetrics: number;
  userActivities: number;
  criticalErrors: number;
}

interface ErrorEvent {
  id: string;
  level: string;
  message: string;
  component?: string;
  path: string;
  createdAt: string;
  resolved: boolean;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  path: string;
  timestamp: string;
}

interface UserActivity {
  id: string;
  action: string;
  element?: string;
  path: string;
  timestamp: string;
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, errorsRes, performanceRes, activitiesRes] = await Promise.all([
        fetch('/api/monitoring/stats'),
        fetch('/api/monitoring/errors'),
        fetch('/api/monitoring/performance'),
        fetch('/api/monitoring/activities'),
      ]);

      const [statsData, errorsData, performanceData, activitiesData] = await Promise.all([
        statsRes.json(),
        errorsRes.json(),
        performanceRes.json(),
        activitiesRes.json(),
      ]);

      setStats(statsData);
      setErrors(errorsData.errors || []);
      setPerformance(performanceData.metrics || []);
      setActivities(activitiesData.activities || []);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const resolveError = async (errorId: string) => {
    try {
      await fetch(`/api/monitoring/errors/${errorId}/resolve`, {
        method: 'POST',
      });
      fetchData(); // 刷新数据
    } catch (error) {
      console.error('Error resolving error:', error);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/monitoring/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time application monitoring and error tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.errorCount}</div>
              {stats.criticalErrors > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {stats.criticalErrors} critical
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.performanceMetrics}</div>
              <p className="text-xs text-muted-foreground">metrics tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Activities</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userActivities}</div>
              <p className="text-xs text-muted-foreground">actions tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.max(0, 100 - (stats.errorCount / stats.totalEvents) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">system health</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors ({errors.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activities">User Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 最近错误 */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>
                  Latest errors and issues in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {errors.slice(0, 5).map((error) => (
                    <div key={error.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{error.message}</p>
                        <p className="text-xs text-gray-500">
                          {error.path} • {new Date(error.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={error.resolved ? 'default' : 'destructive'}>
                          {error.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveError(error.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 性能指标 */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators and system metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performance.slice(0, 5).map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{metric.name}</p>
                        <p className="text-xs text-gray-500">
                          {metric.path} • {new Date(metric.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {metric.value.toFixed(2)} {metric.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                All errors and exceptions tracked by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {errors.map((error) => (
                  <div key={error.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={error.level === 'error' ? 'destructive' : 'secondary'}>
                            {error.level}
                          </Badge>
                          {error.component && (
                            <Badge variant="outline">{error.component}</Badge>
                          )}
                          <Badge variant={error.resolved ? 'default' : 'destructive'}>
                            {error.resolved ? 'Resolved' : 'Open'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{error.message}</p>
                        <p className="text-xs text-gray-500">
                          Path: {error.path} • {new Date(error.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveError(error.id)}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Application performance metrics and benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {performance.map((metric) => (
                  <div key={metric.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{metric.name}</p>
                        <p className="text-xs text-gray-500">
                          {metric.path} • {new Date(metric.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {metric.value.toFixed(2)} {metric.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activities</CardTitle>
              <CardDescription>
                User actions and interactions tracked by the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-gray-500">
                          {activity.element && `Element: ${activity.element} • `}
                          {activity.path} • {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}