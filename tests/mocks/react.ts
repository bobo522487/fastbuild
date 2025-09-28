import { vi } from 'vitest';
import React from 'react';

// 统一的 React 模拟配置
export const setupReactMocks = () => {
  vi.mock('react', () => ({
    ...vi.importActual('react'),
    createContext: vi.fn().mockImplementation((defaultValue) => ({
      _currentValue: defaultValue,
      Provider: ({ value, children }: { value: any; children: React.ReactNode }) => {
        // Simple mock implementation
        return React.createElement('div', { 'data-context-value': JSON.stringify(value) }, children);
      },
      Consumer: ({ children }: { children: (value: any) => React.ReactNode }) => {
        return children(vi.mock.contexts?.[vi.mock.contexts?.length - 1] || defaultValue);
      },
    })),
    useContext: vi.fn().mockImplementation((context) => {
      return context._currentValue || context.defaultValue;
    }),
    useState: vi.fn().mockImplementation((initialValue) => {
      let state = initialValue;
      const setState = vi.fn().mockImplementation((newValue) => {
        state = typeof newValue === 'function' ? newValue(state) : newValue;
      });
      return [state, setState];
    }),
    useMemo: vi.fn().mockImplementation((fn, deps) => fn()),
    useCallback: vi.fn().mockImplementation((fn, deps) => fn),
    useEffect: vi.fn().mockImplementation((fn, deps) => {
      // Simple mock for useEffect
      if (deps && deps.some(dep => dep === undefined)) {
        console.warn('useEffect dependency array contains undefined values');
      }
    }),
  }));
};