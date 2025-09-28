'use client';

import React from 'react';
import { useFormSubmission } from './FormProvider';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { NetworkErrorHandler, NetworkErrorAnalyzer, RetryHandler } from './NetworkErrorHandler';
import { LoadingIndicator, FormLoadingIndicator, PageLoading } from './LoadingIndicator';
import { useFormLoading } from '@/hooks/use-loading';
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
  const { submitForm } = useFormSubmission();
  const {
    isSubmitting,
    isValidating,
    submitCount,
    submitMessage,
    startSubmitting,
    stopSubmitting,
    startValidating,
    stopValidating,
    withSubmitting,
  } = useFormLoading();
  const [networkError, setNetworkError] = React.useState<any>(null);

  const handleSubmit = React.useCallback(
    async (data: Record<string, any>) => {
      setNetworkError(null);

      try {
        const result = await withSubmitting(
          async () => {
            startValidating();
            try {
              const submissionResult = await submitForm(data, metadata);

              if (!submissionResult.success) {
                // 转换表单验证错误为网络错误格式
                const validationError = new Error('error' in submissionResult ? submissionResult.error : 'Form validation failed');
                throw validationError;
              }

              return submissionResult;
            } finally {
              stopValidating();
            }
          },
          '提交表单...'
        );

        if (result.success) {
          onSuccess?.(data);
        }
      } catch (error) {
        const networkErrorInfo = NetworkErrorAnalyzer.analyze(error);
        setNetworkError(networkErrorInfo);
        onError?.(networkErrorInfo.message);
        console.error('❌ Form submission failed:', error);
      }
    },
    [submitForm, metadata, onSuccess, onError, withSubmitting, startValidating, stopValidating]
  );

  const handleRetry = React.useCallback(() => {
    // 清除错误状态，让用户可以重新提交表单
    setNetworkError(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* 表单级加载状态 */}
      <FormLoadingIndicator
        isSubmitting={isSubmitting}
        isValidating={isValidating}
        submitCount={submitCount}
        className="mb-4"
      />

      <DynamicFormRenderer
        metadata={metadata}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        className={className}
      />

      <NetworkErrorHandler
        error={networkError}
        onRetry={networkError?.retryable ? handleRetry : undefined}
        onDismiss={() => setNetworkError(null)}
      />
    </div>
  );
}

// 简化的 tRPC 集成版本
export function TRPCFormSubmitHandler({
  metadata,
  onSuccess,
  onError,
  className,
}: FormSubmitHandlerProps) {
  const { submitForm } = useFormSubmission();
  const [isLoading, setIsLoading] = React.useState(false);
  const submitToDatabase = trpc.submission.create.useMutation();
  const [networkError, setNetworkError] = React.useState<any>(null);

  const handleSubmit = React.useCallback(
    async (data: Record<string, any>) => {
      setNetworkError(null);
      setIsLoading(true);

      try {
        console.log('🚀 Form Submission:', data);

        // 首先处理表单提交（带重试）
        const formResult = await RetryHandler.executeWithRetry(
          async () => {
            const submissionResult = await submitForm(data, metadata);

            if (!submissionResult.success) {
              const validationError = new Error('error' in submissionResult ? submissionResult.error : 'Form validation failed');
              throw validationError;
            }

            return submissionResult;
          },
          {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 5000,
            backoffFactor: 2,
            retryableErrors: ['network', 'server', 'timeout']
          },
          (error, attempt) => {
            console.warn(`🔄 Form submission attempt ${attempt} failed:`, error);
          }
        );

        // 尝试提交到数据库（带重试）
        if (formResult.success) {
          await RetryHandler.executeWithRetry(
            async () => {
              await submitToDatabase.mutateAsync({
                formId: 'demo-form',
                data,
              });
              console.log('📊 Database submission successful');
            },
            {
              maxAttempts: 2,
              baseDelay: 2000,
              maxDelay: 10000,
              backoffFactor: 2,
              retryableErrors: ['network', 'server', 'timeout', 'database']
            },
            (dbError, attempt) => {
              console.warn(`🔄 Database submission attempt ${attempt} failed:`, dbError);
            }
          );
        }

        if (formResult.success) {
          onSuccess?.(data);
        }
      } catch (error) {
        const networkErrorInfo = NetworkErrorAnalyzer.analyze(error);
        setNetworkError(networkErrorInfo);
        onError?.(networkErrorInfo.message);
        console.error('❌ Form submission failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [submitForm, metadata, onSuccess, onError, submitToDatabase]
  );

  const handleRetry = React.useCallback(() => {
    setNetworkError(null);
  }, []);

  return (
    <div className="space-y-4">
      <DynamicFormRenderer
        metadata={metadata}
        onSubmit={handleSubmit}
        isLoading={isLoading || submitToDatabase.isPending}
        className={className}
      />

      <NetworkErrorHandler
        error={networkError}
        onRetry={networkError?.retryable ? handleRetry : undefined}
        onDismiss={() => setNetworkError(null)}
      />
    </div>
  );
}