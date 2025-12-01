import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"
import {
  USER_FILES_BUCKET_NAME,
  getStorageClient,
  getUserObjectPath,
  sanitizeFileName,
} from "@/lib/storage"

export async function PATCH(request: NextRequest) {
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
    const { oldName, newName } = await request.json()

    if (!oldName || !newName) {
      return NextResponse.json({ error: "Both oldName and newName are required" }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const sanitizedOld = sanitizeFileName(oldName)
    const sanitizedNew = sanitizeFileName(newName)

    const storage = getStorageClient()
    const fromPath = getUserObjectPath(userId, sanitizedOld)
    const toPath = getUserObjectPath(userId, sanitizedNew)

    const { error: moveError } = await storage.from(USER_FILES_BUCKET_NAME).move(fromPath, toPath)
    if (moveError) {
      console.error("Storage rename error:", moveError)
      return NextResponse.json({ error: "Failed to rename file" }, { status: 500 })
    }

    // 同步更新 file_types 中的 name，保持 type 不变
    const { error: typeUpdateError } = await supabaseService
      .from("file_types")
      .update({ name: sanitizedNew } as never)
      .eq("user_id", userId)
      .eq("name", sanitizedOld)

    if (typeUpdateError) {
      console.error("file_types rename error:", typeUpdateError)
      // 不阻塞主流程
    }

    return NextResponse.json({ message: "File renamed" }, { status: 200 })
  } catch (error) {
    console.error("File rename error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


