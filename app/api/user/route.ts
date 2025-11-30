import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyJwt } from '@/lib/auth'

type User = {
  id: string
  username: string
  apikey: string | null
  discord_id: string | null
  expires_at: string | null
  plan: number
}

export async function GET(request: NextRequest) {
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

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    // 查询用户信息
    const { data: user, error } = await supabaseService
      .from('users')
      .select('id, username, apikey, discord_id, expires_at, plan')
      .eq('id', userId)
      .single()

    if (error || !user) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const typedUser = user as User

    // 计算剩余天数
    let daysRemaining = 0
    if (typedUser.expires_at) {
      const expiresAt = new Date(typedUser.expires_at)
      const now = new Date()
      const diffTime = expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      user: {
        id: typedUser.id,
        username: typedUser.username,
        apikey: typedUser.apikey || '',
        discordId: typedUser.discord_id || '',
        expiresAt: typedUser.expires_at,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        plan: typedUser.plan,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('User API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

