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
import { Activity, ArrowLeft, Globe2, Settings2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type TaskStatus = "running" | "pending" | "completed" | "failed"

const statusColorMap: Record<TaskStatus, string> = {
  running: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-amber-500/20 text-amber-400",
  completed: "bg-sky-500/20 text-sky-400",
  failed: "bg-red-500/20 text-red-400",
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
  { domain: "example.com", country: "US", rows: 1234, status: "Active" },
  { domain: "foo.bar", country: "SG", rows: 567, status: "Pending" },
  { domain: "my-site.cn", country: "CN", rows: 980, status: "Running" },
  { domain: "backup.net", country: "DE", rows: 312, status: "Paused" },
]

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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
          status === "running" || status === "completed" || status === "failed"
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
                <h1 className="text-2xl font-semibold text-foreground">
                  Task overview
                </h1>
                <p className="text-sm text-muted-foreground">
                  Detailed view of this task configuration and progress.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {task && (
                <Badge className={cn("text-xs shrink-0 capitalize", statusColorMap[task.status])}>
                  {task.status === "running" ? "Running..." : task.status}
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 transition-colors duration-200 hover:bg-secondary/40 hover:border-primary/60 hover:text-primary hover:shadow-md hover:animate-pulse-slow"
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
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Task configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">List</p>
                      <p className="text-sm font-medium text-foreground break-all">
                        {task.listFile || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Thread</p>
                      <p className="text-sm font-medium text-foreground">
                        {task.thread || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Worker</p>
                      <p className="text-sm font-medium text-foreground">
                        {task.worker || "-"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Timeout</p>
                      <p className="text-sm font-medium text-foreground">
                        {task.timeout || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Machine</p>
                    <p className="text-sm font-medium text-foreground">
                      {task.machineId || "No machine"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Execution progress</span>
                    <span className="font-medium text-foreground">{progressLabel}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-400 transition-all"
                      style={{ width: progressLabel }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Tables</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Sample breakdown of domains and countries for this task.
                    </p>
                  </div>
                  <Globe2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="border-b border-border/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="py-2 text-left font-medium">Domains</th>
                          <th className="py-2 text-left font-medium">Country</th>
                          <th className="py-2 text-right font-medium">Rows</th>
                          <th className="py-2 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoRows.map((row) => (
                          <tr key={row.domain} className="border-b border-border/40 last:border-0">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs">
                                  <Activity className="h-3 w-3" />
                                </span>
                                <span className="font-medium text-foreground">{row.domain}</span>
                              </div>
                            </td>
                            <td className="py-2 text-muted-foreground">{row.country}</td>
                            <td className="py-2 text-right text-foreground">{row.rows}</td>
                            <td className="py-2 text-right">
                              <Badge className="text-xs">{row.status}</Badge>
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


