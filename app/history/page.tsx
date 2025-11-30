'use client'

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { History, FileText, Server, CheckSquare, Settings, Wrench } from "lucide-react"

const historyItems = [
  {
    id: 1,
    action: "Task Completed",
    description: "Completed task: Update server configurations",
    icon: CheckSquare,
    time: "2 minutes ago",
    type: "task",
  },
  {
    id: 2,
    action: "File Uploaded",
    description: "Uploaded document: quarterly-report.pdf",
    icon: FileText,
    time: "15 minutes ago",
    type: "file",
  },
  {
    id: 3,
    action: "Machine Restarted",
    description: "Server-02 was successfully restarted",
    icon: Server,
    time: "1 hour ago",
    type: "machine",
  },
  {
    id: 4,
    action: "Utility Executed",
    description: "Ran database backup utility",
    icon: Wrench,
    time: "2 hours ago",
    type: "utility",
  },
  {
    id: 5,
    action: "Settings Changed",
    description: "Updated notification preferences",
    icon: Settings,
    time: "3 hours ago",
    type: "settings",
  },
  {
    id: 6,
    action: "Task Created",
    description: "Created new task: Review security protocols",
    icon: CheckSquare,
    time: "5 hours ago",
    type: "task",
  },
  {
    id: 7,
    action: "File Deleted",
    description: "Removed file: old-backup-2023.zip",
    icon: FileText,
    time: "1 day ago",
    type: "file",
  },
  {
    id: 8,
    action: "Machine Added",
    description: "Added new machine: Worker-Node-05",
    icon: Server,
    time: "2 days ago",
    type: "machine",
  },
]

const typeColors: Record<string, string> = {
  task: "bg-emerald-500/10 text-emerald-500",
  file: "bg-blue-500/10 text-blue-500",
  machine: "bg-purple-500/10 text-purple-500",
  utility: "bg-amber-500/10 text-amber-500",
  settings: "bg-gray-500/10 text-gray-400",
}

export default function HistoryPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">History</h1>
          <p className="text-muted-foreground">View your recent activity and changes</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {historyItems.map((item, index) => (
                <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index !== historyItems.length - 1 && (
                    <div className="absolute left-[18px] top-10 h-full w-px bg-border" />
                  )}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${typeColors[item.type]}`}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
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
