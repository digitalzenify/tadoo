import { createHash, timingSafeEqual } from 'node:crypto'

// Sign-up protection. Bots register accounts in bulk, so registration is gated by a
// honeypot field, an optional invite code, and a per-IP rate limit. Every check here
// is pure so it can be tested without booting the HTTP server; the limiter keeps its
// state in process memory, which is enough for the single-replica deployment.
export function createRateLimiter({ windowMs, max, now = Date.now }) {
  const hits = new Map()
  return function take(key) {
    const current = now()
    const recent = (hits.get(key) || []).filter(at => current - at < windowMs)
    recent.push(current)
    hits.set(key, recent)
    if (hits.size > 5000) {
      for (const [entryKey, times] of hits) if (!times.some(at => current - at < windowMs)) hits.delete(entryKey)
    }
    const allowed = recent.length <= max
    return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((windowMs - (current - recent[0])) / 1000)) }
  }
}

export const validateEmail = email => typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email)

const clean = value => String(value ?? '').trim()

function constantTimeEquals(a, b) {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

export function checkSignup({ email, password, signupCode, website } = {}, configuredCode = '') {
  // The honeypot is a field no human sees; bots fill every input they find.
  if (clean(website)) return { status: 400, error: 'Sign-up was rejected' }
  if (configuredCode && !constantTimeEquals(clean(signupCode), configuredCode)) return { status: 403, error: 'A valid sign-up code is required' }
  if (!validateEmail(email) || typeof password !== 'string' || password.length < 8) return { status: 400, error: 'Use a valid email and a password of at least 8 characters' }
  return null
}

// One proxy hop (Traefik) in front of the API, so req.ip is the real client address.
export const clientIp = req => req.ip || req.socket?.remoteAddress || 'unknown'
