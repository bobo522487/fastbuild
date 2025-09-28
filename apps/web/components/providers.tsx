"use client"

import * as React from "react"
import { useEffect } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { TRPCProvider } from "@/trpc/provider"
import { GlobalErrorHandler } from "@/components/error-boundary"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化全局错误处理器
    GlobalErrorHandler.getInstance().init();
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <TRPCProvider>
        {children}
      </TRPCProvider>
    </NextThemesProvider>
  )
}
