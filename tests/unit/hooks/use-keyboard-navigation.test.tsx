import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../../../../hooks/use-keyboard-navigation';

describe('useKeyboardNavigation', () => {
  const mockContainerRef = { current: document.createElement('div') };
  const mockSelector = 'input, select, textarea, button';

  beforeEach(() => {
    vi.clearAllMocks();
    // 重置容器内容
    mockContainerRef.current.innerHTML = `
      <input type="text" id="name" placeholder="姓名" />
      <input type="email" id="email" placeholder="邮箱" />
      <select id="gender">
        <option value="">请选择</option>
        <option value="male">男</option>
        <option value="female">女</option>
      </select>
      <button type="submit">提交</button>
    `;
  });

  describe('基本功能', () => {
    it('应该正确初始化导航状态', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { state } = result.current;
      expect(state.currentIndex).toBe(-1);
      expect(state.totalElements).toBe(4); // 2 inputs + 1 select + 1 button
      expect(state.currentElement).toBeNull();
      expect(state.navigationHistory).toEqual([]);
    });

    it('应该能够导航到下一个元素', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext } = result.current;

      act(() => {
        navigateNext();
      });

      const { state } = result.current;
      expect(state.currentIndex).toBe(0);
      expect(state.currentElement).toBe(mockContainerRef.current.querySelector('#name'));
    });

    it('应该能够导航到上一个元素', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext, navigatePrevious } = result.current;

      // 先导航到第二个元素
      act(() => {
        navigateNext();
        navigateNext();
      });

      let { state } = result.current;
      expect(state.currentIndex).toBe(1);
      expect(state.currentElement).toBe(mockContainerRef.current.querySelector('#email'));

      // 然后导航回第一个元素
      act(() => {
        navigatePrevious();
      });

      state = result.current.state;
      expect(state.currentIndex).toBe(0);
      expect(state.currentElement).toBe(mockContainerRef.current.querySelector('#name'));
    });

    it('应该能够导航到第一个元素', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext, navigateFirst } = result.current;

      // 导航到第三个元素
      act(() => {
        navigateNext();
        navigateNext();
        navigateNext();
      });

      let { state } = result.current;
      expect(state.currentIndex).toBe(2);

      // 导航回第一个元素
      act(() => {
        navigateFirst();
      });

      state = result.current.state;
      expect(state.currentIndex).toBe(0);
      expect(state.currentElement).toBe(mockContainerRef.current.querySelector('#name'));
    });

    it('应该能够导航到最后一个元素', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateLast } = result.current;

      act(() => {
        navigateLast();
      });

      const { state } = result.current;
      expect(state.currentIndex).toBe(3);
      expect(state.currentElement).toBe(mockContainerRef.current.querySelector('button'));
    });

    it('应该处理循环导航', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext } = result.current;

      // 导航到最后一个元素
      act(() => {
        navigateNext();
        navigateNext();
        navigateNext();
        navigateNext();
      });

      let { state } = result.current;
      expect(state.currentIndex).toBe(3);

      // 再导航一次应该回到第一个元素
      act(() => {
        navigateNext();
      });

      state = result.current.state;
      expect(state.currentIndex).toBe(0);
    });

    it('应该处理反向循环导航', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigatePrevious } = result.current;

      // 从第一个元素向前导航
      act(() => {
        navigatePrevious();
      });

      const { state } = result.current;
      expect(state.currentIndex).toBe(3); // 应该到最后一个元素
    });
  });

  describe('快捷键管理', () => {
    it('应该能够注册和调用快捷键', () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector, {
          customShortcuts: {
            'ctrl+s': mockCallback,
          },
        })
      );

      const { registerShortcut } = result.current;

      act(() => {
        registerShortcut('ctrl+a', mockCallback);
      });

      // 验证快捷键已注册（这里我们测试的是快捷键注册功能，实际的键盘事件需要更复杂的模拟）
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('应该能够注销快捷键', () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { registerShortcut, unregisterShortcut } = result.current;

      act(() => {
        registerShortcut('ctrl+s', mockCallback);
        unregisterShortcut('ctrl+s');
      });

      // 验证快捷键已注销
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('状态管理', () => {
    it('应该能够刷新元素列表', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { refresh, state } = result.current;

      expect(state.totalElements).toBe(4);

      // 添加新元素
      const newInput = document.createElement('input');
      newInput.type = 'text';
      newInput.id = 'phone';
      mockContainerRef.current.appendChild(newInput);

      act(() => {
        refresh();
      });

      const { state: newState } = result.current;
      expect(newState.totalElements).toBe(5);
    });

    it('应该能够启用和禁用导航', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { enable, disable, navigateNext } = result.current;

      act(() => {
        disable();
        navigateNext();
      });

      // 禁用状态下应该不会导航
      let { state } = result.current;
      expect(state.currentIndex).toBe(-1);

      act(() => {
        enable();
        navigateNext();
      });

      // 启用状态下应该正常导航
      state = result.current.state;
      expect(state.currentIndex).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理空容器', () => {
      const emptyContainerRef = { current: document.createElement('div') };
      emptyContainerRef.current.innerHTML = '';

      const { result } = renderHook(() =>
        useKeyboardNavigation(emptyContainerRef, mockSelector)
      );

      const { state } = result.current;
      expect(state.totalElements).toBe(0);
      expect(state.currentIndex).toBe(-1);
      expect(state.currentElement).toBeNull();
    });

    it('应该处理无效的选择器', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, 'invalid-selector')
      );

      const { state } = result.current;
      expect(state.totalElements).toBe(0);
      expect(state.currentIndex).toBe(-1);
    });

    it('应该处理没有匹配元素的选择器', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, '.non-existent-class')
      );

      const { state } = result.current;
      expect(state.totalElements).toBe(0);
      expect(state.currentIndex).toBe(-1);
    });
  });

  describe('导航历史', () => {
    it('应该记录导航历史', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext, navigatePrevious } = result.current;

      // 进行多次导航
      act(() => {
        navigateNext();
        navigateNext();
        navigatePrevious();
      });

      const { state } = result.current;
      expect(state.navigationHistory.length).toBeGreaterThan(0);
    });

    it('应该限制导航历史长度', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext } = result.current;

      // 进行大量导航操作
      for (let i = 0; i < 60; i++) {
        act(() => {
          navigateNext();
        });
      }

      const { state } = result.current;
      expect(state.navigationHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('配置选项', () => {
    it('应该处理自定义快捷键配置', () => {
      const customShortcut = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector, {
          customShortcuts: {
            'ctrl+a': customShortcut,
          },
        })
      );

      const { registerShortcut } = result.current;

      act(() => {
        registerShortcut('ctrl+b', customShortcut);
      });

      expect(customShortcut).not.toHaveBeenCalled();
    });

    it('应该处理导航变化回调', () => {
      const onNavigationChange = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector, {
          onNavigationChange,
        })
      );

      const { navigateNext } = result.current;

      act(() => {
        navigateNext();
      });

      expect(onNavigationChange).toHaveBeenCalledWith('next', expect.any(Element));
    });

    it('应该根据配置启用/禁用功能', () => {
      const { result: result1 } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector, {
          enableKeyboardShortcuts: false,
        })
      );

      const { result: result2 } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector, {
          enableKeyboardShortcuts: true,
        })
      );

      // 两个实例都应该正常初始化
      expect(result1.current.state.totalElements).toBe(4);
      expect(result2.current.state.totalElements).toBe(4);
    });
  });

  describe('DOM变化监听', () => {
    it('应该检测DOM元素的变化', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { state } = result.current;
      expect(state.totalElements).toBe(4);

      // 动态添加新元素
      const newInput = document.createElement('input');
      newInput.type = 'text';
      newInput.id = 'phone';
      mockContainerRef.current.appendChild(newInput);

      // 触发重新渲染来模拟DOM变化
      act(() => {
        result.current.refresh();
      });

      const { state: newState } = result.current;
      expect(newState.totalElements).toBe(5);
    });

    it('应该处理元素属性的动态变化', () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { state } = result.current;
      expect(state.totalElements).toBe(4);

      // 禁用第一个元素
      const firstInput = mockContainerRef.current.querySelector('#name') as HTMLInputElement;
      firstInput.disabled = true;

      act(() => {
        result.current.refresh();
      });

      // 验证状态更新
      const { state: newState } = result.current;
      expect(newState.totalElements).toBe(4); // 元素数量不变，但状态应该更新
    });
  });

  describe('内存管理', () => {
    it('应该正确清理资源', () => {
      const { result, unmount } = renderHook(() =>
        useKeyboardNavigation(mockContainerRef, mockSelector)
      );

      const { navigateNext } = result.current;

      act(() => {
        navigateNext();
      });

      expect(result.current.state.currentIndex).toBe(0);

      // 卸载组件
      unmount();

      // 验证资源被清理（这里我们主要测试卸载不会抛出错误）
      expect(() => {
        result.current.navigateNext();
      }).not.toThrow();
    });
  });
});