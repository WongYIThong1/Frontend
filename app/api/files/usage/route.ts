import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"
import { USER_FILES_BUCKET_NAME, getUserPrefix, getStorageClient } from "@/lib/storage"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session_token")?.value
    const sessionSecret = process.env.SESSION_SECRET

    if (!token || !sessionSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyJwt(token, sessionSecret)
    if (!decoded || !decoded.sub) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 })
    }

    const userId = decoded.sub as string

    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const { data: user, error: userError } = await supabaseService
      .from("users")
      .select("storage_limit_bytes, storage_used_bytes")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("User fetch error (usage):", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let files: { name: string; size: number; createdAt: string; type?: string | null }[] = []

    try {
      const storage = getStorageClient()
      const prefix = getUserPrefix(userId)
      const { data: objects, error: listError } = await storage
        .from(USER_FILES_BUCKET_NAME)
        .list(prefix, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        })

      if (listError) {
        console.error("Storage list error:", listError)
      } else if (objects) {
        const rawFiles = objects.filter((obj: any) => !obj.name.endsWith("/.keep"))

        const names = rawFiles.map((obj: any) => obj.name)
        let typeMap: Record<string, string> = {}
        try {
          const { data: typeRows, error: typeError } = await supabaseService
            .from("file_types")
            .select("name, type")
            .eq("user_id", userId)
            .in("name", names)

          if (typeError) {
            console.error("file_types query error:", typeError)
          } else if (typeRows) {
            typeMap = Object.fromEntries(typeRows.map((row: any) => [row.name, row.type]))
          }
        } catch (typeQueryError) {
          console.error("file_types unexpected error:", typeQueryError)
        }

        files = rawFiles.map((obj: any) => ({
          name: obj.name,
          size: typeof obj.metadata?.size === "number" ? obj.metadata.size : 0,
          createdAt: obj.created_at ?? "",
          type: typeMap[obj.name] ?? null,
        }))
      }
    } catch (error) {
      console.error("Storage list unexpected error:", error)
    }

    return NextResponse.json(
      {
        usage: {
          usedBytes: user.storage_used_bytes ?? 0,
          limitBytes: user.storage_limit_bytes ?? 500 * 1024 * 1024,
        },
        files,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Files usage error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


