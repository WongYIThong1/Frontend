'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Lock } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 确保 cookie 被包含在请求和响应中
        body: JSON.stringify({ username, password, rememberMe }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // 保存用户信息到 localStorage（cookie 已在服务器端设置）
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        if (rememberMe) localStorage.setItem('rememberMe', 'true')
      }

      toast.success('Login successful! Redirecting...')

      // 检查是否有重定向参数
      const urlParams = new URLSearchParams(window.location.search)
      const redirectTo = urlParams.get('redirect') || '/dashboard'

      // 使用 Next.js router 进行导航，确保 cookie 被正确处理
      router.push(redirectTo)
      router.refresh() // 刷新服务器组件以获取最新的认证状态
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div 
        className={`w-full max-w-md transition-all duration-700 ease-out ${
          mounted 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <Card className="bg-card border-border shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle 
              className={`text-3xl font-bold text-card-foreground tracking-tight transition-all duration-500 delay-100 ${
                mounted 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
            >
              Welcome Back
            </CardTitle>
            <CardDescription 
              className={`text-muted-foreground text-base mt-2 transition-all duration-500 delay-200 ${
                mounted 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
            >
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div 
                className={`space-y-2.5 transition-all duration-500 delay-300 ${
                  mounted 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-4'
                }`}
              >
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="pl-11 h-11 bg-input/30 border-input transition-all duration-300 focus-visible:bg-input/50 focus-visible:scale-[1.02] focus-visible:shadow-md"
                  />
                </div>
              </div>
              
              <div 
                className={`space-y-2.5 transition-all duration-500 delay-400 ${
                  mounted 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-4'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <a
                    href="#"
                    className="text-sm text-primary hover:underline transition-all duration-200 font-medium hover:scale-105"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-11 h-11 bg-input/30 border-input transition-all duration-300 focus-visible:bg-input/50 focus-visible:scale-[1.02] focus-visible:shadow-md"
                  />
                </div>
              </div>

              <div 
                className={`flex items-center space-x-3 py-1 transition-all duration-500 delay-500 ${
                  mounted 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-4'
                }`}
              >
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200 hover:scale-110"
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal text-muted-foreground cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors hover:text-foreground"
                >
                  Remember me
                </Label>
              </div>

              <div
                className={`transition-all duration-500 delay-600 ${
                  mounted 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Logging in...
                    </span>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>
            </form>

            <div 
              className={`relative transition-all duration-500 delay-700 ${
                mounted 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-95'
              }`}
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div 
              className={`text-center text-sm transition-all duration-500 delay-800 ${
                mounted 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="text-muted-foreground">Don't have an account?</span>{' '}
              <a 
                href="/signup" 
                className="text-primary hover:underline font-semibold transition-all duration-200 hover:scale-105 inline-block"
              >
                Sign up
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

