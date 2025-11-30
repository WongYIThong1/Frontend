import crypto from 'crypto'

type JwtPayload = Record<string, unknown>

function base64Url(input: Buffer) {
  return input.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function signJwt(payload: JwtPayload, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64Url(Buffer.from(JSON.stringify(header)))
  const encodedPayload = base64Url(Buffer.from(JSON.stringify(payload)))
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${signature}`
}

export function verifyJwt(token: string, secret: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  const data = `${header}.${payload}`
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')

  // Avoid timingSafeEqual throwing on length mismatch or malformed base64
  const signatureBuf = Buffer.from(signature, 'base64url')
  const expectedBuf = Buffer.from(expected, 'base64url')
  if (signatureBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null
    return decoded as JwtPayload
  } catch {
    return null
  }
}
