'use client'

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Server, Network, Activity, Cpu, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Machine {
  id: string
  user_id: string
  ip: string
  ram: string
  core: number
  status: string
  name: string | null
  last_heartbeat: string | null
  created_at: string
  updated_at: string
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/machines', {
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 401) {
            setError('Unauthorized. Please login again.')
          } else {
            setError('Failed to fetch machines')
          }
          return
        }

        const data = await response.json()
        setMachines(data.machines || [])
      } catch (err) {
        console.error('Error fetching machines:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMachines()
  }, [])

  // 生成友好的服务器名称（使用 ID 的前8位或自定义名称）
  const getServerName = (machine: Machine) => {
    return machine.name || `Server-${machine.id.substring(0, 8)}`
  }

  const handleDelete = async (machineId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch('/api/machines', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ machineId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete machine')
      }

      // 从本地状态中移除机器
      setMachines((prev) => prev.filter((m) => m.id !== machineId))

      setDeletingId(null)
      toast({
        title: "Success",
        description: "Machine deleted successfully",
      })
    } catch (err) {
      console.error('Error deleting machine:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to delete machine',
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Machines</h1>
          <p className="text-muted-foreground">Monitor and manage your connected machines</p>
        </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading machines...</div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && machines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No machines found</p>
              <p className="text-sm text-muted-foreground mt-2">Your machines will appear here once they are connected.</p>
            </div>
          )}

          {!isLoading && !error && machines.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => (
                <Card key={machine.id} className="bg-card border-border group">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Server className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <CardTitle className="text-sm text-card-foreground truncate">
                          {getServerName(machine)}
                        </CardTitle>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setDeletingId(machine.id)}
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                <Badge
                  className={
                        machine.status === "Active" 
                          ? "bg-green-500/20 text-green-400 text-xs shrink-0" 
                          : "bg-red-500/20 text-red-400 text-xs shrink-0"
                  }
                >
                  {machine.status}
                </Badge>
              </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                  <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Network className="h-3.5 w-3.5" />
                          IP
                    </div>
                        <span className="text-xs text-card-foreground font-mono">{machine.ip}</span>
                  </div>
                  <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Activity className="h-3.5 w-3.5" />
                      Memory
                    </div>
                        <span className="text-xs text-card-foreground">{machine.ram}</span>
                  </div>
                  <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Cpu className="h-3.5 w-3.5" />
                          Cores
                    </div>
                        <span className="text-xs text-card-foreground">{machine.core}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          )}
      </div>

      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete Machine</DialogTitle>
            <DialogDescription>
              {(() => {
                const machineToDelete = deletingId ? machines.find(m => m.id === deletingId) : null
                const machineName = machineToDelete ? getServerName(machineToDelete) : 'Unknown Machine'
                return `Are you sure you want to delete this machine? This action cannot be undone. Machine "${machineName}" will be permanently deleted.`
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </AuthGuard>
  )
}
