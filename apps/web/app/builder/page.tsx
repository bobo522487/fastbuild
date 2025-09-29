import React from 'react'

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import SimpleLayout from '@/components/layout/SimpleLayout'

export default function BuilderPage() {
  return (
    <SimpleLayout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">表单构建器</h1>
          <p className="text-muted-foreground">
            使用可视化界面创建和设计您的表单
          </p>
        </div>

        {/* 快速开始 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">从空白开始</CardTitle>
              <CardDescription>
                使用可视化编辑器从头创建表单
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">开始构建</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">使用模板</CardTitle>
              <CardDescription>
                基于预设模板快速创建表单
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">选择模板</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">导入JSON</CardTitle>
              <CardDescription>
                从JSON Schema导入表单定义
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">导入文件</Button>
            </CardContent>
          </Card>
        </div>

        {/* 功能特性 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">功能特性</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  丰富的字段类型
                </CardTitle>
                <CardDescription>
                  支持文本、数字、选择、日期、复选框等多种字段类型
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🔧</span>
                  实时预览
                </CardTitle>
                <CardDescription>
                  边构建边预览，所见即所得的编辑体验
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  响应式设计
                </CardTitle>
                <CardDescription>
                  自动适配不同设备屏幕尺寸
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  智能验证
                </CardTitle>
                <CardDescription>
                  内置验证规则和自定义验证支持
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  样式定制
                </CardTitle>
                <CardDescription>
                  灵活的样式配置和主题定制
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  高性能
                </CardTitle>
                <CardDescription>
                  基于Zod Schema的高性能表单渲染
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* 开发状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              开发状态
              <Badge variant="secondary">开发中</Badge>
            </CardTitle>
            <CardDescription>
              表单构建器正在积极开发中，敬请期待完整功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">基础架构已完成</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">可视化编辑器开发中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <span className="text-sm">高级功能待实现</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  )
}