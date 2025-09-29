'use client';

import React, { useState } from 'react';
import { DesignerFormRenderer } from '../../../components/forms/DesignerFormRenderer';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Textarea } from '@workspace/ui/components/textarea';
import { Badge } from '@workspace/ui/components/badge';
import { Alert, AlertDescription } from '@workspace/ui/components/alert';
import { CheckCircle2, AlertCircle, Copy, Download } from 'lucide-react';

// 测试用的设计器JSON数据
const sampleDesignerJson = [
  {
    type: 'input',
    field: 'name',
    title: '姓名',
    name: 'name',
    info: '请输入您的真实姓名',
    $required: true,
    props: {
      placeholder: '请输入姓名',
      maxlength: 50,
    },
    col: {
      span: 12,
    },
    _fc_id: 'name_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'input',
    field: 'email',
    title: '邮箱',
    name: 'email',
    info: '我们将向此邮箱发送确认邮件',
    $required: true,
    props: {
      placeholder: '请输入邮箱地址',
      type: 'email',
    },
    col: {
      span: 12,
    },
    _fc_id: 'email_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'inputNumber',
    field: 'age',
    title: '年龄',
    name: 'age',
    info: '请输入您的年龄',
    $required: false,
    props: {
      placeholder: '请输入年龄',
      min: 0,
      max: 150,
    },
    col: {
      span: 8,
    },
    _fc_id: 'age_field',
    _fc_drag_tag: 'inputNumber',
  },
  {
    type: 'select',
    field: 'gender',
    title: '性别',
    name: 'gender',
    info: '请选择您的性别',
    $required: true,
    props: {
      placeholder: '请选择性别',
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' },
      ],
    },
    col: {
      span: 8,
    },
    _fc_id: 'gender_field',
    _fc_drag_tag: 'select',
  },
  {
    type: 'date',
    field: 'birthday',
    title: '生日',
    name: 'birthday',
    info: '请选择您的出生日期',
    $required: false,
    props: {
      placeholder: '请选择出生日期',
    },
    col: {
      span: 8,
    },
    _fc_id: 'birthday_field',
    _fc_drag_tag: 'date',
  },
  {
    type: 'textarea',
    field: 'bio',
    title: '个人简介',
    name: 'bio',
    info: '请简单介绍一下自己',
    $required: false,
    props: {
      placeholder: '请输入个人简介',
      rows: 4,
      maxlength: 500,
    },
    col: {
      span: 24,
    },
    _fc_id: 'bio_field',
    _fc_drag_tag: 'textarea',
  },
  {
    type: 'checkbox',
    field: 'newsletter',
    title: '订阅邮件',
    name: 'newsletter',
    info: '订阅我们的邮件通讯获取最新信息',
    $required: false,
    props: {
      defaultChecked: false,
    },
    col: {
      span: 24,
    },
    _fc_id: 'newsletter_field',
    _fc_drag_tag: 'checkbox',
  },
];

// 复杂布局测试数据
const complexLayoutJson = [
  {
    type: 'input',
    field: 'company',
    title: '公司名称',
    name: 'company',
    info: '请输入公司名称',
    $required: true,
    props: {
      placeholder: '请输入公司名称',
    },
    col: {
      span: 16,
      offset: 4,
    },
    _fc_id: 'company_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'input',
    field: 'position',
    title: '职位',
    name: 'position',
    info: '请输入您的职位',
    $required: true,
    props: {
      placeholder: '请输入职位',
    },
    col: {
      span: 16,
      offset: 4,
    },
    _fc_id: 'position_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'input',
    field: 'phone',
    title: '电话',
    name: 'phone',
    info: '请输入联系电话',
    $required: true,
    props: {
      placeholder: '请输入电话号码',
    },
    col: {
      span: 8,
    },
    _fc_id: 'phone_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'input',
    field: 'ext',
    title: '分机号',
    name: 'ext',
    info: '分机号（可选）',
    $required: false,
    props: {
      placeholder: '分机号',
    },
    col: {
      span: 8,
    },
    _fc_id: 'ext_field',
    _fc_drag_tag: 'input',
  },
  {
    type: 'input',
    field: 'mobile',
    title: '手机',
    name: 'mobile',
    info: '请输入手机号码',
    $required: true,
    props: {
      placeholder: '请输入手机号码',
    },
    col: {
      span: 8,
    },
    _fc_id: 'mobile_field',
    _fc_drag_tag: 'input',
  },
];

export default function DesignerJsonTestPage() {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(sampleDesignerJson, null, 2));
  const [currentJson, setCurrentJson] = useState(sampleDesignerJson);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setCurrentJson(parsed);
      setError(null);
    } catch (err) {
      setError('JSON格式错误：' + (err as Error).message);
    }
  };

  const handleSubmit = async (data: Record<string, any>) => {
    setIsLoading(true);
    try {
      // 模拟提交延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmittedData(data);
      console.log('表单提交数据：', data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInput);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'designer-form.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">设计器JSON测试页面</h1>
        <p className="text-muted-foreground">
          测试DesignerFormRenderer组件对设计器JSON的支持
        </p>
      </div>

      {/* JSON编辑器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>设计器JSON编辑器</CardTitle>
              <CardDescription>
                编辑下面的JSON来测试不同的表单布局和字段配置
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJsonInput(JSON.stringify(sampleDesignerJson, null, 2))}
              >
                加载示例1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJsonInput(JSON.stringify(complexLayoutJson, null, 2))}
              >
                加载示例2
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="请输入设计器JSON..."
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="h-8 px-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJson}
                className="h-8 px-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleApplyJson} className="w-full">
            应用JSON并渲染表单
          </Button>
        </CardContent>
      </Card>

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能特性</CardTitle>
          <CardDescription>
            当前实现支持的设计器JSON功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="default">布局系统</Badge>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 24列网格布局</li>
                <li>• 响应式设计</li>
                <li>• 列偏移支持</li>
                <li>• 移动端适配</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Badge variant="default">字段类型</Badge>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 文本输入框</li>
                <li>• 数字输入框</li>
                <li>• 选择器</li>
                <li>• 日期选择</li>
                <li>• 多行文本</li>
                <li>• 复选框</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Badge variant="default">验证功能</Badge>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 必填字段验证</li>
                <li>• 字段长度验证</li>
                <li>• 数字范围验证</li>
                <li>• 邮箱格式验证</li>
                <li>• 实时错误提示</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 表单渲染器 */}
      <Card>
        <CardHeader>
          <CardTitle>表单预览</CardTitle>
          <CardDescription>
            基于设计器JSON渲染的动态表单
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DesignerFormRenderer
            designerJson={currentJson}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            maxContentWidth="xl"
            layout="grid"
          />
        </CardContent>
      </Card>

      {/* 提交结果显示 */}
      {submittedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              提交成功
            </CardTitle>
            <CardDescription>
              表单数据已成功处理
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}