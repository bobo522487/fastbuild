/**
 * 优化的Context选择器
 * 解决React Context重渲染问题
 */

import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { OptimizedStateManager } from './optimized-state-manager';

export interface Action<T> {
  type: string;
  payload?: any;
}

export interface ContextValue<T> {
  state: T;
  dispatch: React.Dispatch<Action<T>>;
  subscribe: (listener: (state: T) => void) => () => void;
  getState: () => T;
}

/**
 * 优化的Context
 */
export function createOptimizedContext<T>(initialState: T) {
  const Context = createContext<ContextValue<T> | null>(null);

  /**
   * 优化的Provider组件
   */
  function OptimizedProvider({
    children,
    reducer,
    initialState: providerInitialState = initialState,
  }: {
    children: React.ReactNode;
    reducer: (state: T, action: Action<T>) => T;
    initialState?: T;
  }) {
    const [state, dispatch] = useReducer(reducer, providerInitialState);
    const managerRef = useRef<OptimizedStateManager<T> | null>(null);

    if (!managerRef.current) {
      managerRef.current = new OptimizedStateManager<T>(state);
    }

    useEffect(() => {
      managerRef.current?.setState(() => state);
    }, [state]);

    const contextValue = useMemo(() => ({
      state,
      dispatch,
      subscribe: managerRef.current!.subscribe.bind(managerRef.current),
      getState: managerRef.current!.getState.bind(managerRef.current),
    }), [state]);

    return (
      <Context.Provider value={contextValue}>
        {children}
      </Context.Provider>
    );
  }

  /**
   * 优化的Hook
   */
  function useOptimizedContext(): ContextValue<T> {
    const context = useContext(Context);
    if (!context) {
      throw new Error('useOptimizedContext must be used within an OptimizedProvider');
    }
    return context;
  }

  /**
   * 选择器Hook
   */
  function useSelector<R>(
    selector: (state: T) => R,
    equalityFn: (a: R, b: R) => boolean = Object.is
  ): R {
    const { state, subscribe, getState } = useOptimizedContext();
    const [selectedState, setSelectedState] = useState(() => selector(state));

    useEffect(() => {
      const checkForUpdates = () => {
        const currentState = getState();
        const newSelectedState = selector(currentState);

        setSelectedState(currentSelectedState => {
          if (equalityFn(currentSelectedState, newSelectedState)) {
            return currentSelectedState;
          }
          return newSelectedState;
        });
      };

      const unsubscribe = subscribe(checkForUpdates);
      return unsubscribe;
    }, [subscribe, getState, selector, equalityFn]);

    return selectedState;
  }

  /**
   * Action dispatcher Hook
   */
  function useDispatch(): React.Dispatch<Action<T>> {
    const { dispatch } = useOptimizedContext();
    return dispatch;
  }

  /**
   * State getter Hook
   */
  function useStateGetter(): () => T {
    const { getState } = useOptimizedContext();
    return getState;
  }

  return {
    Context,
    OptimizedProvider,
    useOptimizedContext,
    useSelector,
    useDispatch,
    useStateGetter,
  };
}

/**
 * 创建分片Context
 * 用于将大型状态分割成多个独立的Context
 */
export function createSlicedContext<T>(
  slices: Record<string, (state: T) => any>
) {
  const contexts: Record<string, any> = {};

  Object.entries(slices).forEach(([sliceName, sliceSelector]) => {
    const { Context, OptimizedProvider, useSelector } = createOptimizedContext<any>(null);

    function SlicedProvider({
      children,
      parentContext,
    }: {
      children: React.ReactNode;
      parentContext: React.Context<ContextValue<T>>;
    }) {
      const parentValue = useContext(parentContext);
      if (!parentValue) {
        throw new Error('SlicedProvider must be used within a parent context');
      }

      const sliceState = sliceSelector(parentValue.state);
      const sliceDispatch = parentValue.dispatch;

      const contextValue = useMemo(() => ({
        state: sliceState,
        dispatch: sliceDispatch,
        subscribe: parentValue.subscribe,
        getState: () => sliceSelector(parentValue.getState()),
      }), [sliceState, sliceDispatch, parentValue]);

      return (
        <Context.Provider value={contextValue}>
          {children}
        </Context.Provider>
      );
    }

    function useSliceSelector<R>(
      selector: (sliceState: any) => R,
      equalityFn: (a: R, b: R) => boolean = Object.is
    ): R {
      return useSelector(selector, equalityFn);
    }

    contexts[sliceName] = {
      Context,
      SlicedProvider,
      useSliceSelector,
    };
  });

  return contexts;
}

/**
 * 记忆化选择器工厂
 */
export function createSelectorFactory() {
  const cache = new Map<string, any>();

  function createSelector<T, R>(
    selector: (state: T) => R,
    equalityFn: (a: R, b: R) => boolean = Object.is
  ): (state: T) => R {
    const selectorId = Math.random().toString(36).substr(2, 9);

    return (state: T) => {
      const cacheKey = `${selectorId}-${JSON.stringify(state)}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = selector(state);
      cache.set(cacheKey, result);

      // 简单的LRU缓存清理
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    };
  }

  function clearCache() {
    cache.clear();
  }

  return { createSelector, clearCache };
}

/**
 * 深度比较选择器
 */
export function createDeepSelector<T, R>(
  selector: (state: T) => R
): (state: T) => R {
  const memoCache = new Map<string, R>();

  return (state: T) => {
    const stateString = JSON.stringify(state);

    if (memoCache.has(stateString)) {
      return memoCache.get(stateString)!;
    }

    const result = selector(state);
    memoCache.set(stateString, result);

    if (memoCache.size > 50) {
      const firstKey = memoCache.keys().next().value;
      memoCache.delete(firstKey);
    }

    return result;
  };
}

/**
 * 防抖选择器
 */
export function createDebouncedSelector<T, R>(
  selector: (state: T) => R,
  delay: number = 300
): (state: T) => R {
  let timeoutId: number | null = null;
  let lastResult: R | null = null;
  let lastState: T | null = null;

  return (state: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (state === lastState) {
      return lastResult!;
    }

    return new Promise<R>((resolve) => {
      timeoutId = window.setTimeout(() => {
        const result = selector(state);
        lastResult = result;
        lastState = state;
        resolve(result);
      }, delay);
    });
  };
}

/**
 * 节流选择器
 */
export function createThrottledSelector<T, R>(
  selector: (state: T) => R,
  delay: number = 300
): (state: T) => R {
  let lastResult: R | null = null;
  let lastExecTime = 0;

  return (state: T) => {
    const now = Date.now();

    if (now - lastExecTime > delay) {
      lastResult = selector(state);
      lastExecTime = now;
    }

    return lastResult!;
  };
}

// 临时导入以修复类型错误
import { useState, useRef } from 'react';