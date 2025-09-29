'use client'

import React from 'react'
import Link from 'next/link'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Loader2 } from 'lucide-react'
import SimpleLayout from '@/components/layout/SimpleLayout'
import { FormBreadcrumb, formBreadcrumbPatterns } from '@/components/layout/FormBreadcrumb'
import { trpc } from '@/trpc/provider'

export default function FormsPage() {
  // 获取表单列表数据
  const { data: formsData, isLoading, error } = trpc.form.list.useQuery({
    limit: 50
  })

  // 处理加载状态
  if (isLoading) {
    return (
      <SimpleLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">正在加载表单列表...</p>
          </div>
        </div>
      </SimpleLayout>
    )
  }

  // 处理错误状态
  if (error) {
    return (
      <SimpleLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">错误</CardTitle>
              <CardDescription>
                加载表单列表时发生错误: {error.message}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>
                重新加载
              </Button>
            </CardContent>
          </Card>
        </div>
      </SimpleLayout>
    )
  }

  // 如果没有表单数据
  const forms = formsData?.items || []
  const totalForms = formsData?.total || 0

  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* 面包屑导航 */}
        <FormBreadcrumb
          items={formBreadcrumbPatterns.forms}
          className="mb-4"
        />

        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">表单管理</h1>
            <p className="text-muted-foreground">
              管理您的所有表单和查看提交数据
            </p>
          </div>
          <Button asChild>
            <Link href="/builder">
              创建新表单
            </Link>
          </Button>
        </div>

        {/* 统计概览 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总表单数</CardTitle>
              <span className="text-lg">📋</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalForms}</div>
              <p className="text-xs text-muted-foreground">
                全部表单数量
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总提交数</CardTitle>
              <span className="text-lg">📊</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {forms.reduce((sum, form) => sum + (form._count?.submissions || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">所有表单累计</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日提交</CardTitle>
              <span className="text-lg">📈</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃表单</CardTitle>
              <span className="text-lg">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalForms}</div>
              <p className="text-xs text-muted-foreground">全部表单</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <Card>
          <CardHeader>
            <CardTitle>搜索和筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input placeholder="搜索表单名称..." className="flex-1" />
              <Button variant="outline">筛选</Button>
            </div>
          </CardContent>
        </Card>

        {/* 表单列表 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">表单列表</h2>
          {forms.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">暂无表单</p>
                <Button asChild>
                  <Link href="/builder">创建第一个表单</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          <Link
                            href={`/forms/${form.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {form.name}
                          </Link>
                        </CardTitle>
                        <CardDescription>{form.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">已发布</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <span>{form._count?.submissions || 0} 提交</span>
                        <span>创建于 {new Date(form.createdAt).toLocaleDateString('zh-CN')}</span>
                        <span>更新于 {new Date(form.updatedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/forms/${form.id}`}>
                            填写表单
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/forms/${form.id}/edit`}>
                            编辑
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/forms/${form.id}/submissions`}>
                            查看数据
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SimpleLayout>
  )
}