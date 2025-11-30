import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

type License = {
  id: string
  day: number
  status: string
  license_key: string
}

type User = {
  id: string
  username: string
  plan: number
  status: string
  expires_at: string
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, licenseKey } = await request.json()

    // 清理输入（去除前后空格）
    const cleanUsername = username?.trim()
    const cleanPassword = password?.trim()
    const cleanLicenseKey = licenseKey?.trim()

    // 验证输入
    if (!cleanUsername || !cleanPassword || !cleanLicenseKey) {
      return NextResponse.json(
        { error: 'Username, password, and license key are required' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const { data: existingUser, error: userCheckError } = await supabaseService
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      )
    }

    // 验证 License Key
    const { data: licenseCheck, error: licenseCheckError } = await supabaseService
      .from('licenses')
      .select('id, day, status, license_key')
      .eq('license_key', cleanLicenseKey)
      .maybeSingle()

    if (licenseCheckError || !licenseCheck) {
      console.error('License check error:', licenseCheckError)
      return NextResponse.json(
        { error: 'Invalid license key' },
        { status: 400 }
      )
    }

    const license = licenseCheck as License

    if (license.status !== 'Inactive') {
      return NextResponse.json(
        { error: 'License key has already been used or is expired' },
        { status: 400 }
      )
    }

    // 哈希密码
    const saltRounds = 10
    const passwordHash = bcrypt.hashSync(cleanPassword, saltRounds)

    // 计算过期时间（基于 license.day）
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + license.day)

    // 创建用户
    const createUserResult = await (supabaseService
      .from('users')
      .insert({
        username: cleanUsername,
        password_hash: passwordHash,
        plan: license.day,
        status: 'Active',
        expires_at: expiresAt.toISOString(),
      } as never)
      .select('id, username, plan, status, expires_at')
      .single() as unknown as Promise<{ data: User | null; error: Error | null }>)
    
    const { data: newUser, error: createUserError } = createUserResult

    if (createUserError || !newUser) {
      return NextResponse.json(
        { error: 'Failed to create user', details: createUserError?.message },
        { status: 500 }
      )
    }

    const typedUser = newUser as User

    // 更新 license
    const updateLicenseResult = await (supabaseService
      .from('licenses')
      .update({
        status: 'Active',
        user_id: typedUser.id,
        activated_at: new Date().toISOString(),
      } as never)
      .eq('id', license.id) as unknown as Promise<{ error: Error | null }>)

    if (updateLicenseResult.error) {
      // 如果更新 license 失败，尝试删除刚创建的用户（回滚）
      await supabaseService.from('users').delete().eq('id', typedUser.id)
      return NextResponse.json(
        { error: 'Failed to activate license', details: updateLicenseResult.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: typedUser.id,
          username: typedUser.username,
          plan: typedUser.plan,
          status: typedUser.status,
          expires_at: typedUser.expires_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
