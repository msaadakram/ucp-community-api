/* Rate-limit unit tests: the shared API key must not be a free
 * unlimited hammer for /api/ext/leaderboard. */

import { rateLimit, callerKey, sweepRateLimits } from '../lib/ext/rate-limit.js';

describe('rate limit', () => {
  test('allows a burst then throttles', () => {
    const key = 'burst' + Math.random();
    for (let i = 0; i < 180; i++) {
      const r = rateLimit(key, { limit: 180 });
      expect(r.ok).toBe(true);
    }
    const over = rateLimit(key, { limit: 180 });
    expect(over.ok).toBe(false);
    expect(over.retryAfterMs).toBeGreaterThan(0);
  });

  test('buckets are per key', () => {
    const a = 'a' + Math.random();
    const b = 'b' + Math.random();
    for (let i = 0; i < 50; i++) rateLimit(a, { limit: 10 });
    expect(rateLimit(b, { limit: 10 }).ok).toBe(true);
  });

  test('sweeping drops stale buckets', () => {
    const key = 'stale' + Math.random();
    // A window in the past makes the bucket stale immediately.
    rateLimit(key, { limit: 1, windowMs: -1 });
    sweepRateLimits();
    expect(rateLimit(key, { limit: 1 }).ok).toBe(true);
  });

  test('callerKey prefers the student id, falls back to the IP', () => {
    const req = new Request('http://x/', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    });
    expect(callerKey(req, 'L1TEST')).toBe('L1TEST');
    expect(callerKey(req, '')).toBe('ip:10.0.0.1');
  });
});
