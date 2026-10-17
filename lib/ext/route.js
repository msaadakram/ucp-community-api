/* Shared helper for /api/ext/* routes: API-key gate + rate-limit + Mongo
 * guard. Returns { config, origin } or { response } (send it directly).
 *
 * SECURITY: every ext route requires the `x-api-key` header to match
 * EXT_API_KEY (the extension ships the key). Routes with their own auth
 * (admin Bearer/cookie, the public earn-verify claim) pass
 * { requireKey: false }. When EXT_API_KEY is unset, key-required routes
 * fail closed — the ext surface must never be public-write. */

import crypto from 'crypto';
import { getConfig } from '@/lib/config';
import { json, clientIp } from '@/lib/respond';
import { checkRateLimit, EXT_LIMITS, extRateLimitResponse } from '@/lib/ratelimit';
import { extEnvelope, needMongo } from '@/lib/ext/validate';
import { ensureMongo } from '@/lib/ext/mongo';

export function extApiKeyOk(req, config) {
  const expected = (config.extApiKey || '').trim();
  if (!expected) return false;
  const got = (req.headers.get('x-api-key') || '').trim();
  if (!got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function extRoute(req, bucket, { requireKey = true } = {}) {
  const config = getConfig();
  const origin = config.corsOrigin || '*';
  if (requireKey) {
    if (!config.extApiKey || !extApiKeyOk(req, config)) {
      return {
        config,
        origin,
        // Plain NextResponse (like needMongo): extEnvelope is only for
        // pre-shaped { ..., _status } plain objects.
        response: json(
          {
            error: 'Missing or invalid x-api-key header',
            code: 'EXT_KEY_REQUIRED',
          },
          { status: 401, origin },
        ),
      };
    }
  }
  const limits = EXT_LIMITS[bucket] || EXT_LIMITS.read;
  const check = checkRateLimit(
    `ext:${bucket}:${clientIp(req)}`,
    limits.max,
    limits.windowMs,
  );
  if (!check.allowed) {
    return {
      config,
      origin,
      response: extEnvelope(extRateLimitResponse(origin), origin),
    };
  }
  const noMongo = needMongo(config);
  if (noMongo) return { config, origin, response: noMongo };
  try {
    await ensureMongo(config.mongoUri);
  } catch (err) {
    return {
      config,
      origin,
      response: json(
        { error: 'Database connection failed', code: 'DB_CONNECTION_ERROR' },
        { status: 500, origin },
      ),
    };
  }
  return { config, origin, response: null };
}

/* CSRF guard for cookie-authenticated admin mutations: browsers always
 * send `Sec-Fetch-Site` — same-origin fetches from the panel pass, any
 * cross-site attempt fails. Non-browser callers must set the custom
 * header (top-level navigations cannot, which is exactly the CSRF
 * vector). Pure, unit-tested. */
export function requireSameOrigin(req) {
  const site = (req.headers.get('sec-fetch-site') || '').toLowerCase();
  if (site === 'same-origin' || site === 'same-site') return true;
  return (req.headers.get('x-admin-request') || '') === '1';
}
