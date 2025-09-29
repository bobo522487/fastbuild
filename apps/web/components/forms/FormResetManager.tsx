'use client';

import React from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import type { FormMetadata } from '@workspace/types';

export interface FormResetOptions {
  clearData?: boolean;           // 是否清除已输入的数据
  resetValidation?: boolean;     // 是否重置验证状态
  resetToDefaults?: boolean;     // 是否重置为默认值
  preserveState?: boolean;       // 是否保留某些状态（如条件字段的显示状态）
  confirmRequired?: boolean;     // 是否需要确认
  customMessage?: string;        // 自定义确认消息
}

export interface FormResetContext {
  originalData?: Record<string, any>;          // 原始数据
  currentData: Record<string, any>;            // 当前数据
  fieldStates: Record<string, any>;             // 字段状态
  resetHistory: FormResetHistory[];             // 重置历史
  isDirty: boolean;                            // 表单是否已修改
  canReset: boolean;                           // 是否可以重置
}

export interface FormResetHistory {
  timestamp: Date;
  reason: string;
  options: FormResetOptions;
  dataBefore: Record<string, any>;
  dataAfter: Record<string, any>;
  resetType: 'full' | 'partial' | 'defaults' | 'validation';
}

export interface FormResetStats {
  totalResets: number;
  recentResets: number;
  resetTypes: Record<string, number>;
}

export interface FormResetManagerProps {
  metadata: FormMetadata;
  onReset?: (data: Record<string, any>, options: FormResetOptions) => void;
  onBeforeReset?: (options: FormResetOptions) => Promise<boolean> | boolean;
  children: (context: FormResetContext) => React.ReactNode;
}

export interface FormResetButtonProps {
  children: React.ReactNode;
  onReset: () => void;
  isDirty?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  showConfirmDialog?: boolean;
  confirmMessage?: string;
  className?: string;
}

// 表单重置确认对话框
export function FormResetConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  message = '确定要重置表单吗？这将清除所有已输入的数据。',
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>确认重置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              确认重置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 表单重置按钮组件
export function FormResetButton({
  onReset,
  isDirty = false,
  variant = 'outline',
  size = 'default',
  showConfirmDialog = true,
  confirmMessage = '确定要重置表单吗？这将清除所有已输入的数据。',
  className = '',
}: FormResetButtonProps) {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleResetClick = () => {
    if (showConfirmDialog && isDirty) {
      setShowConfirm(true);
    } else {
      onReset();
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onReset();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        variant={isDirty ? 'destructive' : variant}
        size={size}
        onClick={handleResetClick}
        disabled={!isDirty}
        className={className}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        重置表单
      </Button>

      <FormResetConfirmDialog
        isOpen={showConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={confirmMessage}
      />
    </>
  );
}

// 表单重置管理器组件
export function FormResetManager({
  metadata,
  onReset,
  onBeforeReset,
  children,
}: FormResetManagerProps) {
  const [originalData, setOriginalData] = React.useState<Record<string, any> | undefined>();
  const [currentData, setCurrentData] = React.useState<Record<string, any>>({});
  const [fieldStates, setFieldStates] = React.useState<Record<string, any>>({});
  const [resetHistory, setResetHistory] = React.useState<FormResetHistory[]>([]);

  // 计算表单是否已修改
  const isDirty = React.useMemo(() => {
    if (!originalData) return false;
    return JSON.stringify(originalData) !== JSON.stringify(currentData);
  }, [originalData, currentData]);

  // 计算是否可以重置
  const canReset = React.useMemo(() => {
    return isDirty || Object.keys(currentData).length > 0;
  }, [isDirty, currentData]);

  // 设置初始数据
  const setInitialData = React.useCallback((data: Record<string, any>) => {
    setOriginalData(data);
    setCurrentData(data);
  }, []);

  // 更新当前数据
  const updateData = React.useCallback((newData: Record<string, any>) => {
    setCurrentData(newData);
  }, []);

  // 执行重置操作
  const performReset = React.useCallback(async (
    options: FormResetOptions = {},
    reason = '用户手动重置'
  ) => {
    // 重置选项默认值
    const resetOptions: FormResetOptions = {
      clearData: true,
      resetValidation: true,
      resetToDefaults: false,
      preserveState: false,
      confirmRequired: true,
      ...options,
    };

    // 执行前置检查
    if (onBeforeReset) {
      const canProceed = await onBeforeReset(resetOptions);
      if (!canProceed) return;
    }

    // 保存重置前的状态
    const dataBefore = { ...currentData };

    let dataAfter: Record<string, any> = {};

    // 根据选项计算重置后的数据
    if (resetOptions.resetToDefaults && originalData) {
      // 重置为原始数据（默认值）
      dataAfter = { ...originalData };
    } else if (resetOptions.clearData) {
      // 清除所有数据
      dataAfter = {};
    } else {
      // 部分重置，保留原始数据
      dataAfter = originalData ? { ...originalData } : {};
    }

    // 计算重置类型
    let resetType: FormResetHistory['resetType'] = 'partial';
    if (resetOptions.clearData && !resetOptions.resetToDefaults) {
      resetType = 'full';
    } else if (resetOptions.resetToDefaults) {
      resetType = 'defaults';
    } else if (resetOptions.resetValidation) {
      resetType = 'validation';
    }

    // 更新当前数据
    setCurrentData(dataAfter);

    // 记录重置历史
    const historyEntry: FormResetHistory = {
      timestamp: new Date(),
      reason,
      options: resetOptions,
      dataBefore,
      dataAfter,
      resetType,
    };

    setResetHistory(prev => [...prev, historyEntry]);

    // 调用重置回调
    if (onReset) {
      onReset(dataAfter, resetOptions);
    }
  }, [currentData, originalData, onReset, onBeforeReset]);

  // 快速重置方法
  const resetToDefaults = React.useCallback(() => {
    return performReset({
      resetToDefaults: true,
      resetValidation: true,
      clearData: false,
    }, '重置为默认值');
  }, [performReset]);

  const clearAll = React.useCallback(() => {
    return performReset({
      clearData: true,
      resetValidation: true,
      resetToDefaults: false,
    }, '清除所有数据');
  }, [performReset]);

  const resetValidationOnly = React.useCallback(() => {
    return performReset({
      resetValidation: true,
      clearData: false,
      resetToDefaults: false,
      preserveState: true,
    }, '重置验证状态');
  }, [performReset]);

  // 撤销最后一次重置
  const undoLastReset = React.useCallback(() => {
    const lastReset = resetHistory[resetHistory.length - 1];
    if (lastReset) {
      setCurrentData(lastReset.dataBefore);
      setResetHistory(prev => prev.slice(0, -1));
    }
  }, [resetHistory]);

  // 重置历史管理
  const clearHistory = React.useCallback(() => {
    setResetHistory([]);
  }, []);

  const getResetStats = React.useCallback(() => {
    const totalResets = resetHistory.length;
    const recentResets = resetHistory.filter(
      entry => new Date().getTime() - entry.timestamp.getTime() < 3600000 // 1小时内
    ).length;

    const resetTypes = resetHistory.reduce((acc, entry) => {
      acc[entry.resetType] = (acc[entry.resetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalResets,
      recentResets,
      resetTypes,
    };
  }, [resetHistory]);

  // 构建上下文
  const context: FormResetContext = {
    originalData,
    currentData,
    fieldStates,
    resetHistory,
    isDirty,
    canReset,
  };

  // 返回重置管理器的API
  const resetApi = {
    setInitialData,
    updateData,
    performReset,
    resetToDefaults,
    clearAll,
    resetValidationOnly,
    undoLastReset,
    clearHistory,
    getResetStats,
    context,
  };

  return (
    <>
      {children(context)}
      {/* 导出重置API到全局，供其他组件使用 */}
      <ResetContext.Provider value={resetApi}>
        {null}
      </ResetContext.Provider>
    </>
  );
}

// 创建Context用于跨组件访问重置功能
interface ResetApiType {
  setInitialData: (data: Record<string, any>) => void;
  updateData: (data: Record<string, any>) => void;
  performReset: (options?: FormResetOptions, reason?: string) => Promise<void>;
  resetToDefaults: (reason?: string) => Promise<void>;
  clearAll: (reason?: string) => Promise<void>;
  resetValidationOnly: () => void;
  undoLastReset: () => void;
  clearHistory: () => void;
  getResetStats: () => FormResetStats;
  context: FormResetContext;
}

const ResetContext = React.createContext<ResetApiType | null>(null);

// Hook用于访问重置功能
export function useFormReset() {
  const context = React.useContext(ResetContext);
  if (!context) {
    throw new Error('useFormReset must be used within a FormResetManager');
  }
  return context;
}

// 表单重置历史面板组件
export interface FormResetHistoryPanelProps {
  history: FormResetHistory[];
  onUndo?: (index: number) => void;
  onClear?: () => void;
  className?: string;
}

export function FormResetHistoryPanel({
  history,
  onUndo,
  onClear,
  className = '',
}: FormResetHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-4 ${className}`}>
        暂无重置历史
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">重置历史</h4>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            清除历史
          </Button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {history.map((entry, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {entry.resetType}
                  </span>
                  <span className="text-xs text-gray-400">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{entry.reason}</p>
                <div className="text-xs text-gray-500 mt-1">
                  字段数: {Object.keys(entry.dataBefore).length} → {Object.keys(entry.dataAfter).length}
                </div>
              </div>
              {onUndo && index === history.length - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUndo(index)}
                >
                  撤销
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 快速重置操作组件
export interface QuickResetActionsProps {
  onResetToDefaults?: () => void;
  onClearAll?: () => void;
  onResetValidation?: () => void;
  isDirty?: boolean;
  className?: string;
}

export function QuickResetActions({
  onResetToDefaults,
  onClearAll,
  onResetValidation,
  isDirty = false,
  className = '',
}: QuickResetActionsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {onResetToDefaults && (
        <FormResetButton
          onReset={onResetToDefaults}
          isDirty={isDirty}
          variant="outline"
          size="sm"
          confirmMessage="确定要重置为默认值吗？"
        >
          重置为默认值
        </FormResetButton>
      )}

      {onClearAll && (
        <FormResetButton
          onReset={onClearAll}
          isDirty={isDirty}
          variant="destructive"
          size="sm"
          confirmMessage="确定要清除所有数据吗？此操作不可撤销。"
        >
          清除所有数据
        </FormResetButton>
      )}

      {onResetValidation && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResetValidation}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          重置验证状态
        </Button>
      )}
    </div>
  );
}