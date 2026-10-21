/* In-memory rate limit for the extension/API read paths.
 *
 * A single shared EXT_API_KEY guards /api/ext/*, so one student (or one
 * leaked key) could hammer the boards hard enough to slow the shared
 * Mongo cluster. The limit is deliberately generous: a real student
 * opens a few boards a minute, never hundreds.
 *
 * In-memory and per-dyno: Heroku restarts reset it, and that is fine —
 * this is load protection, not access control (the API key already does
 * that).
 */

const buckets = new Map();

const WINDOW_MS = 60 * 1000;

/// Returns `{ok, retryAfterMs}` for `key`.
export function rateLimit(key, { limit = 120, windowMs = WINDOW_MS } = {}) {
  const now = Date.now();
  const k = String(key || 'anon');
  let bucket = buckets.get(k);
  if (!bucket || bucket.reset <= now) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(k, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterMs: Math.max(1, bucket.reset - now),
    };
  }
  return { ok: true, retryAfterMs: 0 };
}

/// Drops stale buckets so the map cannot grow without bound.
export function sweepRateLimits() {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.reset <= now) buckets.delete(k);
  }
}

setInterval(sweepRateLimits, WINDOW_MS).unref?.();

/// Caller identity for the limit: the student id when present (fair per
/// student), else the IP.
export function callerKey(req, studentId) {
  const sid = String(studentId || '').trim();
  if (sid) return sid;
  const fwd = req.headers?.get?.('x-forwarded-for') || '';
  const ip = fwd.split(',')[0]?.trim() ||
    req.headers?.get?.('x-real-ip') ||
    'anon';
  return 'ip:' + ip;
}
