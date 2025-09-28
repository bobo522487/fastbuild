import React from 'react'
import Link from 'next/link'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import ApplicationShell from '@/components/shadcn-studio/application-shell'

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
    <ApplicationShell>
      <div className="space-y-8">
        {/* 欢迎标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">欢迎来到 FastBuild</h1>
          <p className="text-muted-foreground">
            Schema驱动的动态表单平台 - 快速构建、验证和管理表单
          </p>
        </div>

        {/* 统计概览 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="总表单数"
            value="12"
            description="+2 较上周"
            trend="up"
            icon={() => <span className="text-lg">📋</span>}
          />
          <StatCard
            title="今日提交"
            value="48"
            description="+12 较昨日"
            trend="up"
            icon={() => <span className="text-lg">📊</span>}
          />
          <StatCard
            title="活跃用户"
            value="156"
            description="+8 较昨日"
            trend="up"
            icon={() => <span className="text-lg">👥</span>}
          />
          <StatCard
            title="成功率"
            value="98.5%"
            description="表单提交成功率"
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
              badge="新功能"
            />
            <QuickActionCard
              title="表单演示"
              description="体验动态表单的渲染和验证功能"
              href="/demo"
              icon={() => <span className="text-2xl">🎭</span>}
            />
            <QuickActionCard
              title="查看数据"
              description="分析表单提交数据和用户行为"
              href="/analytics"
              icon={() => <span className="text-2xl">📈</span>}
            />
            <QuickActionCard
              title="表单模板"
              description="使用预设模板快速开始"
              href="/templates"
              icon={() => <span className="text-2xl">📄</span>}
            />
            <QuickActionCard
              title="简化演示"
              description="查看基础表单功能演示"
              href="/demo-simple"
              icon={() => <span className="text-2xl">🎯</span>}
            />
            <QuickActionCard
              title="系统监控"
              description="查看系统性能和健康状态"
              href="/admin/monitoring"
              icon={() => <span className="text-2xl">🖥️</span>}
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
              <CardTitle>系统状态</CardTitle>
              <CardDescription>当前系统运行状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">服务状态</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    正常运行
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">响应时间</span>
                  <span className="text-sm text-muted-foreground">45ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">数据库连接</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    已连接
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">内存使用</span>
                  <span className="text-sm text-muted-foreground">256MB / 1GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">版本信息</span>
                  <span className="text-sm text-muted-foreground">v1.0.0 MVP</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速开始指南 */}
        <Card>
          <CardHeader>
            <CardTitle>快速开始指南</CardTitle>
            <CardDescription>帮助您快速上手 FastBuild 平台</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">1️⃣</span>
                </div>
                <h3 className="font-semibold">创建表单</h3>
                <p className="text-sm text-muted-foreground">
                  使用可视化构建器或JSON Schema创建表单
                </p>
                <Button size="sm" asChild>
                  <Link href="/builder">开始创建</Link>
                </Button>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">2️⃣</span>
                </div>
                <h3 className="font-semibold">体验演示</h3>
                <p className="text-sm text-muted-foreground">
                  查看演示页面了解功能特性
                </p>
                <Button size="sm" asChild>
                  <Link href="/demo">查看演示</Link>
                </Button>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">3️⃣</span>
                </div>
                <h3 className="font-semibold">分析数据</h3>
                <p className="text-sm text-muted-foreground">
                  查看表单提交情况和数据分析
                </p>
                <Button size="sm" asChild>
                  <Link href="/analytics">查看数据</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ApplicationShell>
  )
}
