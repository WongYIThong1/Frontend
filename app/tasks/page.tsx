'use client'

import { useMemo, useState, type ReactNode } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Filter,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TaskStatus = "running" | "pending" | "completed" | "failed"
type TaskPriority = "critical" | "high" | "medium" | "low"

const tasks = [
  {
    id: 1,
    name: "Nightly Database Backup",
    status: "running" as TaskStatus,
    machine: "DB-Cluster-01",
    progress: 72,
    priority: "critical" as TaskPriority,
    owner: "Automation",
    lastRun: "2025-12-01T02:00:00Z",
    nextRun: "2025-12-02T02:00:00Z",
    cadence: "Daily · 02:00 UTC",
  },
  {
    id: 2,
    name: "Weekly Log Rotation",
    status: "completed" as TaskStatus,
    machine: "Infra-Logger",
    progress: 100,
    priority: "medium" as TaskPriority,
    owner: "Ops",
    lastRun: "2025-11-30T04:00:00Z",
    nextRun: "2025-12-07T04:00:00Z",
    cadence: "Weekly · Sunday",
  },
  {
    id: 3,
    name: "Security Surface Scan",
    status: "pending" as TaskStatus,
    machine: "Scanner-Node-03",
    progress: 0,
    priority: "high" as TaskPriority,
    owner: "Security",
    lastRun: "2025-11-28T10:00:00Z",
    nextRun: "2025-12-01T10:00:00Z",
    cadence: "Every 12 hours",
  },
  {
    id: 4,
    name: "Cache Warm-up for API Gateway",
    status: "running" as TaskStatus,
    machine: "Edge-Cache-01",
    progress: 34,
    priority: "medium" as TaskPriority,
    owner: "Platform",
    lastRun: "2025-12-01T06:30:00Z",
    nextRun: "2025-12-01T12:30:00Z",
    cadence: "Every 6 hours",
  },
  {
    id: 5,
    name: "Fleet OS Patch Rollout",
    status: "pending" as TaskStatus,
    machine: "Fleet-Controller",
    progress: 0,
    priority: "critical" as TaskPriority,
    owner: "SRE",
    lastRun: "2025-11-24T01:00:00Z",
    nextRun: "2025-12-02T01:00:00Z",
    cadence: "Scheduled · Dec 2",
  },
  {
    id: 6,
    name: "Orphaned Blob Cleanup",
    status: "failed" as TaskStatus,
    machine: "Storage-Node-07",
    progress: 43,
    priority: "high" as TaskPriority,
    owner: "Storage",
    lastRun: "2025-11-30T08:00:00Z",
    nextRun: "2025-12-01T08:30:00Z",
    cadence: "Hourly · Retries enabled",
  },
]

const taskActivity = [
  {
    id: "evt-1",
    title: "Security Surface Scan completed",
    time: "12 min ago",
    status: "success",
    detail: "180 endpoints scanned",
  },
  {
    id: "evt-2",
    title: "Cache Warm-up triggered",
    time: "45 min ago",
    status: "info",
    detail: "Edge layer 3",
  },
  {
    id: "evt-3",
    title: "Blob cleanup paused",
    time: "1 hr ago",
    status: "warning",
    detail: "Retry window exceeded",
  },
]

const statusFilters = ["all", "running", "pending", "completed", "failed"] as const
type TaskFilter = (typeof statusFilters)[number]

const statusColorMap: Record<TaskStatus, string> = {
  running: "bg-chart-1/15 text-chart-1 border border-chart-1/30",
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
}

const priorityColorMap: Record<TaskPriority, string> = {
  critical: "bg-red-500/15 text-red-400 border border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  medium: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  low: "bg-foreground/5 text-muted-foreground border border-border",
}

export default function TasksPage() {
  const [selectedStatus, setSelectedStatus] = useState<TaskFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [onlyHighPriority, setOnlyHighPriority] = useState(false)

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = selectedStatus === "all" ? true : task.status === selectedStatus
      const matchesPriority = onlyHighPriority ? ["critical", "high"].includes(task.priority) : true
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.machine.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [onlyHighPriority, searchTerm, selectedStatus])

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.status !== "completed")
      .sort(
        (a, b) =>
          new Date(a.nextRun).getTime() -
          new Date(b.nextRun).getTime(),
      )
      .slice(0, 4)
  }, [])

  const stats = {
    total: tasks.length,
    running: tasks.filter((task) => task.status === "running").length,
    failed: tasks.filter((task) => task.status === "failed").length,
    completionRate: Math.round((tasks.filter((task) => task.status === "completed").length / tasks.length) * 100),
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
              <p className="text-sm font-medium text-primary">Automation Console</p>
              <h1 className="text-3xl font-semibold text-foreground">Tasks</h1>
              <p className="text-sm text-muted-foreground">
                Orchestrate workloads, monitor health, and keep every scheduled job on track.
              </p>
          </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Sync Schedules
              </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total tasks" value={stats.total} hint="across all machines" />
            <StatTile label="Active now" value={stats.running} hint="running pipelines" icon={<PlayCircle className="h-4 w-4 text-chart-1" />} />
            <StatTile
              label="Success rate"
              value={`${stats.completionRate}%`}
              hint="last 24h"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            />
            <StatTile
              label="Failed tasks"
              value={stats.failed}
              hint="needs attention"
              trendLabel={stats.failed ? "Investigate now" : "All clear"}
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            />
        </div>

          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="space-y-6">
              <Card className="border-border/70 bg-secondary/30">
          <CardHeader>
                  <CardTitle className="text-base">Filters</CardTitle>
                  <CardDescription>Slice the task board to focus on what matters.</CardDescription>
          </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 overflow-auto pb-1">
                    {statusFilters.map((filter) => (
                      <Button
                        key={filter}
                        size="sm"
                        variant={selectedStatus === filter ? "default" : "ghost"}
                        className={cn("rounded-full px-4 capitalize", selectedStatus === filter && "bg-foreground text-background")}
                        onClick={() => setSelectedStatus(filter)}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">High priority only</p>
                        <p className="text-xs text-muted-foreground">Critical and high severity automations</p>
                      </div>
                      <Button
                        variant={onlyHighPriority ? "default" : "outline"}
                        size="sm"
                        className="rounded-full px-3"
                        onClick={() => setOnlyHighPriority((prev) => !prev)}
                      >
                        {onlyHighPriority ? "On" : "Off"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Upcoming</CardTitle>
                  <CardDescription>Next executions in the pipeline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                      <div className="mt-1 size-2 rounded-full bg-primary" />
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{task.name}</p>
                          <Badge className={cn("capitalize", priorityColorMap[task.priority])}>{task.priority}</Badge>
                        </div>
                        <p className="text-muted-foreground">{task.cadence}</p>
                        <p className="text-xs text-muted-foreground">{new Date(task.nextRun).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {!upcomingTasks.length && <p className="text-sm text-muted-foreground">No upcoming tasks scheduled.</p>}
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Automation health</CardTitle>
                  <CardDescription>Live insight across clusters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <HealthRow label="Execution SLA" value="99.2%" hint="vs goal 99%" trend="+0.4%" />
                  <HealthRow label="Average duration" value="03m 41s" hint="-18% week over week" />
                  <HealthRow label="Queued jobs" value="12" hint="2 need resources" />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/70 bg-card/70">
                <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Task board</CardTitle>
                    <CardDescription>Live state across your automation fleet.</CardDescription>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <div className="relative flex-1 sm:min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by name or machine"
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Advanced filters
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="-mx-4 md:mx-0">
                  <div className="divide-y divide-border/60">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-secondary/20 md:flex-row md:items-center"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{task.name}</p>
                            <Badge className={cn("capitalize", statusColorMap[task.status])}>{task.status}</Badge>
                            <Badge className={cn("capitalize", priorityColorMap[task.priority])}>{task.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {task.machine} • Owned by {task.owner} • {task.cadence}
                          </p>
                        </div>
                        <div className="flex flex-1 items-center gap-4 md:justify-end">
                          <div className="hidden w-40 flex-col gap-1 text-xs text-muted-foreground sm:flex">
                        <div className="h-2 rounded-full bg-muted">
                              <div
                                className={cn("h-2 rounded-full transition-all", task.status === "failed" ? "bg-red-500" : "bg-chart-1")}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <p>Last run: {new Date(task.lastRun).toLocaleString()}</p>
                            <p>Next run: {new Date(task.nextRun).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Activity className="h-4 w-4" />
                              Logs
                            </Button>
                            <Button variant="ghost" size="sm">
                              {task.status === "running" ? (
                                <>
                                  <PauseCircle className="h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-4 w-4" />
                                  Run
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!filteredTasks.length && (
                      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No tasks match the current filters.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-secondary/30">
                <CardHeader>
                  <CardTitle>Recent activity</CardTitle>
                  <CardDescription>Latest signals from the automation control plane.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {taskActivity.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                      <div
                        className={cn(
                          "mt-1 rounded-full p-1.5",
                          event.status === "success" && "bg-emerald-500/15 text-emerald-400",
                          event.status === "warning" && "bg-amber-500/15 text-amber-400",
                          event.status === "info" && "bg-primary/15 text-primary",
                        )}
                      >
                        {event.status === "success" && <CheckCircle2 className="h-4 w-4" />}
                        {event.status === "warning" && <AlertTriangle className="h-4 w-4" />}
                        {event.status === "info" && <Activity className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-muted-foreground">{event.detail}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{event.time}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Playbooks</CardTitle>
                <CardDescription>Automate routine remediations with one click.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  title: "Recover failed rollouts",
                  detail: "Detect and revert stalled deployments automatically.",
                  stat: "3 linked tasks",
                },
                {
                  title: "Warm edge nodes",
                  detail: "Preload caches before daily traffic spikes.",
                  stat: "6 linked tasks",
                },
                { title: "Rotate shared secrets", detail: "Coordinate vault updates across clusters.", stat: "2 linked tasks" },
              ].map((playbook) => (
                <div key={playbook.title} className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                  <p className="font-medium text-foreground">{playbook.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{playbook.detail}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{playbook.stat}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </AuthGuard>
  )
}

function StatTile({
  label,
  value,
  hint,
  icon,
  trendLabel,
}: {
  label: string
  value: string | number
  hint: string
  icon?: ReactNode
  trendLabel?: string
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {trendLabel && <p className="text-xs font-medium text-primary">{trendLabel}</p>}
      </CardContent>
    </Card>
  )
}

function HealthRow({ label, value, hint, trend }: { label: string; value: string; hint: string; trend?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {trend && <p className="text-xs text-primary">{trend}</p>}
      </div>
    </div>
  )
}
