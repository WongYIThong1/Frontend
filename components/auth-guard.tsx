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

        if (res.status === 401 || res.status === 403) {
          const redirect =
            typeof window !== 'undefined'
              ? encodeURIComponent(window.location.pathname + window.location.search)
              : '/dashboard'
          router.replace(`/login?redirect=${redirect || '/dashboard'}`)
          return
        }
      } catch (error) {
        console.error('AuthGuard session check failed:', error)
      } finally {
        if (isMounted) setIsReady(true)
      }
    }

    ensureSession()

    return () => {
      isMounted = false
      controller.abort()
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




