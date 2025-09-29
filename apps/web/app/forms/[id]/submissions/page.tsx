import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import SimpleLayout from '@/components/layout/SimpleLayout'

// 模拟提交数据
const getSubmissions = (formId: string) => {
  const submissions = {
    '1': [
      {
        id: '1',
        submittedAt: '2024-01-20 10:30',
        data: {
          '姓名': '张三',
          '邮箱': 'zhangsan@example.com',
          '产品评分': '5分',
          '反馈内容': '产品很棒，界面友好，功能完善。',
          '推荐意愿': '愿意推荐'
        }
      },
      {
        id: '2',
        submittedAt: '2024-01-20 14:15',
        data: {
          '姓名': '李四',
          '邮箱': 'lisi@example.com',
          '产品评分': '4分',
          '反馈内容': '整体不错，但是还有改进空间。',
          '推荐意愿': '可能会推荐'
        }
      },
      {
        id: '3',
        submittedAt: '2024-01-19 16:45',
        data: {
          '姓名': '王五',
          '邮箱': 'wangwu@example.com',
          '产品评分': '5分',
          '反馈内容': '非常满意，会继续使用。',
          '推荐意愿': '愿意推荐'
        }
      }
    ],
    '2': [
      {
        id: '4',
        submittedAt: '2024-01-18 09:20',
        data: {
          '姓名': '赵六',
          '电话': '13800138000',
          '公司': 'ABC公司',
          '职位': '产品经理',
          '特殊需求': '无'
        }
      }
    ]
  }

  return submissions[formId as keyof typeof submissions] || []
}

// 模拟表单信息
const getFormInfo = (formId: string) => {
  const forms = {
    '1': {
      id: '1',
      name: '用户反馈表',
      description: '收集用户对产品和服务的反馈意见'
    },
    '2': {
      id: '2',
      name: '活动报名表',
      description: '用于活动的在线报名和信息收集'
    }
  }

  return forms[formId as keyof typeof forms] || null
}

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const form = getFormInfo(id)
  const submissions = getSubmissions(id)

  if (!form) {
    notFound()
  }

  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link href="/forms" className="text-muted-foreground hover:text-primary">
                表单管理
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-3xl font-bold tracking-tight">{form.name}</h1>
            </div>
            <p className="text-muted-foreground">{form.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">导出数据</Button>
            <Button asChild>
              <Link href={`/forms/${id}`}>返回表单</Link>
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
              <div className="text-2xl font-bold">{submissions.length}</div>
              <p className="text-xs text-muted-foreground">总提交数量</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日提交</CardTitle>
              <span className="text-lg">📈</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.filter(s => s.submittedAt.startsWith('2024-01-20')).length}
              </div>
              <p className="text-xs text-muted-foreground">今日新增</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">完成率</CardTitle>
              <span className="text-lg">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">表单完成率</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均用时</CardTitle>
              <span className="text-lg">⏱️</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2分30秒</div>
              <p className="text-xs text-muted-foreground">平均填写时间</p>
            </CardContent>
          </Card>
        </div>

        {/* 数据查看和分析 */}
        <Tabs defaultValue="submissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="submissions">提交数据</TabsTrigger>
            <TabsTrigger value="analytics">数据分析</TabsTrigger>
            <TabsTrigger value="export">导出设置</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>提交记录</CardTitle>
                    <CardDescription>
                      查看所有表单提交的详细数据
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="搜索提交记录..." className="w-64" />
                    <Button variant="outline">筛选</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{submission.id}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {submission.submittedAt}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">查看详情</Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(submission.data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span className="text-muted-foreground">{value}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>数据分析</CardTitle>
                <CardDescription>
                  分析表单提交数据的统计信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    数据分析功能正在开发中，敬请期待...
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">提交趋势</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">图表占位</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">字段分析</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">图表占位</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>导出设置</CardTitle>
                <CardDescription>
                  配置数据导出选项并下载提交数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">导出为Excel</CardTitle>
                        <CardDescription>
                          将数据导出为Excel文件格式
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full">导出Excel</Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">导出为CSV</CardTitle>
                        <CardDescription>
                          将数据导出为CSV文件格式
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">导出CSV</Button>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">导出设置</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>包含时间戳</span>
                          <input type="checkbox" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>包含提交ID</span>
                          <input type="checkbox" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>仅导出必填字段</span>
                          <input type="checkbox" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SimpleLayout>
  )
}