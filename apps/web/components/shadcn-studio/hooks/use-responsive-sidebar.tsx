'use client'

import { useState, useEffect } from 'react'

interface UseResponsiveSidebarProps {
  defaultCollapsed?: boolean
  breakpoint?: number
  storageKey?: string
}

export const useResponsiveSidebar = ({
  defaultCollapsed = false,
  breakpoint = 768,
  storageKey = 'sidebar-collapsed'
}: UseResponsiveSidebarProps = {}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isMobile, setIsMobile] = useState(false)

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < breakpoint
      setIsMobile(mobile)

      // 在移动端默认折叠侧边栏
      if (mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }

    // 初始化检查
    checkScreenSize()

    // 监听窗口大小变化
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [breakpoint, isCollapsed])

  // 从本地存储加载折叠状态
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(storageKey)
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true')
      }
    } catch (error) {
      console.warn('Failed to load sidebar collapsed state from localStorage:', error)
    }
  }, [storageKey])

  // 切换折叠状态
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)

    // 保存到本地存储
    try {
      localStorage.setItem(storageKey, newCollapsed.toString())
    } catch (error) {
      console.warn('Failed to save sidebar collapsed state to localStorage:', error)
    }
  }

  // 设置折叠状态
  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed)

    // 保存到本地存储
    try {
      localStorage.setItem(storageKey, collapsed.toString())
    } catch (error) {
      console.warn('Failed to save sidebar collapsed state to localStorage:', error)
    }
  }

  return {
    isCollapsed,
    isMobile,
    toggleCollapsed,
    setCollapsed
  }
}