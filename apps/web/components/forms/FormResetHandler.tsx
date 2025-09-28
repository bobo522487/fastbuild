'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';

import type { FormMetadata } from '@workspace/types';

export interface FormResetHandlerProps {
  form: UseFormReturn<any>;
  metadata: FormMetadata;
  onReset?: () => void;
  className?: string;
  showConfirmDialog?: boolean;
  confirmDialogTitle?: string;
  confirmDialogMessage?: string;
}

export function FormResetHandler({
  form,
  metadata,
  onReset,
  className = '',
  showConfirmDialog = true,
  confirmDialogTitle = '确认重置表单',
  confirmDialogMessage = '您确定要重置表单吗？所有已输入的数据将会丢失。',
}: FormResetHandlerProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [resetStatus, setResetStatus] = React.useState<'idle' | 'confirming' | 'resetting' | 'success'>('idle');

  // 检查表单是否有修改
  const isFormDirty = form.formState.isDirty;

  // 获取默认值
  const getDefaultValues = React.useCallback(() => {
    const values: Record<string, any> = {};
    metadata.fields.forEach((field) => {
      values[field.name] = field.defaultValue || '';
    });
    return values;
  }, [metadata]);

  // 重置表单
  const resetForm = React.useCallback(async () => {
    setIsResetting(true);
    setResetStatus('resetting');

    try {
      // 重置表单状态
      form.reset(getDefaultValues());

      // 触发重置回调
      onReset?.();

      setResetStatus('success');

      // 显示成功状态，然后关闭对话框
      setTimeout(() => {
        setResetStatus('idle');
        setIsDialogOpen(false);
        setIsResetting(false);
      }, 1000);
    } catch (error) {
      console.error('表单重置失败:', error);
      setResetStatus('idle');
      setIsResetting(false);
    }
  }, [form, getDefaultValues, onReset]);

  // 处理重置确认
  const handleResetConfirm = React.useCallback(() => {
    setResetStatus('confirming');
    resetForm();
  }, [resetForm]);

  // 快速重置（不显示确认对话框）
  const handleQuickReset = React.useCallback(() => {
    resetForm();
  }, [resetForm]);

  // 关闭对话框
  const handleDialogClose = React.useCallback(() => {
    if (!isResetting) {
      setIsDialogOpen(false);
      setResetStatus('idle');
    }
  }, [isResetting]);

  // 重置按钮组件
  const ResetButton = React.useCallback(({ onClick, ...props }: any) => (
    <Button
      variant="outline"
      size="sm"
      disabled={!isFormDirty || isResetting}
      className={className}
      onClick={onClick}
      {...props}
    >
      <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
      {isResetting ? '重置中...' : '重置'}
    </Button>
  ), [isFormDirty, isResetting, className]);

  // 如果不需要确认对话框，直接返回重置按钮
  if (!showConfirmDialog) {
    return <ResetButton onClick={handleQuickReset} />;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <ResetButton />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {resetStatus === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            <DialogTitle>
              {resetStatus === 'success' ? '重置成功' : confirmDialogTitle}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {resetStatus === 'idle' && (
            <DialogDescription>
              {confirmDialogMessage}
            </DialogDescription>
          )}

          {resetStatus === 'confirming' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                正在重置表单，请稍候...
              </AlertDescription>
            </Alert>
          )}

          {resetStatus === 'resetting' && (
            <Alert>
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                正在清除表单数据并重置状态...
              </AlertDescription>
            </Alert>
          )}

          {resetStatus === 'success' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                表单已成功重置到初始状态。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {resetStatus === 'idle' && (
            <>
              <Button variant="outline" onClick={handleDialogClose}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleResetConfirm}>
                确认重置
              </Button>
            </>
          )}

          {(resetStatus === 'confirming' || resetStatus === 'resetting') && (
            <Button disabled className="w-full">
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
              处理中...
            </Button>
          )}

          {resetStatus === 'success' && (
            <Button onClick={handleDialogClose} className="w-full">
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 表单重置状态 Hook
export function useFormReset(form: UseFormReturn<any>, metadata: FormMetadata) {
  const [resetHistory, setResetHistory] = React.useState<Array<{
    timestamp: Date;
    reason?: string;
  }>>([]);

  // 获取默认值
  const getDefaultValues = React.useCallback(() => {
    const values: Record<string, any> = {};
    metadata.fields.forEach((field) => {
      values[field.name] = field.defaultValue || '';
    });
    return values;
  }, [metadata]);

  // 重置表单
  const resetForm = React.useCallback((reason?: string) => {
    form.reset(getDefaultValues());

    // 记录重置历史
    setResetHistory(prev => [
      ...prev,
      {
        timestamp: new Date(),
        reason,
      }
    ]);
  }, [form, getDefaultValues]);

  // 撤销重置
  const undoReset = React.useCallback(() => {
    if (resetHistory.length > 0) {
      const lastReset = resetHistory[resetHistory.length - 1];
      // 这里可以实现更复杂的撤销逻辑
      // 目前只是简单的重新重置
      resetForm(`撤销重置 (${lastReset.reason || '手动重置'})`);
    }
  }, [resetHistory, resetForm]);

  // 清除重置历史
  const clearResetHistory = React.useCallback(() => {
    setResetHistory([]);
  }, []);

  // 获取重置统计
  const getResetStats = React.useCallback(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todayResets = resetHistory.filter(
      reset => reset.timestamp >= todayStart
    ).length;

    const totalResets = resetHistory.length;
    const lastResetTime = resetHistory.length > 0 ? resetHistory[resetHistory.length - 1].timestamp : null;

    return {
      todayResets,
      totalResets,
      lastResetTime,
      canUndo: resetHistory.length > 0,
    };
  }, [resetHistory]);

  return {
    resetForm,
    undoReset,
    clearResetHistory,
    getResetStats,
    resetHistory,
  };
}

// 自动重置功能 Hook
export interface AutoResetOptions {
  enableAutoReset?: boolean;
  resetOnSuccess?: boolean;
  resetOnError?: boolean;
  resetTimeout?: number;
  maxResets?: number;
}

export function useAutoReset(
  form: UseFormReturn<any>,
  metadata: FormMetadata,
  options: AutoResetOptions = {}
) {
  const {
    enableAutoReset = false,
    resetOnSuccess = true,
    resetOnError = false,
    resetTimeout = 3000,
    maxResets = 3,
  } = options;

  const { resetForm } = useFormReset(form, metadata);
  const [autoResetCount, setAutoResetCount] = React.useState(0);
  const [isAutoResetting, setIsAutoResetting] = React.useState(false);

  // 自动重置逻辑
  const triggerAutoReset = React.useCallback((reason: string) => {
    if (!enableAutoReset || autoResetCount >= maxResets) {
      return;
    }

    setIsAutoResetting(true);

    setTimeout(() => {
      resetForm(`自动重置: ${reason}`);
      setAutoResetCount(prev => prev + 1);
      setIsAutoResetting(false);
    }, resetTimeout);
  }, [enableAutoReset, autoResetCount, maxResets, resetTimeout, resetForm]);

  // 重置自动重置计数器
  const resetAutoResetCounter = React.useCallback(() => {
    setAutoResetCount(0);
  }, []);

  return {
    triggerAutoReset,
    resetAutoResetCounter,
    autoResetCount,
    isAutoResetting,
    canAutoReset: enableAutoReset && autoResetCount < maxResets,
  };
}

// 高级重置控制面板
export interface AdvancedResetPanelProps {
  form: UseFormReturn<any>;
  metadata: FormMetadata;
  className?: string;
}

export function AdvancedResetPanel({
  form,
  metadata,
  className = '',
}: AdvancedResetPanelProps) {
  const { resetForm, getResetStats, resetHistory } = useFormReset(form, metadata);
  const { autoResetCount, resetAutoResetCounter } = useAutoReset(form, metadata, {
    enableAutoReset: true,
  });

  const stats = getResetStats();

  return (
    <div className={`space-y-4 p-4 border rounded-lg ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">表单重置控制</h4>

      {/* 重置统计 */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-gray-500">今日重置:</span>
          <span className="font-medium">{stats.todayResets}</span>
        </div>
        <div className="space-y-1">
          <span className="text-gray-500">总重置次数:</span>
          <span className="font-medium">{stats.totalResets}</span>
        </div>
        <div className="space-y-1">
          <span className="text-gray-500">自动重置:</span>
          <span className="font-medium">{autoResetCount}</span>
        </div>
        <div className="space-y-1">
          <span className="text-gray-500">最后重置:</span>
          <span className="font-medium">
            {stats.lastResetTime ? stats.lastResetTime.toLocaleTimeString() : '从未'}
          </span>
        </div>
      </div>

      {/* 重置操作 */}
      <div className="flex space-x-2">
        <FormResetHandler
          form={form}
          metadata={metadata}
          className="flex-1"
        />

        {stats.canUndo && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetForm('撤销操作')}
          >
            撤销
          </Button>
        )}

        {autoResetCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetAutoResetCounter}
          >
            清除计数
          </Button>
        )}
      </div>

      {/* 重置历史 */}
      {resetHistory.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-gray-600">重置历史</h5>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {resetHistory.slice(-5).reverse().map((reset, index) => (
              <div key={index} className="text-xs text-gray-500 flex justify-between">
                <span>{reset.reason || '手动重置'}</span>
                <span>{reset.timestamp.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}