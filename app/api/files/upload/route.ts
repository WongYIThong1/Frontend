import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"
import { USER_FILES_BUCKET_NAME, getUserObjectPath, getStorageClient } from "@/lib/storage"

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB 单文件保护，避免极端情况

export async function POST(request: NextRequest) {
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

    const form = await request.formData()
    const file = form.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const fileSize = file.size
    if (fileSize <= 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    const isTxt =
      file.type === "text/plain" ||
      /\.txt$/i.test(file.name ?? "")

    if (!isTxt) {
      return NextResponse.json(
        { error: "Only .txt files are allowed" },
        { status: 400 },
      )
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Single file cannot exceed ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB` },
        { status: 400 },
      )
    }

    const {
      data: user,
      error: userError,
    } = await supabaseService
      .from("users")
      .select("storage_limit_bytes, storage_used_bytes")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("User fetch error (upload):", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const usedBytes = user.storage_used_bytes ?? 0
    const limitBytes = user.storage_limit_bytes ?? 500 * 1024 * 1024

    if (usedBytes + fileSize > limitBytes) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          details: "Uploading this file would exceed your 500MB storage allocation.",
        },
        { status: 403 },
      )
    }

    const storage = getStorageClient()
    const filePath = getUserObjectPath(userId, file.name)
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await storage.from(USER_FILES_BUCKET_NAME).upload(filePath, fileBuffer, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    const { error: updateError } = await supabaseService
      .from("users")
      .update({ storage_used_bytes: usedBytes + fileSize } as never)
      .eq("id", userId)

    if (updateError) {
      console.error("Failed to update storage_used_bytes:", updateError)
      // 不回滚上传，但提示前端稍后刷新用量
    }

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        size: fileSize,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


