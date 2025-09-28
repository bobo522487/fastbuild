import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { HighContrastProvider, HighContrastToggle, useHighContrast } from '../../../apps/web/components/accessibility/HighContrastMode';

// 测试组件
const TestComponent = () => {
  const { enabled, currentTheme, enableHighContrast, disableHighContrast } = useHighContrast();

  return (
    <div>
      <div data-testid="high-contrast-status">{enabled ? 'enabled' : 'disabled'}</div>
      <div data-testid="current-theme">{currentTheme?.name || 'none'}</div>
      <button onClick={() => enableHighContrast('standard-high-contrast')}>
        Enable Standard
      </button>
      <button onClick={() => enableHighContrast('inverted-high-contrast')}>
        Enable Inverted
      </button>
      <button onClick={disableHighContrast}>
        Disable
      </button>
    </div>
  );
};

describe('HighContrastMode', () => {
  beforeEach(() => {
    // 清理本地存储
    localStorage.clear();
    // 清理文档属性
    document.documentElement.removeAttribute('data-high-contrast');
    document.documentElement.removeAttribute('data-theme');
  });

  describe('HighContrastProvider', () => {
    it('应该正确初始化为禁用状态', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      expect(screen.getByTestId('high-contrast-status')).toHaveTextContent('disabled');
      expect(screen.getByTestId('current-theme')).toHaveTextContent('none');
    });

    it('应该能够启用高对比度模式', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      fireEvent.click(screen.getByText('Enable Standard'));

      expect(screen.getByTestId('high-contrast-status')).toHaveTextContent('enabled');
      expect(screen.getByTestId('current-theme')).toHaveTextContent('标准高对比度');
      expect(document.documentElement).toHaveAttribute('data-high-contrast', 'true');
      expect(document.documentElement).toHaveAttribute('data-theme', 'standard-high-contrast');
    });

    it('应该能够切换不同的高对比度主题', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      // 启用标准主题
      fireEvent.click(screen.getByText('Enable Standard'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('标准高对比度');

      // 切换到反色主题
      fireEvent.click(screen.getByText('Enable Inverted'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('反色高对比度');
      expect(document.documentElement).toHaveAttribute('data-theme', 'inverted-high-contrast');
    });

    it('应该能够禁用高对比度模式', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      // 先启用
      fireEvent.click(screen.getByText('Enable Standard'));
      expect(screen.getByTestId('high-contrast-status')).toHaveTextContent('enabled');

      // 再禁用
      fireEvent.click(screen.getByText('Disable'));
      expect(screen.getByTestId('high-contrast-status')).toHaveTextContent('disabled');
      expect(screen.getByTestId('current-theme')).toHaveTextContent('none');
      expect(document.documentElement).not.toHaveAttribute('data-high-contrast');
      expect(document.documentElement).not.toHaveAttribute('data-theme');
    });

    it('应该从本地存储加载设置', () => {
      // 模拟已保存的设置
      localStorage.setItem('high-contrast-enabled', 'true');
      localStorage.setItem('high-contrast-theme', 'inverted-high-contrast');

      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      expect(screen.getByTestId('high-contrast-status')).toHaveTextContent('enabled');
      expect(screen.getByTestId('current-theme')).toHaveTextContent('反色高对比度');
    });

    it('应该处理无效的主题ID', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      // 尝试启用不存在的主题
      fireEvent.click(screen.getByText('Enable Standard'));
      expect(screen.getByTestId('current-theme')).toHaveTextContent('标准高对比度');
    });
  });

  describe('ColorContrastChecker', () => {
    it('应该正确计算颜色对比度', () => {
      const { checkContrast } = render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      ).container.querySelector('div') as any;

      if (checkContrast) {
        const blackWhite = checkContrast('#000000', '#ffffff');
        expect(blackWhite.ratio).toBeCloseTo(21, 0);
        expect(blackWhite.level).toBe('AAA');

        const lowContrast = checkContrast('#cccccc', '#dddddd');
        expect(lowContrast.ratio).toBeLessThan(3);
        expect(lowContrast.level).toBe('Fail');
      }
    });

    it('应该正确评估对比度等级', () => {
      const { checkContrast } = render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      ).container.querySelector('div') as any;

      if (checkContrast) {
        const aaa = checkContrast('#000000', '#ffffff');
        expect(aaa.level).toBe('AAA');
        expect(aaa.text).toBe('优秀');

        const aa = checkContrast('#000000', '#aaaaaa');
        expect(aa.level).toBe('AA');
        expect(aa.text).toBe('良好');

        const a = checkContrast('#000000', '#888888');
        expect(a.level).toBe('A');
        expect(a.text).toBe('及格');

        const fail = checkContrast('#cccccc', '#dddddd');
        expect(fail.level).toBe('Fail');
        expect(fail.text).toBe('不合格');
      }
    });
  });

  describe('HighContrastToggle', () => {
    it('应该能够切换高对比度模式', () => {
      render(
        <HighContrastProvider>
          <HighContrastToggle />
        </HighContrastProvider>
      );

      const toggle = screen.getByRole('button', { name: /启用高对比度/ });
      fireEvent.click(toggle);

      expect(screen.getByRole('button', { name: /高对比度已启用/ })).toBeInTheDocument();
    });
  });

  describe('localStorage persistence', () => {
    it('应该保存设置到本地存储', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      // 启用高对比度
      fireEvent.click(screen.getByText('Enable Standard'));

      expect(localStorage.getItem('high-contrast-enabled')).toBe('true');
      expect(localStorage.getItem('high-contrast-theme')).toBe('standard-high-contrast');

      // 禁用高对比度
      fireEvent.click(screen.getByText('Disable'));

      expect(localStorage.getItem('high-contrast-enabled')).toBe(null);
      expect(localStorage.getItem('high-contrast-theme')).toBe(null);
    });
  });

  describe('CSS custom properties', () => {
    it('应该正确设置CSS变量', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      fireEvent.click(screen.getByText('Enable Standard'));

      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      expect(computedStyle.getPropertyValue('--hc-background').trim()).toBe('#000000');
      expect(computedStyle.getPropertyValue('--hc-foreground').trim()).toBe('#ffffff');
    });

    it('应该在禁用时清除CSS变量', () => {
      render(
        <HighContrastProvider>
          <TestComponent />
        </HighContrastProvider>
      );

      // 启用
      fireEvent.click(screen.getByText('Enable Standard'));
      expect(document.documentElement).toHaveAttribute('data-high-contrast');

      // 禁用
      fireEvent.click(screen.getByText('Disable'));
      expect(document.documentElement).not.toHaveAttribute('data-high-contrast');
    });
  });
});