import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { AccessibilityControlPanel } from '../../../apps/web/components/accessibility/AccessibilityControlPanel';

// 模拟本地存储
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// 模拟 window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('AccessibilityControlPanel', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockReload.mockClear();
    // 清理文档样式
    document.documentElement.style.fontSize = '';
    document.documentElement.style.removeProperty('--spacing-factor');
  });

  describe('基本功能', () => {
    it('应该能够打开和关闭控制面板', () => {
      render(<AccessibilityControlPanel />);

      // 初始状态面板应该是关闭的
      expect(screen.queryByText('无障碍控制面板')).not.toBeInTheDocument();

      // 点击触发按钮打开面板
      fireEvent.click(screen.getByText('无障碍设置'));
      expect(screen.getByText('无障碍控制面板')).toBeInTheDocument();

      // 点击关闭按钮
      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(screen.queryByText('无障碍控制面板')).not.toBeInTheDocument();
    });

    it('应该显示正确的触发按钮', () => {
      render(<AccessibilityControlPanel />);

      const triggerButton = screen.getByText('无障碍设置');
      expect(triggerButton).toBeInTheDocument();
      expect(triggerButton).toHaveTextContent('无障碍设置');
      expect(screen.getByText('新')).toBeInTheDocument();
    });
  });

  describe('高对比度控制', () => {
    it('应该包含高对比度切换按钮', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('高对比度模式')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /启用高对比度/ })).toBeInTheDocument();
    });

    it('应该能够切换高对比度状态', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));
      const toggleButton = screen.getByRole('button', { name: /启用高对比度/ });

      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /高对比度已启用/ })).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /启用高对比度/ })).toBeInTheDocument();
    });
  });

  describe('字体大小控制', () => {
    it('应该显示字体大小控制器', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('字体大小')).toBeInTheDocument();
      expect(screen.getByText('调整文本大小以提高可读性')).toBeInTheDocument();
    });

    it('应该能够调整字体大小', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      // 点击不同的字体大小按钮
      fireEvent.click(screen.getByText('大'));
      expect(document.documentElement.style.fontSize).toBe('125%');

      fireEvent.click(screen.getByText('特大'));
      expect(document.documentElement.style.fontSize).toBe('150%');

      fireEvent.click(screen.getByText('标准'));
      expect(document.documentElement.style.fontSize).toBe('100%');
    });

    it('应该保存字体大小设置到本地存储', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));
      fireEvent.click(screen.getByText('大'));

      expect(mockLocalStorage.getItem('accessibility-font-size')).toBe('125');
    });

    it('应该从本地存储加载字体大小设置', () => {
      mockLocalStorage.setItem('accessibility-font-size', '150');

      render(<AccessibilityControlPanel />);

      expect(document.documentElement.style.fontSize).toBe('150%');
    });
  });

  describe('间距控制', () => {
    it('应该显示间距控制器', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('元素间距')).toBeInTheDocument();
      expect(screen.getByText('调整元素间距以改善交互体验')).toBeInTheDocument();
    });

    it('应该能够调整元素间距', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      fireEvent.click(screen.getByText('宽松'));
      expect(document.documentElement.style.getPropertyValue('--spacing-factor')).toBe('1.25');

      fireEvent.click(screen.getByText('很宽松'));
      expect(document.documentElement.style.getPropertyValue('--spacing-factor')).toBe('1.5');
    });

    it('应该保存间距设置到本地存储', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));
      fireEvent.click(screen.getByText('宽松'));

      expect(mockLocalStorage.getItem('accessibility-spacing')).toBe('125');
    });
  });

  describe('动画控制', () => {
    it('应该显示动画控制器', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('动画效果')).toBeInTheDocument();
      expect(screen.getByText('启用或禁用动画以减少干扰')).toBeInTheDocument();
    });

    it('应该能够切换动画状态', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      const animationSwitch = screen.getByRole('switch');

      // 初始状态应该是启用
      expect(animationSwitch).toBeChecked();

      // 禁用动画
      fireEvent.click(animationSwitch);
      expect(animationSwitch).not.toBeChecked();
      expect(document.documentElement).toHaveClass('reduce-motion');

      // 重新启用动画
      fireEvent.click(animationSwitch);
      expect(animationSwitch).toBeChecked();
      expect(document.documentElement).not.toHaveClass('reduce-motion');
    });

    it('应该保存动画设置到本地存储', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      const animationSwitch = screen.getByRole('switch');
      fireEvent.click(animationSwitch);

      expect(mockLocalStorage.getItem('accessibility-animations')).toBe('false');
    });
  });

  describe('键盘快捷键说明', () => {
    it('应该显示键盘快捷键说明', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('键盘快捷键')).toBeInTheDocument();
      expect(screen.getByText('Tab')).toBeInTheDocument();
      expect(screen.getByText('导航到下一个字段')).toBeInTheDocument();
      expect(screen.getByText('Shift + Tab')).toBeInTheDocument();
      expect(screen.getByText('导航到上一个字段')).toBeInTheDocument();
    });

    it('应该包含所有主要的快捷键', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      const expectedShortcuts = [
        'Tab',
        'Shift + Tab',
        'Enter',
        'Ctrl + Enter',
        'Esc',
        'Ctrl + Home',
        'Ctrl + End',
        '?'
      ];

      expectedShortcuts.forEach(shortcut => {
        expect(screen.getByText(shortcut)).toBeInTheDocument();
      });
    });
  });

  describe('重置功能', () => {
    it('应该显示重置按钮', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('重置所有设置')).toBeInTheDocument();
    });

    it('应该能够重置所有设置', () => {
      // 设置一些值
      mockLocalStorage.setItem('accessibility-font-size', '150');
      mockLocalStorage.setItem('accessibility-spacing', '125');
      mockLocalStorage.setItem('accessibility-animations', 'false');
      mockLocalStorage.setItem('high-contrast-enabled', 'true');

      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));
      fireEvent.click(screen.getByText('重置所有设置'));

      // 验证页面被重新加载
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('可访问性统计', () => {
    it('应该显示可访问性统计信息', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('可访问性统计')).toBeInTheDocument();
      expect(screen.getByText('键盘导航:')).toBeInTheDocument();
      expect(screen.getByText('高对比度:')).toBeInTheDocument();
      expect(screen.getByText('字体大小:')).toBeInTheDocument();
      expect(screen.getByText('元素间距:')).toBeInTheDocument();
    });

    it('应该显示正确的状态徽章', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      // 检查各个状态的显示
      expect(screen.getByText('已禁用')).toBeInTheDocument(); // 键盘导航
      expect(screen.getByText('已禁用')).toBeInTheDocument(); // 高对比度
      expect(screen.getByText('100%')).toBeInTheDocument(); // 字体大小
      expect(screen.getByText('100%')).toBeInTheDocument(); // 元素间距
    });
  });

  describe('颜色对比度检查器', () => {
    it('应该显示颜色对比度检查器', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('颜色对比度检查器')).toBeInTheDocument();
    });

    it('应该包含颜色选择器和预览区域', () => {
      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      expect(screen.getByText('前景色 (文字)')).toBeInTheDocument();
      expect(screen.getByText('背景色')).toBeInTheDocument();
      expect(screen.getByText('示例文本效果预览')).toBeInTheDocument();
      expect(screen.getByText('对比度比值:')).toBeInTheDocument();
      expect(screen.getByText('WCAG等级:')).toBeInTheDocument();
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

      render(<AccessibilityControlPanel />);

      fireEvent.click(screen.getByText('无障碍设置'));

      const panel = screen.getByText('无障碍控制面板').closest('div');
      expect(panel).toBeInTheDocument();

      // 面板应该在小屏幕上正确显示
      expect(panel).toHaveClass('w-96');
    });
  });

  describe('错误处理', () => {
    it('应该处理本地存储错误', () => {
      // 模拟本地存储错误
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem = () => {
        throw new Error('Storage error');
      };

      expect(() => {
        render(<AccessibilityControlPanel />);
      }).not.toThrow();

      // 恢复原始函数
      mockLocalStorage.getItem = originalGetItem;
    });

    it('应该处理无效的本地存储值', () => {
      mockLocalStorage.setItem('accessibility-font-size', 'invalid');

      expect(() => {
        render(<AccessibilityControlPanel />);
      }).not.toThrow();

      // 应该使用默认值
      expect(document.documentElement.style.fontSize).toBe('100%');
    });
  });
});