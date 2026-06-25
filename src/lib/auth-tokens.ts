// Stateless password reset tokens — signed with HMAC-SHA256.
//
// Used by /api/auth/forgot-password (sign) and /api/auth/reset-password
// (verify). Lives in src/lib so both route files can import it cleanly
// (importing from another route file doesn't work reliably in Next.js
// because of how the bundler treats route handlers).
//
// Token format: "base64url(payload).hex(signature)"
// Payload: { userId: string, expiresAt: number (ms timestamp) }
// Signature: HMAC-SHA256(payload, NEXTAUTH_SECRET)
//
// Why stateless?
//   - No DB columns needed → no migrations to run
//   - Works immediately after deploy
//   - Token can't be reused with another account (signed)
//   - Constant-time signature comparison (anti timing attacks)

import crypto from 'crypto'

// NEXTAUTH_SECRET is always present in production (NextAuth requires it).
// We fall back to a dev-only secret for local development.
const SIGNING_SECRET =
  process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-do-not-use-in-prod'

export interface ResetTokenPayload {
  userId: string
  expiresAt: number  // ms since epoch
}

// Sign a payload → returns "base64payload.hexsignature"
export function signResetToken(userId: string, expiresAt: number): string {
  const payload: ResetTokenPayload = { userId, expiresAt }
  const payloadJson = JSON.stringify(payload)
  const b64 = Buffer.from(payloadJson, 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(b64).digest('hex')
  return `${b64}.${sig}`
}

// Verify a signed token → returns the payload, or null if invalid/expired.
// Uses constant-time comparison to prevent timing attacks.
export function verifyResetToken(token: string): ResetTokenPayload | null {
  if (!token || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  if (!b64 || !sig) return null

  // Recompute the expected signature
  const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(b64).digest('hex')

  // Length check first (avoids throwing in timingSafeEqual)
  if (sig.length !== expectedSig.length) return null

  // Constant-time comparison
  try {
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  // Decode payload
  try {
    const payloadJson = Buffer.from(b64, 'base64url').toString('utf8')
    const payload = JSON.parse(payloadJson) as ResetTokenPayload
    if (!payload.userId || typeof payload.userId !== 'string') return null
    if (typeof payload.expiresAt !== 'number') return null
    // Check expiry
    if (payload.expiresAt < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
