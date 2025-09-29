import React from 'react'
import Link from 'next/link'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import SimpleLayout from '@/components/layout/SimpleLayout'

// 统计卡片组件
const StatCard = ({ title, value, description, trend, icon: Icon }: {
  title: string
  value: string | number
  description: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ElementType
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
)

// 快速操作卡片组件
const QuickActionCard = ({ title, description, href, icon: Icon, badge }: {
  title: string
  description: string
  href: string
  icon: React.ElementType
  badge?: string
}) => (
  <Card className="hover:shadow-md transition-shadow cursor-pointer">
    <Link href={href}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className="h-8 w-8 text-primary" />
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Link>
  </Card>
)

export default function HomePage() {
  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* 欢迎标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
          <p className="text-muted-foreground">
            管理您的表单和查看数据统计
          </p>
        </div>

        {/* 统计概览 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="我的表单"
            value="8"
            description="+2 本周新增"
            trend="up"
            icon={() => <span className="text-lg">📋</span>}
          />
          <StatCard
            title="今日提交"
            value="24"
            description="+5 较昨日"
            trend="up"
            icon={() => <span className="text-lg">📊</span>}
          />
          <StatCard
            title="总提交数"
            value="342"
            description="所有表单累计"
            trend="up"
            icon={() => <span className="text-lg">📈</span>}
          />
          <StatCard
            title="完成率"
            value="96.2%"
            description="表单完成率"
            trend="up"
            icon={() => <span className="text-lg">✅</span>}
          />
        </div>

        {/* 快速操作 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">快速操作</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              title="创建表单"
              description="使用可视化构建器创建新的表单"
              href="/builder"
              icon={() => <span className="text-2xl">🛠️</span>}
              badge="开始"
            />
            <QuickActionCard
              title="表单管理"
              description="查看和管理所有表单"
              href="/forms"
              icon={() => <span className="text-2xl">📋</span>}
            />
            <QuickActionCard
              title="功能演示"
              description="体验动态表单的渲染和验证功能"
              href="/demo"
              icon={() => <span className="text-2xl">🎭</span>}
            />
          </div>
        </div>

        {/* 最近活动 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近提交</CardTitle>
              <CardDescription>最新的表单提交记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { form: '联系表单', user: '张三', time: '2分钟前', status: '成功' },
                  { form: '用户注册', user: '李四', time: '5分钟前', status: '成功' },
                  { form: '满意度调查', user: '王五', time: '10分钟前', status: '成功' },
                  { form: '联系表单', user: '赵六', time: '15分钟前', status: '失败' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.form}</span>
                      <span className="text-muted-foreground">by {item.user}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.time}</span>
                      <Badge variant={item.status === '成功' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我的表单</CardTitle>
              <CardDescription>最近创建的表单</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: '用户反馈表', submissions: 24, created: '2天前', status: '已发布' },
                  { name: '活动报名表', submissions: 18, created: '3天前', status: '已发布' },
                  { name: '产品调查', submissions: 32, created: '1周前', status: '已发布' },
                  { name: '联系表单', submissions: 45, created: '2周前', status: '草稿' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.submissions} 提交</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.created}</span>
                      <Badge variant={item.status === '已发布' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Button size="sm" asChild className="w-full">
                    <Link href="/forms">查看所有表单</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SimpleLayout>
  )
}
