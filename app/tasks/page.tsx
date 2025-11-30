'use client'

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const tasks = [
  { id: 1, name: "Database Backup", status: "running", machine: "Server-01", progress: 65 },
  { id: 2, name: "Log Cleanup", status: "completed", machine: "Server-02", progress: 100 },
  { id: 3, name: "Security Scan", status: "pending", machine: "Server-03", progress: 0 },
  { id: 4, name: "Cache Clear", status: "running", machine: "Server-01", progress: 30 },
  { id: 5, name: "System Update", status: "pending", machine: "Server-04", progress: 0 },
]

const statusColors: Record<string, string> = {
  running: "bg-chart-1/20 text-chart-1",
  completed: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
}

export default function TasksPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">Manage and monitor your scheduled tasks</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">All Tasks</CardTitle>
            <CardDescription>A list of all tasks across your machines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-card-foreground">{task.name}</p>
                      <p className="text-sm text-muted-foreground">{task.machine}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {task.status === "running" && (
                      <div className="w-24">
                        <div className="h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-chart-1" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    )}
                    <Badge className={statusColors[task.status]}>{task.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </AuthGuard>
  )
}
