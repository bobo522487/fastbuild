'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@workspace/ui/lib/utils';
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
} from 'lucide-react';

interface NavigationProps {
  onItemClick?: () => void;
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const Navigation = ({ onItemClick, className }: NavigationProps) => {
  const pathname = usePathname();

  // 主要导航项
  const mainNavItems: NavItem[] = [
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
  ];

  // 系统导航项
  const systemNavItems: NavItem[] = [
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

  // 工具导航项
  const toolNavItems: NavItem[] = [
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

  // 判断是否为活跃页面
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // 渲染导航组
  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-3">
        {title}
      </h3>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <nav className={cn("space-y-6", className)}>
      {renderNavGroup("主要功能", mainNavItems)}
      {renderNavGroup("系统管理", systemNavItems)}
      {renderNavGroup("工具与资源", toolNavItems)}
    </nav>
  );
};

export default Navigation;