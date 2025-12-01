import { NextRequest, NextResponse } from "next/server"
import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"

const EXPIRY_THRESHOLD_DAYS = 3
const MS_PER_DAY = 1000 * 60 * 60 * 24

type UserRecord = {
  status: string
  expires_at: string | null
}

async function ensurePlanNotifications(userId: string) {
  if (!supabaseService) {
    return
  }

  const { data: user, error: userError } = await supabaseService
    .from("users")
    .select("status, expires_at")
    .eq("id", userId)
    .single()

  if (userError || !user) {
    console.error("Failed to fetch user for notifications", userError)
    return
  }

  await Promise.all([
    maybeInsertActiveNotification(userId, user as UserRecord),
    maybeInsertExpiryNotification(userId, user as UserRecord),
  ])
}

async function maybeInsertActiveNotification(userId: string, user: UserRecord) {
  if (!supabaseService || user.status !== "Active") return

  const { data } = await supabaseService
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "plan_active")
    .limit(1)

  if (data && data.length > 0) return

  await supabaseService.from("notifications").insert({
    user_id: userId,
    title: "Plan Activated",
    message: "Your subscription is now active. Enjoy full access to all features.",
    type: "plan_active",
  })
}

async function maybeInsertExpiryNotification(userId: string, user: UserRecord) {
  if (!supabaseService || !user.expires_at) return

  const expiresAt = new Date(user.expires_at)
  const diffMs = expiresAt.getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / MS_PER_DAY)

  if (diffDays > EXPIRY_THRESHOLD_DAYS) return

  const notificationType = diffDays < 0 ? "plan_expired" : "plan_expiring"

  const { data } = await supabaseService
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", notificationType)
    .limit(1)

  if (data && data.length > 0) return

  const message =
    diffDays < 0
      ? `Your plan expired on ${expiresAt.toLocaleDateString()}.`
      : `Your plan will expire in ${diffDays} day${diffDays === 1 ? "" : "s"}. Renew soon to avoid interruptions.`

  await supabaseService.from("notifications").insert({
    user_id: userId,
    title: diffDays < 0 ? "Plan Expired" : "Plan Expiring Soon",
    message,
    type: notificationType,
  })
}

async function getSessionUserId(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    await ensurePlanNotifications(userId)

    const { data, error } = await supabaseService
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch notifications:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({ notifications: data ?? [] }, { status: 200 })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      )
    }

    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Notification IDs are required" }, { status: 400 })
    }

    const { error } = await supabaseService
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .in("id", ids)

    if (error) {
      console.error("Failed to mark notifications as read:", error)
      return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Notifications PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

