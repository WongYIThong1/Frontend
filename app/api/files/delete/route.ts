import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"
import {
  USER_FILES_BUCKET_NAME,
  getUserObjectPath,
  getUserPrefix,
  getStorageClient,
  sanitizeFileName,
} from "@/lib/storage"

export async function DELETE(request: NextRequest) {
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
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const sanitizedName = sanitizeFileName(name)
    const storage = getStorageClient()
    const userPrefix = getUserPrefix(userId)

    const { data: listed, error: listError } = await storage.from(USER_FILES_BUCKET_NAME).list(userPrefix, {
      search: sanitizedName,
      limit: 1,
    })

    if (listError) {
      console.error("Storage list error (delete):", listError)
      return NextResponse.json({ error: "Failed to locate file in storage" }, { status: 500 })
    }

    const target = listed?.find((item: any) => item.name === sanitizedName)
    if (!target) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileSize = typeof target.metadata?.size === "number" ? target.metadata.size : 0
    const storagePath = getUserObjectPath(userId, sanitizedName)

    const { error: removeError } = await storage.from(USER_FILES_BUCKET_NAME).remove([storagePath])
    if (removeError) {
      console.error("Storage remove error:", removeError)
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
    }

    const {
      data: user,
      error: userError,
    } = await supabaseService
      .from("users")
      .select("storage_used_bytes")
      .eq("id", userId)
      .single()

    if (!userError && user) {
      const currentUsed = user.storage_used_bytes ?? 0
      const nextUsed = Math.max(0, currentUsed - fileSize)
      const { error: updateError } = await supabaseService
        .from("users")
        .update({ storage_used_bytes: nextUsed } as never)
        .eq("id", userId)

      if (updateError) {
        console.error("Failed to update storage_used_bytes after delete:", updateError)
      }
    }

    return NextResponse.json({ message: "File deleted" }, { status: 200 })
  } catch (error) {
    console.error("File delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


