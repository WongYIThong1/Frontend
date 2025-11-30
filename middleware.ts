import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/api', '/_next', '/favicon.ico', '/public']
const SESSION_COOKIE = 'session_token'

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/=+/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function decodePayload(base64url: string) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const json = atob(padded)
  return JSON.parse(json)
}

async function verifyJwtEdge(token: string, secret: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const encoder = new TextEncoder()
  const [header, payload, signature] = parts
  const data = `${header}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const expected = toBase64Url(sig)
  if (signature !== expected) return false
  try {
    const decoded = decodePayload(payload)
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return false
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET

  if (!token || !secret) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname || '/dashboard')
    return NextResponse.redirect(loginUrl)
  }

  const valid = await verifyJwtEdge(token, secret)
  if (!valid) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname || '/dashboard')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}


