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

export default function MonitoringPage() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    // 模拟数据加载
    const mockStats: MonitoringStats = {
      totalEvents: 1250,
      errorCount: 23,
      performanceMetrics: 45,
      userActivities: 180,
      criticalErrors: 3
    };

    setStats(mockStats);
    setLoading(false);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const mockStats: MonitoringStats = {
        totalEvents: 1250 + Math.floor(Math.random() * 100),
        errorCount: 23 + Math.floor(Math.random() * 10),
        performanceMetrics: 45 + Math.floor(Math.random() * 20),
        userActivities: 180 + Math.floor(Math.random() * 50),
        criticalErrors: 3 + Math.floor(Math.random() * 5)
      };

      setStats(mockStats);
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载监控数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">系统监控</h1>
          <p className="text-muted-foreground">监控系统性能和错误状态</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总事件数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              系统总事件数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误数量</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.errorCount}</div>
            <p className="text-xs text-muted-foreground">
              需要关注的错误
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">性能指标</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.performanceMetrics}</div>
            <p className="text-xs text-muted-foreground">
              性能监控点数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户活动</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.userActivities}</div>
            <p className="text-xs text-muted-foreground">
              用户交互次数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">严重错误</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">{stats?.criticalErrors}</div>
            <p className="text-xs text-muted-foreground">
              需要立即处理
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="errors">错误日志</TabsTrigger>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
          <TabsTrigger value="users">用户活动</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>系统状态概览</CardTitle>
              <CardDescription>
                系统整体运行状态和关键指标
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>系统健康度</span>
                  <Badge variant="outline" className="text-green-600">
                    健康
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>数据库连接</span>
                  <Badge variant="outline" className="text-green-600">
                    正常
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>API 响应时间</span>
                  <Badge variant="outline" className="text-green-600">
                    &lt; 100ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>错误率</span>
                  <Badge variant={stats && stats.errorCount / stats.totalEvents > 0.02 ? "destructive" : "outline"}>
                    {stats ? ((stats.errorCount / stats.totalEvents) * 100).toFixed(2) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>错误日志</CardTitle>
              <CardDescription>
                系统错误和异常信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <p>错误日志功能正在开发中</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>性能监控</CardTitle>
              <CardDescription>
                系统性能指标和优化建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4" />
                <p>性能监控功能正在开发中</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>用户活动</CardTitle>
              <CardDescription>
                用户行为分析和活动追踪
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>用户活动分析功能正在开发中</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}