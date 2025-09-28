'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Switch } from '@workspace/ui/components/switch';
import { Slider } from '@workspace/ui/components/slider';
import { Separator } from '@workspace/ui/components/separator';
import {
  HighContrastProvider,
  HighContrastToggle,
  HighContrastThemeSelector,
  useHighContrast,
  ContrastChecker
} from './HighContrastMode';

// 字体大小控制Hook
function useFontSize() {
  const [fontSize, setFontSize] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-font-size');
      return saved ? parseInt(saved) : 100;
    }
    return 100;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}%`;
    localStorage.setItem('accessibility-font-size', fontSize.toString());
  }, [fontSize]);

  return { fontSize, setFontSize };
}

// 间距控制Hook
function useSpacing() {
  const [spacing, setSpacing] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-spacing');
      return saved ? parseInt(saved) : 100;
    }
    return 100;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--spacing-factor', (spacing / 100).toString());
    localStorage.setItem('accessibility-spacing', spacing.toString());
  }, [spacing]);

  return { spacing, setSpacing };
}

// 动画控制Hook
function useAnimations() {
  const [animationsEnabled, setAnimationsEnabled] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-animations');
      return saved !== 'false';
    }
    return true;
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (animationsEnabled) {
      root.style.removeProperty('--reduce-motion');
      root.classList.remove('reduce-motion');
    } else {
      root.style.setProperty('--reduce-motion', 'reduce');
      root.classList.add('reduce-motion');
    }
    localStorage.setItem('accessibility-animations', animationsEnabled.toString());
  }, [animationsEnabled]);

  return { animationsEnabled, setAnimationsEnabled };
}

// 字体大小控制器
function FontSizeControl() {
  const { fontSize, setFontSize } = useFontSize();

  const sizeOptions = [
    { value: 75, label: '小', description: '适合小屏幕' },
    { value: 100, label: '标准', description: '默认大小' },
    { value: 125, label: '大', description: '易于阅读' },
    { value: 150, label: '特大', description: '视觉障碍友好' },
    { value: 200, label: '最大', description: '重度视觉障碍' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">字体大小</h4>
          <p className="text-sm text-muted-foreground">
            调整文本大小以提高可读性
          </p>
        </div>
        <Badge variant="outline">{fontSize}%</Badge>
      </div>

      <Slider
        value={[fontSize]}
        onValueChange={(value) => setFontSize(value[0])}
        min={75}
        max={200}
        step={25}
        className="w-full"
      />

      <div className="grid grid-cols-5 gap-2">
        {sizeOptions.map((option) => (
          <Button
            key={option.value}
            variant={fontSize === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFontSize(option.value)}
            className="text-xs h-8"
            title={option.description}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 间距控制器
function SpacingControl() {
  const { spacing, setSpacing } = useSpacing();

  const spacingOptions = [
    { value: 75, label: '紧凑', description: '节省空间' },
    { value: 100, label: '标准', description: '默认间距' },
    { value: 125, label: '宽松', description: '易于点击' },
    { value: 150, label: '很宽松', description: '运动障碍友好' },
    { value: 200, label: '最宽松', description: '重度运动障碍' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">元素间距</h4>
          <p className="text-sm text-muted-foreground">
            调整元素间距以改善交互体验
          </p>
        </div>
        <Badge variant="outline">{spacing}%</Badge>
      </div>

      <Slider
        value={[spacing]}
        onValueChange={(value) => setSpacing(value[0])}
        min={75}
        max={200}
        step={25}
        className="w-full"
      />

      <div className="grid grid-cols-5 gap-2">
        {spacingOptions.map((option) => (
          <Button
            key={option.value}
            variant={spacing === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSpacing(option.value)}
            className="text-xs h-8"
            title={option.description}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 动画控制器
function AnimationControl() {
  const { animationsEnabled, setAnimationsEnabled } = useAnimations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">动画效果</h4>
          <p className="text-sm text-muted-foreground">
            启用或禁用动画以减少干扰
          </p>
        </div>
        <Switch
          checked={animationsEnabled}
          onCheckedChange={setAnimationsEnabled}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {animationsEnabled ? (
          <span>动画已启用 - 页面包含过渡和动画效果</span>
        ) : (
          <span>动画已禁用 - 减少视觉干扰，适合注意力障碍用户</span>
        )}
      </div>
    </div>
  );
}

// 快捷键说明
function KeyboardShortcuts() {
  const shortcuts = [
    { key: 'Tab', description: '导航到下一个字段' },
    { key: 'Shift + Tab', description: '导航到上一个字段' },
    { key: 'Enter', description: '在文本字段中导航到下一个字段' },
    { key: 'Ctrl + Enter', description: '提交表单' },
    { key: 'Esc', description: '返回第一个字段' },
    { key: 'Ctrl + Home', description: '移动到第一个字段' },
    { key: 'Ctrl + End', description: '移动到最后一个字段' },
    { key: '?', description: '显示/隐藏帮助信息' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium">键盘快捷键</h4>
      <div className="grid gap-2 text-sm">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between">
            <kbd className="px-2 py-1 text-xs bg-muted border rounded">
              {shortcut.key}
            </kbd>
            <span className="text-muted-foreground">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 可访问性统计信息
function AccessibilityStats() {
  const { enabled, currentTheme, checkContrast } = useHighContrast();

  if (!enabled || !currentTheme) return null;

  const textContrast = checkContrast(
    currentTheme.colors.foreground,
    currentTheme.colors.background
  );

  const buttonContrast = checkContrast(
    currentTheme.colors.primaryForeground,
    currentTheme.colors.primary
  );

  return (
    <div className="space-y-3">
      <h4 className="font-medium">可访问性统计</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>文本对比度:</span>
          <Badge className={textContrast.color}>
            {textContrast.level} ({textContrast.ratio.toFixed(1)}:1)
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>按钮对比度:</span>
          <Badge className={buttonContrast.color}>
            {buttonContrast.level} ({buttonContrast.ratio.toFixed(1)}:1)
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>当前主题:</span>
          <Badge variant="outline">{currentTheme.name}</Badge>
        </div>
      </div>
    </div>
  );
}

// 主要的控制面板组件
export function AccessibilityControlPanel() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <HighContrastProvider>
      <div className="relative">
        {/* 触发按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <span>无障碍设置</span>
          <Badge variant="secondary">新</Badge>
        </Button>

        {/* 控制面板 */}
        {isOpen && (
          <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>无障碍控制面板</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 高对比度控制 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">高对比度模式</h4>
                  <HighContrastToggle />
                </div>
                <HighContrastThemeSelector />
              </div>

              <Separator />

              {/* 字体大小控制 */}
              <FontSizeControl />

              <Separator />

              {/* 间距控制 */}
              <SpacingControl />

              <Separator />

              {/* 动画控制 */}
              <AnimationControl />

              <Separator />

              {/* 键盘快捷键说明 */}
              <KeyboardShortcuts />

              <Separator />

              {/* 可访问性统计 */}
              <AccessibilityStats />

              {/* 颜色对比度检查器 */}
              <div className="space-y-4">
                <h4 className="font-medium">颜色对比度检查器</h4>
                <ContrastChecker />
              </div>

              {/* 重置按钮 */}
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 重置所有设置
                    localStorage.removeItem('accessibility-font-size');
                    localStorage.removeItem('accessibility-spacing');
                    localStorage.removeItem('accessibility-animations');
                    localStorage.removeItem('high-contrast-enabled');
                    localStorage.removeItem('high-contrast-theme');

                    // 刷新页面以应用重置
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  重置所有设置
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </HighContrastProvider>
  );
}

// 简化的工具栏版本
export function AccessibilityToolbar() {
  return (
    <HighContrastProvider>
      <div className="flex items-center gap-2">
        <HighContrastToggle />
        <AccessibilityControlPanel />
      </div>
    </HighContrastProvider>
  );
}

// 页面级别的可访问性提供者
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  return (
    <HighContrastProvider>
      {children}
    </HighContrastProvider>
  );
}