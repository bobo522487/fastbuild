'use client';

import { useState, useCallback, useEffect } from 'react';

export interface LoadingTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  startTime?: number;
  endTime?: number;
}

export interface UseLoadingOptions {
  initialTasks?: LoadingTask[];
  timeout?: number;
  onTimeout?: (taskId: string) => void;
}

export function useLoading(options: UseLoadingOptions = {}) {
  const [tasks, setTasks] = useState<Map<string, LoadingTask>>(
    new Map(options.initialTasks?.map(task => [task.id, task]) || [])
  );
  const [globalLoading, setGlobalLoading] = useState(false);
  const timeoutRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理超时定时器
  useEffect(() => {
    return () => {
      timeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // 计算全局加载状态
  useEffect(() => {
    const hasActiveTasks = Array.from(tasks.values()).some(
      task => task.status === 'running'
    );
    setGlobalLoading(hasActiveTasks);
  }, [tasks]);

  // 开始任务
  const startTask = useCallback((
    id: string,
    name: string,
    message?: string,
    timeoutMs?: number
  ) => {
    const task: LoadingTask = {
      id,
      name,
      status: 'running',
      message,
      startTime: Date.now(),
    };

    setTasks(prev => new Map(prev).set(id, task));

    // 设置超时
    if (timeoutMs && options.onTimeout) {
      const timeout = setTimeout(() => {
        options.onTimeout?.(id);
        failTask(id, '任务超时');
      }, timeoutMs);

      timeoutRef.current.set(id, timeout);
    }

    return task;
  }, [options]);

  // 更新任务进度
  const updateTaskProgress = useCallback((
    id: string,
    progress: number,
    message?: string
  ) => {
    setTasks(prev => {
      const newMap = new Map(prev);
      const task = newMap.get(id);

      if (task && task.status === 'running') {
        newMap.set(id, {
          ...task,
          progress: Math.min(100, Math.max(0, progress)),
          message: message || task.message,
        });
      }

      return newMap;
    });
  }, []);

  // 更新任务消息
  const updateTaskMessage = useCallback((
    id: string,
    message: string
  ) => {
    setTasks(prev => {
      const newMap = new Map(prev);
      const task = newMap.get(id);

      if (task && task.status === 'running') {
        newMap.set(id, {
          ...task,
          message,
        });
      }

      return newMap;
    });
  }, []);

  // 完成任务
  const completeTask = useCallback((id: string, message?: string) => {
    setTasks(prev => {
      const newMap = new Map(prev);
      const task = newMap.get(id);

      if (task) {
        newMap.set(id, {
          ...task,
          status: 'completed',
          message: message || task.message,
          progress: 100,
          endTime: Date.now(),
        });
      }

      return newMap;
    });

    // 清理超时定时器
    const timeout = timeoutRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRef.current.delete(id);
    }
  }, []);

  // 失败任务
  const failTask = useCallback((id: string, error?: string) => {
    setTasks(prev => {
      const newMap = new Map(prev);
      const task = newMap.get(id);

      if (task) {
        newMap.set(id, {
          ...task,
          status: 'failed',
          message: error || task.message,
          endTime: Date.now(),
        });
      }

      return newMap;
    });

    // 清理超时定时器
    const timeout = timeoutRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRef.current.delete(id);
    }
  }, []);

  // 移除任务
  const removeTask = useCallback((id: string) => {
    setTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    // 清理超时定时器
    const timeout = timeoutRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRef.current.delete(id);
    }
  }, []);

  // 清理所有已完成的任务
  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => {
      const newMap = new Map();
      prev.forEach((task, id) => {
        if (task.status === 'running' || task.status === 'pending') {
          newMap.set(id, task);
        }
      });
      return newMap;
    });
  }, []);

  // 获取任务状态
  const getTask = useCallback((id: string) => {
    return tasks.get(id);
  }, [tasks]);

  // 获取所有任务
  const getAllTasks = useCallback(() => {
    return Array.from(tasks.values());
  }, [tasks]);

  // 获取运行中的任务
  const getRunningTasks = useCallback(() => {
    return Array.from(tasks.values()).filter(task => task.status === 'running');
  }, [tasks]);

  // 获取任务统计
  const getTaskStats = useCallback(() => {
    const allTasks = Array.from(tasks.values());
    return {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      running: allTasks.filter(t => t.status === 'running').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      failed: allTasks.filter(t => t.status === 'failed').length,
      averageDuration: allTasks
        .filter(t => t.startTime && t.endTime)
        .reduce((sum, task) => sum + (task.endTime! - task.startTime!), 0) /
        allTasks.filter(t => t.startTime && t.endTime).length || 0,
    };
  }, [tasks]);

  // 包装异步操作
  const withLoading = useCallback(async <T>(
    taskId: string,
    taskName: string,
    operation: () => Promise<T>,
    options?: {
      message?: string;
      timeout?: number;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T> => {
    startTask(taskId, taskName, options?.message, options?.timeout);

    try {
      const result = await operation();
      completeTask(taskId, options?.onSuccess ? '操作成功' : undefined);
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      failTask(taskId, errorMessage);
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [startTask, completeTask, failTask]);

  return {
    // 状态
    tasks: Array.from(tasks.values()),
    globalLoading,

    // 任务操作
    startTask,
    updateTaskProgress,
    updateTaskMessage,
    completeTask,
    failTask,
    removeTask,
    clearCompletedTasks,

    // 查询方法
    getTask,
    getAllTasks,
    getRunningTasks,
    getTaskStats,

    // 工具方法
    withLoading,
  };
}

// 简化的加载状态 Hook
export function useSimpleLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingMessage, setLoadingMessage] = useState<string>();

  const startLoading = useCallback((message?: string) => {
    setIsLoading(true);
    setLoadingMessage(message);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(undefined);
  }, []);

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(message);
    try {
      const result = await operation();
      stopLoading();
      return result;
    } catch (error) {
      stopLoading();
      throw error;
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
    withLoading,
  };
}

// 表单专用的加载状态 Hook
export function useFormLoading() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [submitMessage, setSubmitMessage] = useState<string>();

  const startSubmitting = useCallback((message?: string) => {
    setIsSubmitting(true);
    setSubmitCount(prev => prev + 1);
    setSubmitMessage(message);
  }, []);

  const stopSubmitting = useCallback(() => {
    setIsSubmitting(false);
    setSubmitMessage(undefined);
  }, []);

  const startValidating = useCallback(() => {
    setIsValidating(true);
  }, []);

  const stopValidating = useCallback(() => {
    setIsValidating(false);
  }, []);

  const withSubmitting = useCallback(async <T>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startSubmitting(message);
    try {
      const result = await operation();
      stopSubmitting();
      return result;
    } catch (error) {
      stopSubmitting();
      throw error;
    }
  }, [startSubmitting, stopSubmitting]);

  const withValidating = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    startValidating();
    try {
      const result = await operation();
      stopValidating();
      return result;
    } catch (error) {
      stopValidating();
      throw error;
    }
  }, [startValidating, stopValidating]);

  return {
    isSubmitting,
    isValidating,
    submitCount,
    submitMessage,
    startSubmitting,
    stopSubmitting,
    startValidating,
    stopValidating,
    withSubmitting,
    withValidating,
  };
}