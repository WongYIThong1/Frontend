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
          "id, name, list_file, proxy_file, machine_id, thread, worker, timeout, auto_dumper, status, created_at, updated_at, progress",
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
        "id, name, list_file, proxy_file, machine_id, thread, worker, timeout, auto_dumper, status, created_at, updated_at, progress",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch tasks error:", error)
      return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 })
    }

    return NextResponse.json({ tasks: data ?? [] }, { status: 200 })
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

    const { id, name } = (await request.json()) as { id?: string; name?: string }

    const cleanId = id?.trim()
    const cleanName = name?.trim()

    if (!cleanId || !cleanName) {
      return NextResponse.json({ error: "Task id and new name are required" }, { status: 400 })
    }

    const { data, error } = await supabaseService
      .from("tasks")
      .update({ name: cleanName })
      .eq("id", cleanId)
      .eq("user_id", userId)
      .select("id, name, status, created_at, updated_at")
      .single()

    if (error) {
      console.error("Rename task error:", error)
      return NextResponse.json({ error: "Failed to rename task" }, { status: 500 })
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

