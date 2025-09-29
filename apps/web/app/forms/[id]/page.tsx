'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { redirect } from 'next/navigation'

export default function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)

  // 重定向到提交页面
  React.useEffect(() => {
    redirect(`/forms/${id}/submit`)
  }, [id])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">正在跳转到表单页面...</p>
      </div>
    </div>
  )
}