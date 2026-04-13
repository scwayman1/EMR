/**
 * In-memory sliding-window rate limiter.
 *
 * No external dependencies (no Redis). Good enough for a single-process
 * deployment on Render Starter. For multi-instance production, swap to
 * Upstash Redis rate limiter — same interface, just change the store.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return { ok: false, error: "Too many attempts..." };
 */

interface RateLimiterConfig {
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Max attempts per window per identifier. */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (ms)
}

interface RateLimiter {
  check(identifier: string): RateLimitResult;
  reset(identifier: string): void;
}

/**
 * Create a sliding-window rate limiter. Each identifier (IP, email, etc.)
 * gets its own counter. Expired entries are cleaned up lazily.
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const store = new Map<string, { count: number; windowStart: number }>();

  // Lazy cleanup: remove expired entries every 100 checks
  let checkCount = 0;
  function maybeCleanup() {
    checkCount++;
    if (checkCount % 100 !== 0) return;
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.windowStart > config.windowMs) {
        store.delete(key);
      }
    }
  }

  return {
    check(identifier: string): RateLimitResult {
      maybeCleanup();
      const now = Date.now();
      const entry = store.get(identifier);

      // No entry or window expired → fresh window
      if (!entry || now - entry.windowStart > config.windowMs) {
        store.set(identifier, { count: 1, windowStart: now });
        return {
          allowed: true,
          remaining: config.max - 1,
          resetAt: now + config.windowMs,
        };
      }

      // Within window
      entry.count++;
      const remaining = Math.max(0, config.max - entry.count);
      const resetAt = entry.windowStart + config.windowMs;

      if (entry.count > config.max) {
        return { allowed: false, remaining: 0, resetAt };
      }

      return { allowed: true, remaining, resetAt };
    },

    reset(identifier: string) {
      store.delete(identifier);
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for auth endpoints
// ---------------------------------------------------------------------------

/** Login: 5 attempts per 15 minutes per identifier. */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

/** Signup: 3 attempts per hour per identifier. */
export const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
});
