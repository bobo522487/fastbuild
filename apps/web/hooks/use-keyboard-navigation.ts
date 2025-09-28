'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface KeyboardNavigationOptions {
  enableKeyboardShortcuts?: boolean;
  enableFocusManagement?: boolean;
  enableScreenReaderSupport?: boolean;
  customShortcuts?: Record<string, () => void>;
  onNavigationChange?: (direction: 'next' | 'previous' | 'first' | 'last', targetElement?: Element) => void;
}

export interface KeyboardNavigationState {
  currentIndex: number;
  totalElements: number;
  currentElement: Element | null;
  navigationHistory: Element[];
}

export class NavigationManager {
  private container: HTMLElement;
  private selector: string;
  private elements: Element[] = [];
  private currentIndex: number = -1;
  private shortcuts: Map<string, () => void> = new Map();
  private navigationHistory: Element[] = [];
  private enabled: boolean = true;

  constructor(
    container: HTMLElement,
    selector: string,
    options: KeyboardNavigationOptions = {}
  ) {
    this.container = container;
    this.selector = selector;
    this.initializeElements();
    this.setupKeyboardListeners(options);
    this.setupShortcuts(options.customShortcuts || {});
  }

  private initializeElements(): void {
    this.elements = Array.from(this.container.querySelectorAll(this.selector));
    this.currentIndex = -1;
  }

  private setupKeyboardListeners(options: KeyboardNavigationOptions): void {
    if (!options.enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!this.enabled) return;

      // 检查事件是否在容器内
      const target = event.target as HTMLElement;
      if (!this.container.contains(target)) return;

      const key = event.key.toLowerCase();
      const ctrlKey = event.ctrlKey || event.metaKey;
      const altKey = event.altKey;
      const shiftKey = event.shiftKey;

      // 处理自定义快捷键
      const shortcutKey = `${ctrlKey ? 'ctrl+' : ''}${altKey ? 'alt+' : ''}${shiftKey ? 'shift+' : ''}${key}`;
      if (this.shortcuts.has(shortcutKey)) {
        event.preventDefault();
        this.shortcuts.get(shortcutKey)!();
        return;
      }

      // 处理标准导航键
      switch (key) {
        case 'tab':
          this.handleTabKey(event, shiftKey);
          break;

        case 'arrowdown':
          if (!this.isEditableElement(target)) {
            event.preventDefault();
            this.navigateNext();
          }
          break;

        case 'arrowup':
          if (!this.isEditableElement(target)) {
            event.preventDefault();
            this.navigatePrevious();
          }
          break;

        case 'arrowright':
          if (!this.isEditableElement(target)) {
            event.preventDefault();
            this.navigateNext();
          }
          break;

        case 'arrowleft':
          if (!this.isEditableElement(target)) {
            event.preventDefault();
            this.navigatePrevious();
          }
          break;

        case 'enter':
          this.handleEnterKey(event, target);
          break;

        case 'escape':
          event.preventDefault();
          this.navigateFirst();
          break;

        case 'home':
          if (ctrlKey) {
            event.preventDefault();
            this.navigateFirst();
          }
          break;

        case 'end':
          if (ctrlKey) {
            event.preventDefault();
            this.navigateLast();
          }
          break;

        case 'pageup':
          if (ctrlKey) {
            event.preventDefault();
            this.navigatePrevious();
          }
          break;

        case 'pagedown':
          if (ctrlKey) {
            event.preventDefault();
            this.navigateNext();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 返回清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  private setupShortcuts(customShortcuts: Record<string, () => void>): void {
    // 默认快捷键
    const defaultShortcuts: Record<string, () => void> = {
      'ctrl+enter': () => this.submitForm(),
      'ctrl+s': () => this.saveForm(),
      'ctrl+r': () => this.resetForm(),
      'f1': () => this.showHelp(),
      'h': () => this.showHelp(),
      '/': () => this.focusSearch(),
    };

    // 合并自定义快捷键
    Object.entries({ ...defaultShortcuts, ...customShortcuts }).forEach(([key, callback]) => {
      this.shortcuts.set(key, callback);
    });
  }

  private handleTabKey(event: KeyboardEvent, shiftKey: boolean): void {
    // 让默认的 Tab 行为工作，但我们可以添加额外的逻辑
    setTimeout(() => {
      this.updateCurrentIndex();
    }, 0);
  }

  private handleEnterKey(event: KeyboardEvent, target: HTMLElement): void {
    // 如果是按钮，允许默认行为
    if (target.tagName === 'BUTTON') return;

    // 如果是文本区域，允许默认行为
    if (target.tagName === 'TEXTAREA') return;

    // 如果是多选下拉框，允许默认行为
    if (target.tagName === 'SELECT' && (target as HTMLSelectElement).multiple) return;

    // 否则，阻止默认行为并导航到下一个元素
    event.preventDefault();
    this.navigateNext();
  }

  private isEditableElement(element: Element): boolean {
    const tagName = element.tagName;
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      (element as HTMLElement).isContentEditable
    );
  }

  private updateCurrentIndex(): void {
    const activeElement = document.activeElement;
    const index = this.elements.indexOf(activeElement);
    if (index !== -1) {
      this.currentIndex = index;
      this.addToHistory(activeElement);
    }
  }

  private addToHistory(element: Element): void {
    // 避免重复添加相同元素
    if (this.navigationHistory[this.navigationHistory.length - 1] !== element) {
      this.navigationHistory.push(element);
      // 保持历史记录在合理范围内
      if (this.navigationHistory.length > 50) {
        this.navigationHistory.shift();
      }
    }
  }

  public navigateNext(): void {
    if (this.elements.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.elements.length;
    this.focusCurrentElement('next');
  }

  public navigatePrevious(): void {
    if (this.elements.length === 0) return;

    this.currentIndex = this.currentIndex <= 0
      ? this.elements.length - 1
      : this.currentIndex - 1;
    this.focusCurrentElement('previous');
  }

  public navigateFirst(): void {
    if (this.elements.length === 0) return;

    this.currentIndex = 0;
    this.focusCurrentElement('first');
  }

  public navigateLast(): void {
    if (this.elements.length === 0) return;

    this.currentIndex = this.elements.length - 1;
    this.focusCurrentElement('last');
  }

  private focusCurrentElement(direction: 'next' | 'previous' | 'first' | 'last'): void {
    const element = this.elements[this.currentIndex];
    if (element instanceof HTMLElement) {
      element.focus();
      this.announceFocusChange(element, direction);
    }
  }

  private announceFocusChange(element: Element, direction: string): void {
    // 为屏幕阅读器宣布焦点变化
    const announcer = document.getElementById('keyboard-navigation-announcer');
    if (announcer) {
      const label = this.getElementLabel(element);
      const index = this.currentIndex + 1;
      const total = this.elements.length;
      announcer.textContent = `已${this.getDirectionText(direction)}到: ${label} (${index}/${total})`;
    }
  }

  private getDirectionText(direction: string): string {
    const directionMap = {
      'next': '移动到下一个',
      'previous': '移动到上一个',
      'first': '移动到第一个',
      'last': '移动到最后一个',
    };
    return directionMap[direction as keyof typeof directionMap] || '移动到';
  }

  private getElementLabel(element: Element): string {
    // 获取元素的标签文本
    const label = element.getAttribute('aria-label');
    if (label) return label;

    const labelId = element.getAttribute('aria-labelledby');
    if (labelId) {
      const labelElement = document.getElementById(labelId);
      if (labelElement) return labelElement.textContent || '';
    }

    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder;

    return element.tagName.toLowerCase();
  }

  private submitForm(): void {
    const form = this.container.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }

  private saveForm(): void {
    // 触发表单保存事件
    this.container.dispatchEvent(new CustomEvent('keyboard-save', {
      bubbles: true,
      cancelable: true,
    }));
  }

  private resetForm(): void {
    const form = this.container.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.reset();
    }
  }

  private showHelp(): void {
    // 显示帮助信息
    this.container.dispatchEvent(new CustomEvent('keyboard-help', {
      bubbles: true,
      cancelable: true,
    }));
  }

  private focusSearch(): void {
    const searchInput = this.container.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="搜索"]');
    if (searchInput instanceof HTMLElement) {
      searchInput.focus();
    }
  }

  public registerShortcut(key: string, callback: () => void): void {
    this.shortcuts.set(key.toLowerCase(), callback);
  }

  public unregisterShortcut(key: string): void {
    this.shortcuts.delete(key.toLowerCase());
  }

  public refreshElements(): void {
    this.initializeElements();
  }

  public getState(): KeyboardNavigationState {
    return {
      currentIndex: this.currentIndex,
      totalElements: this.elements.length,
      currentElement: this.elements[this.currentIndex] || null,
      navigationHistory: [...this.navigationHistory],
    };
  }

  public setState(state: Partial<KeyboardNavigationState>): void {
    if (state.currentIndex !== undefined) {
      this.currentIndex = Math.max(-1, Math.min(state.currentIndex, this.elements.length - 1));
    }
    if (state.navigationHistory !== undefined) {
      this.navigationHistory = [...state.navigationHistory];
    }
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public destroy(): void {
    this.elements = [];
    this.shortcuts.clear();
    this.navigationHistory = [];
    this.currentIndex = -1;
    this.enabled = false;
  }
}

export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  options: KeyboardNavigationOptions = {}
) {
  const [state, setState] = useState<KeyboardNavigationState>({
    currentIndex: -1,
    totalElements: 0,
    currentElement: null,
    navigationHistory: [],
  });

  const managerRef = useRef<NavigationManager | null>(null);

  // 初始化导航管理器
  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new NavigationManager(containerRef.current, selector, options);
    managerRef.current = manager;

    // 监听状态变化
    const updateState = () => {
      setState(manager.getState());
    };

    // 定期更新状态
    const interval = setInterval(updateState, 100);

    // 监听容器变化
    const observer = new MutationObserver(() => {
      manager.refreshElements();
      updateState();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'aria-hidden'],
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
      manager.destroy();
    };
  }, [containerRef, selector, JSON.stringify(options)]);

  // 导航函数
  const navigateNext = useCallback(() => {
    managerRef.current?.navigateNext();
  }, []);

  const navigatePrevious = useCallback(() => {
    managerRef.current?.navigatePrevious();
  }, []);

  const navigateFirst = useCallback(() => {
    managerRef.current?.navigateFirst();
  }, []);

  const navigateLast = useCallback(() => {
    managerRef.current?.navigateLast();
  }, []);

  const refresh = useCallback(() => {
    managerRef.current?.refreshElements();
  }, []);

  const registerShortcut = useCallback((key: string, callback: () => void) => {
    managerRef.current?.registerShortcut(key, callback);
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    managerRef.current?.unregisterShortcut(key);
  }, []);

  const enable = useCallback(() => {
    managerRef.current?.enable();
  }, []);

  const disable = useCallback(() => {
    managerRef.current?.disable();
  }, []);

  return {
    state,
    navigateNext,
    navigatePrevious,
    navigateFirst,
    navigateLast,
    refresh,
    registerShortcut,
    unregisterShortcut,
    enable,
    disable,
  };
}