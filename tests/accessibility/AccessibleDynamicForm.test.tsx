import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibleDynamicForm, FormMetadata } from '../../../apps/web/components/forms/AccessibleDynamicForm';

// 模拟提交函数
const mockOnSubmit = vi.fn();

// 测试用的表单元数据
const testMetadata: FormMetadata = {
  version: '1.0.0',
  title: '测试表单',
  description: '这是一个用于测试可访问性功能的表单',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '请输入您的姓名',
      required: true,
      description: '请输入您的真实姓名'
    },
    {
      id: 'email',
      name: 'email',
      type: 'email',
      label: '邮箱',
      placeholder: '请输入您的邮箱',
      required: true,
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      }
    },
    {
      id: 'age',
      name: 'age',
      type: 'number',
      label: '年龄',
      placeholder: '请输入您的年龄',
      required: true,
      validation: {
        min: 18,
        max: 120
      }
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
        { value: 'other', label: '其他' }
      ]
    },
    {
      id: 'bio',
      name: 'bio',
      type: 'textarea',
      label: '个人简介',
      placeholder: '请简单介绍一下自己',
      required: false,
      description: '可选，最多200字'
    },
    {
      id: 'terms',
      name: 'terms',
      type: 'checkbox',
      label: '我同意服务条款',
      required: true
    }
  ]
};

describe('AccessibleDynamicForm', () => {
  let user: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue({});
    user = userEvent.setup();
  });

  describe('基本渲染', () => {
    it('应该正确渲染表单标题和描述', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('测试表单')).toBeInTheDocument();
      expect(screen.getByText('这是一个用于测试可访问性功能的表单')).toBeInTheDocument();
    });

    it('应该正确渲染所有表单字段', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 检查所有字段标签
      expect(screen.getByLabelText('姓名')).toBeInTheDocument();
      expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
      expect(screen.getByLabelText('年龄')).toBeInTheDocument();
      expect(screen.getByLabelText('性别')).toBeInTheDocument();
      expect(screen.getByLabelText('个人简介')).toBeInTheDocument();
      expect(screen.getByLabelText('我同意服务条款')).toBeInTheDocument();
    });

    it('应该正确设置必填字段的ARIA属性', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText('姓名');
      const emailInput = screen.getByLabelText('邮箱');
      const bioTextarea = screen.getByLabelText('个人简介');

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(bioTextarea).toHaveAttribute('aria-required', 'false');
    });
  });

  describe('表单验证', () => {
    it('应该验证必填字段', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 尝试提交空表单
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      // 应该显示验证错误
      expect(screen.getByText('姓名是必填项')).toBeInTheDocument();
      expect(screen.getByText('邮箱是必填项')).toBeInTheDocument();
      expect(screen.getByText('年龄是必填项')).toBeInTheDocument();
      expect(screen.getByText('性别是必填项')).toBeInTheDocument();
      expect(screen.getByText('我同意服务条款是必填项')).toBeInTheDocument();
    });

    it('应该验证邮箱格式', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 输入无效邮箱
      await user.type(screen.getByLabelText('邮箱'), 'invalid-email');
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument();
    });

    it('应该验证数字范围', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 输入超出范围的年龄
      await user.type(screen.getByLabelText('年龄'), '150');
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(screen.getByText('年龄不能大于 120')).toBeInTheDocument();
    });

    it('应该在输入正确值时清除错误', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 先输入无效值
      await user.type(screen.getByLabelText('邮箱'), 'invalid');
      await user.click(screen.getByRole('button', { name: '提交表单' }));
      expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument();

      // 修正为有效值
      await user.clear(screen.getByLabelText('邮箱'));
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');

      // 错误应该被清除
      expect(screen.queryByText('请输入有效的邮箱地址')).not.toBeInTheDocument();
    });
  });

  describe('表单提交', () => {
    it('应该在验证通过时提交表单', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 填写所有必填字段
      await user.type(screen.getByLabelText('姓名'), '张三');
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
      await user.type(screen.getByLabelText('年龄'), '25');
      await user.selectOptions(screen.getByLabelText('性别'), 'male');
      await user.click(screen.getByLabelText('我同意服务条款'));

      // 提交表单
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '张三',
        email: 'test@example.com',
        age: '25',
        gender: 'male',
        bio: '',
        terms: true
      });
    });

    it('应该在提交时显示加载状态', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      // 填写表单
      await user.type(screen.getByLabelText('姓名'), '张三');
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
      await user.type(screen.getByLabelText('年龄'), '25');
      await user.selectOptions(screen.getByLabelText('性别'), 'male');
      await user.click(screen.getByLabelText('我同意服务条款'));

      // 提交表单
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      // 应该显示加载状态
      expect(screen.getByText('提交中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '提交表单' })).toBeDisabled();
    });

    it('应该在提交成功后显示成功消息', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 填写并提交表单
      await user.type(screen.getByLabelText('姓名'), '张三');
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
      await user.type(screen.getByLabelText('年龄'), '25');
      await user.selectOptions(screen.getByLabelText('性别'), 'male');
      await user.click(screen.getByLabelText('我同意服务条款'));
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(screen.getByText('表单提交成功！')).toBeInTheDocument();
    });

    it('应该在提交失败后显示错误消息', async () => {
      mockOnSubmit.mockRejectedValue(new Error('提交失败'));

      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 填写并提交表单
      await user.type(screen.getByLabelText('姓名'), '张三');
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
      await user.type(screen.getByLabelText('年龄'), '25');
      await user.selectOptions(screen.getByLabelText('性别'), 'male');
      await user.click(screen.getByLabelText('我同意服务条款'));
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(screen.getByText('提交失败，请稍后重试')).toBeInTheDocument();
    });
  });

  describe('键盘导航', () => {
    it('应该支持Tab键导航', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
          enableKeyboardNavigation={true}
        />
      );

      const nameInput = screen.getByLabelText('姓名');
      const emailInput = screen.getByLabelText('邮箱');

      // 聚焦到第一个字段
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // 使用Tab键导航
      await user.tab();
      expect(emailInput).toHaveFocus();
    });

    it('应该显示键盘导航状态', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
          enableKeyboardNavigation={true}
        />
      );

      expect(screen.getByText('键盘导航已启用')).toBeInTheDocument();
      expect(screen.getByText('按 Tab 键导航，Enter 键提交')).toBeInTheDocument();
    });
  });

  describe('高对比度模式', () => {
    it('应该在高对比度模式下正确显示', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
          enableHighContrast={true}
        />
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('应该显示可访问性信息', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('无障碍功能')).toBeInTheDocument();
      expect(screen.getByText('键盘导航:')).toBeInTheDocument();
      expect(screen.getByText('高对比度:')).toBeInTheDocument();
      expect(screen.getByText('字体大小:')).toBeInTheDocument();
      expect(screen.getByText('元素间距:')).toBeInTheDocument();
    });
  });

  describe('响应式设计', () => {
    it('应该在移动端正确显示', () => {
      // 模拟移动端视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      // 表单容器应该有响应式类
      const container = screen.getByText('测试表单').closest('div');
      expect(container).toHaveClass('max-w-2xl');
    });
  });

  describe('无障碍功能', () => {
    it('应该为所有输入字段设置正确的ARIA属性', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText('姓名');
      const emailInput = screen.getByLabelText('邮箱');

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('应该在验证失败时更新ARIA属性', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const emailInput = screen.getByLabelText('邮箱');

      // 输入无效邮箱
      await user.type(emailInput, 'invalid');
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('应该为错误消息设置正确的ARIA角色', async () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 触发验证错误
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      const errorMessage = screen.getByText('姓名是必填项').closest('div');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('应该为字段描述设置正确的ARIA属性', () => {
      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText('姓名');
      const description = screen.getByText('请输入您的真实姓名');

      expect(nameInput).toHaveAttribute('aria-describedby');
      expect(description).toBeInTheDocument();
    });
  });

  describe('默认值处理', () => {
    it('应该正确设置字段的默认值', () => {
      const metadataWithDefaults: FormMetadata = {
        ...testMetadata,
        fields: testMetadata.fields.map(field => ({
          ...field,
          defaultValue: field.name === 'name' ? '默认姓名' : undefined
        }))
      };

      render(
        <AccessibleDynamicForm
          metadata={metadataWithDefaults}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('姓名')).toHaveValue('默认姓名');
    });
  });

  describe('错误边界', () => {
    it('应该处理无效的表单元数据', () => {
      const invalidMetadata: FormMetadata = {
        version: '1.0.0',
        fields: []
      };

      expect(() => {
        render(
          <AccessibleDynamicForm
            metadata={invalidMetadata}
            onSubmit={mockOnSubmit}
          />
        );
      }).not.toThrow();
    });

    it('应该处理提交函数抛出的异常', async () => {
      mockOnSubmit.mockRejectedValue(new Error('网络错误'));

      render(
        <AccessibleDynamicForm
          metadata={testMetadata}
          onSubmit={mockOnSubmit}
        />
      );

      // 填写并提交表单
      await user.type(screen.getByLabelText('姓名'), '张三');
      await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
      await user.type(screen.getByLabelText('年龄'), '25');
      await user.selectOptions(screen.getByLabelText('性别'), 'male');
      await user.click(screen.getByLabelText('我同意服务条款'));
      await user.click(screen.getByRole('button', { name: '提交表单' }));

      expect(screen.getByText('提交失败，请稍后重试')).toBeInTheDocument();
    });
  });
});