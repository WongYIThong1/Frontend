'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const ensureSession = async () => {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!res.ok) {
          const redirect =
            typeof window !== 'undefined'
              ? encodeURIComponent(window.location.pathname + window.location.search)
              : '/dashboard'
          router.replace(`/login?redirect=${redirect || '/dashboard'}`)
          return
        }
      } catch (error) {
        // 检查是否是 AbortError（组件卸载时触发）
        const isAbortError =
          error instanceof DOMException && error.name === 'AbortError' ||
          (error as { name?: string })?.name === 'AbortError' ||
          (error as { message?: string })?.message?.includes('component unmounted') ||
          (error as { message?: string })?.message?.includes('aborted')

        if (isAbortError) {
          // 组件卸载触发的中断，不需要打错误日志
          return
        }

        // 只有在组件仍然挂载时才记录错误
        if (isMounted) {
          console.error('AuthGuard session check failed:', error)
        }
      } finally {
        if (isMounted) setIsReady(true)
      }
    }

    ensureSession()

    return () => {
      isMounted = false
      if (!controller.signal.aborted) {
        controller.abort("component unmounted")
      }
    }
  }, [router])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}














