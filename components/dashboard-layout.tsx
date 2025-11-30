import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="md:pl-64">
        <div className="p-6 pt-20 md:pt-6">{children}</div>
      </main>
    </div>
  )
}
