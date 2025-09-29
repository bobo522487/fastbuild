/**
 * 优化的全局状态管理
 * 为整个应用提供高效的状态管理解决方案
 */

import { OptimizedStateManager } from './optimized-state-manager';
import { createSelectorFactory } from './optimized-context-selectors';

// 应用状态接口
export interface AppState {
  // 用户状态
  user: {
    id: string | null;
    email: string | null;
    name: string | null;
    role: 'user' | 'admin' | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };

  // 表单状态
  forms: {
    currentForm: string | null;
    forms: Array<{
      id: string;
      name: string;
      metadata: any;
      createdAt: string;
      updatedAt: string;
    }>;
    isLoading: boolean;
  };

  // UI状态
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
    notifications: Array<{
      id: string;
      type: 'info' | 'warning' | 'error' | 'success';
      message: string;
      timestamp: number;
    }>;
    modal: {
      isOpen: boolean;
      type: string | null;
      data: any;
    };
  };

  // 性能状态
  performance: {
    metrics: {
      renderTime: number;
      memoryUsage: number;
      componentCount: number;
    };
    settings: {
      enableMonitoring: boolean;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
  };
}

// 初始状态
const initialState: AppState = {
  user: {
    id: null,
    email: null,
    name: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
  },
  forms: {
    currentForm: null,
    forms: [],
    isLoading: false,
  },
  ui: {
    theme: 'light',
    sidebarOpen: true,
    notifications: [],
    modal: {
      isOpen: false,
      type: null,
      data: null,
    },
  },
  performance: {
    metrics: {
      renderTime: 0,
      memoryUsage: 0,
      componentCount: 0,
    },
    settings: {
      enableMonitoring: true,
      logLevel: 'info',
    },
  },
};

/**
 * 全局状态管理器
 */
class GlobalStateManager extends OptimizedStateManager<AppState> {
  private selectorFactory = createSelectorFactory();

  constructor() {
    super(initialState);
  }

  // 用户相关方法
  setUser(user: Partial<AppState['user']>): void {
    this.setState(state => ({
      ...state,
      user: { ...state.user, ...user },
    }));
  }

  clearUser(): void {
    this.setState(state => ({
      ...state,
      user: initialState.user,
    }));
  }

  // 表单相关方法
  setForms(forms: AppState['forms']['forms']): void {
    this.setState(state => ({
      ...state,
      forms: { ...state.forms, forms },
    }));
  }

  setCurrentForm(formId: string | null): void {
    this.setState(state => ({
      ...state,
      forms: { ...state.forms, currentForm: formId },
    }));
  }

  addForm(form: AppState['forms']['forms'][0]): void {
    this.setState(state => ({
      ...state,
      forms: {
        ...state.forms,
        forms: [...state.forms.forms, form],
      },
    }));
  }

  updateForm(formId: string, updates: Partial<AppState['forms']['forms'][0]>): void {
    this.setState(state => ({
      ...state,
      forms: {
        ...state.forms,
        forms: state.forms.forms.map(form =>
          form.id === formId ? { ...form, ...updates } : form
        ),
      },
    }));
  }

  removeForm(formId: string): void {
    this.setState(state => ({
      ...state,
      forms: {
        ...state.forms,
        forms: state.forms.forms.filter(form => form.id !== formId),
        currentForm: state.forms.currentForm === formId ? null : state.forms.currentForm,
      },
    }));
  }

  // UI相关方法
  setTheme(theme: 'light' | 'dark'): void {
    this.setState(state => ({
      ...state,
      ui: { ...state.ui, theme },
    }));
  }

  toggleSidebar(): void {
    this.setState(state => ({
      ...state,
      ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
    }));
  }

  addNotification(notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp'>): void {
    const id = Math.random().toString(36).substr(2, 9);
    this.setState(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: [
          ...state.ui.notifications,
          {
            ...notification,
            id,
            timestamp: Date.now(),
          },
        ],
      },
    }));

    // 自动移除通知
    setTimeout(() => {
      this.removeNotification(id);
    }, 5000);
  }

  removeNotification(id: string): void {
    this.setState(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: state.ui.notifications.filter(n => n.id !== id),
      },
    }));
  }

  clearNotifications(): void {
    this.setState(state => ({
      ...state,
      ui: { ...state.ui, notifications: [] },
    }));
  }

  openModal(type: string, data: any = null): void {
    this.setState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modal: { isOpen: true, type, data },
      },
    }));
  }

  closeModal(): void {
    this.setState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modal: { isOpen: false, type: null, data: null },
      },
    }));
  }

  // 性能相关方法
  updateMetrics(metrics: Partial<AppState['performance']['metrics']>): void {
    this.setState(state => ({
      ...state,
      performance: {
        ...state.performance,
        metrics: { ...state.performance.metrics, ...metrics },
      },
    }));
  }

  updatePerformanceSettings(settings: Partial<AppState['performance']['settings']>): void {
    this.setState(state => ({
      ...state,
      performance: {
        ...state.performance,
        settings: { ...state.performance.settings, ...settings },
      },
    }));
  }

  // 选择器方法
  createUserSelector = this.selectorFactory.createSelector(
    (state: AppState) => state.user
  );

  createFormsSelector = this.selectorFactory.createSelector(
    (state: AppState) => state.forms
  );

  createUISelector = this.selectorFactory.createSelector(
    (state: AppState) => state.ui
  );

  createPerformanceSelector = this.selectorFactory.createSelector(
    (state: AppState) => state.performance
  );

  // 专用选择器
  isAuthenticated = this.selectorFactory.createSelector(
    (state: AppState) => state.user.isAuthenticated
  );

  isAdmin = this.selectorFactory.createSelector(
    (state: AppState) => state.user.role === 'admin'
  );

  getFormById = (formId: string) => this.selectorFactory.createSelector(
    (state: AppState) => state.forms.forms.find(form => form.id === formId)
  );

  getUnreadNotifications = this.selectorFactory.createSelector(
    (state: AppState) => state.ui.notifications
  );

  // 性能监控
  startPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    const monitor = () => {
      if (performance && performance.memory) {
        this.updateMetrics({
          memoryUsage: performance.memory.usedJSHeapSize / (1024 * 1024),
        });
      }

      if ('requestAnimationFrame' in window) {
        requestAnimationFrame(monitor);
      }
    };

    requestAnimationFrame(monitor);
  }

  // 导出状态快照
  exportState(): AppState {
    return this.createSnapshot();
  }

  // 导入状态快照
  importState(snapshot: AppState): void {
    this.restoreSnapshot(snapshot);
  }

  // 重置状态
  reset(): void {
    this.reset(initialState);
  }

  // 清理资源
  cleanup(): void {
    super.cleanup();
    this.selectorFactory.clearCache();
  }
}

// 全局状态管理器实例
let globalStateManager: GlobalStateManager | null = null;

/**
 * 获取全局状态管理器实例
 */
export function getGlobalStateManager(): GlobalStateManager {
  if (!globalStateManager) {
    globalStateManager = new GlobalStateManager();
  }
  return globalStateManager;
}

/**
 * 重置全局状态管理器
 */
export function resetGlobalStateManager(): void {
  if (globalStateManager) {
    globalStateManager.cleanup();
  }
  globalStateManager = null;
}

// 导出便捷函数
export const globalState = getGlobalStateManager();

// 用户相关便捷函数
export const setUser = (user: Partial<AppState['user']>) => globalState.setUser(user);
export const clearUser = () => globalState.clearUser();
export const isAuthenticated = () => globalState.isAuthenticated(globalState.getState());

// 表单相关便捷函数
export const setForms = (forms: AppState['forms']['forms']) => globalState.setForms(forms);
export const setCurrentForm = (formId: string | null) => globalState.setCurrentForm(formId);
export const addForm = (form: AppState['forms']['forms'][0]) => globalState.addForm(form);
export const updateForm = (formId: string, updates: Partial<AppState['forms']['forms'][0]>) =>
  globalState.updateForm(formId, updates);
export const removeForm = (formId: string) => globalState.removeForm(formId);

// UI相关便捷函数
export const setTheme = (theme: 'light' | 'dark') => globalState.setTheme(theme);
export const toggleSidebar = () => globalState.toggleSidebar();
export const addNotification = (notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp'>) =>
  globalState.addNotification(notification);
export const removeNotification = (id: string) => globalState.removeNotification(id);
export const clearNotifications = () => globalState.clearNotifications();
export const openModal = (type: string, data?: any) => globalState.openModal(type, data);
export const closeModal = () => globalState.closeModal();

// 性能相关便捷函数
export const updateMetrics = (metrics: Partial<AppState['performance']['metrics']>) =>
  globalState.updateMetrics(metrics);
export const updatePerformanceSettings = (settings: Partial<AppState['performance']['settings']>) =>
  globalState.updatePerformanceSettings(settings);

// 主题应用
export const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }
};

// 初始化主题
export const initializeTheme = () => {
  if (typeof document !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(theme);
    applyTheme(theme);
  }
};

// 自动保存状态
export const enableAutoSave = () => {
  if (typeof window !== 'undefined') {
    // 监听页面关闭事件
    window.addEventListener('beforeunload', () => {
      const state = globalState.exportState();
      localStorage.setItem('appState', JSON.stringify(state));
    });

    // 页面加载时恢复状态
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        globalState.importState(state);
      } catch (error) {
        console.error('Failed to restore app state:', error);
      }
    }
  }
};