type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  windowMs: number
  max: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

// In-memory rate limiter. Sufficient for a single-instance Next.js server —
// when running behind multiple replicas a shared store (Redis/Convex) should
// replace this. The store intentionally uses process memory only, so no PII
// (usernames, IPs) is persisted to disk.
const stores = new Map<string, Map<string, RateLimitEntry>>()

function pruneEntries(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function consumeRateLimit(
  scope: string,
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  let store = stores.get(scope)
  if (!store) {
    store = new Map()
    stores.set(scope, store)
  }

  // Periodically clean up stale entries to keep the map small.
  if (store.size > 1000) {
    pruneEntries(store, now)
  }

  const key = identifier || "unknown"
  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: options.max - 1,
      resetAt,
      retryAfterSeconds: 0,
    }
  }

  const nextCount = existing.count + 1
  if (nextCount > options.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count = nextCount
  return {
    allowed: true,
    remaining: options.max - nextCount,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  }
}

export function getClientIp(request: { headers: { get: (name: string) => string | null } }) {
  const header = request.headers.get("x-forwarded-for")
  if (!header) return "unknown"
  const first = header.split(",")[0]?.trim()
  return first || "unknown"
}