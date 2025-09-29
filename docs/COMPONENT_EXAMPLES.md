# FastBuild 组件使用示例

## 表单系统示例

### 1. 基础表单渲染

```typescript
// pages/form-example.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { OptimizedFormRenderer } from '@/components/forms/OptimizedFormRenderer';
import type { FormMetadata } from '@workspace/types';

// 定义表单元数据
const formMetadata: FormMetadata = {
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
      placeholder: 'your@email.com',
      required: true,
    },
    {
      id: 'age',
      name: 'age',
      type: 'number',
      label: '年龄',
      placeholder: '请输入您的年龄',
      required: true,
    },
    {
      id: 'gender',
      name: 'gender',
      type: 'select',
      label: '性别',
      required: true,
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      id: 'bio',
      name: 'bio',
      type: 'textarea',
      label: '个人简介',
      placeholder: '请简单介绍一下自己...',
      required: false,
    },
    {
      id: 'agreed',
      name: 'agreed',
      type: 'checkbox',
      label: '我同意服务条款',
      required: true,
    },
  ],
};

export default function FormExample() {
  const handleSubmit = React.useCallback(async (data: Record<string, any>) => {
    console.log('表单提交:', data);
    // 这里可以添加提交逻辑
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">用户信息表单</h1>
      <OptimizedFormRenderer
        metadata={formMetadata}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

### 2. 手动构建表单

```typescript
// pages/manual-form-example.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Textarea } from '@workspace/ui/components/textarea';
import { Checkbox } from '@workspace/ui/components/checkbox';

const formSchema = z.object({
  name: z.string().min(2, '姓名至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  age: z.number().min(1, '年龄必须大于0').max(120, '年龄不能超过120'),
  gender: z.enum(['male', 'female', 'other']),
  bio: z.string().optional(),
  agreed: z.boolean().refine(val => val === true, '必须同意服务条款'),
});

type FormData = z.infer<typeof formSchema>;

export default function ManualFormExample() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 0,
      gender: undefined,
      bio: '',
      agreed: false,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('表单数据:', data);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">手动构建表单</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>姓名</FormLabel>
                <FormControl>
                  <Input placeholder="请输入您的姓名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>年龄</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="请输入您的年龄"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>性别</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择性别" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>个人简介</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="请简单介绍一下自己..."
                    className="resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>我同意服务条款</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex space-x-4">
            <Button type="submit">提交表单</Button>
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              重置
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

## 加载状态示例

### 1. 页面级加载状态

```typescript
// pages/loading-example.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import {
  SmartLoading,
  LoadingStateIndicator,
  PageSkeleton,
  FormSkeleton,
  FullScreenLoading
} from '@/components/ui/loading-states';

export default function LoadingExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPageSkeleton, setShowPageSkeleton] = useState(false);
  const [showFormSkeleton, setShowFormSkeleton] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const simulatePageLoading = () => {
    setShowPageSkeleton(true);
    setTimeout(() => setShowPageSkeleton(false), 3000);
  };

  const simulateFormLoading = () => {
    setShowFormSkeleton(true);
    setTimeout(() => setShowFormSkeleton(false), 2500);
  };

  const simulateFullScreenLoading = () => {
    setShowFullScreen(true);
    setTimeout(() => setShowFullScreen(false), 2000);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">加载状态示例</h1>

      {/* 全屏加载 */}
      <FullScreenLoading isLoading={showFullScreen} message="正在加载页面..." />

      <Card>
        <CardHeader>
          <CardTitle>基础加载指示器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <LoadingStateIndicator state="loading" message="加载中..." />
            <LoadingStateIndicator state="success" message="完成！" />
            <LoadingStateIndicator state="error" message="出错了" />
            <LoadingStateIndicator state="validating" message="验证中..." />
          </div>

          <Button onClick={simulateLoading} disabled={isLoading}>
            {isLoading ? '加载中...' : '模拟加载'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>智能加载组件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={simulatePageLoading}>显示页面骨架屏</Button>
            <Button onClick={simulateFormLoading}>显示表单骨架屏</Button>
            <Button onClick={simulateFullScreenLoading}>显示全屏加载</Button>
          </div>

          <SmartLoading isLoading={showPageSkeleton} type="page">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">页面内容</h2>
              <p>这是页面的主要内容区域。</p>
              <Card>
                <CardHeader>
                  <CardTitle>数据卡片</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>这里显示一些数据...</p>
                </CardContent>
              </Card>
            </div>
          </SmartLoading>

          <SmartLoading isLoading={showFormSkeleton} type="form">
            <form className="space-y-4">
              <h3 className="text-lg font-medium">表单内容</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名</label>
                <input className="w-full p-2 border rounded" placeholder="请输入姓名" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <input className="w-full p-2 border rounded" placeholder="请输入邮箱" />
              </div>
            </form>
          </SmartLoading>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>手动骨架屏</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">页面骨架屏</h3>
            <PageSkeleton />
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">表单骨架屏</h3>
            <FormSkeleton fieldCount={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 侧边栏布局示例

### 1. 现代化侧边栏使用

```typescript
// pages/sidebar-example.tsx
'use client';

import React from 'react';
import { SimpleLayout } from '@/components/layout/SimpleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';

export default function SidebarExample() {
  return (
    <SimpleLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">仪表板</h1>
          <Badge variant="secondary">在线</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总表单数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">+20.1% 较上月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2350</div>
              <p className="text-xs text-muted-foreground">+180.1% 较上月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">提交次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,234</div>
              <p className="text-xs text-muted-foreground">+19% 较上月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">转化率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23.5%</div>
              <p className="text-xs text-muted-foreground">+12.5% 较上月</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>最近活动</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">A</span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">Alice 创建了新表单</p>
                  <p className="text-sm text-muted-foreground">用户调查表 - 2分钟前</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">B</span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">Bob 提交了表单</p>
                  <p className="text-sm text-muted-foreground">联系表单 - 15分钟前</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">C</span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">Charlie 更新了设置</p>
                  <p className="text-sm text-muted-foreground">权限设置 - 1小时前</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start">
                ➕ 创建新表单
              </Button>
              <Button variant="outline" className="w-full justify-start">
                📊 查看报表
              </Button>
              <Button variant="outline" className="w-full justify-start">
                👥 管理用户
              </Button>
              <Button variant="outline" className="w-full justify-start">
                ⚙️ 系统设置
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>快速搜索</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input placeholder="搜索表单、用户或数据..." className="flex-1" />
              <Button>搜索</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}
```

## 复杂表单示例

### 1. 条件字段表单

```typescript
// pages/conditional-form-example.tsx
'use client';

import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';

import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

const formSchema = z.object({
  firstName: z.string().min(1, '请输入名'),
  lastName: z.string().min(1, '请输入姓'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().optional(),
  addressType: z.enum(['home', 'work', 'other']),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  hasCompany: z.boolean(),
  companyName: z.string().optional(),
  companyPosition: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ConditionalFormExample() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      addressType: 'home',
      streetAddress: '',
      city: '',
      postalCode: '',
      hasCompany: false,
      companyName: '',
      companyPosition: '',
    },
  });

  // 监听地址类型变化
  const addressType = useWatch({
    control: form.control,
    name: 'addressType',
  });

  // 监听是否有公司变化
  const hasCompany = useWatch({
    control: form.control,
    name: 'hasCompany',
  });

  const onSubmit = (data: FormData) => {
    console.log('表单数据:', data);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>条件字段表单示例</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">基本信息</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>名</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓</FormLabel>
                        <FormControl>
                          <Input placeholder="请输入姓" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>电话 (可选)</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入电话号码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 地址信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">地址信息</h3>

                <FormField
                  control={form.control}
                  name="addressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>地址类型</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择地址类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">家庭地址</SelectItem>
                          <SelectItem value="work">工作地址</SelectItem>
                          <SelectItem value="other">其他地址</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 只有选择了地址类型才显示地址字段 */}
                {addressType && (
                  <>
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>街道地址</FormLabel>
                          <FormControl>
                            <Input placeholder="请输入街道地址" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>城市</FormLabel>
                            <FormControl>
                              <Input placeholder="请输入城市" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>邮政编码</FormLabel>
                            <FormControl>
                              <Input placeholder="请输入邮政编码" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* 公司信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">公司信息</h3>

                <FormField
                  control={form.control}
                  name="hasCompany"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>我有公司信息</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {/* 只有选择有公司才显示公司字段 */}
                {hasCompany && (
                  <>
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>公司名称</FormLabel>
                          <FormControl>
                            <Input placeholder="请输入公司名称" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>职位</FormLabel>
                          <FormControl>
                            <Input placeholder="请输入您的职位" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <div className="flex space-x-4">
                <Button type="submit">提交表单</Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  重置
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 表格组件示例

### 1. 数据表格使用

```typescript
// pages/table-example.tsx
'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

interface FormData {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  submissions: number;
  createdAt: string;
  lastModified: string;
}

export default function TableExample() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 模拟数据
  const formsData: FormData[] = [
    {
      id: '1',
      title: '用户调查表',
      status: 'published',
      submissions: 234,
      createdAt: '2024-01-15',
      lastModified: '2024-01-20',
    },
    {
      id: '2',
      title: '产品反馈表',
      status: 'draft',
      submissions: 0,
      createdAt: '2024-01-18',
      lastModified: '2024-01-18',
    },
    {
      id: '3',
      title: '活动报名表',
      status: 'published',
      submissions: 1567,
      createdAt: '2024-01-10',
      lastModified: '2024-01-22',
    },
    {
      id: '4',
      title: '联系表单',
      status: 'archived',
      submissions: 89,
      createdAt: '2023-12-01',
      lastModified: '2024-01-05',
    },
    {
      id: '5',
      title: '工作申请表',
      status: 'published',
      submissions: 445,
      createdAt: '2024-01-08',
      lastModified: '2024-01-19',
    },
  ];

  const filteredData = formsData.filter((form) => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">已发布</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">草稿</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800">已归档</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">表单管理</h1>
        <Button>创建新表单</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>表单列表</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索表单..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表单名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提交次数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>最后修改</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>{getStatusBadge(form.status)}</TableCell>
                  <TableCell>{form.submissions.toLocaleString()}</TableCell>
                  <TableCell>{form.createdAt}</TableCell>
                  <TableCell>{form.lastModified}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              没有找到匹配的表单
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

这些示例展示了 FastBuild 组件设计系统的实际应用方式。每个示例都遵循最佳实践，展示了组件的组合使用方式和高级功能。通过这些示例，开发者可以更好地理解如何在项目中使用组件系统。