'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { ArrowLeft, Settings, FileText, Eye, BarChart3 } from 'lucide-react'
import SimpleLayout from '@/components/layout/SimpleLayout'
import { FormBreadcrumb, formBreadcrumbPatterns } from '@/components/layout/FormBreadcrumb'
import { trpc } from '@/trpc/provider'

interface FormEditPageProps {
  params: Promise<{ id: string }>
}

export default function FormEditPage({ params }: FormEditPageProps) {
  const { id } = React.use(params)
  const router = useRouter()

  // 获取表单数据
  const { data: form, isLoading, error } = trpc.form.getById.useQuery({ id })

  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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

  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* 面包屑导航 */}
        <FormBreadcrumb
          items={formBreadcrumbPatterns.edit(form.name, form.id)}
          className="mb-4"
        />

        {/* 页面标题和操作 */}
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
              <Badge variant="default">编辑表单</Badge>
            </div>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/forms/${form.id}/submit`}>
                <Eye className="h-4 w-4 mr-2" />
                填写表单
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/forms/${form.id}/submissions`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                查看数据
              </Link>
            </Button>
          </div>
        </div>

        {/* 统计概览 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总提交数</CardTitle>
              <span className="text-lg">📊</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{form._count?.submissions || 0}</div>
              <p className="text-xs text-muted-foreground">总提交数量</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">字段数量</CardTitle>
              <span className="text-lg">📝</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{form.metadata.fields.length}</div>
              <p className="text-xs text-muted-foreground">表单字段</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">创建时间</CardTitle>
              <span className="text-lg">📅</span>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(form.createdAt).toLocaleDateString('zh-CN')}
              </div>
              <p className="text-xs text-muted-foreground">表单创建日期</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最后修改</CardTitle>
              <span className="text-lg">🔄</span>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(form.updatedAt).toLocaleDateString('zh-CN')}
              </div>
              <p className="text-xs text-muted-foreground">最近更新时间</p>
            </CardContent>
          </Card>
        </div>

        {/* 详细信息 */}
        <Tabs defaultValue="fields" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fields">字段配置</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>表单字段</CardTitle>
                <CardDescription>
                  当前表单包含以下字段
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {form.metadata.fields.map((field: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="destructive" className="text-xs">必填</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{field.type}</span>
                        {field.placeholder && (
                          <p className="text-xs text-muted-foreground">{field.placeholder}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline">编辑</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>表单预览</CardTitle>
                <CardDescription>
                  预览表单的最终效果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    表单预览功能正在开发中，敬请期待...
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/forms/${form.id}/submit`}>
                        完整预览
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/builder">
                        编辑表单
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>表单设置</CardTitle>
                <CardDescription>
                  配置表单的高级设置
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">提交后重定向</h4>
                      <p className="text-sm text-muted-foreground">用户提交后跳转的页面</p>
                    </div>
                    <Button variant="outline" size="sm">配置</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">邮件通知</h4>
                      <p className="text-sm text-muted-foreground">新提交时发送邮件通知</p>
                    </div>
                    <Button variant="outline" size="sm">配置</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">数据验证</h4>
                      <p className="text-sm text-muted-foreground">自定义验证规则</p>
                    </div>
                    <Button variant="outline" size="sm">配置</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SimpleLayout>
  )
}