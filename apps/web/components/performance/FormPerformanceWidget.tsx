'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MemoryStick,
  Shield,
  BarChart3,
} from 'lucide-react';

import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

interface FormPerformanceWidgetProps {
  formId: string;
  renderTime?: number;
  validationTime?: number;
  componentCount?: number;
  showDetails?: boolean;
  onOptimize?: () => void;
}

interface PerformanceGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  message: string;
}

export const FormPerformanceWidget: React.FC<FormPerformanceWidgetProps> = ({
  formId,
  renderTime = 0,
  validationTime = 0,
  componentCount = 0,
  showDetails = false,
  onOptimize,
}) => {
  const { getCurrentMemoryUsage, addMetric } = usePerformanceMonitor();
  const [memoryUsage, setMemoryUsage] = React.useState(0);

  React.useEffect(() => {
    // 定期更新内存使用情况
    const updateMemoryUsage = () => {
      setMemoryUsage(getCurrentMemoryUsage());
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, [getCurrentMemoryUsage]);

  React.useEffect(() => {
    // 记录性能指标
    if (renderTime > 0) {
      addMetric({
        renderTime,
        componentCount,
        memoryUsage,
        validationTime,
        schemaCompilationTime: 0,
        cacheHitRate: 0,
        interactionTime: 0,
        firstInputDelay: 0,
        timeToInteractive: 0,
        apiResponseTime: 0,
        resourceLoadTime: 0,
      });
    }
  }, [renderTime, validationTime, componentCount, memoryUsage, addMetric]);

  // 计算性能等级
  const getPerformanceGrade = (): PerformanceGrade => {
    const renderScore = renderTime <= 50 ? 100 : renderTime <= 100 ? 80 : renderTime <= 200 ? 60 : 40;
    const validationScore = validationTime <= 25 ? 100 : validationTime <= 50 ? 80 : validationTime <= 100 ? 60 : 40;
    const memoryScore = memoryUsage <= 30 ? 100 : memoryUsage <= 60 ? 80 : memoryUsage <= 100 ? 60 : 40;

    const overallScore = (renderScore + validationScore + memoryScore) / 3;

    if (overallScore >= 90) return { grade: 'A', color: 'text-green-600', message: '优秀' };
    if (overallScore >= 80) return { grade: 'B', color: 'text-blue-600', message: '良好' };
    if (overallScore >= 70) return { grade: 'C', color: 'text-yellow-600', message: '一般' };
    if (overallScore >= 60) return { grade: 'D', color: 'text-orange-600', message: '较差' };
    return { grade: 'F', color: 'text-red-600', message: '很差' };
  };

  const performanceGrade = getPerformanceGrade();

  // 获取状态指示器
  const getStatusIndicator = (value: number, good: number, warning: number) => {
    if (value <= good) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (value <= warning) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingUp className="h-4 w-4 text-red-500" />;
  };

  // 获取状态颜色
  const getStatusColor = (value: number, good: number, warning: number) => {
    if (value <= good) return 'text-green-600';
    if (value <= warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!showDetails) {
    // 简化版本 - 只显示核心指标
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <Zap className={`h-4 w-4 ${performanceGrade.color}`} />
              <Badge
                variant={performanceGrade.grade === 'A' || performanceGrade.grade === 'B' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {performanceGrade.grade}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {renderTime > 0 ? `${renderTime.toFixed(0)}ms` : '---'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold">表单性能指标</div>
              <div className="flex items-center justify-between text-sm">
                <span>渲染时间:</span>
                <span className={getStatusColor(renderTime, 50, 100)}>
                  {renderTime > 0 ? `${renderTime.toFixed(2)}ms` : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>验证时间:</span>
                <span className={getStatusColor(validationTime, 25, 50)}>
                  {validationTime > 0 ? `${validationTime.toFixed(2)}ms` : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>内存使用:</span>
                <span className={getStatusColor(memoryUsage, 30, 60)}>
                  {memoryUsage > 0 ? `${memoryUsage.toFixed(2)}MB` : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>组件数量:</span>
                <span>{componentCount}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                等级: {performanceGrade.message} ({performanceGrade.grade})
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 完整版本
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>性能监控</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={performanceGrade.grade === 'A' || performanceGrade.grade === 'B' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {performanceGrade.grade} - {performanceGrade.message}
            </Badge>
            {onOptimize && (
              <Button variant="outline" size="sm" onClick={onOptimize}>
                优化
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 核心指标 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">渲染时间</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold ${getStatusColor(renderTime, 50, 100)}`}>
                {renderTime > 0 ? `${renderTime.toFixed(2)}ms` : '---'}
              </span>
              {getStatusIndicator(renderTime, 50, 100)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">验证时间</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold ${getStatusColor(validationTime, 25, 50)}`}>
                {validationTime > 0 ? `${validationTime.toFixed(2)}ms` : '---'}
              </span>
              {getStatusIndicator(validationTime, 25, 50)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">内存使用</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold ${getStatusColor(memoryUsage, 30, 60)}`}>
                {memoryUsage > 0 ? `${memoryUsage.toFixed(2)}MB` : '---'}
              </span>
              {getStatusIndicator(memoryUsage, 30, 60)}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">组件数量</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {componentCount}
            </span>
          </div>
        </div>

        {/* 性能建议 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">优化建议</div>
          <div className="space-y-1">
            {renderTime > 100 && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                • 渲染时间较长，建议使用React.memo优化组件
              </div>
            )}
            {validationTime > 50 && (
              <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                • 验证时间较长，建议优化schema或使用缓存
              </div>
            )}
            {memoryUsage > 60 && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                • 内存使用较高，建议检查内存泄漏
              </div>
            )}
            {renderTime <= 50 && validationTime <= 25 && memoryUsage <= 30 && (
              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                • 性能表现优秀，无需优化
              </div>
            )}
          </div>
        </div>

        {/* 性能目标 */}
        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground mb-2">性能目标</div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between">
              <span>渲染时间:</span>
              <span className={renderTime <= 50 ? 'text-green-600' : 'text-red-600'}>
                {renderTime <= 50 ? '✓' : '✗'} &lt; 50ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>验证时间:</span>
              <span className={validationTime <= 25 ? 'text-green-600' : 'text-red-600'}>
                {validationTime <= 25 ? '✓' : '✗'} &lt; 25ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>内存使用:</span>
              <span className={memoryUsage <= 30 ? 'text-green-600' : 'text-red-600'}>
                {memoryUsage <= 30 ? '✓' : '✗'} &lt; 30MB
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};