import { NextRequest, NextResponse } from "next/server"

import { verifyJwt } from "@/lib/auth"
import {
  USER_FILES_BUCKET_NAME,
  getStorageClient,
  getUserObjectPath,
  sanitizeFileName,
} from "@/lib/storage"

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
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")

    if (!name) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    const sanitizedName = sanitizeFileName(name)
    const storage = getStorageClient()
    const path = getUserObjectPath(userId, sanitizedName)

    const { data, error } = await storage.from(USER_FILES_BUCKET_NAME).createSignedUrl(path, 60, {
      download: false,
    })

    if (error || !data) {
      console.error("Storage signed URL error:", error)
      return NextResponse.json({ error: "Failed to generate review link" }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl }, { status: 200 })
  } catch (error) {
    console.error("File review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


