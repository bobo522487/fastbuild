'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
} from 'lucide-react';

import {
  PerformanceMonitor,
  PerformanceMetrics,
  FormPerformanceData,
  getPerformanceOptimizationSuggestions,
} from './PerformanceMonitor';
import { SchemaValidationMonitor } from '../forms/OptimizedSchemaCompiler';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  componentId?: string;
  showCharts?: boolean;
  refreshInterval?: number;
  onExportData?: (data: PerformanceReport) => void;
}

interface PerformanceReport {
  timestamp: number;
  renderMetrics: PerformanceMetrics[];
  validationMetrics: PerformanceMetrics[];
  formPerformance: FormPerformanceData[];
  optimizationSuggestions: string[];
  summary: {
    avgRenderTime: number;
    avgValidationTime: number;
    totalFormsProcessed: number;
    performanceScore: number;
  };
}

export function PerformanceDashboard({
  componentId = 'global',
  showCharts = true,
  refreshInterval = 5000,
  onExportData,
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics[]>([]);
  const [validationMetrics, setValidationMetrics] = React.useState<PerformanceMetrics[]>([]);
  const [formPerformance, setFormPerformance] = React.useState<FormPerformanceData[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const monitor = PerformanceMonitor.getInstance();
  const validationMonitor = SchemaValidationMonitor.getInstance();

  // 计算性能摘要
  const performanceSummary = React.useMemo(() => {
    if (metrics.length === 0) {
      return {
        avgRenderTime: 0,
        avgValidationTime: 0,
        totalFormsProcessed: 0,
        performanceScore: 100,
      };
    }

    const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
    const avgValidationTime = validationMetrics.length > 0
      ? validationMetrics.reduce((sum, m) => sum + (m.validationTime || 0), 0) / validationMetrics.length
      : 0;
    const totalFormsProcessed = formPerformance.length;

    // 性能评分计算
    let score = 100;
    if (avgRenderTime > 100) score -= 20;
    if (avgRenderTime > 50) score -= 10;
    if (avgValidationTime > 50) score -= 15;
    if (avgValidationTime > 25) score -= 5;

    return {
      avgRenderTime,
      avgValidationTime,
      totalFormsProcessed,
      performanceScore: Math.max(0, score),
    };
  }, [metrics, validationMetrics, formPerformance]);

  // 刷新性能数据
  const refreshData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 获取性能指标
      const avgMetrics = monitor.getAverageMetrics(componentId);
      if (avgMetrics) {
        setMetrics(prev => [...prev.slice(-19), avgMetrics]);
      }

      // 获取验证指标
      const validationReport = validationMonitor.getReport();
      if (validationReport.sampleCount > 0) {
        const validationMetric: PerformanceMetrics = {
          renderTime: 0,
          componentCount: 1,
          validationTime: validationReport.average,
          timestamp: Date.now(),
        };
        setValidationMetrics(prev => [...prev.slice(-19), validationMetric]);
      }

      // 生成优化建议
      if (avgMetrics) {
        const newSuggestions = getPerformanceOptimizationSuggestions(avgMetrics);
        setSuggestions(newSuggestions);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('刷新性能数据失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [componentId, monitor, validationMonitor]);

  // 自动刷新
  React.useEffect(() => {
    refreshData();

    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshData, refreshInterval]);

  // 导出性能报告
  const exportReport = React.useCallback(() => {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      renderMetrics: metrics,
      validationMetrics,
      formPerformance,
      optimizationSuggestions: suggestions,
      summary: performanceSummary,
    };

    // 创建下载链接
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExportData?.(report);
  }, [metrics, validationMetrics, formPerformance, suggestions, performanceSummary, onExportData]);

  // 图表数据准备
  const chartData = React.useMemo(() => {
    return metrics.map((metric, index) => ({
      index: index + 1,
      renderTime: metric.renderTime,
      validationTime: metric.validationTime || 0,
      memoryUsage: metric.memoryUsage ? metric.memoryUsage / 1024 / 1024 : 0,
    }));
  }, [metrics]);

  const performanceScoreData = React.useMemo(() => {
    return [
      { name: '渲染性能', value: Math.max(0, 100 - (performanceSummary.avgRenderTime / 100) * 50) },
      { name: '验证性能', value: Math.max(0, 100 - (performanceSummary.avgValidationTime / 50) * 50) },
      { name: '内存使用', value: 80 }, // 假设值
      { name: '用户体验', value: 90 }, // 假设值
    ];
  }, [performanceSummary]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // 性能状态组件
  const PerformanceStatus = ({ value, threshold, label }: { value: number; threshold: number; label: string }) => {
    const isGood = value <= threshold;
    const isWarning = value > threshold && value <= threshold * 1.5;

    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">{label}:</span>
        <span className={`text-sm ${isGood ? 'text-green-600' : isWarning ? 'text-yellow-600' : 'text-red-600'}`}>
          {value.toFixed(2)}ms
        </span>
        {isGood ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : isWarning ? (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 标题和控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">性能监控面板</h2>
          <p className="text-muted-foreground">
            组件: {componentId} • 最后更新: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportReport}
          >
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 性能摘要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            性能摘要
          </CardTitle>
          <CardDescription>
            关键性能指标概览
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">平均渲染时间</div>
              <PerformanceStatus
                value={performanceSummary.avgRenderTime}
                threshold={100}
                label="渲染"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">平均验证时间</div>
              <PerformanceStatus
                value={performanceSummary.avgValidationTime}
                threshold={50}
                label="验证"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">处理表单数量</div>
              <div className="text-2xl font-bold">{performanceSummary.totalFormsProcessed}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">性能评分</div>
              <Badge
                variant={performanceSummary.performanceScore >= 80 ? 'default' : 'destructive'}
                className="text-lg px-3 py-1"
              >
                {performanceSummary.performanceScore.toFixed(0)}/100
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能图表 */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 渲染时间趋势 */}
          <Card>
            <CardHeader>
              <CardTitle>渲染时间趋势</CardTitle>
              <CardDescription>
                最近20次渲染的性能表现
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="renderTime"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 性能评分分布 */}
          <Card>
            <CardHeader>
              <CardTitle>性能评分分布</CardTitle>
              <CardDescription>
                各项性能指标评分
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={performanceScoreData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {performanceScoreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 优化建议 */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              性能优化建议
            </CardTitle>
            <CardDescription>
              基于当前性能指标的建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{suggestion}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细指标 */}
      <Card>
        <CardHeader>
          <CardTitle>详细性能指标</CardTitle>
          <CardDescription>
            原始性能数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.slice(-5).map((metric, index) => (
              <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 border rounded">
                <div>
                  <div className="text-sm text-muted-foreground">时间戳</div>
                  <div className="text-sm">{new Date(metric.timestamp).toLocaleTimeString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">渲染时间</div>
                  <div className="text-sm font-medium">{metric.renderTime.toFixed(2)}ms</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">组件数量</div>
                  <div className="text-sm font-medium">{metric.componentCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">内存使用</div>
                  <div className="text-sm font-medium">
                    {metric.memoryUsage ? `${(metric.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}