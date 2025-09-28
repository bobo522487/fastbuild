'use client';

import React from 'react';
import { cn } from '@workspace/ui/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card';

import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import {
  Contrast,
  Palette,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

// 颜色对比度检查器
class ColorContrastChecker {
  // 计算相对亮度
  private static getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // 将十六进制颜色转换为RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // 计算对比度
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  // 评估对比度等级
  static getContrastLevel(ratio: number): {
    level: 'AAA' | 'AA' | 'A' | 'Fail';
    text: string;
    color: string;
  } {
    if (ratio >= 7) {
      return { level: 'AAA', text: '优秀', color: 'text-green-600' };
    } else if (ratio >= 4.5) {
      return { level: 'AA', text: '良好', color: 'text-blue-600' };
    } else if (ratio >= 3) {
      return { level: 'A', text: '及格', color: 'text-yellow-600' };
    } else {
      return { level: 'Fail', text: '不合格', color: 'text-red-600' };
    }
  }
}

// 高对比度主题定义
interface HighContrastTheme {
  name: string;
  id: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    muted: string;
    mutedForeground: string;
    error: string;
    errorForeground: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
  };
  description: string;
  useCases: string[];
}

const highContrastThemes: HighContrastTheme[] = [
  {
    name: '标准高对比度',
    id: 'standard-high-contrast',
    description: '经典黑白高对比度主题，适合大多数视觉障碍用户',
    useCases: ['白内障', '色盲', '低视力'],
    colors: {
      background: '#000000',
      foreground: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#000000',
      secondary: '#333333',
      secondaryForeground: '#ffffff',
      accent: '#ffff00',
      accentForeground: '#000000',
      border: '#ffffff',
      muted: '#1a1a1a',
      mutedForeground: '#cccccc',
      error: '#ff0000',
      errorForeground: '#ffffff',
      success: '#00ff00',
      successForeground: '#000000',
      warning: '#ffff00',
      warningForeground: '#000000',
    },
  },
  {
    name: '反色高对比度',
    id: 'inverted-high-contrast',
    description: '白色背景黑色文字的高对比度主题',
    useCases: ['畏光', '某些类型的视觉障碍'],
    colors: {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#000000',
      primaryForeground: '#ffffff',
      secondary: '#cccccc',
      secondaryForeground: '#000000',
      accent: '#0066cc',
      accentForeground: '#ffffff',
      border: '#000000',
      muted: '#f5f5f5',
      mutedForeground: '#666666',
      error: '#cc0000',
      errorForeground: '#ffffff',
      success: '#009900',
      successForeground: '#ffffff',
      warning: '#ff9900',
      warningForeground: '#000000',
    },
  },
  {
    name: '黄色高对比度',
    id: 'yellow-high-contrast',
    description: '黄色背景黑色文字，适合某些视觉障碍',
    useCases: ['视网膜疾病', '视野狭窄'],
    colors: {
      background: '#ffff00',
      foreground: '#000000',
      primary: '#000000',
      primaryForeground: '#ffff00',
      secondary: '#333333',
      secondaryForeground: '#ffff00',
      accent: '#0000ff',
      accentForeground: '#ffff00',
      border: '#000000',
      muted: '#e6e600',
      mutedForeground: '#333333',
      error: '#ff0000',
      errorForeground: '#ffff00',
      success: '#006600',
      successForeground: '#ffff00',
      warning: '#cc6600',
      warningForeground: '#ffff00',
    },
  },
  {
    name: '蓝色高对比度',
    id: 'blue-high-contrast',
    description: '蓝色背景白色文字，减少屏幕眩光',
    useCases: ['畏光', '偏头痛', '阅读困难'],
    colors: {
      background: '#000080',
      foreground: '#ffffff',
      primary: '#ffffff',
      primaryForeground: '#000080',
      secondary: '#4169e1',
      secondaryForeground: '#ffffff',
      accent: '#ffff00',
      accentForeground: '#000080',
      border: '#ffffff',
      muted: '#000066',
      mutedForeground: '#cccccc',
      error: '#ff6666',
      errorForeground: '#ffffff',
      success: '#66ff66',
      successForeground: '#000080',
      warning: '#ffff66',
      warningForeground: '#000080',
    },
  },
];

// 高对比度模式上下文
interface HighContrastContextType {
  enabled: boolean;
  currentTheme: HighContrastTheme | null;
  enableHighContrast: (themeId: string) => void;
  disableHighContrast: () => void;
  toggleHighContrast: () => void;
  availableThemes: HighContrastTheme[];
  checkContrast: (foreground: string, background: string) => {
    ratio: number;
    level: string;
    text: string;
    color: string;
  };
}

const HighContrastContext = React.createContext<HighContrastContextType | undefined>(undefined);

// 高对比度模式提供者
export function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(false);
  const [currentTheme, setCurrentTheme] = React.useState<HighContrastTheme | null>(null);

  // 从本地存储加载设置
  React.useEffect(() => {
    const savedEnabled = localStorage.getItem('high-contrast-enabled') === 'true';
    const savedThemeId = localStorage.getItem('high-contrast-theme');

    if (savedEnabled) {
      setEnabled(true);
      if (savedThemeId) {
        const theme = highContrastThemes.find(t => t.id === savedThemeId);
        setCurrentTheme(theme || highContrastThemes[0]);
      } else {
        setCurrentTheme(highContrastThemes[0]);
      }
    }
  }, []);

  // 应用主题到文档
  React.useEffect(() => {
    if (enabled && currentTheme) {
      const root = document.documentElement;
      Object.entries(currentTheme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--hc-${key}`, value);
      });
      root.setAttribute('data-high-contrast', 'true');
      root.setAttribute('data-theme', currentTheme.id);
    } else {
      const root = document.documentElement;
      Object.keys(highContrastThemes[0].colors).forEach(key => {
        root.style.removeProperty(`--hc-${key}`);
      });
      root.removeAttribute('data-high-contrast');
      root.removeAttribute('data-theme');
    }
  }, [enabled, currentTheme]);

  const enableHighContrast = React.useCallback((themeId: string) => {
    const theme = highContrastThemes.find(t => t.id === themeId);
    if (theme) {
      setEnabled(true);
      setCurrentTheme(theme);
      localStorage.setItem('high-contrast-enabled', 'true');
      localStorage.setItem('high-contrast-theme', themeId);
    }
  }, []);

  const disableHighContrast = React.useCallback(() => {
    setEnabled(false);
    setCurrentTheme(null);
    localStorage.removeItem('high-contrast-enabled');
    localStorage.removeItem('high-contrast-theme');
  }, []);

  const toggleHighContrast = React.useCallback(() => {
    if (enabled) {
      disableHighContrast();
    } else {
      enableHighContrast(highContrastThemes[0].id);
    }
  }, [enabled, enableHighContrast, disableHighContrast]);

  const checkContrast = React.useCallback((foreground: string, background: string) => {
    const ratio = ColorContrastChecker.getContrastRatio(foreground, background);
    const level = ColorContrastChecker.getContrastLevel(ratio);
    return {
      ratio,
      level: level.level,
      text: level.text,
      color: level.color,
    };
  }, []);

  const value: HighContrastContextType = {
    enabled,
    currentTheme,
    enableHighContrast,
    disableHighContrast,
    toggleHighContrast,
    availableThemes: highContrastThemes,
    checkContrast,
  };

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
}

// 使用高对比度模式的Hook
export function useHighContrast() {
  const context = React.useContext(HighContrastContext);
  if (!context) {
    throw new Error('useHighContrast must be used within a HighContrastProvider');
  }
  return context;
}

// 高对比度模式切换器
export function HighContrastToggle() {
  const { enabled, toggleHighContrast, currentTheme } = useHighContrast();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleHighContrast}
      className={cn(
        'flex items-center gap-2',
        enabled && 'border-primary bg-primary/10'
      )}
    >
      {enabled ? (
        <>
          <Eye className="h-4 w-4" />
          <span>高对比度已启用</span>
          {currentTheme && (
            <Badge variant="secondary" className="text-xs">
              {currentTheme.name}
            </Badge>
          )}
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          <span>启用高对比度</span>
        </>
      )}
    </Button>
  );
}

// 高对比度主题选择器
export function HighContrastThemeSelector() {
  const { enabled, currentTheme, enableHighContrast, availableThemes } = useHighContrast();

  if (!enabled) return null;

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          高对比度主题
        </CardTitle>
        <CardDescription className="text-xs">
          选择适合您需求的视觉主题
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {availableThemes.map((theme) => (
            <div
              key={theme.id}
              className={cn(
                'p-3 border rounded-lg cursor-pointer transition-all',
                currentTheme?.id === theme.id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-primary/50'
              )}
              onClick={() => enableHighContrast(theme.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{theme.name}</div>
                {currentTheme?.id === theme.id && (
                  <CheckCircle className="h-4 w-4 text-primary" />
                )}
              </div>

              {/* 颜色预览 */}
              <div className="flex gap-1 mb-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: theme.colors.background }}
                  title="背景色"
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: theme.colors.foreground }}
                  title="前景色"
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="主色"
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="强调色"
                />
              </div>

              {/* 主题信息 */}
              <div className="text-xs text-muted-foreground">
                {theme.description}
              </div>

              {/* 适用场景 */}
              <div className="flex flex-wrap gap-1 mt-2">
                {theme.useCases.map((useCase) => (
                  <Badge key={useCase} variant="outline" className="text-xs">
                    {useCase}
                  </Badge>
                ))}
              </div>

              {/* 对比度检查 */}
              <div className="text-xs mt-2">
                <div className="flex items-center gap-2">
                  <span>文字对比度:</span>
                  <div className={cn(
                    'font-medium',
                    useHighContrast().checkContrast(
                      theme.colors.foreground,
                      theme.colors.background
                    ).color
                  )}>
                    {useHighContrast().checkContrast(
                      theme.colors.foreground,
                      theme.colors.background
                    ).text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 使用提示 */}
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            高对比度模式可能会影响页面的视觉外观，但会显著提高文本的可读性和可访问性。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// 对比度检查器组件
export function ContrastChecker() {
  const { checkContrast } = useHighContrast();
  const [foregroundColor, setForegroundColor] = React.useState('#000000');
  const [backgroundColor, setBackgroundColor] = React.useState('#ffffff');
  const [contrastResult, setContrastResult] = React.useState(() => checkContrast(foregroundColor, backgroundColor));

  const updateContrast = React.useCallback(() => {
    setContrastResult(checkContrast(foregroundColor, backgroundColor));
  }, [foregroundColor, backgroundColor, checkContrast]);

  React.useEffect(() => {
    updateContrast();
  }, [updateContrast]);

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Contrast className="h-4 w-4" />
          颜色对比度检查器
        </CardTitle>
        <CardDescription>
          检查两个颜色之间的对比度是否符合WCAG标准
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 颜色选择器 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">前景色 (文字)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-8 h-8 border rounded"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">背景色</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 border rounded"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border rounded"
                />
              </div>
            </div>
          </div>

          {/* 预览 */}
          <div
            className="p-4 rounded-lg border text-center"
            style={{
              backgroundColor,
              color: foregroundColor,
            }}
          >
            示例文本效果预览
          </div>

          {/* 对比度结果 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">对比度比值:</span>
              <span className="font-mono text-sm font-medium">
                {contrastResult.ratio.toFixed(2)}:1
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">WCAG等级:</span>
              <Badge className={contrastResult.color}>
                {contrastResult.level} ({contrastResult.text})
              </Badge>
            </div>
          </div>

          {/* 标准说明 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• AA级: 4.5:1 (常规文本) 或 3:1 (大文本)</div>
            <div>• AAA级: 7:1 (常规文本) 或 4.5:1 (大文本)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 高对比度模式提示
export function HighContrastAlert() {
  const { enabled } = useHighContrast();

  if (!enabled) return null;

  return (
    <Alert>
      <Contrast className="h-4 w-4" />
      <AlertDescription>
        高对比度模式已启用。您可以在页面右上角的主题选择器中更改主题或关闭此模式。
      </AlertDescription>
    </Alert>
  );
}

// CSS变量定义（用于全局样式）
export const highContrastCSSVariables = `
  :root[data-high-contrast="true"] {
    /* 高对比度主题变量 - 通过JavaScript动态设置 */
  }

  /* 高对比度模式下的组件样式覆盖 */
  [data-high-contrast="true"] {
    /* 确保所有文本都有足够的对比度 */
  }

  /* 高对比度模式下的表单样式 */
  [data-high-contrast="true"] input,
  [data-high-contrast="true"] textarea,
  [data-high-contrast="true"] select {
    /* 强制高对比度表单样式 */
  }

  /* 高对比度模式下的按钮样式 */
  [data-high-contrast="true"] button {
    /* 强制高对比度按钮样式 */
  }
`;