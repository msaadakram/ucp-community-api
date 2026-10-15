/* Short-lived verified-session cache: every feed/thread request carries
 * `x-ucp-session`, and each one triggered a live Odoo round-trip (~1-3s),
 * making community loading feel stuck. Verified identities are now cached
 * per session id for 60s. Best-effort per instance (like the rate limiter);
 * failures are NEVER cached, so fresh logins and deaths take effect fast. */

const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 2000;

let cache = globalThis.__ucpSessionCache || null;
if (!cache) {
  cache = new Map();
  globalThis.__ucpSessionCache = cache;
}

function keyFor(odooBase, sid) {
  return `${odooBase}||${sid}`;
}

export function getCachedUser(odooBase, sid, nowMs = Date.now()) {
  const hit = cache.get(keyFor(odooBase, sid));
  if (!hit) return null;
  if (hit.exp <= nowMs) {
    cache.delete(keyFor(odooBase, sid));
    return null;
  }
  return hit.user;
}

export function setCachedUser(
  odooBase,
  sid,
  user,
  nowMs = Date.now(),
  ttlMs = TTL_MS,
) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(keyFor(odooBase, sid), { user, exp: nowMs + ttlMs });
}

/* Test seams. */
export function __resetSessionCache() {
  cache.clear();
}

export function __sessionCacheSize() {
  return cache.size;
}
