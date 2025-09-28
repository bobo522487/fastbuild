import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 模拟键盘导航表单组件
const KeyboardNavigableForm = ({
  metadata,
  onSubmit,
  isLoading = false,
  className,
  formId = 'test-form',
  enableKeyboardShortcuts = true,
  enableFocusManagement = true,
}: any) => {
  const mockFields = metadata.fields || [];

  const handleSubmit = async (data: any) => {
    await onSubmit(data);
  };

  return (
    <div data-testid="keyboard-navigable-form" className={className}>
      <form id={formId} data-testid="form-element">
        {mockFields.map((field: any) => (
          <div key={field.id} data-testid={`field-${field.name}`}>
            <label htmlFor={`${formId}-${field.name}`}>{field.label}</label>
            {field.type === 'text' && (
              <input
                id={`${formId}-${field.name}`}
                name={field.name}
                type="text"
                placeholder={field.placeholder}
                data-testid={`input-${field.name}`}
                required={field.required}
              />
            )}
            {field.type === 'select' && (
              <select
                id={`${formId}-${field.name}`}
                name={field.name}
                data-testid={`select-${field.name}`}
                required={field.required}
              >
                <option value="">{field.placeholder || '请选择...'}</option>
                {field.options?.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'checkbox' && (
              <input
                id={`${formId}-${field.name}`}
                name={field.name}
                type="checkbox"
                data-testid={`checkbox-${field.name}`}
                required={field.required}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          data-testid="submit-button"
          disabled={isLoading}
        >
          {isLoading ? '提交中...' : '提交表单'}
        </button>
      </form>
    </div>
  );
};

describe('KeyboardNavigableForm', () => {
  const mockOnSubmit = vi.fn();
  const user = userEvent.setup();

  const mockMetadata = {
    version: '1.0.0',
    fields: [
      {
        id: 'name',
        name: 'name',
        type: 'text',
        label: '姓名',
        placeholder: '请输入您的姓名',
        required: true,
      },
      {
        id: 'email',
        name: 'email',
        type: 'text',
        label: '邮箱',
        placeholder: '请输入您的邮箱',
        required: true,
      },
      {
        id: 'gender',
        name: 'gender',
        type: 'select',
        label: '性别',
        placeholder: '请选择性别',
        required: true,
        options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' },
        ],
      },
      {
        id: 'agree',
        name: 'agree',
        type: 'checkbox',
        label: '同意条款',
        required: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue({});
  });

  describe('基本键盘导航', () => {
    it('应该能够使用Tab键在字段间导航', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');
      const genderSelect = screen.getByTestId('select-gender');
      const agreeCheckbox = screen.getByTestId('checkbox-agree');

      // 初始状态，第一个字段应该没有焦点
      expect(nameInput).not.toHaveFocus();

      // 点击第一个字段获取焦点
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 使用Tab键导航到下一个字段
      await user.tab();
      expect(emailInput).toHaveFocus();

      // 继续Tab导航
      await user.tab();
      expect(genderSelect).toHaveFocus();

      await user.tab();
      expect(agreeCheckbox).toHaveFocus();

      // 继续Tab应该回到第一个字段
      await user.tab();
      expect(nameInput).toHaveFocus();
    });

    it('应该能够使用Shift+Tab反向导航', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');
      const genderSelect = screen.getByTestId('select-gender');
      const agreeCheckbox = screen.getByTestId('checkbox-agree');

      // 聚焦到最后一个字段
      await user.click(agreeCheckbox);
      expect(agreeCheckbox).toHaveFocus();

      // 使用Shift+Tab反向导航
      await user.tab({ shift: true });
      expect(genderSelect).toHaveFocus();

      await user.tab({ shift: true });
      expect(emailInput).toHaveFocus();

      await user.tab({ shift: true });
      expect(nameInput).toHaveFocus();
    });

    it('应该能够使用方向键在字段间导航', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      // 点击第一个字段
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 模拟按下向下箭头键
      await user.keyboard('{ArrowDown}');
      expect(emailInput).toHaveFocus();

      // 模拟按下向上箭头键
      await user.keyboard('{ArrowUp}');
      expect(nameInput).toHaveFocus();
    });

    it('应该在输入框中允许正常的方向键操作', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');

      // 点击输入框并输入内容
      await user.click(nameInput);
      await user.type(nameInput, '张三');

      expect(nameInput).toHaveValue('张三');
      expect(nameInput).toHaveFocus();

      // 在输入框中按方向键应该不触发导航
      await user.keyboard('{ArrowLeft}');
      expect(nameInput).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(nameInput).toHaveFocus();
    });
  });

  describe('Enter键处理', () => {
    it('应该在文本字段中按Enter键导航到下一个字段', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 按Enter键应该导航到下一个字段
      await user.keyboard('{Enter}');
      expect(emailInput).toHaveFocus();
    });

    it('应该在按钮上按Enter键触发点击事件', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByTestId('submit-button');

      // 点击按钮获取焦点
      await user.click(submitButton);
      expect(submitButton).toHaveFocus();

      // 按Enter键应该触发提交
      await user.keyboard('{Enter}');
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('应该在多选下拉框中允许正常的Enter键操作', async () => {
      // 这个测试需要模拟多选下拉框的行为
      const metadataWithMultiSelect = {
        ...mockMetadata,
        fields: [
          {
            id: 'interests',
            name: 'interests',
            type: 'select',
            label: '兴趣爱好',
            required: true,
            multiple: true,
            options: [
              { value: 'sports', label: '运动' },
              { value: 'music', label: '音乐' },
            ],
          },
        ],
      };

      render(
        <KeyboardNavigableForm
          metadata={metadataWithMultiSelect}
          onSubmit={mockOnSubmit}
        />
      );

      const select = screen.getByTestId('select-interests');

      await user.click(select);
      expect(select).toHaveFocus();

      // 在多选下拉框中按Enter键不应该导航
      await user.keyboard('{Enter}');
      expect(select).toHaveFocus();
    });
  });

  describe('特殊按键处理', () => {
    it('应该按Esc键返回第一个字段', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      // 聚焦到第二个字段
      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      // 按Esc键应该返回第一个字段
      await user.keyboard('{Escape}');
      expect(nameInput).toHaveFocus();
    });

    it('应该按Ctrl+Enter提交表单', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');

      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 按Ctrl+Enter应该提交表单
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('应该按Home键移动到第一个字段', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      // 按Ctrl+Home应该移动到第一个字段
      await user.keyboard('{Control>}{Home}{/Control}');
      expect(nameInput).toHaveFocus();
    });

    it('应该按End键移动到最后一个字段', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const agreeCheckbox = screen.getByTestId('checkbox-agree');

      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 按Ctrl+End应该移动到最后一个字段
      await user.keyboard('{Control>}{End}{/Control}');
      expect(agreeCheckbox).toHaveFocus();
    });
  });

  describe('快捷键功能', () => {
    it('应该能够显示和隐藏帮助信息', async () => {
      const { container } = render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 按?键应该显示帮助
      await user.keyboard('?');
      // 这里可以检查帮助信息是否显示（取决于实际实现）

      // 再次按?键应该隐藏帮助
      await user.keyboard('?');
    });

    it('应该支持自定义快捷键', async () => {
      const customShortcut = vi.fn();

      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
          customShortcuts={{
            'ctrl+s': customShortcut,
          }}
        />
      );

      // 按Ctrl+S应该触发自定义快捷键
      await user.keyboard('{Control>}{s}{/Control}');
      expect(customShortcut).toHaveBeenCalled();
    });
  });

  describe('焦点管理', () => {
    it('应该正确管理字段焦点状态', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      // 初始状态没有焦点
      expect(nameInput).not.toHaveFocus();
      expect(emailInput).not.toHaveFocus();

      // 点击第一个字段
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 导航到第二个字段
      await user.tab();
      expect(emailInput).toHaveFocus();
      expect(nameInput).not.toHaveFocus();
    });

    it('应该能够启用和禁用键盘导航', async () => {
      const { rerender } = render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
          enableKeyboardShortcuts={true}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      await user.click(nameInput);

      // 键盘导航启用时，方向键应该工作
      await user.keyboard('{ArrowDown}');
      expect(emailInput).toHaveFocus();

      // 禁用键盘导航
      rerender(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
          enableKeyboardShortcuts={false}
        />
      );

      // 重新聚焦到第一个字段
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 键盘导航禁用时，方向键不应该触发导航
      await user.keyboard('{ArrowDown}');
      expect(nameInput).toHaveFocus();
    });
  });

  describe('可访问性', () => {
    it('应该为屏幕阅读器提供正确的ARIA属性', async () => {
      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const form = screen.getByTestId('form-element');
      const nameInput = screen.getByTestId('input-name');

      // 检查基本的ARIA属性
      expect(form).toHaveAttribute('id', 'test-form');
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('应该为屏幕阅读器提供焦点变化通知', async () => {
      // 模拟屏幕阅读器公告器
      const announcer = document.createElement('div');
      announcer.id = 'keyboard-navigation-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);

      render(
        <KeyboardNavigableForm
          metadata={mockMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByTestId('input-name');
      const emailInput = screen.getByTestId('input-email');

      await user.click(nameInput);
      await user.keyboard('{ArrowDown}');

      // 检查屏幕阅读器公告
      expect(announcer.textContent).toContain('已移动到下一个');

      document.body.removeChild(announcer);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的选择器', () => {
      const container = document.createElement('div');
      container.innerHTML = '<input type="text" />';

      expect(() => {
        // 这里应该创建NavigationManager实例但不会抛出错误
        new (require('../../../../hooks/use-keyboard-navigation').NavigationManager)(
          container,
          'input:not-exist'
        );
      }).not.toThrow();
    });

    it('应该处理空的元素列表', () => {
      const container = document.createElement('div');
      container.innerHTML = '<div>没有可导航元素</div>';

      const manager = new (require('../../../../hooks/use-keyboard-navigation').NavigationManager)(
        container,
        'input'
      );

      expect(manager.getState().totalElements).toBe(0);
      expect(manager.getState().currentIndex).toBe(-1);
    });
  });

  describe('性能优化', () => {
    it('应该能够刷新元素列表', () => {
      const container = document.createElement('div');
      container.innerHTML = '<input type="text" id="test1" />';

      const manager = new (require('../../../../hooks/use-keyboard-navigation').NavigationManager)(
        container,
        'input'
      );

      expect(manager.getState().totalElements).toBe(1);

      // 动态添加新元素
      const newInput = document.createElement('input');
      newInput.type = 'text';
      newInput.id = 'test2';
      container.appendChild(newInput);

      // 刷新元素列表
      manager.refreshElements();
      expect(manager.getState().totalElements).toBe(2);
    });

    it('应该管理导航历史记录', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <input type="text" id="test1" />
        <input type="text" id="test2" />
        <input type="text" id="test3" />
      `;

      const manager = new (require('../../../../hooks/use-keyboard-navigation').NavigationManager)(
        container,
        'input'
      );

      // 模拟导航历史
      manager.navigateNext();
      manager.navigateNext();

      const state = manager.getState();
      expect(state.navigationHistory.length).toBeGreaterThan(0);
    });
  });
});