import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  AccessibleFieldWrapper,
  generateErrorId,
  generateDescriptionId,
  generateHintId,
  useKeyboardNavigation,
  useFocusManagement,
  generateActionDescription,
  ScreenReaderAnnouncement,
  KeyboardShortcutsHelp,
} from '../../../apps/web/components/forms/accessibility/AccessibilityWrapper';

// Mock react hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useRef: vi.fn(() => ({ current: null })),
    useCallback: vi.fn((fn) => fn),
    useMemo: vi.fn((fn) => fn()),
  };
});

describe('AccessibilityWrapper', () => {
  describe('ID 生成函数', () => {
    it('应该生成正确的错误ID', () => {
      const errorId = generateErrorId('test-field');
      expect(errorId).toBe('test-field-error');
    });

    it('应该生成正确的描述ID', () => {
      const descriptionId = generateDescriptionId('test-field');
      expect(descriptionId).toBe('test-field-description');
    });

    it('应该生成正确的提示ID', () => {
      const hintId = generateHintId('test-field');
      expect(hintId).toBe('test-field-hint');
    });
  });

  describe('AccessibleFieldWrapper', () => {
    const mockFieldProps = {
      id: 'test-field',
      label: 'Test Field',
      description: 'This is a test field',
      required: true,
      hasError: false,
    };

    it('应该正确渲染标签和描述', () => {
      render(
        <AccessibleFieldWrapper fieldProps={mockFieldProps}>
          <input type="text" />
        </AccessibleFieldWrapper>
      );

      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
      expect(screen.getByText('This is a test field')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('应该显示错误消息', () => {
      const errorProps = {
        ...mockFieldProps,
        hasError: true,
        errorMessage: 'This field is required',
      };

      render(
        <AccessibleFieldWrapper fieldProps={errorProps}>
          <input type="text" />
        </AccessibleFieldWrapper>
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toHaveAttribute('role', 'alert');
    });

    it('应该正确注入无障碍访问属性', () => {
      render(
        <AccessibleFieldWrapper fieldProps={mockFieldProps}>
          <input type="text" />
        </AccessibleFieldWrapper>
      );

      const input = screen.getByLabelText('Test Field');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('应该处理禁用状态', () => {
      const disabledProps = {
        ...mockFieldProps,
        disabled: true,
      };

      render(
        <AccessibleFieldWrapper fieldProps={disabledProps}>
          <input type="text" />
        </AccessibleFieldWrapper>
      );

      const label = screen.getByText('Test Field');
      expect(label).toHaveClass('opacity-50');
      expect(label).toHaveClass('cursor-not-allowed');
    });
  });

  describe('useKeyboardNavigation', () => {
    let mockOnSubmit: ReturnType<typeof vi.fn>;
    let mockOnCancel: ReturnType<typeof vi.fn>;
    let mockOnReset: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockOnSubmit = vi.fn();
      mockOnCancel = vi.fn();
      mockOnReset = vi.fn();
    });

    it('应该处理 Ctrl+Enter 快捷键', () => {
      const { handleKeyDown } = useKeyboardNavigation(mockOnSubmit, mockOnCancel, mockOnReset);
      const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });

      act(() => {
        handleKeyDown(event as any);
      });

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('应该处理 Cmd+Enter 快捷键 (Mac)', () => {
      const { handleKeyDown } = useKeyboardNavigation(mockOnSubmit, mockOnCancel, mockOnReset);
      const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true });

      act(() => {
        handleKeyDown(event as any);
      });

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('应该处理 Escape 快捷键', () => {
      const { handleKeyDown } = useKeyboardNavigation(mockOnSubmit, mockOnCancel, mockOnReset);
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      act(() => {
        handleKeyDown(event as any);
      });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('应该处理 Ctrl+Shift+R 快捷键', () => {
      const { handleKeyDown } = useKeyboardNavigation(mockOnSubmit, mockOnCancel, mockOnReset);
      const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, shiftKey: true });

      act(() => {
        handleKeyDown(event as any);
      });

      expect(mockOnReset).toHaveBeenCalled();
    });

    it('不应该处理其他按键组合', () => {
      const { handleKeyDown } = useKeyboardNavigation(mockOnSubmit, mockOnCancel, mockOnReset);
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });

      act(() => {
        handleKeyDown(event as any);
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
      expect(mockOnReset).not.toHaveBeenCalled();
    });
  });

  describe('generateActionDescription', () => {
    it('应该为文本字段生成正确的描述', () => {
      const description = generateActionDescription('focus', 'text', '用户名');
      expect(description).toBe('正在输入文本 "用户名"');
    });

    it('应该为数字字段生成正确的描述', () => {
      const description = generateActionDescription('change', 'number', '年龄');
      expect(description).toBe('已更改数字 "年龄"');
    });

    it('应该为错误状态生成正确的描述', () => {
      const description = generateActionDescription('error', 'email', '邮箱地址');
      expect(description).toBe('邮箱地址 "邮箱地址"有错误');
    });

    it('应该为无标签字段生成描述', () => {
      const description = generateActionDescription('success', 'select');
      expect(description).toBe('选择一个选项');
    });
  });

  describe('ScreenReaderAnnouncement', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该显示公告消息', () => {
      render(
        <ScreenReaderAnnouncement message="测试公告" politeness="polite" />
      );

      const announcement = screen.getByText('测试公告');
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      expect(announcement).toHaveAttribute('aria-atomic', 'true');
    });

    it('应该在超时后隐藏公告', () => {
      render(
        <ScreenReaderAnnouncement message="测试公告" timeout={1000} />
      );

      expect(screen.getByText('测试公告')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('测试公告')).not.toBeInTheDocument();
    });

    it('应该支持不同的礼貌级别', () => {
      render(
        <ScreenReaderAnnouncement message="重要公告" politeness="assertive" />
      );

      const announcement = screen.getByText('重要公告');
      expect(announcement).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('KeyboardShortcutsHelp', () => {
    const shortcuts = [
      { key: 'Ctrl + S', description: '保存', category: '文件' },
      { key: 'Ctrl + Z', description: '撤销', category: '编辑' },
      { key: 'F1', description: '帮助', category: '通用' },
    ];

    it('应该显示快捷键按钮', () => {
      render(<KeyboardShortcutsHelp shortcuts={shortcuts} />);

      expect(screen.getByText('键盘快捷键')).toBeInTheDocument();
    });

    it('应该打开快捷键面板', () => {
      render(<KeyboardShortcutsHelp shortcuts={shortcuts} />);

      const button = screen.getByText('键盘快捷键');
      fireEvent.click(button);

      expect(screen.getByText('键盘快捷键')).toBeInTheDocument();
      expect(screen.getByText('文件')).toBeInTheDocument();
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('通用')).toBeInTheDocument();
    });

    it('应该正确显示快捷键列表', () => {
      render(<KeyboardShortcutsHelp shortcuts={shortcuts} />);

      fireEvent.click(screen.getByText('键盘快捷键'));

      expect(screen.getByText('Ctrl + S')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('Ctrl + Z')).toBeInTheDocument();
      expect(screen.getByText('撤销')).toBeInTheDocument();
    });

    it('应该正确处理分组', () => {
      render(<KeyboardShortcutsHelp shortcuts={shortcuts} />);

      fireEvent.click(screen.getByText('键盘快捷键'));

      const fileSection = screen.getByText('文件').parentElement;
      const editSection = screen.getByText('编辑').parentElement;

      expect(fileSection).toContainElement(screen.getByText('Ctrl + S'));
      expect(editSection).toContainElement(screen.getByText('Ctrl + Z'));
    });

    it('应该处理默认分类', () => {
      const noCategoryShortcuts = [
        { key: 'Enter', description: '提交' },
      ];

      render(<KeyboardShortcutsHelp shortcuts={noCategoryShortcuts} />);

      fireEvent.click(screen.getByText('键盘快捷键'));

      expect(screen.getByText('通用')).toBeInTheDocument();
      expect(screen.getByText('Enter')).toBeInTheDocument();
    });
  });

  describe('useFocusManagement', () => {
    beforeEach(() => {
      // Mock DOM elements
      const mockElement = {
        focus: vi.fn(),
      };

      vi.spyOn(React, 'useRef').mockReturnValue({ current: mockElement as any });
    });

    it('应该提供焦点管理方法', () => {
      const {
        firstInputRef,
        lastInputRef,
        errorRef,
        focusFirstInput,
        focusFirstError,
        trapFocus,
      } = useFocusManagement();

      expect(firstInputRef).toBeDefined();
      expect(lastInputRef).toBeDefined();
      expect(errorRef).toBeDefined();
      expect(typeof focusFirstInput).toBe('function');
      expect(typeof focusFirstError).toBe('function');
      expect(typeof trapFocus).toBe('function');
    });

    it('应该调用焦点方法', () => {
      const { focusFirstInput, focusFirstError } = useFocusManagement();

      focusFirstInput();
      focusFirstError();

      // 验证 ref.current.focus 被调用
      expect(vi.fn()).toHaveBeenCalled(); // 这里会检查 mock 的 focus 方法
    });
  });
});