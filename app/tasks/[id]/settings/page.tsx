"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Save,
  FileText,
  Network,
  Server,
  Gauge,
  Clock,
  Settings2,
  Loader2,
  Plus,
  Trash2,
  Database,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type FileOption = {
  name: string
  type: string | null
}

type MachineOption = {
  id: string
  name: string | null
  ip: string
}

type Table = {
  id: string
  name: string
  columns: string[] // Array of column names
}

export default function TaskSettingsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [listFile, setListFile] = useState<string>("")
  const [proxyFile, setProxyFile] = useState<string>("")
  const [machineId, setMachineId] = useState<string>("")
  const [thread, setThread] = useState<string>("")
  const [worker, setWorker] = useState<string>("")
  const [timeout, setTimeout] = useState<string>("")
  const [dumperThread, setDumperThread] = useState<string>("")
  const [dumperWorker, setDumperWorker] = useState<string>("")
  const [dumperTimeout, setDumperTimeout] = useState<string>("")
  const [dumperMinRows, setDumperMinRows] = useState<string>("")
  const [autoDumper, setAutoDumper] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [dumperPreset, setDumperPreset] = useState<string>("")
  const [tables, setTables] = useState<Table[]>([])
  const [presetName, setPresetName] = useState<string>("")
  const [savedPresets, setSavedPresets] = useState<Array<{ id: string; name: string; settings: Table[] }>>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [tableInputValues, setTableInputValues] = useState<Record<string, string>>({}) // For table names and column inputs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Options
  const [listFiles, setListFiles] = useState<FileOption[]>([])
  const [proxyFiles, setProxyFiles] = useState<FileOption[]>([])
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([])

  // Load task data
  useEffect(() => {
    const loadTask = async () => {
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
        const task = data.task

        if (!task) {
          setError("Task not found")
          return
        }

        // Set form values
        setName(task.name || "")
        setListFile(task.list_file || "")
        setProxyFile(task.proxy_file || "")
        setMachineId(task.machine_id || "")
        setThread(String(task.thread || ""))
        setWorker(String(task.worker || ""))
        
        // Extract timeout number from "15s" format
        const timeoutStr = task.timeout || ""
        const timeoutNum = timeoutStr.replace(/[^\d]/g, "")
        setTimeout(timeoutNum)
        setAutoDumper(task.auto_dumper || false)
        setAiMode(task.ai_mode || false)

        // Load dumper performance settings if present
        if (task.dumper_thread != null) {
          setDumperThread(String(task.dumper_thread))
        }
        if (task.dumper_worker != null) {
          setDumperWorker(String(task.dumper_worker))
        }
        if (task.dumper_timeout) {
          const dumperTimeoutStr = task.dumper_timeout as string
          const dumperTimeoutNum = dumperTimeoutStr.replace(/[^\d]/g, "")
          setDumperTimeout(dumperTimeoutNum)
        }
        if (task.dumper_min_rows != null) {
          setDumperMinRows(String(task.dumper_min_rows))
        }

        // Load saved presets from API first (needed to match preset IDs)
        const loadedPresets = await loadSavedPresets()

        // Load dumper settings from database
        if (task.auto_dumper) {
          if (task.dumper_preset_id) {
            // User saved preset
            const presetId = task.dumper_preset_id
            setDumperPreset(`preset_${presetId}`)
            setSelectedPresetId(presetId)
            
            // Find the preset in loaded presets to load its settings
            const preset = loadedPresets.find((p: any) => p.id === presetId)
            if (preset) {
              setTables(preset.settings || [])
              setPresetName(preset.name)
            } else {
              // If preset not found in list, fetch it from API
              try {
                const presetRes = await fetch(`/api/presets?id=${encodeURIComponent(presetId)}`, {
                  credentials: "include",
                })
                if (presetRes.ok) {
                  const presetData = await presetRes.json()
                  if (presetData.preset) {
                    setTables(presetData.preset.settings || [])
                    setPresetName(presetData.preset.name)
                  }
                }
              } catch (e) {
                console.error("Failed to load preset:", e)
              }
            }
          } else if (task.dumper_preset_type) {
            // System preset
            setDumperPreset(task.dumper_preset_type)
            setSelectedPresetId(null)
            
            // Load tables if preset type is "custom"
            if (task.dumper_preset_type === "custom" && task.dumper_settings) {
              setTables(task.dumper_settings || [])
            } else {
              setTables([])
            }
            setPresetName("")
          }
        } else {
          // Clear dumper settings if auto_dumper is false
          setDumperPreset("")
          setTables([])
          setPresetName("")
          setSelectedPresetId(null)
        }
      } catch (err) {
        console.error("Load task error:", err)
        setError(err instanceof Error ? err.message : "Failed to load task")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadTask()
    }
  }, [params.id])

  // Load files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch("/api/files/usage", {
          credentials: "include",
        })
        if (!response.ok) return
        const data = await response.json()
        const files = (data.files || []) as any[]
        const mapped: FileOption[] = files.map((file) => ({
          name: String(file.name ?? ""),
          type: (file.type as string | null) ?? null,
        }))
        setListFiles(mapped.filter((file) => file.type === "urls"))
        setProxyFiles(mapped.filter((file) => file.type === "proxies"))
      } catch (error) {
        console.error("Failed to load files:", error)
      }
    }

    fetchFiles()
  }, [])

  // Load machines
  useEffect(() => {
    const loadMachines = async () => {
      try {
        const response = await fetch("/api/machines", {
          credentials: "include",
        })
        if (!response.ok) return
        const data = await response.json()
        const machines = (data.machines || []) as any[]
        const mapped: MachineOption[] = machines.map((m) => ({
          id: m.id as string,
          name: (m.name as string | null) ?? null,
          ip: (m.ip as string) ?? "",
        }))
        setMachineOptions(mapped)
      } catch (error) {
        console.error("Failed to load machines:", error)
      }
    }

    loadMachines()
  }, [])

  // Load saved presets on mount
  useEffect(() => {
    loadSavedPresets()
  }, [])

  // Clear dumper settings when autoDumper is disabled
  useEffect(() => {
    if (!autoDumper) {
      setDumperPreset("")
      setTables([])
      setPresetName("")
      setTableInputValues({})
    }
  }, [autoDumper])

  // Clear tables when preset changes from custom or saved preset
  useEffect(() => {
    if (dumperPreset !== "custom" && !dumperPreset.startsWith("preset_")) {
      setTables([])
      setPresetName("")
      setSelectedPresetId(null)
    }
  }, [dumperPreset])

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast({
        variant: "destructive",
        title: "Preset name is required",
        description: "Please enter a name for your preset.",
      })
      return
    }

    if (tables.length === 0) {
      toast({
        variant: "destructive",
        title: "No custom settings",
        description: "Please add at least one custom setting before saving.",
      })
      return
    }

    try {
      const response = await fetch("/api/presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: presetName.trim(),
          settings: tables,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save preset")
      }

      const data = await response.json()
      
      // Reload presets list
      await loadSavedPresets()

      const savedPresetName = presetName.trim()
      toast({
        title: "Preset saved",
        description: `"${savedPresetName}" has been saved successfully.`,
      })

      // Auto-select the newly saved preset
      const presetsResponse = await fetch("/api/presets", {
        credentials: "include",
      })
      if (presetsResponse.ok) {
        const presetsData = await presetsResponse.json()
        const newPreset = presetsData.presets?.find((p: any) => p.name === savedPresetName)
        if (newPreset) {
          setDumperPreset(`preset_${newPreset.id}`)
          setSelectedPresetId(newPreset.id)
          setTables(newPreset.settings || [])
        }
      }

      // Clear preset name after saving
      setPresetName("")
    } catch (err) {
      console.error("Save preset error:", err)
      toast({
        variant: "destructive",
        title: "Failed to save preset",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  const loadSavedPresets = async () => {
    try {
      const response = await fetch("/api/presets", {
        credentials: "include",
      })
      if (!response.ok) return []
      const data = await response.json()
      const presets = data.presets || []
      setSavedPresets(presets)
      return presets
    } catch (error) {
      console.error("Failed to load saved presets:", error)
      return []
    }
  }

  const addTable = () => {
    const newTable: Table = {
      id: `table_${Date.now()}`,
      name: "",
      columns: [],
    }
    setTables([...tables, newTable])
  }

  const removeTable = (tableId: string) => {
    setTables(tables.filter((table) => table.id !== tableId))
  }

  const updateTableName = (tableId: string, name: string) => {
    setTables(
      tables.map((table) =>
        table.id === tableId ? { ...table, name } : table
      )
    )
  }

  const addColumn = (tableId: string) => {
    const inputValue = (tableInputValues[`${tableId}_column`] || "").trim()
    
    if (!inputValue) {
      toast({
        variant: "destructive",
        title: "Column name required",
        description: "Please enter a column name.",
      })
      return
    }

    // Split by comma and trim each column
    const columns = inputValue
      .split(",")
      .map((col) => col.trim())
      .filter((col) => col.length > 0)

    if (columns.length === 0) {
      toast({
        variant: "destructive",
        title: "Column name required",
        description: "Please enter a column name.",
      })
      return
    }

    setTables(
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: [...table.columns, ...columns],
            }
          : table
      )
    )

    // Clear the input
    setTableInputValues({
      ...tableInputValues,
      [`${tableId}_column`]: "",
    })
  }

  const removeColumn = (tableId: string, columnIndex: number) => {
    setTables(
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: table.columns.filter((_, index) => index !== columnIndex),
            }
          : table
      )
    )
  }

  const updateColumn = (tableId: string, columnIndex: number, value: string) => {
    setTables(
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              columns: table.columns.map((col, index) =>
                index === columnIndex ? value : col
              ),
            }
          : table
      )
    )
  }

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        toast({
          variant: "destructive",
          title: "Task name is required",
        })
        return
      }

      if (!thread || !worker || !timeout) {
        toast({
          variant: "destructive",
          title: "Thread, Worker and Timeout are required",
        })
        return
      }

      const threadNum = parseInt(thread, 10)
      const workerNum = parseInt(worker, 10)
      const timeoutNum = parseInt(timeout, 10)

      if (!Number.isFinite(threadNum) || threadNum <= 0) {
        toast({
          variant: "destructive",
          title: "Thread must be a positive number",
        })
        return
      }

      if (!Number.isFinite(workerNum) || workerNum <= 0) {
        toast({
          variant: "destructive",
          title: "Worker must be a positive number",
        })
        return
      }

      if (!Number.isFinite(timeoutNum) || timeoutNum <= 0) {
        toast({
          variant: "destructive",
          title: "Timeout must be a positive number",
        })
        return
      }

      // Dumper performance settings：可选，用户可以在不开 Auto Dumper / AI Mode 的情况下预先配置
      let dumperThreadNum: number | null = null
      let dumperWorkerNum: number | null = null
      let dumperTimeoutNum: number | null = null
      let dumperMinRowsNum: number | null = null

      const hasAnyDumperValue =
        dumperThread.trim() !== "" ||
        dumperWorker.trim() !== "" ||
        dumperTimeout.trim() !== "" ||
        dumperMinRows.trim() !== ""

      if (hasAnyDumperValue) {
        dumperThreadNum = parseInt(dumperThread || "0", 10)
        dumperWorkerNum = parseInt(dumperWorker || "0", 10)
        dumperTimeoutNum = parseInt(dumperTimeout || "0", 10)
        dumperMinRowsNum = parseInt(dumperMinRows || "0", 10)

        if (!Number.isFinite(dumperThreadNum) || dumperThreadNum <= 0) {
          toast({
            variant: "destructive",
            title: "Dumper thread must be a positive number",
          })
          return
        }

        if (!Number.isFinite(dumperWorkerNum) || dumperWorkerNum <= 0) {
          toast({
            variant: "destructive",
            title: "Dumper worker must be a positive number",
          })
          return
        }

        if (!Number.isFinite(dumperTimeoutNum) || dumperTimeoutNum <= 0) {
          toast({
            variant: "destructive",
            title: "Dumper timeout must be a positive number",
          })
          return
        }

        if (!Number.isFinite(dumperMinRowsNum) || dumperMinRowsNum <= 0) {
          toast({
            variant: "destructive",
            title: "Dumper min rows must be a positive number",
          })
          return
        }
      }

      setIsSaving(true)

      // Prepare dumper preset data for database
      let dumperPresetId: string | null = null
      let dumperPresetType: string | null = null
      let dumperSettings: any = null

      if (autoDumper && dumperPreset) {
        if (dumperPreset.startsWith("preset_")) {
          // User saved preset
          const presetId = dumperPreset.replace("preset_", "")
          dumperPresetId = presetId
          dumperPresetType = null
          dumperSettings = null
        } else {
          // System preset
          dumperPresetId = null
          dumperPresetType = dumperPreset
          if (dumperPreset === "custom") {
            dumperSettings = tables
          } else {
            dumperSettings = null
          }
        }
      } else if (!autoDumper) {
        // Clear dumper preset data if auto_dumper is disabled
        dumperPresetId = null
        dumperPresetType = null
        dumperSettings = null
      }

      // 构建请求 payload，只有在用户填写了 Dumper Settings 时才下发这些字段
      const payload: any = {
        id: params.id,
        name: name.trim(),
        listFile: listFile || null,
        proxyFile: proxyFile || null,
        machineId: machineId || null,
        thread: threadNum,
        worker: workerNum,
        timeout: timeoutNum,
        autoDumper: autoDumper,
        dumperPresetId: dumperPresetId,
        dumperPresetType: dumperPresetType,
        dumperSettings: dumperSettings,
        aiMode: aiMode,
      }

      if (hasAnyDumperValue) {
        payload.dumperThread = dumperThreadNum
        payload.dumperWorker = dumperWorkerNum
        payload.dumperTimeout = dumperTimeoutNum
        payload.dumperMinRows = dumperMinRowsNum
      }

      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update task")
      }

      toast({
        title: "Task updated",
        description: "Your task settings have been saved successfully.",
      })

      // Navigate back to task detail page
      router.push(`/tasks/${params.id}`)
    } catch (err) {
      console.error("Save task error:", err)
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 transition-colors duration-200 hover:bg-secondary/40 hover:border-primary/60 hover:text-primary"
              onClick={() => router.push(`/tasks/${params.id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold text-foreground">Task Settings</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure task parameters and resources
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading task settings...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20 text-destructive shrink-0">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-destructive mb-1">Error</h3>
                    <p className="text-sm text-destructive/80">{error}</p>
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={() => router.push("/tasks")}>
                        Back to tasks
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Form */}
          {!isLoading && !error && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Task name and identification</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-name" className="text-sm font-medium">
                        Task Name
                      </Label>
                      <Input
                        id="task-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Enter task name"
                        className="h-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Resources */}
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Network className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle>Resources</CardTitle>
                        <CardDescription>Files and machine assignment</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="task-list-file" className="text-sm font-medium">
                          List File
                        </Label>
                        <Select
                          value={listFile || "__none__"}
                          onValueChange={(value) => setListFile(value === "__none__" ? "" : value)}
                        >
                          <SelectTrigger id="task-list-file" className="h-10">
                            <SelectValue placeholder="Select list file (urls)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {listFiles.length === 0 ? (
                              <SelectItem value="__empty_lists" disabled>
                                No list files available
                              </SelectItem>
                            ) : (
                              listFiles.map((file) => (
                                <SelectItem key={file.name} value={file.name}>
                                  {file.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="task-proxy-file" className="text-sm font-medium">
                          Proxy File
                        </Label>
                        <Select
                          value={proxyFile || "__none__"}
                          onValueChange={(value) => setProxyFile(value === "__none__" ? "" : value)}
                        >
                          <SelectTrigger id="task-proxy-file" className="h-10">
                            <SelectValue placeholder="Select proxy file (proxies)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {proxyFiles.length === 0 ? (
                              <SelectItem value="__empty_proxies" disabled>
                                No proxy files available
                              </SelectItem>
                            ) : (
                              proxyFiles.map((file) => (
                                <SelectItem key={file.name} value={file.name}>
                                  {file.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-machine" className="text-sm font-medium">
                        Machine
                      </Label>
                      <Select
                        value={machineId || "__none__"}
                        onValueChange={(value) => setMachineId(value === "__none__" ? "" : value)}
                      >
                        <SelectTrigger id="task-machine" className="h-10">
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No machine</SelectItem>
                          {machineOptions.length === 0 ? (
                            <SelectItem value="__empty_machines" disabled>
                              No machines available
                            </SelectItem>
                          ) : (
                            machineOptions.map((machine) => (
                              <SelectItem key={machine.id} value={machine.id}>
                                {machine.name || machine.ip}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance */}
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <Gauge className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle>Performance</CardTitle>
                        <CardDescription>Thread, worker, and timeout configuration</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Global performance */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="task-thread" className="text-sm font-medium">
                          Thread
                        </Label>
                        <Select
                          value={thread}
                          onValueChange={setThread}
                        >
                          <SelectTrigger id="task-thread" className="h-10">
                            <SelectValue placeholder="Select thread" />
                          </SelectTrigger>
                          <SelectContent>
                            {["50","150","250","500","750","1000","1250","1550","1750","2000","2250","2500","2750","3000"].map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-worker" className="text-sm font-medium">
                          Worker
                        </Label>
                        <Select
                          value={worker}
                          onValueChange={setWorker}
                        >
                          <SelectTrigger id="task-worker" className="h-10">
                            <SelectValue placeholder="Select worker" />
                          </SelectTrigger>
                          <SelectContent>
                            {["5","15","25","35","45","55","65","75","85","95","100"].map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-timeout" className="text-sm font-medium">
                          Timeout
                        </Label>
                        <Select
                          value={timeout ? `${timeout}s` : ""}
                          onValueChange={(value) => {
                            const num = value.replace(/[^\d]/g, "")
                            setTimeout(num)
                          }}
                        >
                          <SelectTrigger id="task-timeout" className="h-10">
                            <SelectValue placeholder="Select timeout" />
                          </SelectTrigger>
                          <SelectContent>
                            {["15s","25s","35s","45s","55s","60s"].map((value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dumper Settings - only meaningful when auto dumper is on, but always visible in this card */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-sm font-medium">Dumper Settings</span>
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="dumper-thread" className="text-xs font-medium">
                            Thread
                          </Label>
                          <Select
                            value={dumperThread}
                            onValueChange={setDumperThread}
                          >
                            <SelectTrigger id="dumper-thread" className="h-9 text-xs">
                              <SelectValue placeholder="Thread" />
                            </SelectTrigger>
                            <SelectContent>
                              {["50","150","250","500","750","1000","1250","1550","1750","2000","2250","2500","2750","3000"].map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dumper-worker" className="text-xs font-medium">
                            Worker
                          </Label>
                          <Select
                            value={dumperWorker}
                            onValueChange={setDumperWorker}
                          >
                            <SelectTrigger id="dumper-worker" className="h-9 text-xs">
                              <SelectValue placeholder="Worker" />
                            </SelectTrigger>
                            <SelectContent>
                              {["5","15","25","35","45","55","65","75","85","95","100"].map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dumper-timeout" className="text-xs font-medium">
                            Timeout
                          </Label>
                          <Select
                            value={dumperTimeout ? `${dumperTimeout}s` : ""}
                            onValueChange={(value) => {
                              const num = value.replace(/[^\d]/g, "")
                              setDumperTimeout(num)
                            }}
                          >
                            <SelectTrigger id="dumper-timeout" className="h-9 text-xs">
                              <SelectValue placeholder="Timeout" />
                            </SelectTrigger>
                            <SelectContent>
                              {["15s","25s","35s","45s","55s","60s"].map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dumper-min-rows" className="text-xs font-medium">
                            Min Rows
                          </Label>
                          <Select
                            value={dumperMinRows}
                            onValueChange={setDumperMinRows}
                          >
                            <SelectTrigger id="dumper-min-rows" className="h-9 text-xs">
                              <SelectValue placeholder="Min Rows" />
                            </SelectTrigger>
                            <SelectContent>
                              {["10","25","50","100","250","500","1000"].map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Options */}
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                        <Database className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle>Custom Settings</CardTitle>
                        <CardDescription>Configure database tables and columns for dumper</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* AI Mode */}
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="task-ai-mode" className="text-sm font-medium cursor-pointer">
                          AI Mode
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enable AI-assisted dumper behavior
                        </p>
                      </div>
                      <Switch
                        id="task-ai-mode"
                        checked={aiMode}
                        onCheckedChange={setAiMode}
                      />
                    </div>

                    {/* Auto Dumper */}
                    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-4 py-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="task-auto-dumper" className="text-sm font-medium cursor-pointer">
                          Auto Dumper
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically dump with preset
                        </p>
                      </div>
                      <Switch
                        id="task-auto-dumper"
                        checked={autoDumper}
                        onCheckedChange={setAutoDumper}
                      />
                    </div>

                    {autoDumper && (
                      <div className="space-y-4 pt-2 border-t border-border/60">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="dumper-preset" className="text-sm font-medium">
                              Dumper Preset
                            </Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  aria-label="Dumper Preset information"
                                >
                                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-xs">
                                  Dumper Preset defines the data export format. Choose a preset format (e.g., Email:Password) or create a custom format by specifying tables and columns to extract from the database.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select
                            value={dumperPreset}
                            onValueChange={(value) => {
                              setDumperPreset(value)
                              
                              // If it's a user saved preset (starts with "preset_")
                              if (value.startsWith("preset_")) {
                                const presetId = value.replace("preset_", "")
                                const preset = savedPresets.find((p) => p.id === presetId)
                                if (preset) {
                                  setSelectedPresetId(presetId)
                                  setTables(preset.settings || [])
                                  // Set preset name for display
                                  setPresetName(preset.name)
                                }
                              } else {
                                // System presets
                                setSelectedPresetId(null)
                                if (value === "custom") {
                                  // Keep existing tables or start fresh
                                  if (tables.length === 0) {
                                    setTables([])
                                  }
                                } else {
                                  // Clear tables for system presets
                                  setTables([])
                                  setPresetName("")
                                }
                              }
                            }}
                          >
                            <SelectTrigger id="dumper-preset" className="h-10">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email_password">Email:Password preset</SelectItem>
                              <SelectItem value="user_password">User:Password preset</SelectItem>
                              <SelectItem value="cc_cvv_date">CC:Cvv:Date preset</SelectItem>
                              <SelectItem value="custom">Custom Preset</SelectItem>
                              {savedPresets.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Saved Presets
                                  </div>
                                  {savedPresets.map((preset) => (
                                    <SelectItem key={preset.id} value={`preset_${preset.id}`}>
                                      {preset.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {(dumperPreset === "custom" || dumperPreset.startsWith("preset_")) && (
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Custom Settings</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addTable}
                                className="h-8 gap-1.5"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Table
                              </Button>
                            </div>

                            {tables.length === 0 ? (
                              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">
                                No tables added. Click "Add Table" to get started.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {tables.map((table) => (
                                  <div
                                    key={table.id}
                                    className="p-4 rounded-lg border border-border/60 bg-secondary/20"
                                  >
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          value={table.name}
                                          onChange={(e) =>
                                            updateTableName(table.id, e.target.value)
                                          }
                                          placeholder="Table name"
                                          className="h-9 flex-1 font-medium"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => removeTable(table.id)}
                                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      <div className="space-y-2 pl-2 border-l-2 border-border/40">
                                        <Label className="text-xs text-muted-foreground">Columns</Label>
                                        {table.columns.map((column, columnIndex) => (
                                          <div
                                            key={columnIndex}
                                            className="flex items-center gap-2"
                                          >
                                            <Input
                                              value={column}
                                              onChange={(e) =>
                                                updateColumn(table.id, columnIndex, e.target.value)
                                              }
                                              placeholder={`Column ${columnIndex + 1}`}
                                              className="h-9 flex-1"
                                            />
                                            {table.columns.length > 1 && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                  removeColumn(table.id, columnIndex)
                                                }
                                                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                          <Input
                                            value={tableInputValues[`${table.id}_column`] || ""}
                                            onChange={(e) => {
                                              setTableInputValues({
                                                ...tableInputValues,
                                                [`${table.id}_column`]: e.target.value,
                                              })
                                            }}
                                            placeholder={`Column ${table.columns.length + 1} (e.g., email,password)`}
                                            className="h-9 flex-1"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault()
                                                addColumn(table.id)
                                              }
                                            }}
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addColumn(table.id)}
                                            className="h-9 gap-1.5"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="space-y-3 pt-2 border-t border-border/60">
                              <div className="space-y-2">
                                <Label htmlFor="preset-name" className="text-sm font-medium">
                                  Preset Name
                                </Label>
                                <Input
                                  id="preset-name"
                                  value={presetName}
                                  onChange={(e) => setPresetName(e.target.value)}
                                  placeholder="Enter preset name"
                                  className="h-10"
                                  disabled={dumperPreset.startsWith("preset_") && selectedPresetId !== null}
                                />
                              </div>
                              {dumperPreset.startsWith("preset_") && selectedPresetId !== null ? (
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch("/api/presets", {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          credentials: "include",
                                          body: JSON.stringify({
                                            id: selectedPresetId,
                                            name: presetName.trim(),
                                            settings: tables,
                                          }),
                                        })

                                        if (!response.ok) {
                                          const data = await response.json().catch(() => ({}))
                                          throw new Error(data.error || "Failed to update preset")
                                        }

                                        const responseData = await response.json()
                                        
                                        // Reload presets list first
                                        await loadSavedPresets()

                                        // Show success toast
                                        toast({
                                          title: "Preset updated",
                                          description: `"${presetName.trim()}" has been updated successfully.`,
                                        })
                                      } catch (err) {
                                        console.error("Update preset error:", err)
                                        toast({
                                          variant: "destructive",
                                          title: "Failed to update preset",
                                          description: err instanceof Error ? err.message : "Please try again.",
                                        })
                                      }
                                    }}
                                    disabled={!presetName.trim() || tables.length === 0}
                                    className="flex-1 gap-2"
                                  >
                                    <Save className="h-4 w-4" />
                                    Update Preset
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setDumperPreset("custom")
                                      setSelectedPresetId(null)
                                      setPresetName("")
                                    }}
                                    className="gap-2"
                                  >
                                    Save as New
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      if (!selectedPresetId) return
                                      setShowDeleteDialog(true)
                                    }}
                                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  onClick={handleSavePreset}
                                  disabled={!presetName.trim() || tables.length === 0}
                                  className="w-full gap-2"
                                >
                                  <Save className="h-4 w-4" />
                                  Save Preset
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="border-border/70 bg-card/80">
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !name.trim() || !thread || !worker || !timeout}
                      className="w-full gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/tasks/${params.id}`)}
                      disabled={isSaving}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Delete Preset Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => setShowDeleteDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Preset</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete this preset?
            </DialogDescription>
          </DialogHeader>
          {presetName && (
            <div className="rounded-md border border-border px-3 py-2 text-sm bg-secondary/20">
              <p className="font-medium text-foreground">{presetName}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedPresetId) return

                try {
                  const response = await fetch("/api/presets", {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                      id: selectedPresetId,
                    }),
                  })

                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(data.error || "Failed to delete preset")
                  }

                  // Clear current selection
                  setDumperPreset("")
                  setSelectedPresetId(null)
                  setTables([])
                  setPresetName("")
                  setTableInputValues({})

                  // Reload presets list
                  await loadSavedPresets()

                  // Close dialog
                  setShowDeleteDialog(false)

                  toast({
                    title: "Preset deleted",
                    description: `"${presetName}" has been deleted successfully.`,
                  })
                } catch (err) {
                  console.error("Delete preset error:", err)
                  toast({
                    variant: "destructive",
                    title: "Failed to delete preset",
                    description: err instanceof Error ? err.message : "Please try again.",
                  })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  )
}
