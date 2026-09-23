import { describe, expect, it } from 'vitest'
import { checkSignup, createRateLimiter, validateEmail } from './security.mjs'

describe('sign-up gate', () => {
  it('accepts a well-formed sign-up when no invite code is configured', () => {
    expect(checkSignup({ email: 'alex@example.com', password: 'longenough' })).toBeNull()
  })

  it('rejects a filled honeypot field', () => {
    expect(checkSignup({ email: 'alex@example.com', password: 'longenough', website: 'https://spam.example' })).toMatchObject({ status: 400 })
  })

  it('requires the configured invite code', () => {
    const configured = 'invite-only-code'
    expect(checkSignup({ email: 'alex@example.com', password: 'longenough' }, configured)).toMatchObject({ status: 403 })
    expect(checkSignup({ email: 'alex@example.com', password: 'longenough', signupCode: 'wrong-code' }, configured)).toMatchObject({ status: 403 })
    expect(checkSignup({ email: 'alex@example.com', password: 'longenough', signupCode: configured }, configured)).toBeNull()
  })

  it('still validates email and password', () => {
    expect(checkSignup({ email: 'not-an-email', password: 'longenough' })).toMatchObject({ status: 400 })
    expect(checkSignup({ email: 'alex@example.com', password: 'short' })).toMatchObject({ status: 400 })
    expect(validateEmail('alex@example.com')).toBe(true)
    expect(validateEmail('alex@example')).toBe(false)
  })
})

describe('rate limiter', () => {
  it('allows up to the limit inside the window and then blocks with a retry hint', () => {
    let clock = 0
    const take = createRateLimiter({ windowMs: 60_000, max: 3, now: () => clock })
    expect([take('1.2.3.4').allowed, take('1.2.3.4').allowed, take('1.2.3.4').allowed]).toEqual([true, true, true])
    const blocked = take('1.2.3.4')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(take('5.6.7.8').allowed).toBe(true)
  })

  it('forgets attempts once the window has passed', () => {
    let clock = 0
    const take = createRateLimiter({ windowMs: 1_000, max: 1, now: () => clock })
    expect(take('1.2.3.4').allowed).toBe(true)
    expect(take('1.2.3.4').allowed).toBe(false)
    clock += 1_500
    expect(take('1.2.3.4').allowed).toBe(true)
  })
})
