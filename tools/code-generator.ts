/**
 * 代码生成工具
 * 自动生成常用的代码模板和组件
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ComponentTemplate {
  name: string;
  type: 'component' | 'page' | 'hook' | 'util' | 'store' | 'api';
  template: string;
  outputPath: string;
  dependencies?: string[];
}

interface GenerateOptions {
  overwrite?: boolean;
  createDirectory?: boolean;
  addImports?: boolean;
  formatCode?: boolean;
}

/**
 * 代码生成器
 */
export class CodeGenerator {
  private templates: Map<string, ComponentTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * 初始化代码模板
   */
  private initializeTemplates(): void {
    // React 组件模板
    this.templates.set('react-component', {
      name: 'React Component',
      type: 'component',
      template: this.getReactComponentTemplate(),
      outputPath: 'components/{name}.tsx',
      dependencies: ['react'],
    });

    // React 页面模板
    this.templates.set('react-page', {
      name: 'React Page',
      type: 'page',
      template: this.getReactPageTemplate(),
      outputPath: 'app/{name}/page.tsx',
      dependencies: ['react', 'next'],
    });

    // React Hook 模板
    this.templates.set('react-hook', {
      name: 'React Hook',
      type: 'hook',
      template: this.getReactHookTemplate(),
      outputPath: 'hooks/use-{name}.tsx',
      dependencies: ['react'],
    });

    // 工具函数模板
    this.templates.set('util-function', {
      name: 'Utility Function',
      type: 'util',
      template: this.getUtilFunctionTemplate(),
      outputPath: 'lib/{name}.ts',
      dependencies: [],
    });

    // Zustand Store 模板
    this.templates.set('zustand-store', {
      name: 'Zustand Store',
      type: 'store',
      template: this.getZustandStoreTemplate(),
      outputPath: 'lib/stores/{name}.ts',
      dependencies: ['zustand'],
    });

    // API 路由模板
    this.templates.set('api-route', {
      name: 'API Route',
      type: 'api',
      template: this.getApiRouteTemplate(),
      outputPath: 'app/api/{name}/route.ts',
      dependencies: ['next'],
    });

    // 类型定义模板
    this.templates.set('typescript-types', {
      name: 'TypeScript Types',
      type: 'types',
      template: this.getTypeScriptTypesTemplate(),
      outputPath: 'types/{name}.ts',
      dependencies: [],
    });

    // 测试文件模板
    this.templates.set('test-file', {
      name: 'Test File',
      type: 'test',
      template: this.getTestFileTemplate(),
      outputPath: '__tests__/{name}.test.{ext}',
      dependencies: ['@testing-library/react', 'vitest'],
    });
  }

  /**
   * 生成代码
   */
  generate(
    templateName: string,
    componentName: string,
    options: GenerateOptions = {}
  ): {
    success: boolean;
    outputPath: string;
    error?: string;
    warnings?: string[];
  } {
    const template = this.templates.get(templateName);
    if (!template) {
      return {
        success: false,
        outputPath: '',
        error: `模板 "${templateName}" 不存在`,
      };
    }

    try {
      // 生成代码内容
      const code = this.generateCode(template, componentName);

      // 确定输出路径
      const outputPath = this.resolveOutputPath(template, componentName);

      // 检查文件是否存在
      if (existsSync(outputPath) && !options.overwrite) {
        return {
          success: false,
          outputPath,
          error: `文件已存在: ${outputPath}`,
        };
      }

      // 创建目录（如果需要）
      if (options.createDirectory) {
        const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      // 写入文件
      writeFileSync(outputPath, code);

      // 添加导入（如果需要）
      if (options.addImports) {
        this.addImports(componentName, template, outputPath);
      }

      // 格式化代码（如果需要）
      if (options.formatCode) {
        this.formatCode(outputPath);
      }

      return {
        success: true,
        outputPath,
      };

    } catch (error) {
      return {
        success: false,
        outputPath: '',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 批量生成代码
   */
  generateBatch(
    generations: Array<{
      templateName: string;
      componentName: string;
      options?: GenerateOptions;
    }>
  ): Array<{
    success: boolean;
    outputPath: string;
    error?: string;
    warnings?: string[];
  }> {
    return generations.map(({ templateName, componentName, options }) => {
      return this.generate(templateName, componentName, options);
    });
  }

  /**
   * 生成代码内容
   */
  private generateCode(template: ComponentTemplate, componentName: string): string {
    let code = template.template;

    // 替换占位符
    code = code.replace(/\{name\}/g, componentName);
    code = code.replace(/\{Name\}/g, this.capitalizeFirstLetter(componentName));
    code = code.replace(/\{NAME\}/g, componentName.toUpperCase());
    code = code.replace(/\{camelCase\}/g, this.camelCase(componentName));
    code = code.replace(/\{PascalCase\}/g, this.pascalCase(componentName));

    // 添加时间戳
    code = code.replace(/\{timestamp\}/g, new Date().toISOString());

    return code;
  }

  /**
   * 解析输出路径
   */
  private resolveOutputPath(template: ComponentTemplate, componentName: string): string {
    let outputPath = template.outputPath;

    // 替换占位符
    outputPath = outputPath.replace(/\{name\}/g, componentName);
    outputPath = outputPath.replace(/\{ext\}/g, this.getFileExtension(template.type));

    return join(process.cwd(), outputPath);
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(type: string): string {
    switch (type) {
      case 'component':
      case 'page':
      case 'hook':
        return 'tsx';
      case 'util':
      case 'store':
      case 'types':
      case 'api':
        return 'ts';
      case 'test':
        return 'tsx';
      default:
        return 'ts';
    }
  }

  /**
   * 添加导入
   */
  private addImports(componentName: string, template: ComponentTemplate, outputPath: string): void {
    // 这里可以实现自动添加导入的逻辑
    // 例如：在 index.ts 文件中添加导出
  }

  /**
   * 格式化代码
   */
  private formatCode(filePath: string): void {
    try {
      // 这里可以调用 prettier 格式化代码
      const { execSync } = require('child_process');
      execSync(`npx prettier --write "${filePath}"`, { stdio: 'pipe' });
    } catch (error) {
      console.warn(`代码格式化失败: ${error}`);
    }
  }

  /**
   * 获取可用的模板列表
   */
  getAvailableTemplates(): Array<{
    name: string;
    type: string;
    description: string;
  }> {
    return Array.from(this.templates.entries()).map(([key, template]) => ({
      name: key,
      type: template.type,
      description: template.name,
    }));
  }

  /**
   * React 组件模板
   */
  private getReactComponentTemplate(): string {
    return `'use client';

import React, { forwardRef } from 'react';
import { cn } from '@workspace/ui/lib/utils';

export interface {Name}Props {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const {Name} = forwardRef<HTMLDivElement, {Name}Props>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-component-styles',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{Name}.displayName = '{Name}';

export default {Name};
`;
  }

  /**
   * React 页面模板
   */
  private getReactPageTemplate(): string {
    return `'use client';

import React from 'react';
import { {Name} } from '@/components/{name}';

export default function {Name}Page() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{Name}</h1>
      <div className="grid gap-6">
        <{Name} />
      </div>
    </div>
  );
}
`;
  }

  /**
   * React Hook 模板
   */
  private getReactHookTemplate(): string {
    return `import { useState, useEffect, useCallback } from 'react';

export interface Use{Name}Options {
  initialValue?: any;
  enabled?: boolean;
}

export interface Use{Name}Return {
  value: any;
  loading: boolean;
  error: Error | null;
  setValue: (value: any) => void;
  refresh: () => void;
}

export function use{Name}(options: Use{Name}Options = {}): Use{Name}Return {
  const { initialValue, enabled = true } = options;

  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 在这里实现你的逻辑
      const result = await fetchData();
      setValue(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    value,
    loading,
    error,
    setValue,
    refresh,
  };
}

// 辅助函数
async function fetchData(): Promise<any> {
  // 实现你的数据获取逻辑
  return Promise.resolve(null);
}

export type { Use{Name}Options, Use{Name}Return };
export default use{Name};
`;
  }

  /**
   * 工具函数模板
   */
  private getUtilFunctionTemplate(): string {
    return `/**
 * {Name} 工具函数
 * @description {功能描述}
 */

/**
 * 主要功能函数
 */
export function {camelCase}(
  param1: string,
  param2?: number
): string {
  // 实现你的逻辑
  return param1;
}

/**
 * 辅助函数
 */
export function {camelCase}Helper(
  param: any
): boolean {
  // 实现辅助逻辑
  return true;
}

/**
 * 类型守卫
 */
export function is{Name}(value: any): value is {Name}Type {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiredProperty' in value
  );
}

// 类型定义
export interface {Name}Type {
  id: string;
  name: string;
  [key: string]: any;
}

// 常量
export const {NAME}_CONSTANTS = {
  DEFAULT_VALUE: 'default',
  MAX_COUNT: 100,
} as const;

export default {camelCase};
`;
  }

  /**
   * Zustand Store 模板
   */
  private getZustandStoreTemplate(): string {
    return `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface {Name}State {
  // 状态
  value: any;
  loading: boolean;
  error: string | null;

  // 方法
  setValue: (value: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: Partial<{Name}State> = {
  value: null,
  loading: false,
  error: null,
};

export const use{Name}Store = create<{Name}State>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 方法
        setValue: (value) => set({ value }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),

        reset: () => set(initialState),
      }),
      {
        name: '{name}-storage',
      }
    ),
    {
      name: '{name}-store',
    }
  )
);

// 选择器
export const {camelCase}Value = (state: {Name}State) => state.value;
export const {camelCase}Loading = (state: {Name}State) => state.loading;
export const {camelCase}Error = (state: {Name}State) => state.error;

// 动作
export const {camelCase}Actions = {
  setValue: use{Name}Store.getState().setValue,
  setLoading: use{Name}Store.getState().setLoading,
  setError: use{Name}Store.getState().setError,
  reset: use{Name}Store.getState().reset,
};

export default use{Name}Store;
`;
  }

  /**
   * API 路由模板
   */
  private getApiRouteTemplate(): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@workspace/database';

/**
 * GET /api/{name}
 * 获取{ Name }列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const [items, total] = await Promise.all([
      prisma.{camelCase}.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.{camelCase}.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/{name} error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/{name}
 * 创建{ Name }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证输入
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const item = await prisma.{camelCase}.create({
      data: {
        name: body.name,
        // 其他字段
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('POST /api/{name} error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * TypeScript 类型定义模板
   */
  private getTypeScriptTypesTemplate(): string {
    return `/**
 * {Name} 类型定义
 * @description 类型定义和接口
 */

// 基础类型
export interface {Name} {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// 输入类型
export interface Create{Name}Input {
  name: string;
  [key: string]: any;
}

export interface Update{Name}Input {
  id: string;
  name?: string;
  [key: string]: any;
}

// 查询类型
export interface {Name}Query {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 响应类型
export interface {Name}Response {
  success: boolean;
  data?: {Name} | {Name}[];
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 状态类型
export interface {Name}State {
  items: {Name}[];
  loading: boolean;
  error: string | null;
}

// 事件类型
export type {Name}EventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'loaded';

export interface {Name}Event {
  type: {Name}EventType;
  payload: {Name};
  timestamp: string;
}

// 配置类型
export interface {Name}Config {
  enabled: boolean;
  maxItems: number;
  cacheTTL: number;
}

// 默认配置
export const DEFAULT_{NAME}_CONFIG: {Name}Config = {
  enabled: true,
  maxItems: 100,
  cacheTTL: 3600000, // 1 hour
};

// 类型守卫
export function is{Name}(value: any): value is {Name} {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  );
}

export function is{Name}Event(value: any): value is {Name}Event {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    typeof value.payload === 'object'
  );
}

export type {
  {Name},
  Create{Name}Input,
  Update{Name}Input,
  {Name}Query,
  {Name}Response,
  {Name}State,
  {Name}EventType,
  {Name}Event,
  {Name}Config,
};
`;
  }

  /**
   * 测试文件模板
   */
  private getTestFileTemplate(): string {
    return `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { {Name} } from '@/components/{name}';

describe('{Name}', () => {
  beforeEach(() => {
    // 在每个测试前重置状态
  });

  it('renders without crashing', () => {
    render(<{Name} />);
    expect(screen.getByText('{Name}')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<{Name} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Expected result')).toBeInTheDocument();
    });
  });

  it('calls callback when clicked', () => {
    const mockCallback = vi.fn();
    render(<{Name} onClick={mockCallback} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<{Name} className="custom-class" />);

    const element = screen.getByTestId('{name}');
    expect(element).toHaveClass('custom-class');
  });

  it('handles loading state', () => {
    render(<{Name} loading={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<{Name} error="Test error" />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  // 异步测试
  it('loads data asynchronously', async () => {
    render(<{Name} />);

    await waitFor(() => {
      expect(screen.getByText('Loaded data')).toBeInTheDocument();
    });
  });

  // 可访问性测试
  it('is accessible', () => {
    render(<{Name} />);

    const element = screen.getByRole('button');
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute('aria-label');
  });
});
`;
  }

  /**
   * 字符串工具函数
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }

  private pascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
  }
}

/**
 * 便捷函数：生成代码
 */
export function generateCode(
  templateName: string,
  componentName: string,
  options?: GenerateOptions
): {
  success: boolean;
  outputPath: string;
  error?: string;
  warnings?: string[];
} {
  const generator = new CodeGenerator();
  return generator.generate(templateName, componentName, options);
}

/**
 * 便捷函数：批量生成代码
 */
export function generateCodeBatch(
  generations: Array<{
    templateName: string;
    componentName: string;
    options?: GenerateOptions;
  }>
): Array<{
  success: boolean;
  outputPath: string;
  error?: string;
  warnings?: string[];
}> {
  const generator = new CodeGenerator();
  return generator.generateBatch(generations);
}

/**
 * 便捷函数：获取可用模板
 */
export function getAvailableCodeTemplates(): Array<{
  name: string;
  type: string;
  description: string;
}> {
  const generator = new CodeGenerator();
  return generator.getAvailableTemplates();
}