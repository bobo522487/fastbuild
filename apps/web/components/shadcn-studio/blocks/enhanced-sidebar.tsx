'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@workspace/ui/lib/utils'
import { useResponsiveSidebar } from '../hooks/use-responsive-sidebar'

interface EnhancedSidebarProps {
  children: React.ReactNode
  className?: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  collapsedWidth?: number
  storageKey?: string
}

const EnhancedSidebar = ({
  children,
  className,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 500,
  collapsedWidth = 80,
  storageKey = 'sidebar-width'
}: EnhancedSidebarProps) => {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  const { isCollapsed, isMobile, toggleCollapsed } = useResponsiveSidebar({
    storageKey: `${storageKey}-collapsed`
  })

  // 计算当前宽度
  const currentWidth = isCollapsed ? collapsedWidth : width

  // 从本地存储加载保存的宽度
  useEffect(() => {
    if (isCollapsed) return

    try {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10)
        if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
          setWidth(parsedWidth)
        }
      }
    } catch (error) {
      console.warn('Failed to load sidebar width from localStorage:', error)
    }
  }, [storageKey, minWidth, maxWidth, isCollapsed])

  // 保存宽度到本地存储
  const saveWidth = useCallback((newWidth: number) => {
    try {
      localStorage.setItem(storageKey, newWidth.toString())
    } catch (error) {
      console.warn('Failed to save sidebar width to localStorage:', error)
    }
  }, [storageKey])

  // 开始调整大小
  const startResizing = useCallback((e: React.MouseEvent) => {
    if (isCollapsed || isMobile) return // 移动端或折叠状态不允许调整大小

    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [isCollapsed, isMobile])

  // 调整大小
  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !sidebarRef.current || isCollapsed) return

    const sidebarRect = sidebarRef.current.getBoundingClientRect()
    const newWidth = e.clientX - sidebarRect.left

    // 限制在最小和最大宽度之间
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

    if (clampedWidth !== width) {
      setWidth(clampedWidth)
      saveWidth(clampedWidth)
    }
  }, [isResizing, minWidth, maxWidth, width, isCollapsed, saveWidth])

  // 停止调整大小
  const stopResizing = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // 添加全局事件监听器
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      return () => {
        window.removeEventListener('mousemove', resize)
        window.removeEventListener('mouseup', stopResizing)
      }
    }
  }, [isResizing, resize, stopResizing])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isResizing) {
        stopResizing()
      }
    }

    if (isResizing) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isResizing, stopResizing])

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'relative flex-shrink-0 border-r bg-background transition-all duration-200 ease-in-out',
        isResizing && 'select-none',
        isMobile && 'fixed left-0 top-0 z-40 h-full shadow-lg',
        className
      )}
      style={{
        width: `${currentWidth}px`,
        transform: isMobile && isCollapsed ? 'translateX(-100%)' : 'translateX(0)'
      }}
    >
      {/* 侧边栏内容 */}
      <div className="h-full overflow-hidden">
        {children}
      </div>

      {/* 拖动手柄 - 只在桌面端且未折叠时显示 */}
      {!isMobile && !isCollapsed && (
        <div
          ref={resizeHandleRef}
          className={cn(
            'absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-primary/10 transition-colors group',
            isResizing && 'bg-primary/20'
          )}
          onMouseDown={startResizing}
        >
          {/* 拖动指示器 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1 h-4 rounded-full bg-border group-hover:bg-primary/40 transition-colors',
                  isResizing && 'bg-primary/60'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* 移动端遮罩 */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={toggleCollapsed}
        />
      )}
    </div>
  )
}

export default EnhancedSidebar