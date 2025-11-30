import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyJwt } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    // 获取用户当前密码哈希
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Password change not available for this account' }, { status: 400 })
    }

    // 验证当前密码
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    // 哈希新密码
    const saltRounds = 10
    const newPasswordHash = bcrypt.hashSync(newPassword, saltRounds)

    // 更新密码
    const updateResult = await (supabaseService
      .from('users')
      .update({ password_hash: newPasswordHash } as never)
      .eq('id', userId) as unknown as Promise<{ error: Error | null }>)

    if (updateResult.error) {
      console.error('Failed to update password:', updateResult.error)
      return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password changed successfully' }, { status: 200 })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

