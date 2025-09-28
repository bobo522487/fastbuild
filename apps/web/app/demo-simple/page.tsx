'use client';

import React from 'react';
import ApplicationShell from '@/components/shadcn-studio/application-shell';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@workspace/ui/components/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';

// 简单的表单 Schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  contactMethod: z.enum(['email', 'phone', 'both']),
  newsletter: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

// 示例表单数据
const sampleFormData = {
  name: '张三',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  message: '这是一个测试消息，用来验证表单提交功能是否正常工作。',
  contactMethod: 'email' as const,
  newsletter: true,
};

export default function SimpleDemoPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitResult, setSubmitResult] = React.useState<{
    success: boolean;
    message: string;
    data?: FormData;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: sampleFormData,
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // 模拟提交延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Console.log 输出提交数据
      console.log('🚀 Form Submitted:', {
        timestamp: new Date().toISOString(),
        data,
        validation: 'passed',
      });

      // 设置成功结果
      setSubmitResult({
        success: true,
        message: '表单提交成功！请查看控制台输出。',
        data,
      });

      // 重置表单
      form.reset();

    } catch (error) {
      console.error('❌ Form submission error:', error);
      setSubmitResult({
        success: false,
        message: 'Submission failed, please try again。',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSampleData = () => {
    form.reset(sampleFormData);
  };

  return (
    <ApplicationShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">FastBuild 简化演示</h1>
          <p className="text-muted-foreground">
            测试 Schema 驱动的表单生成和验证功能
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>联系表单</CardTitle>
            <CardDescription>
              使用 Zod Schema 验证的动态表单示例
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 姓名 */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="Please enter your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 邮箱 */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱 *</FormLabel>
                      <FormControl>
                        <Input placeholder="Please enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 电话 */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>电话</FormLabel>
                      <FormControl>
                        <Input placeholder="Please enter your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 联系方式偏好 */}
                <FormField
                  control={form.control}
                  name="contactMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系方式偏好 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择联系方式" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">邮件</SelectItem>
                          <SelectItem value="phone">电话</SelectItem>
                          <SelectItem value="both">均可</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 消息 */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>消息 *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please enter your message"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 订阅 Newsletter */}
                <FormField
                  control={form.control}
                  name="newsletter"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>订阅新闻通讯</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {/* 按钮组 */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? '提交中...' : '提交表单'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadSampleData}
                    disabled={isSubmitting}
                  >
                    加载示例数据
                  </Button>
                </div>

                {/* 提交结果 */}
                {submitResult && (
                  <div className={`p-4 rounded-lg ${
                    submitResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      submitResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {submitResult.success ? '✅' : '❌'} {submitResult.message}
                    </p>
                    {submitResult.success && submitResult.data && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-green-700">
                          查看提交的数据
                        </summary>
                        <pre className="mt-2 text-xs bg-green-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(submitResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>功能说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">✅ 已实现功能</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>使用 Zod Schema 进行表单验证</li>
                  <li>React Hook Form 集成</li>
                  <li>支持多种字段类型：文本、邮箱、选择、文本域、复选框</li>
                  <li>实时验证反馈</li>
                  <li>表单提交后 console.log 输出</li>
                  <li>示例数据加载功能</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔄 提交流程</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>用户填写表单，实时验证输入</li>
                  <li>点击"提交表单"按钮</li>
                  <li>前端验证通过后提交数据</li>
                  <li>控制台输出提交的详细信息</li>
                  <li>显示提交结果给用户</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🎯 测试方法</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>点击"加载示例数据"快速填入测试数据</li>
                  <li>修改字段值查看实时验证效果</li>
                  <li>提交表单后查看浏览器控制台输出</li>
                  <li>验证所有字段类型的正常工作</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ApplicationShell>
  );
}