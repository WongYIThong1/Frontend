'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const checkSession = async () => {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!isMounted) return

        if (res.ok) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch (error) {
        console.error('Session check failed:', error)
        if (isMounted) router.replace('/login')
      } finally {
        if (isMounted) setChecking(false)
      }
    }

    checkSession()

    return () => {
      isMounted = false
      // 仅在仍未完成时才 abort，避免已完成请求触发 AbortError
      if (!controller.signal.aborted) {
        controller.abort()
      }
    }
  }, [router])

  if (!checking) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
