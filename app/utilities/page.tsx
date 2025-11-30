'use client'

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal, Database, RefreshCw, Shield, Zap, Archive } from "lucide-react"

const utilities = [
  {
    name: "Terminal",
    description: "Access command line interface",
    icon: Terminal,
    status: "available",
  },
  {
    name: "Database Manager",
    description: "Manage database connections and queries",
    icon: Database,
    status: "available",
  },
  {
    name: "Sync Tool",
    description: "Synchronize data across services",
    icon: RefreshCw,
    status: "running",
  },
  {
    name: "Security Scanner",
    description: "Scan for vulnerabilities and threats",
    icon: Shield,
    status: "available",
  },
  {
    name: "Performance Monitor",
    description: "Monitor system performance metrics",
    icon: Zap,
    status: "available",
  },
  {
    name: "Backup Manager",
    description: "Create and manage system backups",
    icon: Archive,
    status: "available",
  },
]

export default function UtilitiesPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Utilities</h1>
          <p className="text-muted-foreground">System tools and utilities</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {utilities.map((utility) => (
            <Card key={utility.name} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <utility.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {utility.status === "running" && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Running
                    </span>
                  )}
                </div>
                <CardTitle className="text-base">{utility.name}</CardTitle>
                <CardDescription>{utility.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  {utility.status === "running" ? "Open" : "Launch"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
    </AuthGuard>
  )
}
