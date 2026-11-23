import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, getDailyQuota, recordRateLimitAction, resetRateLimits } from './ratelimit'

describe('ratelimit', () => {
  beforeEach(() => {
    resetRateLimits()
  })

  it('allows the first action and returns accurate remaining quota', () => {
    const status = checkRateLimit('explain')
    expect(status.allowed).toBe(true)
    expect(status.remainingDaily).toBe(20)
    expect(status.maxDaily).toBe(20)
  })

  it('enforces cooldown seconds between rapid actions', () => {
    const t0 = 1700000000000
    expect(checkRateLimit('explain', t0).allowed).toBe(true)
    recordRateLimitAction('explain', t0)

    // Attempt 2 seconds later (cooldown is 6 seconds)
    const blocked = checkRateLimit('explain', t0 + 2000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBe(4)
    expect(blocked.reason).toContain('Please wait 4s')

    // Attempt 7 seconds later -> should be allowed
    const allowed = checkRateLimit('explain', t0 + 7000)
    expect(allowed.allowed).toBe(true)
  })

  it('enforces burst limits in a short window', () => {
    let t = 1700000000000
    // Record 4 actions separated by 10s (clearing cooldown, but inside 300s window)
    for (let i = 0; i < 4; i++) {
      expect(checkRateLimit('explain', t).allowed).toBe(true)
      recordRateLimitAction('explain', t)
      t += 10000
    }

    // 5th attempt within 5 minutes should trigger burst limit
    const burstBlocked = checkRateLimit('explain', t)
    expect(burstBlocked.allowed).toBe(false)
    expect(burstBlocked.reason).toContain('Hourly rate limit reached')
  })

  it('enforces daily maximum and recovers after 24 hours', () => {
    let t = 1700000000000
    // Record 20 actions spaced by 15 minutes each (total 300 minutes = 5 hours)
    for (let i = 0; i < 20; i++) {
      recordRateLimitAction('explain', t)
      t += 15 * 60 * 1000
    }

    // 21st attempt within 24h should be blocked by daily limit
    const dailyBlocked = checkRateLimit('explain', t)
    expect(dailyBlocked.allowed).toBe(false)
    expect(dailyBlocked.remainingDaily).toBe(0)
    expect(dailyBlocked.reason).toContain('Daily free quota reached')

    // After 25 hours from the first action, older actions should expire
    const later = 1700000000000 + 25 * 60 * 60 * 1000
    const nextDay = checkRateLimit('explain', later)
    expect(nextDay.allowed).toBe(true)
  })

  it('provides helper for getDailyQuota', () => {
    recordRateLimitAction('reply')
    const q = getDailyQuota('reply')
    expect(q.max).toBe(25)
    expect(q.remaining).toBe(24)
  })
})
