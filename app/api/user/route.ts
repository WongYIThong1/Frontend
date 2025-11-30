import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyJwt } from '@/lib/auth'

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

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Failed to fetch user information' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 计算剩余天数
    let daysRemaining = 0
    if (user.expires_at) {
      const expiresAt = new Date(user.expires_at)
      const now = new Date()
      const diffTime = expiresAt.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        apikey: user.apikey || '',
        discordId: user.discord_id || '',
        expiresAt: user.expires_at,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        plan: user.plan,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('User API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

