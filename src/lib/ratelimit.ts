/**
 * Client-side rate limiting and abuse prevention.
 * Protects Firebase AI Logic and Google Gemini Cloud quota from automated scrapers,
 * accidental double-clicks, and runaway viral usage.
 */

export type RateLimitAction = 'explain' | 'reply' | 'cloud-image' | 'cloud-simplify'

interface ActionConfig {
  /** Minimum seconds that must elapse between two consecutive calls */
  cooldownSec: number
  /** Maximum requests allowed in a short burst window */
  maxBurst: number
  /** Burst window duration in seconds */
  burstWindowSec: number
  /** Maximum requests allowed in a 24-hour rolling window */
  maxDaily: number
}

const LIMITS: Record<RateLimitAction, ActionConfig> = {
  explain: {
    cooldownSec: 6,
    maxBurst: 4,
    burstWindowSec: 300, // 5 minutes
    maxDaily: 20,
  },
  reply: {
    cooldownSec: 4,
    maxBurst: 6,
    burstWindowSec: 300,
    maxDaily: 25,
  },
  'cloud-image': {
    cooldownSec: 10,
    maxBurst: 3,
    burstWindowSec: 300,
    maxDaily: 10,
  },
  'cloud-simplify': {
    cooldownSec: 2,
    maxBurst: 15,
    burstWindowSec: 300,
    maxDaily: 40,
  },
}

const STORAGE_KEY = 'paperwork_decoder_ratelimits_v1'

interface StoredUsage {
  history: Record<string, number[]>
}

// In-memory fallback if localStorage is blocked (e.g. private mode or strict security)
let memoryStore: StoredUsage = { history: {} }

function getStore(): StoredUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryStore
    return JSON.parse(raw) as StoredUsage
  } catch {
    return memoryStore
  }
}

function saveStore(store: StoredUsage) {
  memoryStore = store
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Ignore storage quota or permission errors
  }
}

/** Prunes timestamps older than 24 hours. */
function prune(timestamps: number[], now: number): number[] {
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  return timestamps.filter((t) => t > oneDayAgo)
}

export interface RateLimitCheckResult {
  allowed: boolean
  retryAfterSec?: number
  reason?: string
  remainingDaily: number
  maxDaily: number
}

/**
 * Checks whether an action is permitted under rate limit policies.
 */
export function checkRateLimit(action: RateLimitAction, now = Date.now()): RateLimitCheckResult {
  const config = LIMITS[action]
  const store = getStore()
  const history = prune(store.history[action] || [], now)
  const maxDaily = config.maxDaily

  // 1. Check cooldown from the most recent request
  if (history.length > 0) {
    const lastTimestamp = history[history.length - 1]
    const elapsedSec = (now - lastTimestamp) / 1000
    if (elapsedSec < config.cooldownSec) {
      const wait = Math.ceil(config.cooldownSec - elapsedSec)
      return {
        allowed: false,
        retryAfterSec: wait,
        reason: `Please wait ${wait}s before sending another request.`,
        remainingDaily: Math.max(0, maxDaily - history.length),
        maxDaily,
      }
    }
  }

  // 2. Check burst window (e.g., max 4 in 5 minutes)
  const burstStart = now - config.burstWindowSec * 1000
  const burstCount = history.filter((t) => t > burstStart).length
  if (burstCount >= config.maxBurst) {
    const oldestInBurst = history.filter((t) => t > burstStart)[0]
    const wait = Math.ceil((oldestInBurst + config.burstWindowSec * 1000 - now) / 1000)
    return {
      allowed: false,
      retryAfterSec: wait,
      reason: `Hourly rate limit reached. Please wait ${wait}s before trying again.`,
      remainingDaily: Math.max(0, maxDaily - history.length),
      maxDaily,
    }
  }

  // 3. Check 24-hour daily limit
  if (history.length >= maxDaily) {
    const oldest = history[0]
    const wait = Math.ceil((oldest + 24 * 60 * 60 * 1000 - now) / 1000)
    const hours = Math.ceil(wait / 3600)
    return {
      allowed: false,
      retryAfterSec: wait,
      reason: `Daily free quota reached (${maxDaily}/${maxDaily} letters). Resets in ~${hours}h.`,
      remainingDaily: 0,
      maxDaily,
    }
  }

  return {
    allowed: true,
    remainingDaily: maxDaily - history.length,
    maxDaily,
  }
}

/**
 * Records a completed or initiated action timestamp.
 */
export function recordRateLimitAction(action: RateLimitAction, now = Date.now()): void {
  const store = getStore()
  const history = prune(store.history[action] || [], now)
  history.push(now)
  store.history[action] = history
  saveStore(store)
}

/**
 * Gets remaining quota for the UI.
 */
export function getDailyQuota(action: RateLimitAction): { remaining: number; max: number } {
  const check = checkRateLimit(action)
  return { remaining: check.remainingDaily, max: check.maxDaily }
}

/**
 * Clears rate limit state (for tests and dev resets).
 */
export function resetRateLimits(): void {
  memoryStore = { history: {} }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}
