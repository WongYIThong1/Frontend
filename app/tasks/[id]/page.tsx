"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Activity,
  ArrowLeft,
  Globe2,
  Settings2,
  Trash2,
  TrendingUp,
  FileText,
  Shield,
  Database,
  Filter,
  Download,
  Search,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  Square,
  Eye,
  SkipForward,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"

interface ChartCardProps {
  title: string
  value: string
  subValue?: string
  data: number[]
  color?: string
}

const ChartCard: React.FC<ChartCardProps> = ({ title, value, subValue, data, color = '#3b82f6' }) => {
  // Normalize data to 0-100 range for the SVG
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((val - min) / range) * 80 // keep some padding at bottom
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="border-border/70 bg-card/80 rounded-xl p-5 flex flex-col justify-between h-48 relative overflow-hidden group hover:border-primary/40 transition-colors">
      <div className="z-10">
        <h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {subValue && <span className="text-sm text-muted-foreground">{subValue}</span>}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50 group-hover:opacity-70 transition-opacity">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Fill area */}
          <path
            d={`M 0,100 ${points.split(' ').map(p => `L ${p}`).join(' ')} L 100,100 Z`}
            fill={`url(#gradient-${title.replace(/\s/g, '')})`}
            stroke="none"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

type TaskStatus = "running" | "pending" | "completed" | "failed" | "paused"

const statusColorMap: Record<TaskStatus, string> = {
  running: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-amber-500/20 text-amber-400",
  completed: "bg-sky-500/20 text-sky-400",
  failed: "bg-red-500/20 text-red-400",
  paused: "bg-yellow-500/20 text-yellow-400",
}

type TaskDetail = {
  id: string
  name: string
  status: TaskStatus
  listFile: string | null
  thread: number
  worker: number
  timeout: string
  machineId: string | null
  progress: number
}

const demoRows = [
  { id: "1294-X8", domain: "example.com", waf: "Cloudflare", database: "MySQL", rows: 1234, status: "Active" },
  { id: "2294-X8", domain: "foo.bar", waf: "AWS Shield", database: "PostgreSQL", rows: 567, status: "Pending" },
  { id: "3294-X8", domain: "my-site.cn", waf: "Akamai", database: "Oracle", rows: 980, status: "Running" },
  { id: "4294-X8", domain: "backup.net", waf: "None", database: "MongoDB", rows: 312, status: "Paused" },
  { id: "5294-X8", domain: "test-lab.io", waf: "Cloudflare", database: "MariaDB", rows: 845, status: "Active" },
]

// 模拟图表数据
const requestsPerMinuteData = [
  { time: "00:00", value: 2200 },
  { time: "00:05", value: 2350 },
  { time: "00:10", value: 2405 },
  { time: "00:15", value: 2380 },
  { time: "00:20", value: 2450 },
  { time: "00:25", value: 2420 },
]

const websitesPerMinuteData = [
  { time: "00:00", value: 135 },
  { time: "00:05", value: 140 },
  { time: "00:10", value: 142 },
  { time: "00:15", value: 141 },
  { time: "00:20", value: 143 },
  { time: "00:25", value: 142 },
]

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/tasks?id=${encodeURIComponent(params.id)}`, {
          credentials: "include",
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load task")
        }
        const data = await res.json()
        const t = data.task
        if (!t) {
          setError("Task not found")
          return
        }
        const status = (t.status as string) || "pending"
        const normalizedStatus: TaskStatus =
          status === "running" || status === "completed" || status === "failed" || status === "paused"
            ? (status as TaskStatus)
            : "pending"

        setTask({
          id: String(t.id),
          name: String(t.name ?? ""),
          status: normalizedStatus,
          listFile: t.list_file ? String(t.list_file) : null,
          thread: typeof t.thread === "number" ? t.thread : 0,
          worker: typeof t.worker === "number" ? t.worker : 0,
          timeout: String(t.timeout ?? ""),
          machineId: t.machine_id ? String(t.machine_id) : null,
          progress: typeof t.progress === "number" ? t.progress : 0,
        })
      } catch (err) {
        console.error("Task detail fetch error:", err)
        setError(err instanceof Error ? err.message : "Unable to load task")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      void load()
    }
  }, [params.id])

  const progressLabel = useMemo(() => {
    if (!task) return "0%"
    const v = Math.max(0, Math.min(100, Math.round(task.progress)))
    return `${v}%`
  }, [task])

  const handleStart = async () => {
    if (!task) return
    try {
      setIsActionLoading(true)
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: task.id, status: "running" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to start task")
      }

      const data = await res.json()
      if (data.task) {
        setTask({ ...task, status: data.task.status as TaskStatus })
      } else {
        setTask({ ...task, status: "running" })
      }

      toast({
        title: "Task started",
        description: "The task has been started successfully.",
      })
    } catch (err) {
      console.error("Start task error:", err)
      toast({
        variant: "destructive",
        title: "Failed to start task",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!task) return
    try {
      setIsActionLoading(true)
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: task.id, status: "paused" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to pause task")
      }

      const data = await res.json()
      if (data.task) {
        setTask({ ...task, status: data.task.status as TaskStatus })
      } else {
        setTask({ ...task, status: "paused" })
      }

      toast({
        title: "Task paused",
        description: "The task has been paused successfully.",
      })
    } catch (err) {
      console.error("Pause task error:", err)
      toast({
        variant: "destructive",
        title: "Failed to pause task",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleStop = async () => {
    if (!task) return
    try {
      setIsActionLoading(true)
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: task.id, status: "completed" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to stop task")
      }

      const data = await res.json()
      if (data.task) {
        setTask({ ...task, status: data.task.status as TaskStatus })
      } else {
        setTask({ ...task, status: "completed" })
      }

      toast({
        title: "Task stopped",
        description: "The task has been stopped successfully.",
      })
    } catch (err) {
      console.error("Stop task error:", err)
      toast({
        variant: "destructive",
        title: "Failed to stop task",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    try {
      setIsDeleting(true)
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: task.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete task")
      }

      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      })

      setIsDeleteOpen(false)
      router.push("/tasks")
    } catch (err) {
      console.error("Delete task from detail page error:", err)
      toast({
        variant: "destructive",
        title: "Failed to delete task",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6 max-h-screen overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push("/tasks")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-foreground">
                    Task overview
                  </h1>
                  {task && (
                    <Badge className={cn("text-xs shrink-0 capitalize px-3 py-1", statusColorMap[task.status])}>
                      {task.status === "running" ? "Running..." : task.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {task && (
                <>
                  {task.status === "running" ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-primary/60 hover:text-primary hover:shadow-md hover:animate-pulse-slow"
                        onClick={handlePause}
                        disabled={isActionLoading}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-destructive/60 hover:text-destructive hover:shadow-md hover:animate-pulse-slow"
                        onClick={handleStop}
                        disabled={isActionLoading}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-primary/60 hover:text-primary hover:shadow-md hover:animate-pulse-slow"
                      onClick={handleStart}
                      disabled={isActionLoading}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-primary/60 hover:text-primary hover:shadow-md hover:animate-pulse-slow"
                onClick={() => router.push(`/tasks/${params.id}/settings`)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-destructive/60 hover:text-destructive hover:shadow-md hover:animate-pulse-slow"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
              Loading task...
            </div>
          )}

          {!isLoading && error && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-6 text-sm text-destructive">
                {error}
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => router.push("/tasks")}>
                    Back to tasks
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && task && (
            <>
              {/* Main Grid Layout: Optimized 3-column layout */}
              <div className="grid gap-4 lg:grid-cols-12">
                {/* Left Column: Charts (8 columns on large screens) */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Charts Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChartCard
                      title="REQUESTS PER MINUTE"
                      value="2,405"
                      subValue="+12%"
                      data={requestsPerMinuteData.map(d => d.value)}
                      color="#3b82f6"
                    />
                    <ChartCard
                      title="WEBSITES PER MINUTE"
                      value="142"
                      subValue="+5%"
                      data={websitesPerMinuteData.map(d => d.value)}
                      color="#10b981"
                    />
                  </div>

                  {/* Progress Card */}
                  <Card className="border-border/70 bg-card/80 rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <h2 className="text-base font-semibold text-foreground mb-1">Progress</h2>
                          <p className="text-muted-foreground text-sm">Execution progress</p>
                        </div>
                        <span className="text-muted-foreground text-sm font-medium">{progressLabel}</span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-400 transition-all duration-300 relative"
                          style={{ width: progressLabel }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Overview (4 columns on large screens) */}
                <div className="lg:col-span-4">
                  <Card className="border-border/70 bg-card/80 rounded-xl h-full">
                    <CardContent className="p-6 h-full flex flex-col">
                      <div className="mb-6">
                        <h2 className="text-base font-semibold text-foreground">Overview</h2>
                        <p className="text-muted-foreground text-sm">Task statistics summary</p>
                      </div>

                      <div className="flex-1 flex flex-col gap-4 justify-center">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-secondary/20 rounded-lg p-4 border border-border/60">
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldCheck size={16} className="text-emerald-400" />
                              <span className="text-xs font-medium uppercase text-muted-foreground">Injectable</span>
                            </div>
                            <div className="text-2xl font-bold text-foreground">42</div>
                          </div>

                          <div className="bg-secondary/20 rounded-lg p-4 border border-border/60">
                            <div className="flex items-center gap-2 mb-2">
                              <ShieldAlert size={16} className="text-red-400" />
                              <span className="text-xs font-medium uppercase text-muted-foreground">Not Injectable</span>
                            </div>
                            <div className="text-2xl font-bold text-foreground">128</div>
                          </div>
                        </div>

                        <div className="bg-secondary/20 rounded-lg p-4 border border-border/60 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Database size={16} className="text-primary" />
                              <span className="text-xs font-medium uppercase text-muted-foreground">Total Rows</span>
                            </div>
                            <div className="text-xl font-bold text-foreground">3,093</div>
                          </div>
                          <div className="h-8 w-24 bg-muted rounded flex items-end gap-1 px-1 pb-1 overflow-hidden">
                            {[40, 70, 50, 90, 60, 80, 40].map((h, i) => (
                              <div key={i} className="flex-1 bg-muted-foreground/30 rounded-sm" style={{ height: `${h}%` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 表格区域 */}
              <Card className="border-border/70 bg-card/80 rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-foreground">Tables</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Sample breakdown of domains, WAF, and database types.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 搜索和操作栏 */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search domains..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 表格 */}
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="border-b border-border/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="py-3 px-4 text-left font-medium">
                            <div className="flex items-center gap-2">
                              <UICheckbox
                                checked={selectedRows.length === demoRows.length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRows(demoRows.map((r) => r.id))
                                  } else {
                                    setSelectedRows([])
                                  }
                                }}
                              />
                              <span>DOMAINS</span>
                            </div>
                          </th>
                          <th className="py-3 px-4 text-left font-medium">WAF</th>
                          <th className="py-3 px-4 text-left font-medium">DATABASE</th>
                          <th className="py-3 px-4 text-right font-medium">ROWS</th>
                          <th className="py-3 px-4 text-right font-medium">STATUS</th>
                          <th className="py-3 px-4 text-right font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoRows
                          .filter((row) =>
                            row.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            row.waf.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            row.database.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((row) => (
                            <tr
                              key={row.id}
                              className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <UICheckbox
                                    checked={selectedRows.includes(row.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedRows([...selectedRows, row.id])
                                      } else {
                                        setSelectedRows(selectedRows.filter((id) => id !== row.id))
                                      }
                                    }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Globe2 className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <span className="font-medium text-foreground">{row.domain}</span>
                                      <span className="text-xs text-muted-foreground ml-2">(ID: {row.id})</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-foreground">{row.waf}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-foreground">{row.database}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right text-foreground">{row.rows.toLocaleString()}</td>
                              <td className="py-3 px-4 text-right">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    row.status === "Active"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : row.status === "Pending"
                                        ? "bg-amber-500/20 text-amber-400"
                                        : row.status === "Running"
                                          ? "bg-sky-500/20 text-sky-400"
                                          : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {row.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      className="flex items-center gap-2"
                                      onClick={() => {
                                        router.push(`/tasks/${params.id}/database?domain=${encodeURIComponent(row.domain)}`)
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                      View URL
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="flex items-center gap-2"
                                      onClick={async () => {
                                        try {
                                          // TODO: Implement skip URL API call
                                          toast({
                                            title: "URL skipped",
                                            description: `Skipped ${row.domain}`,
                                          })
                                        } catch (err) {
                                          console.error("Skip URL error:", err)
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to skip URL",
                                            description: err instanceof Error ? err.message : "Please try again.",
                                          })
                                        }
                                      }}
                                    >
                                      <SkipForward className="h-4 w-4" />
                                      Skip URL
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Dialog open={isDeleteOpen} onOpenChange={(open) => !isDeleting && setIsDeleteOpen(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete task</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure you want to delete this task?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-border px-3 py-2 text-sm bg-secondary/20">
              <p className="font-medium text-foreground truncate">{task?.name}</p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AuthGuard>
  )
}


