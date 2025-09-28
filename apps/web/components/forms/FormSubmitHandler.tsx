'use client';

import React from 'react';
import { useFormSubmission } from './FormProvider';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { trpc } from '@/trpc/provider';
import type { FormMetadata } from '@workspace/types';

interface FormSubmitHandlerProps {
  metadata: FormMetadata;
  onSuccess?: (data: Record<string, any>) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function FormSubmitHandler({
  metadata,
  onSuccess,
  onError,
  className,
}: FormSubmitHandlerProps) {
  const { submitForm, isLoading } = useFormSubmission();

  const handleSubmit = React.useCallback(
    async (data: Record<string, any>) => {
      try {
        const result = await submitForm(data, metadata);

        if (result.success) {
          onSuccess?.(data);
        } else {
          onError?.(result.error || 'Submission failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission failed, please try again';
        onError?.(errorMessage);
      }
    },
    [submitForm, metadata, onSuccess, onError]
  );

  return (
    <DynamicFormRenderer
      metadata={metadata}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      className={className}
    />
  );
}

// 简化的 tRPC 集成版本
export function TRPCFormSubmitHandler({
  metadata,
  onSuccess,
  onError,
  className,
}: FormSubmitHandlerProps) {
  const { submitForm, isLoading } = useFormSubmission();
  const submitToDatabase = trpc.submission.create.useMutation();

  const handleSubmit = React.useCallback(
    async (data: Record<string, any>) => {
      try {
        console.log('🚀 Form Submission:', data);

        // 首先处理表单提交
        const result = await submitForm(data, metadata);

        // 尝试提交到数据库
        try {
          await submitToDatabase.mutateAsync({
            formId: 'demo-form',
            data,
          });
          console.log('📊 Database submission successful');
        } catch (dbError) {
          console.warn('⚠️ Database submission failed:', dbError);
        }

        if (result.success) {
          onSuccess?.(data);
        } else {
          onError?.(result.error || 'Submission failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Submission failed, please try again';
        onError?.(errorMessage);
      }
    },
    [submitForm, metadata, onSuccess, onError, submitToDatabase]
  );

  return (
    <div className="space-y-4">
      <DynamicFormRenderer
        metadata={metadata}
        onSubmit={handleSubmit}
        isLoading={isLoading || submitToDatabase.isPending}
        className={className}
      />

      {/* 显示 tRPC 错误 */}
      {submitToDatabase.error && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ 数据库存储失败，但表单已正常处理
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            {submitToDatabase.error.message}
          </p>
        </div>
      )}
    </div>
  );
}