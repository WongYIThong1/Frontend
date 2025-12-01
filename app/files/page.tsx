'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  Cloud,
  Code,
  Eye,
  FolderOpen,
  Grid2X2,
  ImageIcon,
  List,
  MoreVertical,
  Pencil,
  RefreshCcw,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react"

type FileRecord = {
  id: string
  name: string
  sizeBytes: number
  createdAt: string
  icon: React.ComponentType<{ className?: string }>
}

const viewModes = ["list", "grid"] as const
type ViewMode = (typeof viewModes)[number]

export default function FilesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [files, setFiles] = useState<FileRecord[]>([])
  const [usedBytes, setUsedBytes] = useState(0)
  const [limitBytes, setLimitBytes] = useState(500 * 1024 * 1024)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploadDone, setUploadDone] = useState(0)
  const [actioningFileId, setActioningFileId] = useState<string | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const [reviewFileName, setReviewFileName] = useState<string | null>(null)
  const [isReviewLoading, setIsReviewLoading] = useState(false)
  const reviewTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileRecord | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredFiles = useMemo(() => {
    return files.filter((file) => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [files, searchTerm])

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / Math.pow(1024, idx)
    return `${value.toFixed(1)} ${units[idx]}`
  }

  const formatDate = (iso: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString()
  }

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/files/usage", { credentials: "include" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load files")
      }
      const data = await res.json()
      const usage = data.usage as { usedBytes: number; limitBytes: number }
      const serverFiles = (data.files as any[]) || []

      setUsedBytes(usage?.usedBytes ?? 0)
      setLimitBytes(usage?.limitBytes ?? 500 * 1024 * 1024)

      const mapped: FileRecord[] = serverFiles.map((file, index) => {
        const rawName: string = file.name || ""
        const parts = rawName.split("/")
        const displayName = parts[parts.length - 1] || rawName
        let Icon = Code
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(displayName)) Icon = ImageIcon
        else if (/\.(log|txt)$/i.test(displayName)) Icon = FolderOpen
        else if (/\.(tar|gz|tgz|zip)$/i.test(displayName)) Icon = Cloud

        return {
          id: `${index}-${rawName}`,
          name: displayName,
          sizeBytes: typeof file.size === "number" ? file.size : 0,
          createdAt: file.createdAt || "",
          icon: Icon,
        }
      })

      setFiles(mapped)
    } catch (err) {
      console.error("Files usage load error:", err)
      setError(err instanceof Error ? err.message : "Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    if (isReviewOpen && reviewUrl) {
      if (reviewTimerRef.current) {
        clearTimeout(reviewTimerRef.current)
      }
      reviewTimerRef.current = setTimeout(() => {
        setIsReviewOpen(false)
        setReviewUrl(null)
      }, 60000)
    }
    return () => {
      if (reviewTimerRef.current) {
        clearTimeout(reviewTimerRef.current)
        reviewTimerRef.current = null
      }
    }
  }, [isReviewOpen, reviewUrl])

  const handleUploadClick = () => {
    setIsUploadDialogOpen(true)
  }

  const uploadFiles = async (filesToUpload: File[]) => {
    if (!filesToUpload.length) return
    const txtFiles = filesToUpload.filter((file) => /\.txt$/i.test(file.name))
    if (!txtFiles.length) {
      setError("Only .txt files can be uploaded.")
      return
    }
    try {
      setIsUploading(true)
      setUploadTotal(txtFiles.length)
      setUploadDone(0)
      setError(null)
      for (let i = 0; i < txtFiles.length; i++) {
        const file = txtFiles[i]
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || `Upload failed for ${file.name}`)
        }
        setUploadDone((prev) => prev + 1)
      }
      await fetchUsage()
    } catch (err) {
      console.error("File upload error (client):", err)
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Please try again.",
        })
    } finally {
      setIsUploading(false)
      setIsUploadDialogOpen(false)
      setIsDragActive(false)
      setUploadTotal(0)
      setUploadDone(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return
    const filesArr = Array.from(fileList)
    void uploadFiles(filesArr)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)
    const dt = event.dataTransfer
    const files: File[] = []
    if (dt.items && dt.items.length) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i]
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
    } else if (dt.files && dt.files.length) {
      files.push(...Array.from(dt.files))
    }
    void uploadFiles(files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setActioningFileId(deleteTarget.id)
      setError(null)
      const res = await fetch("/api/files/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deleteTarget.name }),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete file")
      }
      await fetchUsage()
    } catch (err) {
      console.error("File delete error:", err)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setActioningFileId(null)
      setDeleteTarget(null)
    }
  }

  const handleConfirmRename = async () => {
    const raw = renameValue.trim()
    if (!renameTarget || !raw) {
      setRenameTarget(null)
      return
    }
    // 始终追加 .txt 后缀（如果用户没有输入）
    const nextName = raw.toLowerCase().endsWith(".txt") ? raw : `${raw}.txt`
    if (nextName === renameTarget.name) {
      setRenameTarget(null)
      setRenameValue("")
      return
    }
    try {
      setActioningFileId(renameTarget.id)
      setError(null)
      const res = await fetch("/api/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: renameTarget.name, newName: nextName }),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to rename file")
      }
      await fetchUsage()
    } catch (err) {
      console.error("File rename error:", err)
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setActioningFileId(null)
      setRenameTarget(null)
      setRenameValue("")
    }
  }

  const handleReview = async (file: FileRecord) => {
    try {
      setReviewFileName(file.name)
      setReviewUrl(null)
      setIsReviewOpen(true)
      setIsReviewLoading(true)
      setActioningFileId(file.id)
      setError(null)
      const res = await fetch(`/api/files/review?name=${encodeURIComponent(file.name)}`, {
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to generate review link")
      }
      setReviewUrl(data.url)
    } catch (err) {
      console.error("File review error:", err)
      toast({
        variant: "destructive",
        title: "Preview failed",
        description: err instanceof Error ? err.message : "Please try again.",
      })
      setIsReviewOpen(false)
    } finally {
      setIsReviewLoading(false)
      setActioningFileId(null)
    }
  }

  const renderActions = (file: FileRecord) => {
    const loading = actioningFileId === file.id
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={loading}
            title="File actions"
            aria-label="File actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => handleReview(file)}
            disabled={loading}
          >
            <Eye className="h-4 w-4" />
            Review
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => {
              setRenameTarget(file)
              // 在输入框中隐藏 .txt 后缀，只展示基础名称
              const base = file.name.replace(/\.txt$/i, "")
              setRenameValue(base)
            }}
            disabled={loading}
          >
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive focus:text-destructive"
            onClick={() => setDeleteTarget(file)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Files</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </div>
          <Card className="border-border/70 bg-card/80 w-full">
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center justify-between text-sm text-muted-foreground">
                <span>{formatBytes(usedBytes)} used</span>
                <span>{formatBytes(Math.max(0, limitBytes - usedBytes))} remaining</span>
                <span>{limitBytes > 0 ? `${Math.min(100, Math.round((usedBytes / limitBytes) * 100))}%` : "0%"}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-400 transition-all"
                  style={{
                    width:
                      limitBytes > 0
                        ? `${Math.min(100, Math.round((usedBytes / limitBytes) * 100))}%`
                        : "0%",
                  }}
                />
              </div>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".txt,text/plain"
          />
          <Card className="border-border/70 bg-card/80 w-full">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search files by name"
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {viewModes.map((mode) => {
                    const Icon = mode === "list" ? List : Grid2X2
                    return (
                      <Button
                        key={mode}
                        variant={viewMode === mode ? "default" : "outline"}
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setViewMode(mode)}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Loading files...</div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl border border-border/60 bg-secondary/20 p-4 transition hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/70">
                            <file.icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                          </div>
                        </div>
                        {renderActions(file)}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>Created · {formatDate(file.createdAt)}</p>
                        <p>Size · {formatBytes(file.sizeBytes)}</p>
                      </div>
                    </div>
                  ))}
                  {!filteredFiles.length && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                      No files match your search.
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="py-3 font-medium">Name</th>
                        <th className="py-3 font-medium">Size</th>
                        <th className="py-3 font-medium">Created</th>
                        <th className="py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((file) => (
                        <tr key={file.id} className="border-b border-border/40">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                                <file.icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">{formatBytes(file.sizeBytes)}</td>
                          <td className="py-4">{formatDate(file.createdAt)}</td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end">{renderActions(file)}</div>
                          </td>
                        </tr>
                      ))}
                      {!filteredFiles.length && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                            No files match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent
          className="w-[92vw] max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          onPointerDownOutside={() => {
            if (reviewTimerRef.current) {
              clearTimeout(reviewTimerRef.current)
              reviewTimerRef.current = null
            }
          }}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-base font-semibold text-foreground">
              <span className="line-clamp-2 break-all">{reviewFileName || "Preview file"}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isReviewLoading
                ? "Generating secure preview link..."
                : "Preview is secured. Links expire automatically after 60 seconds."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-3">
            {isReviewLoading && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
                Loading preview...
              </div>
            )}
            {!isReviewLoading && reviewUrl && (
              <iframe
                src={reviewUrl}
                className="h-[65vh] w-full overflow-hidden rounded-lg border border-border bg-background shadow-inner"
                style={{ border: "none" } as React.CSSProperties}
                title="File preview"
              />
            )}
            {!isReviewLoading && !reviewUrl && (
              <div className="flex h-[60vh] items-center justify-center text-sm text-destructive">
                Unable to load preview.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => !isUploading && setIsUploadDialogOpen(open)}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>Drag .txt files here, or browse from your device.</DialogDescription>
          </DialogHeader>
          <div
            className={`mt-4 flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center text-sm transition-all duration-300 ${
              isDragActive
                ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.3)] scale-[1.01] animate-pulse"
                : "border-border/60 bg-secondary/10 hover:border-primary/40 hover:bg-secondary/20"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
          >
            <p className="mb-2 text-foreground">Drop .txt files here</p>
            <p className="mb-4 text-xs text-muted-foreground">Up to 50MB per file, total limited by your 500MB quota.</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Browse files
            </Button>
          </div>
          {isUploading && (
            <div className="mt-4 space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-sky-500 to-emerald-400 transition-all"
                  style={{
                    width:
                      uploadTotal > 0 ? `${Math.min(100, Math.round((uploadDone / uploadTotal) * 100))}%` : "10%",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading {uploadTotal ? `${uploadDone}/${uploadTotal}` : ""}...
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>
              Enter a new name for your file. The <span className="font-mono">.txt</span> extension will be added
              automatically.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder="e.g. my-file.txt"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>This action is permanent. Are you sure you want to delete this file?</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
            <p className="text-sm font-medium text-foreground">{deleteTarget?.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(deleteTarget?.sizeBytes || 0)}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}


