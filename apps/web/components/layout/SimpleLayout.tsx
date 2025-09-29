'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@workspace/ui/components/button';
import { Separator } from '@workspace/ui/components/separator';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { User } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb';
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
  HelpCircleIcon,
  Menu,
  X,
} from 'lucide-react';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

const SimpleLayout = ({ children }: SimpleLayoutProps) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // 导航菜单项
  const navItems = [
    {
      title: '工作台',
      href: '/',
      icon: LayoutDashboardIcon,
    },
    {
      title: '表单管理',
      href: '/forms',
      icon: FileTextIcon,
    },
    {
      title: '表单构建器',
      href: '/builder',
      icon: FileEditIcon,
    },
    {
      title: '数据分析',
      href: '/analytics',
      icon: BarChart3Icon,
    },
    {
      title: '数据管理',
      href: '/data',
      icon: DatabaseIcon,
    },
    {
      title: '系统设置',
      href: '/settings',
      icon: SettingsIcon,
    },
    {
      title: '用户管理',
      href: '/users',
      icon: UsersIcon,
    },
    {
      title: '系统监控',
      href: '/monitoring',
      icon: MonitorIcon,
    },
  ];

  // 工具菜单项
  const toolItems = [
    {
      title: '活动日志',
      href: '/logs',
      icon: ActivityIcon,
    },
    {
      title: '日历计划',
      href: '/calendar',
      icon: CalendarIcon,
    },
    {
      title: '下载中心',
      href: '/downloads',
      icon: DownloadIcon,
    },
    {
      title: '测试工具',
      href: '/testing',
      icon: TestTubeIcon,
    },
    {
      title: '帮助文档',
      href: '/help',
      icon: HelpCircleIcon,
    },
  ];

  // 生成面包屑导航
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ title: '首页', href: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ title, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // 判断当前页面是否活跃
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <h1 className="text-xl font-bold">FastBuild</h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* 主要导航 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              主要功能
            </h3>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <Separator />

          {/* 工具导航 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              工具与资源
            </h3>
            <div className="space-y-1">
              {toolItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* 用户信息 */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">FastBuild User</p>
              <p className="text-xs text-muted-foreground truncate">
                user@fastbuild.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="lg:pl-64">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-6">
            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* 面包屑导航 */}
            <div className="flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => (
                    <React.Fragment key={item.href}>
                      <BreadcrumbItem className={index === breadcrumbs.length - 1 ? "" : "hidden md:block"}>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{item.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={item.href}>{item.title}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* 用户菜单 */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="min-h-[calc(100vh-4rem)] px-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SimpleLayout;