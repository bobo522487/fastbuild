/**
 * 优化的状态管理器
 * 提供高性能的状态管理和选择器功能
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';

export interface StateSelector<T, R> {
  (state: T): R;
}

export interface EqualityFn<T> {
  (a: T, b: T): boolean;
}

/**
 * 优化的状态管理器基类
 */
export class OptimizedStateManager<T> {
  private state: T;
  private listeners = new Set<(state: T) => void>();
  private selectors = new Map<string, {
    selector: StateSelector<T, any>;
    lastResult: any;
    dependencies: Set<keyof T>;
  }>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * 获取当前状态
   */
  getState(): T {
    return this.state;
  }

  /**
   * 更新状态
   */
  setState(updater: (state: T) => Partial<T> | T): void {
    const newState = updater(this.state);
    const mergedState = typeof newState === 'object' && newState !== null
      ? { ...this.state, ...newState }
      : newState;

    if (this.shouldUpdate(this.state, mergedState)) {
      this.state = mergedState;
      this.notifyListeners();
      this.invalidateSelectors();
    }
  }

  /**
   * 批量更新状态
   */
  batchUpdate(updaters: Array<(state: T) => Partial<T>>): void {
    const newState = { ...this.state };
    let hasChanges = false;

    for (const updater of updaters) {
      const update = updater(newState);
      const merged = { ...newState, ...update };
      if (this.shouldUpdate(newState, merged)) {
        Object.assign(newState, merged);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.state = newState;
      this.notifyListeners();
      this.invalidateSelectors();
    }
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 选择器缓存
   */
  createSelector<R>(
    selector: StateSelector<T, R>,
    equalityFn: EqualityFn<R> = Object.is
  ): () => R {
    const selectorId = Math.random().toString(36).substr(2, 9);

    this.selectors.set(selectorId, {
      selector,
      lastResult: null,
      dependencies: new Set(),
    });

    return () => {
      const cached = this.selectors.get(selectorId);
      if (!cached) return selector(this.state);

      const newResult = selector(this.state);

      if (cached.lastResult === null || !equalityFn(cached.lastResult, newResult)) {
        cached.lastResult = newResult;
      }

      return cached.lastResult;
    };
  }

  /**
   * 派生状态缓存
   */
  createDerivedState<R>(
    selector: StateSelector<T, R>,
    equalityFn: EqualityFn<R> = Object.is
  ): () => R {
    return this.createSelector(selector, equalityFn);
  }

  /**
   * 记忆化计算
   */
  memoized<R>(
    compute: () => R,
    dependencies: Array<keyof T>,
    equalityFn: EqualityFn<R> = Object.is
  ): () => R {
    const memo = new MemoizationCache<R>(equalityFn);
    return () => memo.memoize(() => compute(), dependencies.map(dep => this.state[dep]));
  }

  /**
   * 状态快照
   */
  createSnapshot(): T {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 恢复快照
   */
  restoreSnapshot(snapshot: T): void {
    this.setState(() => snapshot);
  }

  /**
   * 状态重置
   */
  reset(initialState: T): void {
    this.state = initialState;
    this.notifyListeners();
    this.invalidateSelectors();
  }

  /**
   * 获取状态统计
   */
  getStats() {
    return {
      listenersCount: this.listeners.size,
      selectorsCount: this.selectors.size,
      stateSize: JSON.stringify(this.state).length,
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.listeners.clear();
    this.selectors.clear();
  }

  private shouldUpdate(oldState: T, newState: T): boolean {
    return oldState !== newState;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private invalidateSelectors(): void {
    this.selectors.forEach(cached => {
      cached.lastResult = null;
    });
  }
}

/**
 * 记忆化缓存
 */
class MemoizationCache<T> {
  private lastResult: T | null = null;
  private lastDependencies: any[] = [];

  constructor(private equalityFn: EqualityFn<T> = Object.is) {}

  memoize(compute: () => T, dependencies: any[]): T {
    if (this.lastDependencies.length === dependencies.length &&
        this.lastDependencies.every((dep, i) => dep === dependencies[i]) &&
        this.lastResult !== null) {
      return this.lastResult;
    }

    const result = compute();
    this.lastResult = result;
    this.lastDependencies = [...dependencies];

    return result;
  }
}

/**
 * React Hook for optimized state management
 */
export function useOptimizedState<T>(
  manager: OptimizedStateManager<T>
): [T, (updater: (state: T) => Partial<T> | T) => void] {
  const [state, setState] = useState(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);

  const updateState = useCallback((updater: (state: T) => Partial<T> | T) => {
    manager.setState(updater);
  }, [manager]);

  return [state, updateState];
}

/**
 * React Hook for optimized selectors
 */
export function useOptimizedSelector<T, R>(
  manager: OptimizedStateManager<T>,
  selector: StateSelector<T, R>,
  equalityFn: EqualityFn<R> = Object.is
): R {
  const memoizedSelector = useMemo(
    () => manager.createSelector(selector, equalityFn),
    [manager, selector, equalityFn]
  );

  const [selectedState, setSelectedState] = useState(() => memoizedSelector());

  useEffect(() => {
    const checkForUpdates = () => {
      const newState = memoizedSelector();
      setSelectedState(current => {
        if (equalityFn(current, newState)) {
          return current;
        }
        return newState;
      });
    };

    // 使用 requestAnimationFrame 优化性能
    let animationFrameId: number;
    const unsubscribe = manager.subscribe(() => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(checkForUpdates);
    });

    return () => {
      unsubscribe();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [manager, memoizedSelector, equalityFn]);

  return selectedState;
}

/**
 * 批量状态更新 Hook
 */
export function useBatchUpdate<T>(
  manager: OptimizedStateManager<T>
): (updaters: Array<(state: T) => Partial<T>>) => void {
  const batchUpdate = useCallback(
    (updaters: Array<(state: T) => Partial<T>>) => {
      manager.batchUpdate(updaters);
    },
    [manager]
  );

  return batchUpdate;
}

/**
 * 状态快照 Hook
 */
export function useStateSnapshot<T>(
  manager: OptimizedStateManager<T>
): [T, (snapshot: T) => void] {
  const createSnapshot = useCallback(() => manager.createSnapshot(), [manager]);
  const restoreSnapshot = useCallback((snapshot: T) => manager.restoreSnapshot(snapshot), [manager]);

  return [createSnapshot(), restoreSnapshot];
}

/**
 * 深度比较函数
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;

    const valueA = (a as any)[key];
    const valueB = (b as any)[key];

    if (!deepEqual(valueA, valueB)) return false;
  }

  return true;
}

/**
 * 浅比较函数
 */
export function shallowEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * 性能优化的上下文值比较
 */
export function useStableContextValue<T>(value: T): T {
  const ref = useRef<T>(value);
  const isEqual = deepEqual(ref.current, value);

  useEffect(() => {
    if (!isEqual) {
      ref.current = value;
    }
  }, [value, isEqual]);

  return isEqual ? ref.current : value;
}

// 临时导入以修复类型错误
import { useState } from 'react';