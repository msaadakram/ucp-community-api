/* Best-effort in-memory rate limiting. Same Vercel caveat as events.js:
 * per-instance only — Vercel's edge network still absorbs real DDoS, and
 * the strict checks (auth, validation, 5 MB uploads) hold everywhere. */

const buckets = new Map();
const MAX_BUCKETS = 10000;
let lastSweep = 0;

/// Sweep stale buckets at most once a minute so the map cannot grow
/// unbounded on a long-lived dyno.
function sweep(now) {
  if (now - lastSweep < 60 * 1000 && buckets.size <= MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(key);
  }
  // Still too large (all fresh): drop the oldest 25% rather than leak.
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let removed = 0;
    for (const key of buckets.keys()) {
      if (removed >= overflow) break;
      buckets.delete(key);
      removed += 1;
    }
  }
}

export function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  sweep(now);
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

/* Extension buckets (port of extention-server rateLimiter.js +
 * earnRateLimiter.js): per-minute, per-IP. Same per-instance caveat.
 * Keys are `ext:<bucket>:<ip>`; call `extLimit(req, bucket, origin)` —
 * returns null when allowed, or a 429 response object when limited. */
export const EXT_LIMITS = {
  write: { max: 30, windowMs: 60 * 1000 }, // save-grades/timetable/cookies/privacy/credits-deduct
  read: { max: 60, windowMs: 60 * 1000 }, // leaderboard/check-student/credits/privacy reads
  earnGenerate: { max: 10, windowMs: 60 * 1000 },
  earnVerify: { max: 30, windowMs: 60 * 1000 },
};

export function extRateLimitResponse(origin) {
  return {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    details: 'Please wait before trying again',
    _status: 429,
    _origin: origin,
  };
}

