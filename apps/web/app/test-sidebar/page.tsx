'use client'

import React from 'react'
import EnhancedSidebar from '@/components/shadcn-studio/blocks/enhanced-sidebar'

export default function SidebarTestPage() {
  return (
    <div className="flex min-h-screen">
      <EnhancedSidebar defaultWidth={300} minWidth={200} maxWidth={600}>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">测试侧边栏</h2>
          <p className="text-sm text-muted-foreground">
            请尝试拖动右侧的边框来调整宽度。拖动手柄应该在右侧边缘显示为6个圆点。
          </p>
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">✅ 拖动功能已启用</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">✅ 本地存储已启用</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">✅ 响应式设计已启用</p>
            </div>
          </div>
        </div>
      </EnhancedSidebar>

      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">侧边栏拖动测试</h1>
        <div className="space-y-4">
          <p>这是一个用于测试侧边栏拖动功能的页面。</p>
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">测试说明：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>将鼠标移动到左侧侧边栏的右边缘</li>
              <li>应该看到6个圆点组成的拖动指示器</li>
              <li>鼠标指针应该变成双向箭头（↔）</li>
              <li>按住左键并拖动来调整宽度</li>
              <li>松开鼠标后，宽度设置会保存到本地存储</li>
            </ul>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">功能特性：</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>最小宽度：200px</li>
              <li>最大宽度：600px</li>
              <li>默认宽度：300px</li>
              <li>支持本地存储记忆</li>
              <li>支持ESC键取消拖动</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}