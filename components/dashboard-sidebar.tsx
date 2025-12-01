"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, CheckSquare, Server, Menu, X, FolderOpen, Wrench, History, Settings, LogOut, ChevronDown, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { Skeleton } from "@/components/ui/skeleton"

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Machines", href: "/machines", icon: Server },
  { name: "Files", href: "/files", icon: FolderOpen },
  { name: "Utilities", href: "/utilities", icon: Wrench },
  { name: "History", href: "/history", icon: History },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [username, setUsername] = useState<string>("User")
  const [daysRemaining, setDaysRemaining] = useState<string>("")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showNotificationMenu, setShowNotificationMenu] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [isBellShaking, setIsBellShaking] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsError, setNotificationsError] = useState<string | null>(null)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isMarkingNotifications, setIsMarkingNotifications] = useState(false)
  const hasUnreadNotifications = notifications.some((notification) => !notification.read)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true)
      setNotificationsError(null)
      const response = await fetch("/api/notifications", {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          setNotifications([])
          setNotificationsError("Please log in again to view notifications.")
          return
        }
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error("Notifications fetch error:", error)
      setNotificationsError("Unable to load notifications.")
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)
    if (unreadIds.length === 0) {
      return
    }

    try {
      setIsMarkingNotifications(true)
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: unreadIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read")
      }

      setNotifications((prev) => prev.map((notification) => (unreadIds.includes(notification.id) ? { ...notification, read: true } : notification)))
    } catch (error) {
      console.error("Notifications mark read error:", error)
      setNotificationsError("Failed to update notifications.")
    } finally {
      setIsMarkingNotifications(false)
    }
  }

  const handleNotificationToggle = () => {
    const nextState = !showNotificationMenu
    setShowNotificationMenu(nextState)
    if (nextState && !isLoadingNotifications) {
      fetchNotifications()
    }
  }

  const formatNotificationTime = (isoDate: string) => {
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) {
      return ""
    }
    return date.toLocaleString()
  }

  const getNotificationBadgeStyles = (type: string) => {
    switch (type) {
      case "plan_expiring":
        return { label: "Expiring soon", className: "bg-amber-500/10 text-amber-300" }
      case "plan_expired":
        return { label: "Expired", className: "bg-red-500/10 text-red-300" }
      case "plan_active":
        return { label: "Active", className: "bg-green-500/10 text-green-300" }
      default:
        return { label: "General", className: "bg-muted/50 text-muted-foreground" }
    }
  }

  useEffect(() => {
    // 确保在客户端环境中访问 localStorage
    if (typeof window === 'undefined') return
    
    // 从 localStorage 获取用户信息
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.username) {
          setUsername(user.username)
        }
        
        // 计算剩余天数
        if (user.expires_at) {
          const expiresAt = new Date(user.expires_at)
          const now = new Date()
          const diffTime = expiresAt.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays > 0) {
            setDaysRemaining(`${diffDays} days remaining`)
          } else if (diffDays === 0) {
            setDaysRemaining("Expires today")
          } else {
            setDaysRemaining("Expired")
          }
        } else {
          setDaysRemaining("No expiration date")
        }
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      setDaysRemaining("Error loading data")
    }
  }, [])

  // 首次加载时拉取一次通知
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // 定时轮询，保证通知列表在不刷新页面的情况下也会自动更新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 15000) // 每 15 秒刷新一次

    return () => clearInterval(interval)
  }, [fetchNotifications])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showUserMenu && !showNotificationMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-user-menu]') && !target.closest('[data-notification-menu]')) {
        setShowUserMenu(false)
        setShowNotificationMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, showNotificationMenu])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        // 清除 localStorage
        localStorage.removeItem('user')
        localStorage.removeItem('rememberMe')
        
        // 重定向到登录页
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* User Info Header */}
          <div className="p-4">
            <div className="relative">
              {/* User Info */}
              <div 
                className="relative"
                data-user-menu
              >
                <div 
                  className="flex items-center gap-2.5 cursor-pointer rounded-lg p-2 pr-12 hover:bg-sidebar-accent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 ring-1 ring-sidebar-border transition-all duration-200 hover:ring-2 hover:ring-primary/30">
                    <span className="text-xs font-semibold text-sidebar-foreground transition-all duration-200">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 truncate min-w-0 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                    <p className="text-base font-medium text-sidebar-foreground truncate transition-all duration-200">{username}</p>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 transition-all duration-200",
                        showUserMenu && "rotate-180"
                      )} 
                    />
                  </div>
                </div>
              
                {/* Dropdown Menu */}
                <div 
                  className={cn(
                    "absolute top-full left-0 right-0 mt-2 bg-sidebar border border-sidebar-border rounded-lg shadow-lg overflow-hidden z-50 transition-all duration-200 ease-out",
                    showUserMenu 
                      ? "opacity-100 translate-y-0 pointer-events-auto" 
                      : "opacity-0 -translate-y-2 pointer-events-none"
                  )}
                  data-user-menu
                >
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setShowUserMenu(false)
                    setShowSettingsDialog(true)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-left"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      setShowLogoutDialog(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Notification Icon - Positioned at top right */}
              <div 
                className="absolute top-2.5 right-2.5"
                data-notification-menu
              >
                <button
                  onClick={handleNotificationToggle}
                  onMouseEnter={() => {
                    setIsBellShaking(true)
                    setTimeout(() => setIsBellShaking(false), 1200)
                  }}
                  className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-sidebar-accent transition-all duration-200 hover:scale-110 active:scale-95 relative group"
                >
                  <Bell className={cn(
                    "h-4 w-4 text-muted-foreground transition-all duration-200",
                    showNotificationMenu && "text-sidebar-foreground scale-110",
                    isBellShaking && "animate-shake"
                  )} />
                  {hasUnreadNotifications && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />
                  )}
                </button>

                {/* Notification Dropdown Menu */}
                <div 
                  className={cn(
                    "absolute top-full left-full ml-2 mt-0 w-80 bg-sidebar border border-sidebar-border rounded-lg shadow-lg overflow-hidden z-50 transition-all duration-200 ease-out",
                    showNotificationMenu 
                      ? "opacity-100 translate-y-0 pointer-events-auto" 
                      : "opacity-0 -translate-y-2 pointer-events-none"
                  )}
                  data-notification-menu
                >
                  <div className="flex items-center justify-between gap-2 p-4 border-b border-sidebar-border">
                    <h3 className="text-sm font-semibold text-sidebar-foreground">Notifications</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground hover:text-sidebar-foreground"
                      onClick={handleMarkAllRead}
                      disabled={!hasUnreadNotifications || isMarkingNotifications}
                    >
                      {isMarkingNotifications ? "Updating..." : "Mark all as read"}
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="space-y-3 p-4">
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="space-y-2">
                            <Skeleton className="h-4 w-1/2 bg-sidebar-border/60" />
                            <Skeleton className="h-3 w-full bg-sidebar-border/40" />
                          </div>
                        ))}
                      </div>
                    ) : notificationsError ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-sm text-red-400">
                        {notificationsError}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4">
                        <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-sidebar-border">
                        {notifications.map((notification) => {
                          const { label, className } = getNotificationBadgeStyles(notification.type)
                          return (
                            <div key={notification.id} className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-sidebar-foreground">{notification.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatNotificationTime(notification.created_at)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", className)}>
                                {label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Confirm Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
    </>
  )
}

