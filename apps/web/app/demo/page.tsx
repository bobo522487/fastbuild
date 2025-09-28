'use client';

import React from 'react';
import { FormProvider } from '@/components/forms/FormProvider';
import { SimpleFormSubmitHandler } from '@/components/forms/SimpleFormSubmitHandler';
import { exampleForms } from '@/examples/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { useFormMetadata } from '@/components/forms/FormProvider';

export default function DemoPage() {
  const { currentMetadata, loadMetadata } = useFormMetadata();

  // 简单的统计状态
  const [stats, setStats] = React.useState({
    totalSubmissions: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    averageResponseTime: 0,
  });
  const [selectedForm, setSelectedForm] = React.useState<string | null>(null);

  const handleFormSelect = React.useCallback((formId: string) => {
    const form = exampleForms.find(f => f.id === formId);
    if (form) {
      setSelectedForm(formId);
      loadMetadata(form.metadata);
    }
  }, [loadMetadata]);

  const handleFormSubmit = React.useCallback((data: Record<string, any>) => {
    console.log('✅ Form submitted successfully:', data);
    alert('表单提交成功！请查看控制台输出。');
  }, []);

  const handleFormError = React.useCallback((error: string) => {
    console.error('❌ Form submission error:', error);
    alert(`Submission failed: ${error}`);
  }, []);

  return (
    <FormProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">FastBuild 动态表单演示</h1>
          <p className="text-muted-foreground">
            体验 Schema 驱动的动态表单生成和验证能力
          </p>
        </div>

        {/* 统计信息 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总提交次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">成功提交</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successfulSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">失败提交</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageResponseTime}ms</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 表单选择器 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>选择表单</CardTitle>
                <CardDescription>
                  选择一个示例表单来体验动态渲染
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {exampleForms.map((form) => (
                  <div
                    key={form.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedForm === form.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                    onClick={() => handleFormSelect(form.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{form.name}</h3>
                      <Badge variant="secondary">{form.metadata.fields.length} 字段</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {form.description}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      版本 {form.metadata.version}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 表单渲染区域 */}
          <div className="lg:col-span-2">
            {currentMetadata ? (
              <SimpleFormSubmitHandler
                metadata={currentMetadata}
                onSuccess={handleFormSubmit}
                onError={handleFormError}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold mb-2">选择一个表单开始</h3>
                    <p className="text-muted-foreground">
                      从左侧选择一个示例表单来体验动态表单渲染
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
              <CardDescription>
                了解如何使用 FastBuild 动态表单系统
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <h4>核心特性</h4>
              <ul>
                <li>🔄 <strong>动态渲染</strong>：基于 JSON Schema 自动生成表单</li>
                <li>✅ <strong>实时验证</strong>：使用 Zod 进行客户端和服务端验证</li>
                <li>🎨 <strong>响应式设计</strong>：适配桌面和移动设备</li>
                <li>📊 <strong>统计追踪</strong>：实时监控表单使用情况</li>
              </ul>

              <h4>支持的字段类型</h4>
              <ul>
                <li>📝 Text - 单行文本输入</li>
                <li>📄 Textarea - 多行文本输入</li>
                <li>🔢 Number - 数字输入</li>
                <li>📋 Select - 下拉选择</li>
                <li>☑️ Checkbox - 复选框</li>
                <li>📅 Date - 日期选择</li>
              </ul>

              <h4>提交流程</h4>
              <ol>
                <li>用户填写表单并进行实时验证</li>
                <li>点击提交按钮</li>
                <li>数据在控制台输出（开发调试）</li>
                <li>可扩展集成数据库存储</li>
                <li>显示提交结果和反馈</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </FormProvider>
  );
}