'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  LayoutDashboardIcon,
  FileEditIcon,
  FileTextIcon,
  BarChart3Icon,
  DatabaseIcon,
  UsersIcon,
  SettingsIcon,
  ActivityIcon,
  CalendarIcon,
  DownloadIcon,
  TestTubeIcon,
  MonitorIcon,
  HelpCircleIcon
} from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@workspace/ui/components/breadcrumb'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@workspace/ui/components/sidebar'
import EnhancedSidebar from './blocks/enhanced-sidebar'

import LanguageDropdown from './blocks/dropdown-language'
import ProfileDropdown from './blocks/dropdown-profile'

// 导航菜单项配置
const navigationItems = [
  {
    group: '主要功能',
    items: [
      {
        title: '仪表板',
        href: '/dashboard',
        icon: LayoutDashboardIcon,
        badge: '5'
      },
      {
        title: '表单构建器',
        href: '/builder',
        icon: FileEditIcon
      },
      {
        title: '表单模板',
        href: '/templates',
        icon: FileTextIcon
      },
      {
        title: '数据分析',
        href: '/analytics',
        icon: BarChart3Icon
      },
      {
        title: '提交数据',
        href: '/submissions',
        icon: DatabaseIcon,
        badge: '3'
      }
    ]
  },
  {
    group: '高级功能',
    items: [
      {
        title: '实时监控',
        href: '/monitoring',
        icon: ActivityIcon
      },
      {
        title: '计划任务',
        href: '/scheduling',
        icon: CalendarIcon
      },
      {
        title: '数据导出',
        href: '/export',
        icon: DownloadIcon
      },
      {
        title: 'A/B测试',
        href: '/testing',
        icon: TestTubeIcon
      }
    ]
  },
  {
    group: '系统管理',
    items: [
      {
        title: '用户管理',
        href: '/users',
        icon: UsersIcon
      },
      {
        title: '系统设置',
        href: '/settings',
        icon: SettingsIcon
      },
      {
        title: '性能监控',
        href: '/admin/monitoring',
        icon: MonitorIcon
      },
      {
        title: '帮助中心',
        href: '/help',
        icon: HelpCircleIcon
      }
    ]
  }
]

interface ApplicationShellProps {
  children: React.ReactNode
}

const ApplicationShell = ({ children }: ApplicationShellProps) => {
  const pathname = usePathname()

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [
      { title: '首页', href: '/' }
    ]

    let currentPath = ''
    segments.forEach((segment) => {
      currentPath += `/${segment}`
      const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      breadcrumbs.push({ title, href: currentPath })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <div className='flex min-h-dvh w-full'>
      <SidebarProvider>
        <EnhancedSidebar defaultWidth={256} minWidth={200} maxWidth={500}>
          <Sidebar>
            <SidebarContent>
              {/* Logo区域 */}
              <div className='p-6'>
                <h1 className='text-xl font-bold'>FastBuild</h1>
                <p className='text-sm text-muted-foreground'>动态表单平台</p>
              </div>

              <Separator />

              {navigationItems.map((group) => (
                <SidebarGroup key={group.group}>
                  <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          {item.badge && (
                            <SidebarMenuBadge className='bg-primary/10 rounded-full'>
                              {item.badge}
                            </SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </EnhancedSidebar>

        <div className='flex flex-1 flex-col'>
          <header className='bg-card sticky top-0 z-50 border-b'>
            <div className='mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6'>
              <div className='flex items-center gap-4'>
                <SidebarTrigger className='[&_svg]:!size-5' />
                <Separator orientation='vertical' className='hidden !h-4 sm:block' />
                <Breadcrumb className='hidden sm:block'>
                  <BreadcrumbList>
                    {breadcrumbs.map((breadcrumb, index) => (
                      <React.Fragment key={breadcrumb.href}>
                        <BreadcrumbItem>
                          {index === breadcrumbs.length - 1 ? (
                            <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.title}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {index < breadcrumbs.length - 1 && (
                          <BreadcrumbSeparator />
                        )}
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className='flex items-center gap-1.5'>
                <LanguageDropdown
                  trigger={
                    <Button variant='ghost' size='icon'>
                      <HelpCircleIcon className='h-4 w-4' />
                    </Button>
                  }
                />
                <ProfileDropdown
                  trigger={
                    <Button variant='ghost' size='icon' className='size-9.5'>
                      <Avatar className='size-9.5 rounded-md'>
                        <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                    </Button>
                  }
                />
              </div>
            </div>
          </header>

          <main className='mx-auto size-full max-w-7xl flex-1 px-4 py-6 sm:px-6'>
            {children}
          </main>

          <footer>
            <div className='text-muted-foreground mx-auto flex size-full max-w-7xl items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6'>
              <p className='text-center text-sm text-balance'>
                {`©${new Date().getFullYear()} FastBuild`} -
                <a href='#' className='text-primary mx-1'>
                  Schema驱动的动态表单平台
                </a>
              </p>
              <div className='flex items-center gap-4 text-xs'>
                <span>v1.0.0</span>
                <Separator orientation='vertical' className='h-4' />
                <span>MVP Edition</span>
              </div>
            </div>
          </footer>
        </div>
      </SidebarProvider>
    </div>
  )
}

export default ApplicationShell