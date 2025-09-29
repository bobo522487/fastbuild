'use client';

import React from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from '@workspace/ui/components/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';

import {
  ChevronDown,
  ChevronRight,
  Settings,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  Database,
  Download,
  Upload,
} from 'lucide-react';

import { FormResetHandler, useFormReset, AdvancedResetPanel } from './FormResetHandler';
import { LoadingIndicator, useGlobalLoading } from './LoadingIndicator';
import type { FormMetadata } from '@workspace/types';

export interface FormControlPanelProps {
  form: UseFormReturn<any>;
  metadata: FormMetadata;
  onSubmit?: (data: any) => Promise<void>;
  onSaveDraft?: (data: any) => Promise<void>;
  onLoadDraft?: () => Promise<any>;
  className?: string;
  showAdvanced?: boolean;
}

export function FormControlPanel({
  form,
  metadata,
  onSubmit,
  onSaveDraft,
  onLoadDraft,
  className = '',
  showAdvanced = false,
}: FormControlPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [showDevMode, setShowDevMode] = React.useState(false);
  const [draftStatus, setDraftStatus] = React.useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [isDataDialogOpen, setIsDataDialogOpen] = React.useState(false);

  const { status, operations } = useGlobalLoading();
  const { resetForm, getResetStats } = useFormReset(form, metadata);
  const stats = getResetStats();

  // 检查表单状态
  const isFormDirty = form.formState.isDirty;
  const isFormValid = form.formState.isValid;
  const isSubmitting = status.state === 'loading';

  // 获取表单数据
  const getFormData = () => {
    return form.getValues();
  };

  // 导出表单数据
  const exportFormData = () => {
    const data = getFormData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入表单数据
  const importFormData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        form.reset(data);
        setDraftStatus('unsaved');
      } catch (error) {
        console.error('导入失败:', error);
      }
    };
    reader.readAsText(file);
  };

  // 保存草稿
  const saveDraft = async () => {
    if (!onSaveDraft) return;

    setDraftStatus('saving');
    try {
      await onSaveDraft(getFormData());
      setDraftStatus('saved');
    } catch (error) {
      console.error('保存草稿失败:', error);
      setDraftStatus('unsaved');
    }
  };

  // 加载草稿
  const loadDraft = async () => {
    if (!onLoadDraft) return;

    try {
      const draftData = await onLoadDraft();
      form.reset(draftData);
      setDraftStatus('unsaved');
    } catch (error) {
      console.error('加载草稿失败:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              表单控制面板
            </CardTitle>
            <CardDescription>
              管理表单状态、数据和行为
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isFormValid ? 'default' : 'destructive'}>
              {isFormValid ? '有效' : '无效'}
            </Badge>
            <Badge variant={isFormDirty ? 'secondary' : 'outline'}>
              {isFormDirty ? '已修改' : '未修改'}
            </Badge>
            {stats.totalResets > 0 && (
              <Badge variant="outline">
                重置 {stats.totalResets}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 主要操作 */}
        <div className="flex flex-wrap gap-2">
          {onSubmit && (
            <Button
              onClick={() => onSubmit(getFormData())}
              disabled={!isFormValid || isSubmitting}
              className="flex-1 min-w-[120px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? '提交中...' : '提交表单'}
            </Button>
          )}

          <FormResetHandler
            form={form}
            metadata={metadata}
            onReset={() => setDraftStatus('unsaved')}
          />

          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={draftStatus === 'saving' || !isFormDirty}
              className="flex-1 min-w-[120px]"
            >
              <Save className="h-4 w-4 mr-2" />
              {draftStatus === 'saving' ? '保存中...' : '保存草稿'}
            </Button>
          )}

          {onLoadDraft && (
            <Button
              variant="outline"
              onClick={loadDraft}
              className="flex-1 min-w-[120px]"
            >
              <FileText className="h-4 w-4 mr-2" />
              加载草稿
            </Button>
          )}
        </div>

        {/* 数据操作 */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDataDialogOpen} onOpenChange={setIsDataDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                查看数据
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>表单数据</DialogTitle>
                <DialogDescription>
                  当前表单的所有字段值
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-xs bg-gray-100 p-4 rounded">
                  {JSON.stringify(getFormData(), null, 2)}
                </pre>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsDataDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={exportFormData}>
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>

          <div>
            <input
              type="file"
              accept=".json"
              onChange={importFormData}
              className="hidden"
              id="import-data"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-data')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              导入数据
            </Button>
          </div>
        </div>

        {/* 高级功能 */}
        {showAdvanced && (
          <>
            {/* 暂时注释掉折叠组件，因为导入被注释了 */}
            {/* <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}> */}
              {/* <CollapsibleTrigger asChild> */}
                {/* <Button variant="ghost" size="sm" className="w-full justify-between"> */}
                  {/* 高级功能 */}
                  {/* {isAdvancedOpen ? ( */}
                    {/* <ChevronDown className="h-4 w-4" /> */}
                  {/* ) : ( */}
                    {/* <ChevronRight className="h-4 w-4" /> */}
                  {/* )} */}
                {/* </Button> */}
              {/* </CollapsibleTrigger> */}
              {/* <CollapsibleContent className="space-y-4 mt-4"> */}
                <AdvancedResetPanel
                  form={form}
                  metadata={metadata}
                />

                {/* 开发者模式 */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDevMode(!showDevMode)}
                    className="w-full justify-between"
                  >
                    开发者模式
                    {showDevMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>

                  {showDevMode && (
                    <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                      <h5 className="text-sm font-medium">表单调试信息</h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">表单状态:</span>
                          <span className="ml-2">{form.formState.isSubmitting ? '提交中' : '空闲'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">验证状态:</span>
                          <span className="ml-2">{isFormValid ? '通过' : '失败'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">错误数量:</span>
                          <span className="ml-2">{Object.keys(form.formState.errors).length}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">修改状态:</span>
                          <span className="ml-2">{isFormDirty ? '已修改' : '未修改'}</span>
                        </div>
                      </div>

                      {/* 活动操作 */}
                      {operations.length > 0 && (
                        <div className="mt-4">
                          <h6 className="text-xs font-medium text-gray-600 mb-2">活动操作</h6>
                          <div className="space-y-1">
                            {operations.slice(0, 3).map((op) => (
                              <div key={op.id} className="text-xs flex justify-between">
                                <span>{op.name}</span>
                                <span className="text-gray-500">{op.state}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 草稿状态 */}
                      {draftStatus !== 'unsaved' && (
                        <Alert>
                          <Database className="h-4 w-4" />
                          <AlertDescription>
                            草稿状态: {draftStatus === 'saved' ? '已保存' : '保存中...'}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              {/* </CollapsibleContent> */}
            {/* </Collapsible> */}
          </>
        )}

        {/* 全局状态指示器 */}
        {status.state !== 'idle' && (
          <Alert>
            <LoadingIndicator
              status={status}
              size="sm"
            />
            <AlertDescription>
              全局状态: {status.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// 表单数据历史记录
export interface FormDataHistoryProps {
  form: UseFormReturn<any>;
  className?: string;
}

export function FormDataHistory({ form, className = '' }: FormDataHistoryProps) {
  const [history, setHistory] = React.useState<Array<{
    timestamp: Date;
    data: any;
    action: string;
  }>>([]);

  // 监听表单变化
  const watchedValues = form.watch();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHistory(prev => [
        ...prev.slice(-9), // 保留最近9条记录
        {
          timestamp: new Date(),
          data: { ...watchedValues },
          action: '字段修改',
        }
      ]);
    }, 1000); // 防抖

    return () => clearTimeout(timer);
  }, [watchedValues]);

  // 清除历史
  const clearHistory = () => {
    setHistory([]);
  };

  // 恢复到某个历史版本
  const restoreToHistory = (index: number) => {
    const historyItem = history[index];
    if (historyItem) {
      form.reset(historyItem.data);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">数据历史</CardTitle>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            清除历史
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">暂无历史记录</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.action}</div>
                  <div className="text-xs text-gray-500">
                    {item.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreToHistory(index)}
                >
                  恢复
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}