'use client';

import React from 'react';
import { useFormSubmission } from './FormProvider';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import type { FormMetadata } from '@workspace/types';

interface SimpleFormSubmitHandlerProps {
  metadata: FormMetadata;
  onSuccess?: (data: Record<string, any>) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SimpleFormSubmitHandler({
  metadata,
  onSuccess,
  onError,
  className,
}: SimpleFormSubmitHandlerProps) {
  const { submitForm, isLoading } = useFormSubmission();
  const [submitHistory, setSubmitHistory] = React.useState<Array<{
    data: Record<string, any>;
    timestamp: Date;
    success: boolean;
  }>>([]);

  const handleSubmit = React.useCallback(
    async (data: Record<string, any>) => {
      const timestamp = new Date();

      try {
        console.log('🚀 Simple Form Submission:', {
          metadata,
          data,
          timestamp,
        });

        const result = await submitForm(data, metadata);

        // 记录提交历史
        const submissionRecord = {
          data,
          timestamp,
          success: result.success,
        };

        setSubmitHistory(prev => [...prev, submissionRecord]);

        if (result.success) {
          console.log('✅ Form submission successful:', submissionRecord);
          onSuccess?.(data);
        } else {
          console.error('❌ Form submission failed:', result.error);
          onError?.(result.error || 'Submission failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission failed, please try again';

        // 记录失败的提交
        setSubmitHistory(prev => [...prev, {
          data,
          timestamp,
          success: false,
        }]);

        console.error('❌ Form submission error:', error);
        onError?.(errorMessage);
      }
    },
    [submitForm, metadata, onSuccess, onError]
  );

  return (
    <div className="space-y-4">
      <DynamicFormRenderer
        metadata={metadata}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        className={className}
      />

      {/* 调试信息 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && submitHistory.length > 0 && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">提交历史记录</h3>
          <div className="text-sm space-y-1">
            <p>总提交次数: {submitHistory.length}</p>
            <p>成功: {submitHistory.filter(h => h.success).length}</p>
            <p>失败: {submitHistory.filter(h => !h.success).length}</p>
          </div>

          {/* 显示最近的提交记录 */}
          {submitHistory.slice(-2).map((record, index) => (
            <div key={index} className="mt-2 p-2 bg-white rounded border">
              <p className="font-medium">提交 #{submitHistory.length - index}</p>
              <p className="text-xs text-gray-600">
                时间: {record.timestamp.toLocaleString()}
              </p>
              <p className="text-xs">
                状态: {record.success ? '✅ 成功' : '❌ 失败'}
              </p>
              <details className="mt-1">
                <summary className="text-xs cursor-pointer">查看数据</summary>
                <pre className="text-xs bg-gray-50 p-1 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(record.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}

          {submitHistory.length > 2 && (
            <p className="text-xs text-gray-500 mt-2">
              还有 {submitHistory.length - 2} 条更早的记录...
            </p>
          )}
        </div>
      )}
    </div>
  );
}