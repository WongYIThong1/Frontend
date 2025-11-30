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
      const maxAttempts = 5
      let newApiKey: string | null = null
      let updateSuccess = false

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        newApiKey = `sk_${randomBytes(32).toString('hex')}`

        const { error: updateError } = await (supabaseService as any)
          .from('users')
          .update({ apikey: newApiKey })
          .eq('id', typedUser.id)

        if (!updateError) {
          updateSuccess = true
          break
        }

        const msg = updateError.message || ''
        // 若数据库唯一约束冲突则重试，否则直接报错
        if (!(msg.includes('duplicate') || msg.includes('unique') || msg.includes('UNIQUE'))) {
          console.error(`Error updating API key (attempt ${attempt}):`, updateError)
          break
        }
      }

      if (!updateSuccess || !newApiKey) {
        console.error(`Failed to generate unique API key after ${maxAttempts} attempts for user ${typedUser.id}`)
        return NextResponse.json(
          { error: 'Failed to generate unique API key. Please try again.' },
          { status: 500 }
        )
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
