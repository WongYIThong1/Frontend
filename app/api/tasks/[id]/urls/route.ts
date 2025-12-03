import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Next.js 16 中 params 可能是 Promise
    const resolvedParams = await Promise.resolve(params)
    const taskId = resolvedParams.id

    // 验证任务属于当前用户，并获取总域名数
    const { data: task, error: taskError } = await supabaseService
      .from("tasks")
      .select("id, user_id, total_url_lines, current_lines")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 })
    }

    // 获取该任务的所有 task_url 记录
    const { data: taskUrls, error: urlsError } = await supabaseService
      .from("task_url")
      .select("id, domains, waf, links, database, rows, status, progress")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })

    if (urlsError) {
      console.error("Fetch task URLs error:", urlsError)
      return NextResponse.json({ error: "Failed to load task URLs" }, { status: 500 })
    }

    // 确保 rows 和 links 字段正确转换为数字（bigint/integer 可能返回为字符串）
    const normalizedUrls = (taskUrls || []).map((url: any) => ({
      ...url,
      rows: url.rows !== null && url.rows !== undefined ? Number(url.rows) : null,
      links: url.links !== null && url.links !== undefined ? Number(url.links) : null,
    }))

    // 计算进度：根据已完成域名数 / 总域名数
    // 必须使用 tasks 表中的 total_url_lines 和 current_lines
    let progress = 0
    let totalDomains = 0
    let completedDomains = 0
    
    // 总域名数：优先使用 tasks.total_url_lines，如果为 0 或 null，则回退到 task_url 表的记录数
    totalDomains = task?.total_url_lines && task.total_url_lines > 0 
      ? task.total_url_lines 
      : ((taskUrls || []).length)
    
    // 已完成域名数：优先使用 tasks.current_lines，如果为 0 或 null，则从 task_url 表统计
    if (task?.current_lines !== null && task?.current_lines !== undefined && task.current_lines >= 0) {
      completedDomains = task.current_lines
    } else {
      // 回退：统计所有已完成状态的域名（不区分大小写）
      completedDomains = normalizedUrls.filter((url: { status?: string | null }) => {
        const status = (url.status || "").toLowerCase()
        return status === "completed"
      }).length
    }
    
    if (totalDomains > 0) {
      progress = Math.round((completedDomains / totalDomains) * 100)
    }
    
    // 如果 task_url 表中没有数据，尝试从任务的 progress 字段获取进度
    // 但优先使用 task_url 计算的结果

    // 计算总行数和已完成行数（使用标准化后的数据）
    const totalRows = normalizedUrls.reduce((sum: number, url: { rows?: number | null }) => {
      return sum + (url.rows !== null && url.rows !== undefined ? Number(url.rows) : 0)
    }, 0)
    
    const completedRows = normalizedUrls.reduce((sum: number, url: { status?: string | null; rows?: number | null }) => {
      const status = (url.status || "").toLowerCase()
      if (status === "completed" && url.rows !== null && url.rows !== undefined) {
        return sum + Number(url.rows)
      }
      return sum
    }, 0)

    return NextResponse.json({ 
      urls: normalizedUrls,
      progress: Math.min(100, Math.max(0, progress)),
      totalDomains,
      completedDomains,
      totalRows,
      completedRows
    }, { status: 200 })
  } catch (error) {
    console.error("Task URLs GET unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

