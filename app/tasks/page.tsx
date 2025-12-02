"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Activity,
  Clock3,
  Plus,
  RefreshCcw,
  Search,
  Eye,
  MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type TaskStatus = "running" | "pending" | "completed" | "failed" | "paused"

type MachineOption = {
  id: string
  name: string | null
  ip: string
}

type FileOption = {
  name: string
  type: string | null
}

const tasks = [
  // 静态数据已移除，任务将从 /api/tasks 加载
] as const

const statusColorMap: Record<TaskStatus, string> = {
  running: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-amber-500/20 text-amber-400",
  completed: "bg-sky-500/20 text-sky-400",
  failed: "bg-red-500/20 text-red-400",
  paused: "bg-yellow-500/20 text-yellow-400",
}

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskMachine, setNewTaskMachine] = useState("")
  const [newTaskThread, setNewTaskThread] = useState("")
  const [newTaskTimeout, setNewTaskTimeout] = useState("")
  const [newTaskStartFrom, setNewTaskStartFrom] = useState("")
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([])
  const [newTaskAutoDumper, setNewTaskAutoDumper] = useState(false)
  const [listFiles, setListFiles] = useState<FileOption[]>([])
  const [proxyFiles, setProxyFiles] = useState<FileOption[]>([])
  const [newTaskListFile, setNewTaskListFile] = useState("")
  const [newTaskProxyFile, setNewTaskProxyFile] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const [tasksFromServer, setTasksFromServer] = useState<
    {
      id: string
      name: string
      status: TaskStatus
      machineId: string | null
      progress: number
      listFile: string | null
      timeout: string
      createdAt: string
      updatedAt: string
    }[]
  >([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [renameTaskId, setRenameTaskId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleteTaskName, setDeleteTaskName] = useState("")

  const getMachineLabel = (machineId: string | null) => {
    if (!machineId) return "No machine"
    const machine = machineOptions.find((m) => m.id === machineId)
    if (!machine) return "Unknown machine"
    return machine.name || machine.ip || "Unknown machine"
  }

  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return tasksFromServer.filter((task) => {
      const machineLabel = getMachineLabel(task.machineId).toLowerCase()
      const matchesSearch =
        task.name.toLowerCase().includes(term) || machineLabel.includes(term)

      return matchesSearch
    })
  }, [searchTerm, tasksFromServer, machineOptions])

  const loadMachines = useCallback(async () => {
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
      console.error("Failed to load machines for task dialog:", error)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true)
      setTasksError(null)
      const response = await fetch("/api/tasks", {
        credentials: "include",
      })
      if (!response.ok) {
        if (response.status === 401) {
          setTasksError("Please log in again to view tasks.")
          return
        }
        throw new Error("Failed to load tasks")
      }
      const data = await response.json()
      const apiTasks = (data.tasks || []) as any[]
      const mapped = apiTasks.map((task) => {
        const status = (task.status as string) || "pending"
        const normalizedStatus: TaskStatus =
          status === "running" || status === "completed" || status === "failed" || status === "paused"
            ? (status as TaskStatus)
            : "pending"

        return {
          id: String(task.id),
          name: String(task.name ?? ""),
          status: normalizedStatus,
          machineId: task.machine_id ? String(task.machine_id) : null,
          progress: typeof task.progress === "number" ? task.progress : 0,
          listFile: task.list_file ? String(task.list_file) : null,
          timeout: String(task.timeout ?? ""),
          createdAt: String(task.created_at ?? ""),
          updatedAt: String(task.updated_at ?? ""),
        }
      })
      setTasksFromServer(mapped)
    } catch (error) {
      console.error("Tasks fetch error:", error)
      setTasksError("Unable to load tasks.")
    } finally {
      setIsLoadingTasks(false)
    }
  }, [])

  useEffect(() => {
    loadMachines()
  }, [loadMachines])

  useEffect(() => {
    // 首次加载时拉取一次任务列表，后续由创建/删除等操作主动刷新
    void loadTasks()
  }, [loadTasks])

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
        setListFiles(
          mapped.filter((file) => file.type === "urls"),
        )
        setProxyFiles(
          mapped.filter((file) => file.type === "proxies"),
        )
      } catch (error) {
        console.error("Failed to load files for task dialog:", error)
      }
    }

    fetchFiles()
  }, [])

  const handleCreateTask = async () => {
    try {
      if (!newTaskName.trim()) {
        toast({
          variant: "destructive",
          title: "Task name is required",
        })
        return
      }
      if (!newTaskThread || !newTaskTimeout || !newTaskStartFrom) {
        toast({
          variant: "destructive",
          title: "Thread, Worker and Timeout are required",
        })
        return
      }

      // 解析 timeout 字符串（如 "15s"）为数字（秒数）
      const timeoutStr = newTaskStartFrom.trim()
      const timeoutNum = parseInt(timeoutStr.replace(/[^\d]/g, ""), 10)
      if (!Number.isFinite(timeoutNum) || timeoutNum <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid timeout value",
          description: "Timeout must be a positive number.",
        })
        return
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newTaskName.trim(),
          listFile: newTaskListFile || null,
          proxyFile: newTaskProxyFile || null,
          machineId: newTaskMachine || null,
          thread: Number(newTaskThread),
          worker: Number(newTaskTimeout),
          timeout: timeoutNum,
          autoDumper: newTaskAutoDumper,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create task")
      }

      setIsNewTaskOpen(false)
      setNewTaskName("")
      setNewTaskListFile("")
      setNewTaskProxyFile("")
      setNewTaskMachine("")
      setNewTaskThread("")
      setNewTaskTimeout("")
      setNewTaskStartFrom("")
      setNewTaskAutoDumper(false)

      await loadTasks()

      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
      })
    } catch (error) {
      console.error("Create task (client) error:", error)
      toast({
        variant: "destructive",
        title: "Failed to create task",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6 max-h-screen overflow-y-auto no-scrollbar">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">View and manage your scheduled tasks.</p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <CardTitle className="text-base font-medium">Task list</CardTitle>
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
                <Button
                  className="gap-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  onClick={() => setIsNewTaskOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoadingTasks ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Loading tasks...
                </div>
              ) : tasksError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {tasksError}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                  <p>No tasks found</p>
                  <p className="mt-1 text-xs">Your tasks will appear here once they are created.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className="bg-card border-border group">
                      <CardHeader className="flex flex-row items-start justify-between pb-2 px-4 pt-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <CardTitle className="text-sm text-card-foreground truncate">
                              {task.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground truncate">
                              {getMachineLabel(task.machineId)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge className={cn("text-xs shrink-0 capitalize", statusColorMap[task.status])}>
                            {task.status === "running" ? "Running..." : task.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => {
                                  setRenameTaskId(task.id)
                                  setRenameValue(task.name)
                                }}
                              >
                                Rename task
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={() => {
                                  setDeleteTaskId(task.id)
                                  setDeleteTaskName(task.name)
                                }}
                              >
                                Delete task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="space-y-3 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              List
                            </span>
                            <span className="text-card-foreground">
                              {task.listFile || "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              Runtime
                            </span>
                            <span className="text-card-foreground">
                              {task.status === "pending" ? "0s" : task.timeout || "-"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5" />
                                Progress
                              </span>
                              <span className="text-card-foreground">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-1.5 rounded-full bg-primary transition-all",
                                  task.status === "failed" && "bg-red-500",
                                )}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 bg-white text-black hover:bg-white hover:text-black transition-all duration-200 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
                            onClick={() => router.push(`/tasks/${task.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 text-black" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create new task</DialogTitle>
                <DialogDescription>
                  Configure how this task should run across your machines.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-name">Task Name</Label>
                  <Input
                    id="task-name"
                    value={newTaskName}
                    onChange={(event) => setNewTaskName(event.target.value)}
                    placeholder="Enter task name"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-list-file">Lists</Label>
                    <Select
                      value={newTaskListFile}
                      onValueChange={setNewTaskListFile}
                    >
                      <SelectTrigger id="task-list-file" className="h-9">
                        <SelectValue placeholder="Select list file (urls)" />
                      </SelectTrigger>
                      <SelectContent>
                        {listFiles.length === 0 ? (
                          <SelectItem value="__empty_lists" disabled>
                            No list files
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

                  <div className="space-y-1.5">
                    <Label htmlFor="task-proxy-file">Proxies</Label>
                    <Select
                      value={newTaskProxyFile}
                      onValueChange={setNewTaskProxyFile}
                    >
                      <SelectTrigger id="task-proxy-file" className="h-9">
                        <SelectValue placeholder="Select proxy file (proxies)" />
                      </SelectTrigger>
                      <SelectContent>
                        {proxyFiles.length === 0 ? (
                          <SelectItem value="__empty_proxies" disabled>
                            No proxy files
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

                <div className="space-y-1.5">
                  <Label htmlFor="task-machine">Machine</Label>
                  <Select
                    value={newTaskMachine}
                    onValueChange={setNewTaskMachine}
                  >
                    <SelectTrigger id="task-machine" className="h-9">
                      <SelectValue placeholder="Select machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machineOptions.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.name || machine.ip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-thread">Thread</Label>
                    <Select
                      value={newTaskThread}
                      onValueChange={setNewTaskThread}
                    >
                      <SelectTrigger id="task-thread" className="h-9">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="task-timeout">Worker</Label>
                    <Select
                      value={newTaskTimeout}
                      onValueChange={setNewTaskTimeout}
                    >
                      <SelectTrigger id="task-timeout" className="h-9">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="task-start-from">Timeout</Label>
                    <Select
                      value={newTaskStartFrom}
                      onValueChange={setNewTaskStartFrom}
                    >
                      <SelectTrigger id="task-start-from" className="h-9">
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

                <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="task-auto-dumper">Auto dumper</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically dump with preset.
                    </p>
                  </div>
                  <Switch
                    id="task-auto-dumper"
                    checked={newTaskAutoDumper}
                    onCheckedChange={setNewTaskAutoDumper}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNewTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={!newTaskName.trim() || !newTaskThread || !newTaskTimeout || !newTaskStartFrom}
                >
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={renameTaskId !== null} onOpenChange={(open) => !open && setRenameTaskId(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Rename task</DialogTitle>
                <DialogDescription>
                  Update the task name. This does not change its configuration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="rename-task">Task name</Label>
                <Input
                  id="rename-task"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRenameTaskId(null)
                    setRenameValue("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!renameValue.trim()}
                  onClick={async () => {
                    if (!renameTaskId) return
                    try {
                      const res = await fetch("/api/tasks", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ id: renameTaskId, name: renameValue.trim() }),
                      })
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}))
                        throw new Error(data.error || "Failed to rename task")
                      }
                      const { task } = await res.json()
                      setTasksFromServer((prev) =>
                        prev.map((t) => (t.id === renameTaskId ? { ...t, name: task.name as string } : t)),
                      )
                      setRenameTaskId(null)
                      setRenameValue("")
                      toast({
                        title: "Task renamed",
                      })
                    } catch (error) {
                      console.error("Rename task (client) error:", error)
                      toast({
                        variant: "destructive",
                        title: "Failed to rename task",
                        description: error instanceof Error ? error.message : "Please try again.",
                      })
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteTaskId !== null} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete task</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Are you sure you want to delete this task?
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border px-3 py-2 text-sm bg-secondary/20">
                <p className="font-medium text-foreground truncate">{deleteTaskName}</p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTaskId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]"
                  onClick={async () => {
                    if (!deleteTaskId) return
                    try {
                      const res = await fetch("/api/tasks", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ id: deleteTaskId }),
                      })
                      if (!res.ok) {
                        const data = await res.json().catch(() => ({}))
                        throw new Error(data.error || "Failed to delete task")
                      }
                      setTasksFromServer((prev) => prev.filter((t) => t.id !== deleteTaskId))
                      setDeleteTaskId(null)
                      setDeleteTaskName("")
                      toast({
                        title: "Task deleted",
                      })
                    } catch (error) {
                      console.error("Delete task (client) error:", error)
                      toast({
                        variant: "destructive",
                        title: "Failed to delete task",
                        description: error instanceof Error ? error.message : "Please try again.",
                      })
                    }
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
