import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyJwt } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 从 cookie 中获取 session token
    const token = request.cookies.get('session_token')?.value
    const sessionSecret = process.env.SESSION_SECRET

    if (!token || !sessionSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 验证 JWT token 并提取用户 ID
    const decoded = verifyJwt(token, sessionSecret)
    if (!decoded || !decoded.sub) {
      return NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
    }

    const userId = decoded.sub as string
    const { discordId } = await request.json()

    if (!discordId || !discordId.trim()) {
      return NextResponse.json({ error: 'Discord ID is required' }, { status: 400 })
    }

    // 验证 Discord ID 格式（通常是数字字符串，长度在 17-19 之间）
    const cleanDiscordId = discordId.trim()
    if (!/^\d{17,19}$/.test(cleanDiscordId)) {
      return NextResponse.json({ error: 'Invalid Discord ID format' }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    // 更新 Discord ID
    const updateResult = await (supabaseService
      .from('users')
      .update({ discord_id: cleanDiscordId } as never)
      .eq('id', userId) as unknown as Promise<{ error: Error | null }>)

    if (updateResult.error) {
      console.error('Failed to update Discord ID:', updateResult.error)
      return NextResponse.json({ error: 'Failed to bind Discord ID' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Discord ID bound successfully',
      discordId: cleanDiscordId,
    }, { status: 200 })
  } catch (error) {
    console.error('Bind Discord error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

