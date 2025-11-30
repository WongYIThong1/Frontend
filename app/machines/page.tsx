'use client'

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Server, Network, Activity, Cpu, Edit2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
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

  const handleStartEdit = (machine: Machine) => {
    setEditingId(machine.id)
    setEditName(getServerName(machine))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveName = async (machineId: string) => {
    if (!editName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/machines', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ machineId, name: editName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update name')
      }

      // 更新本地状态
      setMachines((prev) =>
        prev.map((m) => (m.id === machineId ? { ...m, name: editName.trim() } : m))
      )

      setEditingId(null)
      setEditName('')
      toast({
        title: "Success",
        description: "Machine name updated successfully",
      })
    } catch (err) {
      console.error('Error updating machine name:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update machine name',
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
                      {editingId === machine.id ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-sm px-2"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName(machine.id)
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleSaveName(machine.id)}
                            disabled={isSaving}
                            className="h-7 w-7 shrink-0"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="h-7 w-7 shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                  </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <CardTitle className="text-sm text-card-foreground truncate">
                            {getServerName(machine)}
                          </CardTitle>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(machine)}
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                  </div>
                      )}
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
    </DashboardLayout>
    </AuthGuard>
  )
}
