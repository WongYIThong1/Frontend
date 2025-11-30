import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { signJwt } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

type User = {
  id: string
  username: string
  password_hash: string | null
  plan: number
  status: string
  expires_at: string | null
  apikey: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await request.json()

    // 清理输入（去除前后空格）
    const cleanUsername = username?.trim()
    const cleanPassword = password?.trim()

    if (!cleanUsername || !cleanPassword) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    const { data: user, error: userError } = await supabaseService
      .from('users')
      .select('id, username, password_hash, plan, status, expires_at, apikey')
      .eq('username', cleanUsername)
      .single()

    if (userError || !user) {
      console.error('Database query error:', userError)
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const typedUser = user as User

    if (!typedUser.password_hash) {
      console.error('User has no password_hash:', typedUser.id)
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const isPasswordValid = bcrypt.compareSync(cleanPassword, typedUser.password_hash)
    if (!isPasswordValid) {
      console.error('Password validation failed for user:', cleanUsername)
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    if (typedUser.status !== 'Active') {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 })
    }

    if (typedUser.expires_at) {
      const expiresAt = new Date(typedUser.expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Account has expired' }, { status: 403 })
      }
    }

    let finalApikey = typedUser.apikey
    if (!finalApikey) {
      let newApiKey: string | null = null
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      while (!isUnique && attempts < maxAttempts) {
        attempts++
        const randomPart = randomBytes(32).toString('hex')
        newApiKey = `sk_${randomPart}`

        const { data: existingKey } = await supabaseService
          .from('users')
          .select('id')
          .eq('apikey', newApiKey)
          .maybeSingle()

        if (!existingKey) {
          isUnique = true
        }
      }

      if (!isUnique || !newApiKey) {
        return NextResponse.json(
          { error: 'Failed to generate unique API key. Please try again.' },
          { status: 500 }
        )
      }

      // Update API key in database
      const updateResult = await (supabaseService
        .from('users')
        .update({ apikey: newApiKey } as never)
        .eq('id', typedUser.id) as unknown as Promise<{ error: Error | null }>)

      if (updateResult.error) {
        console.error('Failed to update API key:', updateResult.error)
        return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
      }

      finalApikey = newApiKey
    }

    const { password_hash, apikey, ...userWithoutSensitiveData } = typedUser

    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SESSION_SECRET' },
        { status: 500 }
      )
    }

    const expiresInSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 2
    const token = signJwt(
      {
        sub: typedUser.id,
        username: typedUser.username,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      },
      sessionSecret
    )

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutSensitiveData,
        apikey: finalApikey || '',
      },
      { status: 200 }
    )

    // 在开发环境中，secure 应该为 false（localhost 使用 http）
    // 在生产环境中，secure 应该为 true（使用 https）
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const isSecure = proto === 'https'
    
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: expiresInSeconds,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
