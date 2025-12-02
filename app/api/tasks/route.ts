import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"

type CreateTaskBody = {
  name?: string
  listFile?: string | null
  proxyFile?: string | null
  machineId?: string | null
  thread?: string | number
  worker?: string | number
  timeout?: string | number
  autoDumper?: boolean
  aiMode?: boolean
}

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("session_token")?.value
  const sessionSecret = process.env.SESSION_SECRET

  if (!token || !sessionSecret) {
    return null
  }

  const decoded = verifyJwt(token, sessionSecret)
  if (!decoded || !decoded.sub) {
    return null
  }

  return decoded.sub as string
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as CreateTaskBody

    const name = body.name?.trim()
    const listFile = body.listFile ?? null
    const proxyFile = body.proxyFile ?? null
    const machineId = body.machineId ?? null
    const autoDumper = Boolean(body.autoDumper)
    const aiMode = Boolean(body.aiMode)

    const threadNum = typeof body.thread === "number" ? body.thread : parseInt(String(body.thread ?? ""), 10)
    const workerNum = typeof body.worker === "number" ? body.worker : parseInt(String(body.worker ?? ""), 10)
    const timeoutNum = typeof body.timeout === "number" ? body.timeout : parseInt(String(body.timeout ?? ""), 10)

    if (!name) {
      return NextResponse.json({ error: "Task name is required" }, { status: 400 })
    }
    if (!Number.isFinite(threadNum) || threadNum <= 0) {
      return NextResponse.json({ error: "Thread must be a positive number" }, { status: 400 })
    }
    if (!Number.isFinite(workerNum) || workerNum <= 0) {
      return NextResponse.json({ error: "Worker must be a positive number" }, { status: 400 })
    }
    if (!Number.isFinite(timeoutNum) || timeoutNum <= 0) {
      return NextResponse.json({ error: "Timeout must be a positive number" }, { status: 400 })
    }

    // 将 timeout 转换为字符串格式（如 "15s"）以保持与数据库格式一致
    const timeout = `${timeoutNum}s`

    const { data, error } = await supabaseService
      .from("tasks")
      .insert({
        user_id: userId,
        name,
        list_file: listFile,
        proxy_file: proxyFile,
        machine_id: machineId,
        thread: threadNum,
        worker: workerNum,
        timeout,
        auto_dumper: autoDumper,
        ai_mode: aiMode,
        status: "pending",
      })
      .select("id, name, status, created_at, updated_at")
      .single()

    if (error) {
      console.error("Create task error:", error)
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
    }

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error) {
    console.error("Create task unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (id) {
      const { data, error } = await supabaseService
        .from("tasks")
        .select(
          "id, name, list_file, proxy_file, machine_id, thread, worker, timeout, auto_dumper, ai_mode, dumper_preset_id, dumper_preset_type, dumper_settings, dumper_thread, dumper_worker, dumper_timeout, dumper_min_rows, status, created_at, updated_at, progress",
        )
        .eq("user_id", userId)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Fetch single task error:", error)
        return NextResponse.json({ error: "Task not found" }, { status: 404 })
      }

      return NextResponse.json({ task: data }, { status: 200 })
    }

    const { data, error } = await supabaseService
      .from("tasks")
      .select(
          "id, name, list_file, proxy_file, machine_id, thread, worker, timeout, auto_dumper, ai_mode, dumper_preset_id, dumper_preset_type, dumper_settings, dumper_thread, dumper_worker, dumper_timeout, dumper_min_rows, status, created_at, updated_at, progress, total_url_lines, current_lines",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch tasks error:", error)
      return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 })
    }

    // 计算每个任务的进度（基于 total_url_lines 和 current_lines）
    const tasksWithProgress = (data ?? []).map((task: any) => {
      let calculatedProgress = task.progress || 0
      
      // 如果 total_url_lines 和 current_lines 存在，使用它们计算进度
      if (task.total_url_lines && task.total_url_lines > 0) {
        const completed = task.current_lines || 0
        calculatedProgress = Math.min(100, Math.max(0, Math.round((completed / task.total_url_lines) * 100)))
      }
      
      return {
        ...task,
        progress: calculatedProgress,
      }
    })

    return NextResponse.json({ tasks: tasksWithProgress }, { status: 200 })
  } catch (error) {
    console.error("Tasks GET unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      id?: string
      name?: string
      listFile?: string | null
      proxyFile?: string | null
      machineId?: string | null
      thread?: string | number
      worker?: string | number
      timeout?: string | number
      autoDumper?: boolean
      dumperPresetId?: string | null
      dumperPresetType?: string | null
      dumperSettings?: any
      status?: string
      dumperThread?: string | number
      dumperWorker?: string | number
      dumperTimeout?: string | number
      dumperMinRows?: string | number
      aiMode?: boolean
    }

    const cleanId = body.id?.trim()
    if (!cleanId) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 })
    }

    // 构建更新对象
    const updateData: Record<string, any> = {}

    if (body.name !== undefined) {
      const cleanName = body.name?.trim()
      if (!cleanName) {
        return NextResponse.json({ error: "Task name cannot be empty" }, { status: 400 })
      }
      updateData.name = cleanName
    }

    if (body.listFile !== undefined) {
      updateData.list_file = body.listFile || null
    }

    if (body.proxyFile !== undefined) {
      updateData.proxy_file = body.proxyFile || null
    }

    if (body.machineId !== undefined) {
      updateData.machine_id = body.machineId || null
    }

    if (body.thread !== undefined) {
      const threadNum = typeof body.thread === "number" ? body.thread : parseInt(String(body.thread ?? ""), 10)
      if (!Number.isFinite(threadNum) || threadNum <= 0) {
        return NextResponse.json({ error: "Thread must be a positive number" }, { status: 400 })
      }
      updateData.thread = threadNum
    }

    if (body.worker !== undefined) {
      const workerNum = typeof body.worker === "number" ? body.worker : parseInt(String(body.worker ?? ""), 10)
      if (!Number.isFinite(workerNum) || workerNum <= 0) {
        return NextResponse.json({ error: "Worker must be a positive number" }, { status: 400 })
      }
      updateData.worker = workerNum
    }

    if (body.timeout !== undefined) {
      const timeoutNum = typeof body.timeout === "number" ? body.timeout : parseInt(String(body.timeout ?? ""), 10)
      if (!Number.isFinite(timeoutNum) || timeoutNum <= 0) {
        return NextResponse.json({ error: "Timeout must be a positive number" }, { status: 400 })
      }
      // 将 timeout 转换为字符串格式（如 "15s"）以保持与数据库格式一致
      updateData.timeout = `${timeoutNum}s`
    }

    if (body.autoDumper !== undefined) {
      updateData.auto_dumper = Boolean(body.autoDumper)
    }

    if (body.aiMode !== undefined) {
      updateData.ai_mode = Boolean(body.aiMode)
    }

    if (body.dumperPresetId !== undefined) {
      updateData.dumper_preset_id = body.dumperPresetId || null
    }

    if (body.dumperPresetType !== undefined) {
      if (body.dumperPresetType && !['email_password', 'user_password', 'cc_cvv_date', 'custom'].includes(body.dumperPresetType)) {
        return NextResponse.json({ error: "Invalid dumper preset type" }, { status: 400 })
      }
      updateData.dumper_preset_type = body.dumperPresetType || null
    }

    if (body.dumperSettings !== undefined) {
      updateData.dumper_settings = body.dumperSettings || null
    }

    if (body.status !== undefined) {
      const validStatuses = ["pending", "running", "paused", "completed", "failed"]
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
      }
      
      // 如果要将任务状态设置为 "running"，需要先检查机器是否在线
      if (body.status === "running") {
        // 获取任务的 machine_id
        const { data: taskData, error: taskError } = await supabaseService
          .from("tasks")
          .select("machine_id")
          .eq("id", cleanId)
          .eq("user_id", userId)
          .single()

        if (taskError || !taskData) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 })
        }

        const machineId = taskData.machine_id

        // 如果任务有关联的机器，检查机器状态
        if (machineId) {
          const { data: machineData, error: machineError } = await supabaseService
            .from("machines")
            .select("status, last_heartbeat")
            .eq("id", machineId)
            .eq("user_id", userId)
            .single()

          if (machineError || !machineData) {
            return NextResponse.json({ error: "Machine not found or access denied" }, { status: 404 })
          }

          // 检查机器是否在线
          // 方法1: 检查 status 字段
          const statusLower = (machineData.status || "").toLowerCase()
          const isStatusOffline = statusLower === "offline"
          const isStatusActive = statusLower === "active" || statusLower === "online"
          
          // 方法2: 检查 last_heartbeat（如果超过5分钟没有心跳，认为离线）
          // 注意：如果 last_heartbeat 为 null，且 status 是 Active/Online，则允许（可能是新机器）
          const lastHeartbeat = machineData.last_heartbeat ? new Date(machineData.last_heartbeat) : null
          let isHeartbeatStale = false
          
          if (lastHeartbeat) {
            const now = new Date()
            const heartbeatAge = (now.getTime() - lastHeartbeat.getTime()) / 1000 / 60 // 分钟
            isHeartbeatStale = heartbeatAge > 5 // 5分钟
          } else if (!isStatusActive) {
            // 如果没有心跳且状态不是 Active/Online，认为离线
            isHeartbeatStale = true
          }
          // 如果 last_heartbeat 为 null 但 status 是 Active/Online，允许（可能是新机器还没有心跳）

          // 如果状态是离线，或者心跳过期（即使状态是 Active），都认为离线
          if (isStatusOffline || isHeartbeatStale) {
            let errorMessage = "Machine is offline. Please ensure the machine is online before starting the task."
            if (isStatusOffline) {
              errorMessage += ` Status: ${machineData.status}`
            }
            if (isHeartbeatStale) {
              if (lastHeartbeat) {
                const now = new Date()
                const heartbeatAge = (now.getTime() - lastHeartbeat.getTime()) / 1000 / 60
                errorMessage += ` Last heartbeat was ${Math.round(heartbeatAge)} minutes ago (threshold: 5 minutes).`
              } else {
                errorMessage += ` No heartbeat recorded.`
              }
            }
            return NextResponse.json(
              { error: errorMessage },
              { status: 400 }
            )
          }
        }
      }
      
      updateData.status = body.status
    }

    // Dumper performance settings
    if (body.dumperThread !== undefined) {
      const dumperThreadNum =
        typeof body.dumperThread === "number"
          ? body.dumperThread
          : parseInt(String(body.dumperThread ?? ""), 10)
      if (!Number.isFinite(dumperThreadNum) || dumperThreadNum <= 0) {
        return NextResponse.json({ error: "Dumper thread must be a positive number" }, { status: 400 })
      }
      updateData.dumper_thread = dumperThreadNum
    }

    if (body.dumperWorker !== undefined) {
      const dumperWorkerNum =
        typeof body.dumperWorker === "number"
          ? body.dumperWorker
          : parseInt(String(body.dumperWorker ?? ""), 10)
      if (!Number.isFinite(dumperWorkerNum) || dumperWorkerNum <= 0) {
        return NextResponse.json({ error: "Dumper worker must be a positive number" }, { status: 400 })
      }
      updateData.dumper_worker = dumperWorkerNum
    }

    if (body.dumperTimeout !== undefined) {
      const dumperTimeoutNum =
        typeof body.dumperTimeout === "number"
          ? body.dumperTimeout
          : parseInt(String(body.dumperTimeout ?? ""), 10)
      if (!Number.isFinite(dumperTimeoutNum) || dumperTimeoutNum <= 0) {
        return NextResponse.json({ error: "Dumper timeout must be a positive number" }, { status: 400 })
      }
      updateData.dumper_timeout = `${dumperTimeoutNum}s`
    }

    if (body.dumperMinRows !== undefined) {
      const dumperMinRowsNum =
        typeof body.dumperMinRows === "number"
          ? body.dumperMinRows
          : parseInt(String(body.dumperMinRows ?? ""), 10)
      if (!Number.isFinite(dumperMinRowsNum) || dumperMinRowsNum <= 0) {
        return NextResponse.json({ error: "Dumper min rows must be a positive number" }, { status: 400 })
      }
      updateData.dumper_min_rows = dumperMinRowsNum
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabaseService
      .from("tasks")
      .update(updateData)
      .eq("id", cleanId)
      .eq("user_id", userId)
      .select(
        "id, name, list_file, proxy_file, machine_id, thread, worker, timeout, auto_dumper, ai_mode, dumper_preset_id, dumper_preset_type, dumper_settings, dumper_thread, dumper_worker, dumper_timeout, dumper_min_rows, status, created_at, updated_at, progress",
      )
      .single()

    if (error) {
      console.error("Update task error:", error)
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
    }

    return NextResponse.json({ task: data }, { status: 200 })
  } catch (error) {
    console.error("Tasks PATCH unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = (await request.json()) as { id?: string }
    const cleanId = id?.trim()

    if (!cleanId) {
      return NextResponse.json({ error: "Task id is required" }, { status: 400 })
    }

    const { error } = await supabaseService
      .from("tasks")
      .delete()
      .eq("id", cleanId)
      .eq("user_id", userId)

    if (error) {
      console.error("Delete task error:", error)
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Tasks DELETE unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

