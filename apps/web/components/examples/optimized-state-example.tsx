'use client';

import React, { useState, useEffect } from 'react';
import {
  useOptimizedState,
  useOptimizedSelector,
  useBatchUpdate,
  OptimizedStateManager,
} from '@/lib/state/optimized-state-manager';
import {
  useOptimizedFormState,
  OptimizedFormStateManager,
} from '@/lib/state/optimized-form-state';
import {
  globalState,
  setUser,
  addNotification,
  setTheme,
  initializeTheme,
} from '@/lib/state/optimized-global-state';

// 示例表单元数据
const exampleFormMetadata = {
  version: "1.0",
  fields: [
    {
      id: "name",
      name: "name",
      type: "text" as const,
      label: "姓名",
      required: true,
    },
    {
      id: "email",
      name: "email",
      type: "text" as const,
      label: "邮箱",
      required: true,
    },
    {
      id: "age",
      name: "age",
      type: "number" as const,
      label: "年龄",
      required: false,
    },
    {
      id: "subscribe",
      name: "subscribe",
      type: "checkbox" as const,
      label: "订阅邮件",
      required: false,
      defaultValue: false,
    },
  ],
};

// 简单状态管理示例
interface CounterState {
  count: number;
  lastUpdate: string;
  history: number[];
}

const initialState: CounterState = {
  count: 0,
  lastUpdate: new Date().toISOString(),
  history: [],
};

/**
 * 简单状态管理示例组件
 */
export function SimpleStateExample() {
  const [manager] = useState(() => new OptimizedStateManager(initialState));
  const [state, setState] = useOptimizedState(manager);

  // 使用选择器优化性能
  const count = useOptimizedSelector(manager, s => s.count);
  const lastUpdate = useOptimizedSelector(manager, s => s.lastUpdate);
  const historyCount = useOptimizedSelector(manager, s => s.history.length);

  const batchUpdate = useBatchUpdate(manager);

  const increment = () => {
    setState(s => ({
      count: s.count + 1,
      lastUpdate: new Date().toISOString(),
      history: [...s.history.slice(-9), s.count + 1],
    }));
  };

  const decrement = () => {
    setState(s => ({
      count: s.count - 1,
      lastUpdate: new Date().toISOString(),
      history: [...s.history.slice(-9), s.count - 1],
    }));
  };

  const batchIncrement = () => {
    batchUpdate([
      s => ({ count: s.count + 1 }),
      s => ({ lastUpdate: new Date().toISOString() }),
      s => ({ history: [...s.history.slice(-9), s.count + 1] }),
    ]);
  };

  const reset = () => {
    setState(() => initialState);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">简单状态管理示例</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">Count: {count}</span>
          <div className="flex gap-2">
            <button
              onClick={decrement}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              -
            </button>
            <button
              onClick={increment}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              +
            </button>
            <button
              onClick={batchIncrement}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              批量+1
            </button>
            <button
              onClick={reset}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              重置
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <div>最后更新: {new Date(lastUpdate).toLocaleTimeString()}</div>
          <div>历史记录数: {historyCount}</div>
          <div>历史记录: {state.history.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 表单状态管理示例组件
 */
export function FormStateExample() {
  const formState = useOptimizedFormState(exampleFormMetadata);

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      console.log('表单提交:', values);
      addNotification({
        type: 'success',
        message: '表单提交成功！',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: '表单提交失败',
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">表单状态管理示例</h3>

      <form onSubmit={(e) => {
        e.preventDefault();
        formState.submit(handleSubmit);
      }} className="space-y-4">
        {exampleFormMetadata.fields.map(field => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                name={field.name}
                value={formState.values[field.name] || ''}
                onChange={(e) => formState.setFieldValue(field.id, e.target.value)}
                onBlur={() => formState.setFieldTouched(field.id)}
                className={`w-full px-3 py-2 border rounded ${
                  formState.errors[field.name] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                name={field.name}
                value={formState.values[field.name] || ''}
                onChange={(e) => formState.setFieldValue(field.id, Number(e.target.value))}
                onBlur={() => formState.setFieldTouched(field.id)}
                className={`w-full px-3 py-2 border rounded ${
                  formState.errors[field.name] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name={field.name}
                  checked={formState.values[field.name] || false}
                  onChange={(e) => formState.setFieldValue(field.id, e.target.checked)}
                  className="mr-2"
                />
                {field.label}
              </label>
            )}

            {formState.errors[field.name] && (
              <div className="text-red-500 text-sm">{formState.errors[field.name]}</div>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {formState.isSubmitting ? '提交中...' : '提交'}
          </button>
          <button
            type="button"
            onClick={() => formState.reset()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            重置
          </button>
        </div>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <div>表单状态: {formState.isValid ? '有效' : '无效'}</div>
        <div>是否脏: {formState.isDirty ? '是' : '否'}</div>
        <div>错误数: {Object.values(formState.errors).filter(Boolean).length}</div>
      </div>
    </div>
  );
}

/**
 * 全局状态管理示例组件
 */
export function GlobalStateExample() {
  // 使用全局状态的选择器
  const user = useOptimizedSelector(globalState, s => s.user);
  const theme = useOptimizedSelector(globalState, s => s.ui.theme);
  const notifications = useOptimizedSelector(globalState, s => s.ui.notifications);

  useEffect(() => {
    initializeTheme();
  }, []);

  const handleLogin = () => {
    setUser({
      id: '1',
      email: 'user@example.com',
      name: '测试用户',
      role: 'user',
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const handleLogout = () => {
    clearUser();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const addTestNotification = () => {
    const types = ['info', 'warning', 'error', 'success'] as const;
    const randomType = types[Math.floor(Math.random() * types.length)];

    addNotification({
      type: randomType!,
      message: `这是一条${randomType}类型的测试通知`,
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">全局状态管理示例</h3>

      <div className="space-y-4">
        {/* 用户状态 */}
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">用户状态</h4>
          <div className="text-sm space-y-1">
            <div>认证状态: {user.isAuthenticated ? '已认证' : '未认证'}</div>
            {user.isAuthenticated && (
              <>
                <div>用户名: {user.name}</div>
                <div>邮箱: {user.email}</div>
                <div>角色: {user.role}</div>
              </>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            {user.isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                登出
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                登录
              </button>
            )}
          </div>
        </div>

        {/* 主题状态 */}
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">主题状态</h4>
          <div className="text-sm">
            当前主题: {theme}
          </div>
          <button
            onClick={toggleTheme}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            切换主题
          </button>
        </div>

        {/* 通知状态 */}
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">通知 ({notifications.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`text-xs p-2 rounded ${
                  notification.type === 'error' ? 'bg-red-100 text-red-700' :
                  notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  notification.type === 'success' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}
              >
                {notification.message}
                <div className="text-gray-500 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addTestNotification}
            className="mt-2 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            添加测试通知
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 性能对比示例组件
 */
export function PerformanceComparison() {
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(c => c + 1);
  });

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">性能对比示例</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SimpleStateExample />
        <FormStateExample />
        <GlobalStateExample />
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <div className="font-medium mb-2">性能指标:</div>
        <div>容器渲染次数: {renderCount}</div>
        <div>各个子组件独立渲染，不会相互影响</div>
        <div>使用选择器避免不必要的重渲染</div>
      </div>
    </div>
  );
}

// 修复导入错误
import { clearUser } from '@/lib/state/optimized-global-state';
import { applyTheme } from '@/lib/state/optimized-global-state';