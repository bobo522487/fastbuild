'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { useHighContrast } from './HighContrastMode';

// 高对比度模式下的样式类生成器
export function getHighContrastClasses(enabled: boolean, themeId?: string) {
  if (!enabled) return '';

  const baseClasses = [
    'high-contrast-mode',
    'transition-colors duration-200'
  ];

  // 根据主题添加特定类
  const themeClasses: Record<string, string[]> = {
    'standard-high-contrast': [
      'hc-standard-theme',
      '[&_*]:text-white',
      '[&_*]:bg-black',
      '[&_*]:border-white'
    ],
    'inverted-high-contrast': [
      'hc-inverted-theme',
      '[&_*]:text-black',
      '[&_*]:bg-white',
      '[&_*]:border-black'
    ],
    'yellow-high-contrast': [
      'hc-yellow-theme',
      '[&_*]:text-black',
      '[&_*]:bg-yellow-400',
      '[&_*]:border-black'
    ],
    'blue-high-contrast': [
      'hc-blue-theme',
      '[&_*]:text-white',
      '[&_*]:bg-blue-900',
      '[&_*]:border-white'
    ]
  };

  const specificClasses = themeId ? themeClasses[themeId] || [] : [];

  return [...baseClasses, ...specificClasses].join(' ');
}

// 高对比度模式的样式提供者
export function HighContrastStyles() {
  const { enabled, currentTheme } = useHighContrast();

  if (!enabled) return null;

  // 生成CSS变量样式
  const cssVariables = React.useMemo(() => {
    if (!currentTheme) return {};

    const styles: React.CSSProperties = {};

    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      styles[`--hc-${key}`] = value;
    });

    return styles;
  }, [currentTheme]);

  return (
    <style jsx global>{`
      :root[data-high-contrast="true"] {
        ${currentTheme ? Object.entries(currentTheme.colors).map(([key, value]) =>
          `--hc-${key}: ${value};`
        ).join('\n        ') : ''}
      }

      /* 高对比度模式下的基础样式 */
      [data-high-contrast="true"] * {
        border-width: 2px !important;
        border-style: solid !important;
        outline-width: 2px !important;
        outline-style: solid !important;
      }

      [data-high-contrast="true"] input,
      [data-high-contrast="true"] textarea,
      [data-high-contrast="true"] select {
        background-color: var(--hc-background) !important;
        color: var(--hc-foreground) !important;
        border-color: var(--hc-border) !important;
        outline-color: var(--hc-primary) !important;
      }

      [data-high-contrast="true"] button {
        background-color: var(--hc-primary) !important;
        color: var(--hc-primaryForeground) !important;
        border-color: var(--hc-border) !important;
        font-weight: 700 !important;
        min-height: 44px !important;
        padding: 12px 24px !important;
      }

      [data-high-contrast="true"] button:hover {
        background-color: var(--hc-accent) !important;
        color: var(--hc-accentForeground) !important;
        outline-color: var(--hc-accent) !important;
        outline-width: 3px !important;
      }

      [data-high-contrast="true"] button:focus {
        outline-color: var(--hc-primary) !important;
        outline-width: 3px !important;
        outline-offset: 2px !important;
      }

      [data-high-contrast="true"] button:disabled {
        background-color: var(--hc-muted) !important;
        color: var(--hc-mutedForeground) !important;
        border-color: var(--hc-border) !important;
        opacity: 0.7 !important;
      }

      [data-high-contrast="true"] label {
        color: var(--hc-foreground) !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
      }

      [data-high-contrast="true"] .error-message {
        color: var(--hc-error) !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
        background-color: var(--hc-background) !important;
        border: 2px solid var(--hc-error) !important;
        padding: 8px !important;
        margin: 4px 0 !important;
      }

      [data-high-contrast="true"] .success-message {
        color: var(--hc-success) !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
        background-color: var(--hc-background) !important;
        border: 2px solid var(--hc-success) !important;
        padding: 8px !important;
        margin: 4px 0 !important;
      }

      [data-high-contrast="true"] .warning-message {
        color: var(--hc-warning) !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
        background-color: var(--hc-background) !important;
        border: 2px solid var(--hc-warning) !important;
        padding: 8px !important;
        margin: 4px 0 !important;
      }

      /* 增强焦点指示器 */
      [data-high-contrast="true"] *:focus {
        outline: 3px solid var(--hc-primary) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px var(--hc-accent) !important;
      }

      [data-high-contrast="true"] *:focus-visible {
        outline: 3px solid var(--hc-primary) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px var(--hc-accent) !important;
      }

      /* 增强链接对比度 */
      [data-high-contrast="true"] a {
        color: var(--hc-primary) !important;
        text-decoration: underline !important;
        font-weight: 700 !important;
        border-bottom: 2px solid var(--hc-primary) !important;
      }

      [data-high-contrast="true"] a:hover {
        color: var(--hc-accent) !important;
        border-bottom-color: var(--hc-accent) !important;
        text-decoration: none !important;
      }

      /* 增强表格对比度 */
      [data-high-contrast="true"] table {
        border: 3px solid var(--hc-border) !important;
      }

      [data-high-contrast="true"] th,
      [data-high-contrast="true"] td {
        border: 2px solid var(--hc-border) !important;
        padding: 8px !important;
      }

      [data-high-contrast="true"] th {
        background-color: var(--hc-primary) !important;
        color: var(--hc-primaryForeground) !important;
        font-weight: 700 !important;
      }

      /* 增强列表对比度 */
      [data-high-contrast="true"] ul,
      [data-high-contrast="true"] ol {
        list-style-type: disc !important;
        margin-left: 24px !important;
      }

      [data-high-contrast="true"] li {
        margin: 8px 0 !important;
      }

      /* 增强代码块对比度 */
      [data-high-contrast="true"] pre,
      [data-high-contrast="true"] code {
        background-color: var(--hc-muted) !important;
        color: var(--hc-foreground) !important;
        border: 2px solid var(--hc-border) !important;
        padding: 12px !important;
        font-family: 'Courier New', monospace !important;
        font-size: 1.1em !important;
      }

      /* 增强图标对比度 */
      [data-high-contrast="true"] svg {
        stroke: var(--hc-foreground) !important;
        stroke-width: 3px !important;
        min-width: 24px !important;
        min-height: 24px !important;
      }

      /* 增强输入框占位符对比度 */
      [data-high-contrast="true"] input::placeholder,
      [data-high-contrast="true"] textarea::placeholder {
        color: var(--hc-mutedForeground) !important;
        opacity: 1 !important;
        font-weight: 500 !important;
      }

      /* 增强选择器对比度 */
      [data-high-contrast="true"] select option {
        background-color: var(--hc-background) !important;
        color: var(--hc-foreground) !important;
        border: 1px solid var(--hc-border) !important;
        padding: 8px !important;
      }

      [data-high-contrast="true"] select option:hover {
        background-color: var(--hc-accent) !important;
        color: var(--hc-accentForeground) !important;
      }

      /* 增强复选框和单选按钮对比度 */
      [data-high-contrast="true"] input[type="checkbox"],
      [data-high-contrast="true"] input[type="radio"] {
        width: 24px !important;
        height: 24px !important;
        border: 3px solid var(--hc-border) !important;
        background-color: var(--hc-background) !important;
        margin: 8px !important;
      }

      [data-high-contrast="true"] input[type="checkbox"]:checked,
      [data-high-contrast="true"] input[type="radio"]:checked {
        background-color: var(--hc-primary) !important;
        border-color: var(--hc-primary) !important;
      }

      /* 增强进度条对比度 */
      [data-high-contrast="true"] progress {
        border: 3px solid var(--hc-border) !important;
        height: 24px !important;
        background-color: var(--hc-background) !important;
      }

      [data-high-contrast="true"] progress::-webkit-progress-bar {
        background-color: var(--hc-background) !important;
        border: 2px solid var(--hc-border) !important;
      }

      [data-high-contrast="true"] progress::-webkit-progress-value {
        background-color: var(--hc-primary) !important;
        border: 2px solid var(--hc-primary) !important;
      }

      /* 特定主题的额外样式 */
      [data-theme="yellow-high-contrast"] {
        filter: contrast(1.2) saturate(1.1);
      }

      [data-theme="blue-high-contrast"] {
        filter: contrast(1.1) saturate(0.9);
      }

      /* 动画和过渡效果 */
      [data-high-contrast="true"] * {
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
      }

      /* 屏幕阅读器专用类 */
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      /* 高对比度模式下的焦点跳过链接 */
      [data-high-contrast="true"] .skip-link {
        position: absolute !important;
        top: -40px !important;
        left: 0 !important;
        background: var(--hc-primary) !important;
        color: var(--hc-primaryForeground) !important;
        padding: 8px !important;
        text-decoration: none !important;
        border-radius: 0 0 4px 0 !important;
        z-index: 100 !important;
      }

      [data-high-contrast="true"] .skip-link:focus {
        top: 0 !important;
      }
    `}</style>
  );
}

// 高对比度模式包装器组件
export function HighContrastWrapper({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { enabled, currentTheme } = useHighContrast();

  return (
    <div
      className={cn(
        'transition-all duration-200',
        enabled && 'high-contrast-active',
        getHighContrastClasses(enabled, currentTheme?.id),
        className
      )}
    >
      <HighContrastStyles />
      {children}
    </div>
  );
}

// 生成高对比度特定的CSS变量
export function generateHighContrastCSSVariables(theme: any) {
  return Object.entries(theme.colors).map(([key, value]) =>
    `--hc-${key}: ${value};`
  ).join('\n  ');
}