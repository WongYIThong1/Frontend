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

    // 查询该用户的所有机器，排除敏感字段
    const { data: machines, error } = await supabaseService
      .from('machines')
      .select('id, user_id, ip, ram, core, status, name, last_heartbeat, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 })
    }

    return NextResponse.json({ machines: machines || [] }, { status: 200 })
  } catch (error) {
    console.error('Machines API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
    const { machineId, name } = await request.json()

    if (!machineId || !name) {
      return NextResponse.json({ error: 'Machine ID and name are required' }, { status: 400 })
    }

    const cleanName = name.trim()
    if (!cleanName) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    if (!supabaseService) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    // 验证机器属于当前用户
    const { data: machine, error: fetchError } = await supabaseService
      .from('machines')
      .select('id, user_id')
      .eq('id', machineId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !machine) {
      return NextResponse.json({ error: 'Machine not found or access denied' }, { status: 404 })
    }

    // 更新机器名称
    const { data: updatedMachine, error: updateError } = await supabaseService
      .from('machines')
      .update({ name: cleanName, updated_at: new Date().toISOString() })
      .eq('id', machineId)
      .eq('user_id', userId)
      .select('id, name')
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update machine name' }, { status: 500 })
    }

    return NextResponse.json({ machine: updatedMachine }, { status: 200 })
  } catch (error) {
    console.error('Update machine name error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

