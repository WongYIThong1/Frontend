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

    const body = await request.json()
    const { taskId, domain, database, table, columns, results } = body

    if (!taskId || !domain || !database || !table || !columns || !results) {
      return NextResponse.json(
        { error: "Missing required fields: taskId, domain, database, table, columns, results" },
        { status: 400 },
      )
    }

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "Results must be a non-empty array" }, { status: 400 })
    }

    // Verify task belongs to user
    const { data: task, error: taskError } = await supabaseService
      .from("tasks")
      .select("id, user_id")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 })
    }

    // Save dump results to database
    // TODO: Create a dump_results table if it doesn't exist
    // For now, we'll store it as JSON in a text field or create a new table
    const { data: dumpResult, error: insertError } = await supabaseService
      .from("dump_results")
      .insert({
        task_id: taskId,
        user_id: userId,
        domain,
        database_name: database,
        table_name: table,
        columns: columns,
        results: results,
        row_count: results.length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      // If table doesn't exist, we'll need to create it
      // For now, return a success response but log the error
      console.error("Failed to save dump results:", insertError)
      
      // Try to create the table structure (this would typically be done via migration)
      // For now, we'll just return success and note that the table needs to be created
      return NextResponse.json(
        {
          error: "Failed to save results. Please ensure the dump_results table exists.",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        id: dumpResult.id,
        rowCount: results.length,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error("Save dump results error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    )
  }
}

