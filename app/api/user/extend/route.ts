import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyJwt } from '@/lib/auth'

type License = {
  id: string
  day: number
  status: string
  license_key: string
}

type User = {
  expires_at: string | null
}

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
    const { licenseKey } = await request.json()

    if (!licenseKey || !licenseKey.trim()) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    // 验证 License Key
    const { data: license, error: licenseError } = await supabaseService
      .from('licenses')
      .select('id, day, status, license_key')
      .eq('license_key', licenseKey.trim())
      .maybeSingle()

    if (licenseError || !license) {
      console.error('License check error:', licenseError)
      return NextResponse.json({ error: 'Invalid license key' }, { status: 400 })
    }

    const typedLicense = license as License

    if (typedLicense.status !== 'Inactive') {
      return NextResponse.json(
        { error: 'License key has already been used or is expired' },
        { status: 400 }
      )
    }

    // 获取当前用户信息
    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('expires_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const typedUser = user as User

    // 计算新的过期时间
    let newExpiresAt: Date
    if (typedUser.expires_at) {
      const currentExpiresAt = new Date(typedUser.expires_at)
      const now = new Date()
      
      // 如果当前已过期，从今天开始计算
      if (currentExpiresAt < now) {
        newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + typedLicense.day)
      } else {
        // 如果未过期，在现有基础上增加天数
        newExpiresAt = new Date(currentExpiresAt)
        newExpiresAt.setDate(newExpiresAt.getDate() + typedLicense.day)
      }
    } else {
      // 如果没有过期时间，从今天开始计算
      newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + typedLicense.day)
    }

    // 更新用户过期时间
    const { error: updateUserError } = await supabaseService
      .from('users')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', userId)

    if (updateUserError) {
      console.error('Failed to update user expires_at:', updateUserError)
      return NextResponse.json({ error: 'Failed to extend account' }, { status: 500 })
    }

    // 更新 license 状态
    const updateLicenseResult = await (supabaseService
      .from('licenses')
      .update({
        status: 'Active',
        user_id: userId,
        activated_at: new Date().toISOString(),
      } as never)
      .eq('id', typedLicense.id) as unknown as Promise<{ error: Error | null }>)

    if (updateLicenseResult.error) {
      console.error('Failed to update license:', updateLicenseResult.error)
      // 回滚用户更新
      await (supabaseService
        .from('users')
        .update({ expires_at: typedUser.expires_at } as never)
        .eq('id', userId) as unknown as Promise<{ error: Error | null }>)
      return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 })
    }

    // 计算新的剩余天数
    const diffTime = newExpiresAt.getTime() - new Date().getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      message: 'Account extended successfully',
      expiresAt: newExpiresAt.toISOString(),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    }, { status: 200 })
  } catch (error) {
    console.error('Extend account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

