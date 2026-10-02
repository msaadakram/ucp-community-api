/* Best-effort in-memory rate limiting. Same Vercel caveat as events.js:
 * per-instance only — Vercel's edge network still absorbs real DDoS, and
 * the strict checks (auth, validation, 5 MB uploads) hold everywhere. */

const buckets = new Map();

export function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetMs: bucket.reset - now,
  };
}

export function __resetRateLimits() {
  buckets.clear();
}
