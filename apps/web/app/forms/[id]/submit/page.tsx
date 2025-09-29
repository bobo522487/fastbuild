'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react'
import SimpleLayout from '@/components/layout/SimpleLayout'
import { FormBreadcrumb, formBreadcrumbPatterns } from '@/components/layout/FormBreadcrumb'
import { SimpleFormSubmitHandler } from '@/components/forms/SimpleFormSubmitHandler'
import { trpc } from '@/trpc/provider'

interface FormSubmissionPageProps {
  params: Promise<{ id: string }>
}

export default function FormSubmissionPage({ params }: FormSubmissionPageProps) {
  const { id } = React.use(params)
  const router = useRouter()
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = React.useState<string>('')

  // 获取表单数据
  const { data: form, isLoading, error } = trpc.form.getById.useQuery({ id })

  const handleSubmitSuccess = React.useCallback((data: Record<string, any>) => {
    setSubmitStatus('success')
    setSubmitMessage('表单提交成功！感谢您的参与。')
    console.log('✅ Form submission successful:', data)

    // 滚动到页面顶部显示成功消息
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSubmitError = React.useCallback((error: string) => {
    setSubmitStatus('error')
    setSubmitMessage(error || '提交失败，请重试。')
    console.error('❌ Form submission error:', error)

    // 滚动到页面顶部显示错误消息
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleReset = React.useCallback(() => {
    setSubmitStatus('idle')
    setSubmitMessage('')
  }, [])

  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">正在加载表单...</p>
          </div>
        </div>
      </SimpleLayout>
    )
  }

  if (error || !form) {
    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">错误</CardTitle>
              <CardDescription>
                {error?.message || '表单不存在或已被删除'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/forms">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回表单列表
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">返回首页</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    )
  }

  // 提交成功页面
  if (submitStatus === 'success') {
    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-600">提交成功！</CardTitle>
              <CardDescription className="text-base">
                {submitMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 justify-center">
                <Button onClick={handleReset} variant="outline">
                  再次填写
                </Button>
                <Button asChild>
                  <Link href="/forms">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回表单列表
                  </Link>
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>提交时间：{new Date().toLocaleString('zh-CN')}</p>
                <p>表单：{form.name}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    )
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <FormBreadcrumb
          items={formBreadcrumbPatterns.submit(form.name, form.id)}
          className="mb-4"
        />

        {/* 页面标题和返回按钮 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/forms">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回表单列表
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{form.name}</h1>
              <Badge variant="default">填写表单</Badge>
            </div>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        </div>

        {/* 提交状态提示 */}
        {submitStatus === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>{submitMessage}</AlertDescription>
          </Alert>
        )}

        {/* 表单渲染 */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>请填写表单</CardTitle>
              <CardDescription>
                请仔细填写以下信息，所有必填项都需要完成
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleFormSubmitHandler
                metadata={{ ...form.metadata, id: form.id }}
                onSuccess={handleSubmitSuccess}
                onError={handleSubmitError}
              />
            </CardContent>
          </Card>
        </div>

        {/* 页面底部信息 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>表单版本：{form.version}</p>
          <p>创建时间：{new Date(form.createdAt).toLocaleDateString('zh-CN')}</p>
        </div>
      </div>
    </SimpleLayout>
  )
}