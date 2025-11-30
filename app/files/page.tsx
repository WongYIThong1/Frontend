'use client'

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, File, FileText, ImageIcon, Upload, MoreVertical } from "lucide-react"

const files = [
  { name: "Documents", type: "folder", items: 24, modified: "2 hours ago", icon: FolderOpen },
  { name: "Images", type: "folder", items: 156, modified: "1 day ago", icon: FolderOpen },
  { name: "report-2024.pdf", type: "file", size: "2.4 MB", modified: "3 hours ago", icon: FileText },
  { name: "backup-config.json", type: "file", size: "12 KB", modified: "5 hours ago", icon: File },
  { name: "screenshot.png", type: "file", size: "1.8 MB", modified: "1 day ago", icon: ImageIcon },
  { name: "logs-november.txt", type: "file", size: "456 KB", modified: "2 days ago", icon: FileText },
]

export default function FilesPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Files</h1>
            <p className="text-muted-foreground">Manage and organize your files</p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base font-medium">All Files</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <file.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.type === "folder" ? `${file.items} items` : file.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{file.modified}</span>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
