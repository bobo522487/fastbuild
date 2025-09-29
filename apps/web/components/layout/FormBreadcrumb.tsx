import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home, FileText, Edit, BarChart3 } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface FormBreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function FormBreadcrumb({ items, className }: FormBreadcrumbProps) {
  return (
    <nav aria-label="面包屑导航" className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}>
      <Link
        href="/"
        className="flex items-center space-x-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>首页</span>
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center space-x-1 hover:text-foreground transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center space-x-1 text-foreground font-medium">
              {item.icon}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// 预定义的面包屑配置
export const formBreadcrumbPatterns = {
  // 表单列表页面
  forms: [
    { label: '表单管理', href: '/forms', icon: <FileText className="h-4 w-4" /> }
  ],

  // 表单提交页面
  submit: (formName: string, formId: string) => [
    { label: '表单管理', href: '/forms', icon: <FileText className="h-4 w-4" /> },
    { label: formName, href: `/forms/${formId}` },
    { label: '填写表单', icon: <FileText className="h-4 w-4" /> }
  ],

  // 表单编辑页面
  edit: (formName: string, formId: string) => [
    { label: '表单管理', href: '/forms', icon: <FileText className="h-4 w-4" /> },
    { label: formName, href: `/forms/${formId}` },
    { label: '编辑表单', icon: <Edit className="h-4 w-4" /> }
  ],

  // 表单数据页面
  submissions: (formName: string, formId: string) => [
    { label: '表单管理', href: '/forms', icon: <FileText className="h-4 w-4" /> },
    { label: formName, href: `/forms/${formId}` },
    { label: '提交数据', icon: <BarChart3 className="h-4 w-4" /> }
  ]
}