import crypto from 'crypto'

export const ADMIN_SWITCH_COOKIE = 'sdc_admin_switch'
const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

function getSigningSecret(): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SWITCH_PASSCODE
  return secret ? secret.trim() : null
}

/**
 * Constant-time comparison via SHA-256 digests so lengths never leak.
 */
export function verifyPasscode(input: string): boolean {
  const expected = process.env.ADMIN_SWITCH_PASSCODE?.trim()
  if (!expected || !input) return false

  const a = crypto.createHash('sha256').update(input.trim()).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

export function createSwitchToken(): string | null {
  const secret = getSigningSecret()
  if (!secret) return null

  const exp = String(Date.now() + TOKEN_TTL_MS)
  const sig = crypto.createHmac('sha256', secret).update(exp).digest('hex')
  return `${exp}.${sig}`
}

export function verifySwitchToken(token: string | undefined): boolean {
  if (!token || !process.env.ADMIN_SWITCH_PASSCODE?.trim()) return false
  const secret = getSigningSecret()
  if (!secret) return false

  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false

  const expectedSig = crypto.createHmac('sha256', secret).update(expStr).digest('hex')
  if (sig.length !== expectedSig.length) return false

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
}
