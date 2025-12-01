import { NextRequest, NextResponse } from "next/server"

import { supabaseService } from "@/lib/supabase"
import { verifyJwt } from "@/lib/auth"

type CreatePresetBody = {
  name: string
  settings: Array<{
    id: string
    format: string
    customFields?: string[]
  }>
}

type UpdatePresetBody = {
  id: string
  name?: string
  settings?: Array<{
    id: string
    format: string
    customFields?: string[]
  }>
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

    const body = (await request.json()) as CreatePresetBody

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: "Preset name is required" }, { status: 400 })
    }

    if (!Array.isArray(body.settings)) {
      return NextResponse.json({ error: "Settings must be an array" }, { status: 400 })
    }

    const { data, error } = await supabaseService
      .from("dumper_presets")
      .insert({
        user_id: userId,
        name,
        settings: body.settings,
      })
      .select("id, name, settings, created_at, updated_at")
      .single()

    if (error) {
      console.error("Create preset error:", error)
      return NextResponse.json({ error: "Failed to create preset" }, { status: 500 })
    }

    return NextResponse.json({ preset: data }, { status: 201 })
  } catch (error) {
    console.error("Create preset unexpected error:", error)
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
        .from("dumper_presets")
        .select("id, name, settings, created_at, updated_at")
        .eq("user_id", userId)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Fetch single preset error:", error)
        return NextResponse.json({ error: "Preset not found" }, { status: 404 })
      }

      return NextResponse.json({ preset: data }, { status: 200 })
    }

    const { data, error } = await supabaseService
      .from("dumper_presets")
      .select("id, name, settings, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch presets error:", error)
      return NextResponse.json({ error: "Failed to load presets" }, { status: 500 })
    }

    return NextResponse.json({ presets: data ?? [] }, { status: 200 })
  } catch (error) {
    console.error("Presets GET unexpected error:", error)
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

    const body = (await request.json()) as UpdatePresetBody

    const cleanId = body.id?.trim()
    if (!cleanId) {
      return NextResponse.json({ error: "Preset id is required" }, { status: 400 })
    }

    const updateData: Record<string, any> = {}

    if (body.name !== undefined) {
      const cleanName = body.name?.trim()
      if (!cleanName) {
        return NextResponse.json({ error: "Preset name cannot be empty" }, { status: 400 })
      }
      updateData.name = cleanName
    }

    if (body.settings !== undefined) {
      if (!Array.isArray(body.settings)) {
        return NextResponse.json({ error: "Settings must be an array" }, { status: 400 })
      }
      updateData.settings = body.settings
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabaseService
      .from("dumper_presets")
      .update(updateData)
      .eq("id", cleanId)
      .eq("user_id", userId)
      .select("id, name, settings, created_at, updated_at")
      .single()

    if (error) {
      console.error("Update preset error:", error)
      return NextResponse.json({ error: "Failed to update preset" }, { status: 500 })
    }

    return NextResponse.json({ preset: data }, { status: 200 })
  } catch (error) {
    console.error("Presets PATCH unexpected error:", error)
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
      return NextResponse.json({ error: "Preset id is required" }, { status: 400 })
    }

    const { error } = await supabaseService
      .from("dumper_presets")
      .delete()
      .eq("id", cleanId)
      .eq("user_id", userId)

    if (error) {
      console.error("Delete preset error:", error)
      return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Presets DELETE unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

