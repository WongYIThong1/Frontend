'use client'

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle, Server, Clock } from "lucide-react"

const stats = [
  { name: "Active Tasks", value: "12", icon: CheckCircle, change: "+2 from last week" },
  { name: "Machines Online", value: "8", icon: Server, change: "All systems operational" },
  { name: "Uptime", value: "99.9%", icon: Activity, change: "Last 30 days" },
  { name: "Avg Response", value: "45ms", icon: Clock, change: "-5ms from last week" },
]

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your system.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
            <CardDescription>Your latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Task completed", desc: "Backup process finished successfully", time: "2 min ago" },
                { title: "Machine online", desc: "Server-04 is now operational", time: "15 min ago" },
                { title: "Settings updated", desc: "Notification preferences changed", time: "1 hour ago" },
                { title: "New task created", desc: "Database cleanup scheduled", time: "3 hours ago" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
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

