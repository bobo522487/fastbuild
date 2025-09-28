# FastBuild 示例代码

本文档提供了 FastBuild 的各种使用示例，帮助您快速上手和集成。

## 目录

- [基础示例](#基础示例)
- [表单创建示例](#表单创建示例)
- [API 集成示例](#api-集成示例)
- [组件使用示例](#组件使用示例)
- [测试示例](#测试示例)
- [高级示例](#高级示例)
- [Zod 4 现代化功能示例](#zod-4-现代化功能示例)
- [性能优化示例](#性能优化示例)

## 基础示例

### 1. 基本的表单创建

```typescript
import { trpc } from '@/trpc/provider';

// 创建联系表单
const contactForm = await trpc.form.create.mutate({
  name: 'Contact Form',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'name',
        name: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        id: 'email',
        name: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
        placeholder: 'Enter your email',
      },
      {
        id: 'message',
        name: 'message',
        type: 'textarea',
        label: 'Message',
        required: true,
        placeholder: 'Enter your message',
      },
    ],
  },
});

console.log('Form created:', contactForm);
```

### 2. 表单提交示例

```typescript
import { trpc } from '@/trpc/provider';

// 提交表单数据
const submission = await trpc.submission.create.mutate({
  formId: 'form-id-here',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'I would like to contact you about your services.',
  },
});

console.log('Form submitted:', submission);
```

### 3. 用户认证示例

```typescript
import { trpc } from '@/trpc/provider';

// 用户登录
const loginResult = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'password123',
});

if (loginResult.success) {
  console.log('User logged in:', loginResult.user);

  // 获取用户信息
  const { data: user } = trpc.auth.me.useQuery();
  console.log('Current user:', user);
}
```

## 表单创建示例

### 1. 复杂表单结构

```typescript
const registrationForm = {
  name: 'User Registration',
  metadata: {
    version: '1.0.0',
    fields: [
      // 基本信息
      {
        id: 'fullName',
        name: 'fullName',
        type: 'text',
        label: 'Full Name',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        id: 'email',
        name: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
        placeholder: 'Enter your email',
      },
      {
        id: 'password',
        name: 'password',
        type: 'text',
        label: 'Password',
        required: true,
        placeholder: 'Enter your password',
      },
      // 个人信息
      {
        id: 'age',
        name: 'age',
        type: 'number',
        label: 'Age',
        required: true,
        placeholder: 'Enter your age',
      },
      {
        id: 'gender',
        name: 'gender',
        type: 'select',
        label: 'Gender',
        required: true,
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        id: 'birthDate',
        name: 'birthDate',
        type: 'date',
        label: 'Birth Date',
        required: true,
      },
      // 偏好设置
      {
        id: 'newsletter',
        name: 'newsletter',
        type: 'checkbox',
        label: 'Subscribe to newsletter',
        defaultValue: true,
      },
      {
        id: 'interests',
        name: 'interests',
        type: 'select',
        label: 'Interests',
        required: true,
        options: [
          { label: 'Technology', value: 'tech' },
          { label: 'Sports', value: 'sports' },
          { label: 'Music', value: 'music' },
          { label: 'Reading', value: 'reading' },
        ],
      },
      // 条件字段（仅当年龄大于18时显示）
      {
        id: 'occupation',
        name: 'occupation',
        type: 'text',
        label: 'Occupation',
        required: false,
        placeholder: 'Enter your occupation',
        condition: {
          fieldId: 'age',
          operator: 'equals',
          value: 18,
        },
      },
    ],
  },
};
```

### 2. 调查问卷表单

```typescript
const surveyForm = {
  name: 'Customer Satisfaction Survey',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'overallSatisfaction',
        name: 'overallSatisfaction',
        type: 'select',
        label: 'Overall Satisfaction',
        required: true,
        options: [
          { label: 'Very Satisfied', value: 5 },
          { label: 'Satisfied', value: 4 },
          { label: 'Neutral', value: 3 },
          { label: 'Dissatisfied', value: 2 },
          { label: 'Very Dissatisfied', value: 1 },
        ],
      },
      {
        id: 'serviceQuality',
        name: 'serviceQuality',
        type: 'select',
        label: 'Service Quality',
        required: true,
        options: [
          { label: 'Excellent', value: 5 },
          { label: 'Good', value: 4 },
          { label: 'Average', value: 3 },
          { label: 'Poor', value: 2 },
          { label: 'Very Poor', value: 1 },
        ],
      },
      {
        id: 'recommendation',
        name: 'recommendation',
        type: 'select',
        label: 'How likely are you to recommend us?',
        required: true,
        options: [
          { label: 'Very Likely', value: 10 },
          { label: 'Likely', value: 8 },
          { label: 'Neutral', value: 6 },
          { label: 'Unlikely', value: 4 },
          { label: 'Very Unlikely', value: 2 },
        ],
      },
      {
        id: 'feedback',
        name: 'feedback',
        type: 'textarea',
        label: 'Additional Feedback',
        required: false,
        placeholder: 'Please share any additional feedback...',
      },
    ],
  },
};
```

## API 集成示例

### 1. React Hook Form 集成

```typescript
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/trpc/provider';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';

// 定义表单模式
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const submitMutation = trpc.submission.create.useMutation();

  const onSubmit = async (data: ContactFormData) => {
    try {
      const result = await submitMutation.mutateAsync({
        formId: 'contact-form-id',
        data,
      });

      console.log('Form submitted successfully:', result);
      reset(); // 重置表单
      alert('Thank you for your message!');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter your name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="Enter your email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Message
        </label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="Enter your message"
          rows={4}
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitMutation.isPending}
        className="w-full"
      >
        {submitMutation.isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

### 2. 动态表单渲染器

```typescript
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/trpc/provider';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';

interface DynamicFormRendererProps {
  formId: string;
}

export function DynamicFormRenderer({ formId }: DynamicFormRendererProps) {
  const { data: form, isLoading } = trpc.form.getById.useQuery(
    { id: formId },
    { enabled: !!formId }
  );

  const submitMutation = trpc.submission.create.useMutation();

  if (isLoading) return <div>Loading form...</div>;
  if (!form) return <div>Form not found</div>;

  // 动态构建 Zod 模式
  const buildZodSchema = (fields: any[]) => {
    const schema: Record<string, any> = {};

    fields.forEach((field) => {
      let fieldSchema: any;

      switch (field.type) {
        case 'text':
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'email':
          fieldSchema = z.string().email();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }

      if (field.required) {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      }

      schema[field.name] = fieldSchema;
    });

    return z.object(schema);
  };

  const formSchema = buildZodSchema(form.metadata.fields);
  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await submitMutation.mutateAsync({
        formId,
        data,
      });

      console.log('Form submitted successfully:', result);
      reset();
      alert('Form submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit form. Please try again.');
    }
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...register(field.name)}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
          />
        );

      case 'select':
        return (
          <Select onValueChange={(value) => register(field.name).onChange({ target: { value } })}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              {...register(field.name)}
              defaultChecked={field.defaultValue}
            />
            <label htmlFor={field.id} className="text-sm">
              {field.label}
            </label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            {...register(field.name)}
            defaultValue={field.defaultValue}
          />
        );

      default:
        return (
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            {...register(field.name)}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-2xl font-bold">{form.name}</h2>

      {form.metadata.fields.map((field: any) => (
        <div key={field.id} className="space-y-2">
          <label htmlFor={field.id} className="block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          {renderField(field)}
          {errors[field.name] && (
            <p className="text-sm text-red-600">
              {errors[field.name]?.message}
            </p>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={submitMutation.isPending}
        className="w-full"
      >
        {submitMutation.isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

### 3. 表单管理界面

```typescript
'use client';

import React from 'react';
import { trpc } from '@/trpc/provider';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { format } from 'date-fns';

export function FormManagement() {
  const { data: forms, isLoading, refetch } = trpc.form.list.useQuery();
  const deleteForm = trpc.form.delete.useMutation();

  const handleDelete = async (formId: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      try {
        await deleteForm.mutateAsync({ id: formId });
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  if (isLoading) return <div>Loading forms...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Form Management</h1>
        <Button>Create New Form</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms?.items.map((form) => (
          <Card key={form.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{form.name}</span>
                <Badge variant="secondary">
                  {form.metadata.fields.length} fields
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Created: {format(new Date(form.createdAt), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  Submissions: {form.submissions.length}
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(form.id)}
                    disabled={deleteForm.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## 组件使用示例

### 1. 认证状态管理

```typescript
'use client';

import React from 'react';
import { trpc } from '@/trpc/provider';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';

export function AuthStatus() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const login = trpc.auth.login.useMutation();
  const logout = trpc.auth.logout.useMutation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span>Welcome, {user.name}!</span>
        <Button onClick={handleLogout} disabled={logout.isPending}>
          {logout.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex items-center space-x-2">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

### 2. 表单提交统计

```typescript
'use client';

import React from 'react';
import { trpc } from '@/trpc/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

export function FormStats({ formId }: { formId: string }) {
  const { data: submissions, isLoading } = trpc.submission.getByFormId.useQuery(
    { formId },
    { enabled: !!formId }
  );

  if (isLoading) return <div>Loading statistics...</div>;

  const totalSubmissions = submissions?.items.length || 0;
  const recentSubmissions = submissions?.items.filter(
    (sub) => new Date(sub.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSubmissions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentSubmissions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalSubmissions > 0 ? Math.round(totalSubmissions / 30) : 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 测试示例

### 1. API 测试

```typescript
// tests/unit/api.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockContext } from '../setup';

describe('Form API', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe('form.create', () => {
    it('should create a new form', async () => {
      const formData = {
        name: 'Test Form',
        metadata: {
          version: '1.0.0',
          fields: [
            {
              id: 'name',
              name: 'name',
              type: 'text',
              label: 'Name',
              required: true,
            },
          ],
        },
      };

      const result = await ctx.prisma.form.create({
        data: {
          ...formData,
          createdById: ctx.user.id,
        },
      });

      expect(result.name).toBe(formData.name);
      expect(result.createdById).toBe(ctx.user.id);
    });
  });

  describe('submission.create', () => {
    it('should create a new submission', async () => {
      const form = await ctx.prisma.form.create({
        data: {
          name: 'Test Form',
          metadata: {
            version: '1.0.0',
            fields: [],
          },
          createdById: ctx.user.id,
        },
      });

      const submissionData = {
        formId: form.id,
        data: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const result = await ctx.prisma.submission.create({
        data: submissionData,
      });

      expect(result.formId).toBe(form.id);
      expect(result.data).toEqual(submissionData.data);
    });
  });
});
```

### 2. 组件测试

```typescript
// tests/components/ContactForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '@/components/forms/ContactForm';
import { trpc } from '@/trpc/provider';

// Mock tRPC
vi.mock('@/trpc/provider', () => ({
  trpc: {
    submission: {
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 'test-submission' }),
          isPending: false,
        }),
      },
    },
  },
}));

describe('ContactForm', () => {
  it('should render form fields', () => {
    render(<ContactForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<ContactForm />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });
  });

  it('should submit form data', async () => {
    const { container } = render(<ContactForm />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Test message' },
    });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(trpc.submission.create.useMutation().mutateAsync).toHaveBeenCalledWith({
        formId: 'contact-form-id',
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Test message',
        },
      });
    });
  });
});
```

## 高级示例

### 1. 条件字段处理

```typescript
// 处理条件字段的逻辑
export function useConditionalFields(formMetadata: any) {
  const [fieldStates, setFieldStates] = React.useState<Record<string, boolean>>({});

  const evaluateCondition = (condition: any, formData: Record<string, any>) => {
    if (!condition) return true;

    const fieldValue = formData[condition.fieldId];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return fieldValue?.includes(condition.value);
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      default:
        return true;
    }
  };

  const updateFieldStates = (formData: Record<string, any>) => {
    const newStates: Record<string, boolean> = {};

    formMetadata.fields.forEach((field: any) => {
      if (field.condition) {
        newStates[field.id] = evaluateCondition(field.condition, formData);
      } else {
        newStates[field.id] = true;
      }
    });

    setFieldStates(newStates);
  };

  const isFieldVisible = (fieldId: string) => {
    return fieldStates[fieldId] !== false;
  };

  return {
    fieldStates,
    updateFieldStates,
    isFieldVisible,
  };
}
```

### 2. 表单数据验证

```typescript
import { z } from 'zod';

export function createFormValidator(formMetadata: any) {
  const fieldSchemas: Record<string, any> = {};

  formMetadata.fields.forEach((field: any) => {
    let schema: any;

    switch (field.type) {
      case 'text':
      case 'textarea':
        schema = z.string();
        break;
      case 'email':
        schema = z.string().email('Invalid email address');
        break;
      case 'number':
        schema = z.number('Must be a number');
        break;
      case 'select':
        schema = z.string();
        break;
      case 'checkbox':
        schema = z.boolean();
        break;
      case 'date':
        schema = z.string().refine(
          (date) => !isNaN(Date.parse(date)),
          'Invalid date'
        );
        break;
      default:
        schema = z.string();
    }

    // 添加必填验证
    if (field.required) {
      schema = schema.min(1, `${field.label} is required`);
    }

    // 添加自定义验证
    if (field.validation) {
      field.validation.forEach((rule: any) => {
        switch (rule.type) {
          case 'minLength':
            schema = schema.min(rule.value, `Minimum ${rule.value} characters`);
            break;
          case 'maxLength':
            schema = schema.max(rule.value, `Maximum ${rule.value} characters`);
            break;
          case 'pattern':
            schema = schema.regex(
              new RegExp(rule.value),
              rule.message || 'Invalid format'
            );
            break;
        }
      });
    }

    fieldSchemas[field.name] = schema;
  });

  return z.object(fieldSchemas);
}
```

### 3. 实时表单提交

```typescript
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/trpc/provider';
import { debounce } from 'lodash';

export function AutoSaveForm({ formId }: { formId: string }) {
  const { data: form } = trpc.form.getById.useQuery({ id: formId });
  const { data: existingSubmission } = trpc.submission.getByFormId.useQuery(
    { formId, limit: 1 },
    { enabled: !!formId }
  );

  const submitMutation = trpc.submission.create.useMutation();

  const formSchema = React.useMemo(() => {
    if (!form) return z.object({});

    return createFormValidator(form.metadata);
  }, [form]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: existingSubmission?.items[0]?.data || {},
  });

  const watchedValues = watch();

  // 防抖自动保存
  const debouncedSave = React.useMemo(
    () =>
      debounce(async (data: any) => {
        try {
          await submitMutation.mutateAsync({
            formId,
            data,
          });
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      }, 1000),
    [formId, submitMutation]
  );

  React.useEffect(() => {
    if (Object.keys(watchedValues).length > 0) {
      debouncedSave(watchedValues);
    }
  }, [watchedValues, debouncedSave]);

  if (!form) return <div>Loading form...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{form.name}</h2>
        <div className="text-sm text-gray-500">
          {submitMutation.isPending ? 'Saving...' : 'Auto-saved'}
        </div>
      </div>

      {form.metadata.fields.map((field: any) => (
        <div key={field.id}>
          <label>{field.label}</label>
          {/* Render field based on type */}
          {renderField(field, register, errors)}
        </div>
      ))}
    </div>
  );
}
```

## 性能优化示例

### 1. 数据库查询优化

```typescript
// 优化的表单查询
export const getFormsWithStats = trpc.form.list.query(
  async ({ ctx, input }) => {
    const { search, cursor, limit = 10 } = input;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { createdBy: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const forms = await ctx.prisma.form.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        submissions: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const items = forms.slice(0, limit);
    const nextCursor = forms.length > limit ? forms[limit - 1].id : null;

    return {
      items: items.map((form) => ({
        ...form,
        submissionCount: form.submissions.length,
        recentSubmissionCount: form.submissions.filter(
          (sub) => new Date(sub.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      })),
      nextCursor,
      total: await ctx.prisma.form.count({ where }),
    };
  }
);
```

### 2. 前端缓存优化

```typescript
'use client';

import React from 'react';
import { trpc } from '@/trpc/provider';

export function FormList() {
  const [searchTerm, setSearchTerm] = React.useState('');

  // 使用查询优化
  const { data, fetchNextPage, hasNextPage, isFetching } =
    trpc.form.list.useInfiniteQuery(
      { search: searchTerm, limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true, // 保持旧数据直到新数据加载完成
        staleTime: 5 * 60 * 1000, // 5分钟缓存
      }
    );

  const forms = data?.pages.flatMap((page) => page.items) || [];

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <div>
      <SearchInput onSearch={handleSearch} />

      <div className="space-y-4">
        {forms.map((form) => (
          <FormCard key={form.id} form={form} />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetching}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isFetching ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Zod 4 现代化功能示例

### 1. 智能布尔值转换

FastBuild 的 Schema 编译器现在支持 Zod 4 风格的智能布尔值转换：

```typescript
// 创建支持智能布尔值转换的表单
const smartBooleanForm = {
  name: 'Smart Boolean Demo',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'newsletter',
        name: 'newsletter',
        type: 'checkbox',
        label: 'Subscribe to newsletter',
        description: 'Supports multiple input formats',
      },
      {
        id: 'termsAccepted',
        name: 'termsAccepted',
        type: 'checkbox',
        label: 'Accept terms and conditions',
        required: true,
      },
    ],
  },
};

// 测试各种布尔值输入格式
const testCases = [
  { newsletter: true },           // 原生布尔值
  { newsletter: 1 },             // 数字 1
  { newsletter: 0 },             // 数字 0
  { newsletter: 'true' },        // 字符串 'true'
  { newsletter: 'false' },       // 字符串 'false'
  { newsletter: 'yes' },         // 字符串 'yes'
  { newsletter: 'no' },          // 字符串 'no'
  { newsletter: 'on' },          // 字符串 'on'
  { newsletter: 'off' },         // 字符串 'off'
  { newsletter: 'TRUE' },        // 大写字符串
  { newsletter: 'invalid' },     // 其他字符串（转为 false）
];

// 使用 Schema 编译器验证
import { buildZodSchema } from '@workspace/schema-compiler';

const schema = buildZodSchema(smartBooleanForm.metadata);

testCases.forEach((testCase, index) => {
  const result = schema.safeParse(testCase);
  console.log(`Test case ${index + 1}:`, {
    input: testCase,
    success: result.success,
    output: result.success ? result.data : result.error,
  });
});
```

### 2. 元数据系统

Zod 4 的 `.meta()` 方法可以为字段添加丰富的元数据：

```typescript
// 创建带有丰富元数据的表单
const metadataRichForm = {
  name: 'Metadata Rich Form',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'email',
        name: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
        description: 'We will never share your email with third parties',
      },
      {
        id: 'password',
        name: 'password',
        type: 'text',
        label: 'Password',
        required: true,
        description: 'Use at least 8 characters',
      },
      {
        id: 'age',
        name: 'age',
        type: 'number',
        label: 'Age',
        required: true,
        description: 'Must be between 18 and 120',
      },
    ],
  },
};

// 编译后的 Schema 会包含元数据
const schema = buildZodSchema(metadataRichForm.metadata);

// 元数据包含 UI 组件信息、验证规则、业务逻辑等
console.log('Field metadata:', schema._def.schema.shape.email._def.meta);
```

### 3. 智能字段验证

系统会根据字段名称和标签自动应用验证规则：

```typescript
// 自动验证示例
const smartValidationForm = {
  name: 'Smart Validation Demo',
  metadata: {
    version: '1.0.0',
    fields: [
      {
        id: 'email',
        name: 'email',  // 自动应用邮箱验证
        type: 'text',
        label: 'Email Address',
        required: true,
      },
      {
        id: 'website',
        name: 'website',  // 自动应用 URL 验证
        type: 'text',
        label: 'Website URL',
      },
      {
        id: 'phone',
        name: 'phone',  // 自动应用电话号码验证
        type: 'text',
        label: 'Phone Number',
      },
      {
        id: 'age',
        name: 'age',  // 自动应用年龄范围验证
        type: 'number',
        label: 'Age',
        required: true,
      },
      {
        id: 'price',
        name: 'price',  // 自动应用价格验证（非负数）
        type: 'number',
        label: 'Price',
        required: true,
      },
    ],
  },
};

// 测试智能验证
const schema = buildZodSchema(smartValidationForm.metadata);

const testData = {
  email: 'invalid-email',  // 会被拒绝
  website: 'not-a-url',    // 会被拒绝
  phone: '123',           // 会被拒绝
  age: -5,                // 会被拒绝
  price: -10,             // 会被拒绝
};

const result = schema.safeParse(testData);
console.log('Validation result:', result);
```

### 4. JSON Schema 转换

将 Zod Schema 转换为 JSON Schema：

```typescript
import { buildZodSchema, zodToJsonSchema } from '@workspace/schema-compiler';

// 创建表单
const formMetadata = {
  version: '1.0.0',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: 'Name',
      required: true,
    },
    {
      id: 'email',
      name: 'email',
      type: 'text',
      label: 'Email',
      required: true,
    },
  ],
};

// 构建 Zod Schema
const zodSchema = buildZodSchema(formMetadata);

// 转换为 JSON Schema
const jsonSchema = zodToJsonSchema(zodSchema);

console.log('JSON Schema:', JSON.stringify(jsonSchema, null, 2));

// 输出类似：
// {
//   "type": "object",
//   "properties": {
//     "name": {
//       "type": "string",
//       "minLength": 1
//     },
//     "email": {
//       "type": "string",
//       "format": "email",
//       "minLength": 1
//     }
//   },
//   "required": ["name", "email"]
// }
```

### 5. 性能优化示例

使用 LRU 缓存和性能监控：

```typescript
import { SchemaCompiler } from '@workspace/schema-compiler';

// 创建带缓存的编译器实例
const compiler = new SchemaCompiler({
  enableCache: true,
  cacheMaxSize: 100,
  enablePrecompilation: true,
});

// 获取性能指标
const metrics = compiler.getPerformanceMetrics();
console.log('Performance metrics:', {
  compilationTime: `${metrics.compilationTime}ms`,
  validationTime: `${metrics.validationTime}ms`,
  cacheHitRate: `${metrics.cacheHitRate}%`,
  cacheSize: metrics.cacheSize,
  totalCompilations: metrics.totalCompilations,
});

// 运行性能基准测试
const benchmarkResult = await compiler.runPerformanceBenchmark(formMetadata, 1000);
console.log('Benchmark result:', benchmarkResult);

// 清空缓存
compiler.clearCache();
```

## 性能优化示例

### 1. 批量 Schema 编译

```typescript
import { SchemaCompiler } from '@workspace/schema-compiler';

const compiler = new SchemaCompiler();

// 批量编译多个表单
const forms = [
  { id: 'form1', metadata: formMetadata1 },
  { id: 'form2', metadata: formMetadata2 },
  { id: 'form3', metadata: formMetadata3 },
];

// 预编译所有表单
const schemas = forms.map(form => {
  const result = compiler.compile(form.metadata);
  return { formId: form.id, schema: result.schema };
});

// 缓存结果用于后续使用
const schemaCache = new Map(schemas.map(item => [item.formId, item.schema]));
```

### 2. 懒加载字段组件

```typescript
// 优化的字段组件渲染
const LazyFieldComponent = React.lazy(() => import('./fields/TextField'));

// 按需加载字段组件
const renderField = (field: FormField) => {
  const componentMap = {
    text: () => import('./fields/TextField'),
    number: () => import('./fields/NumberField'),
    select: () => import('./fields/SelectField'),
    checkbox: () => import('./fields/CheckboxField'),
    textarea: () => import('./fields/TextareaField'),
  };

  const LazyComponent = React.lazy(componentMap[field.type]);

  return (
    <React.Suspense fallback={<div>Loading field...</div>}>
      <LazyComponent field={field} />
    </React.Suspense>
  );
};
```

### 3. 智能预取策略

```typescript
import { trpc } from '@/trpc/provider';

export function useFormPrefetch() {
  const utils = trpc.useUtils();

  // 预取相关数据
  const prefetchRelatedData = async (formId: string) => {
    // 预取表单详情
    await utils.form.getById.prefetch({ id: formId });

    // 预取表单提交记录
    await utils.submission.getByFormId.prefetch({
      formId,
      limit: 10
    });

    // 预取表单统计
    await utils.form.getStats.prefetch({ formId });
  };

  return { prefetchRelatedData };
}
```

这些示例涵盖了 FastBuild 的主要使用场景，从基础的表单创建到高级的实时功能。您可以根据自己的需求调整和扩展这些示例。

**新增的 Zod 4 功能**：
- 智能布尔值转换支持多种输入格式
- 丰富的元数据系统增强开发体验
- 自动字段验证减少重复代码
- JSON Schema 转换增强互操作性
- 性能优化系统提升应用响应速度