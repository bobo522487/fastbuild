'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { FormMetadata } from '@workspace/types';
import { NetworkErrorAnalyzer, RetryHandler } from './NetworkErrorHandler';

interface FormContextType {
  currentMetadata: FormMetadata | null;
  setCurrentMetadata: (metadata: FormMetadata) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const FormContext = React.createContext<FormContextType | undefined>(undefined);

export function useFormContext() {
  const context = React.useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}

interface FormProviderProps {
  children: React.ReactNode;
}

export function FormProvider({ children }: FormProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [currentMetadata, setCurrentMetadata] = React.useState<FormMetadata | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const value = React.useMemo(
    () => ({
      currentMetadata,
      setCurrentMetadata,
      isLoading,
      setIsLoading,
      error,
      setError,
      clearError,
    }),
    [currentMetadata, isLoading, error, clearError]
  );

  return (
    <FormContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </FormContext.Provider>
  );
}

// Hook for managing form submissions
export function useFormSubmission() {
  const { setIsLoading, setError, clearError } = useFormContext();

  const submitForm = React.useCallback(
    async (data: Record<string, any>, metadata: FormMetadata) => {
      setIsLoading(true);
      clearError();

      try {
        console.log('📋 Form Metadata:', metadata);
        console.log('📝 Form Data:', data);

        // 使用重试机制执行表单提交
        const result = await RetryHandler.executeWithRetry(
          async () => {
            // 这里可以添加 tRPC 调用
            // await submissionRouter.create({
            //   formId: metadata.id,
            //   data,
            // });

            console.log('✅ Form submitted successfully!');

            // 模拟 API 调用延迟
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return { success: true };
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

        return result;
      } catch (error) {
        const networkErrorInfo = NetworkErrorAnalyzer.analyze(error);
        setError(networkErrorInfo.message);
        console.error('❌ Form submission error:', error);
        return { success: false, error: networkErrorInfo.message };
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setError, clearError]
  );

  return { submitForm };
}

// Hook for managing form metadata
export function useFormMetadata() {
  const { currentMetadata, setCurrentMetadata, setError } = useFormContext();

  const loadMetadata = React.useCallback(
    async (metadata: FormMetadata) => {
      try {
        setCurrentMetadata(metadata);
        console.log('📋 Form metadata loaded:', metadata);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '加载表单配置失败';
        setError(errorMessage);
        console.error('❌ Failed to load form metadata:', error);
      }
    },
    [setCurrentMetadata, setError]
  );

  const loadMetadataFromJson = React.useCallback(
    async (jsonPath: string) => {
      try {
        // 使用重试机制加载JSON配置
        const metadata = await RetryHandler.executeWithRetry(
          async () => {
            const response = await fetch(jsonPath);
            if (!response.ok) {
              throw new Error(`Failed to load form configuration: ${response.statusText}`);
            }
            return await response.json();
          },
          {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 5000,
            backoffFactor: 2,
            retryableErrors: ['network', 'server', 'timeout']
          },
          (error, attempt) => {
            console.warn(`🔄 JSON loading attempt ${attempt} failed:`, error);
          }
        );

        await loadMetadata(metadata);
      } catch (error) {
        const networkErrorInfo = NetworkErrorAnalyzer.analyze(error);
        setError(networkErrorInfo.message);
        console.error('❌ Failed to load JSON metadata:', error);
      }
    },
    [loadMetadata, setError]
  );

  return {
    currentMetadata,
    loadMetadata,
    loadMetadataFromJson,
  };
}