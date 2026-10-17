/* Shared helper for /api/ext/* routes: rate-limit + Mongo guard.
 * Returns { config, origin } or { response } (send it directly). */

import { getConfig } from '@/lib/config';
import { json, clientIp } from '@/lib/respond';
import { checkRateLimit, EXT_LIMITS, extRateLimitResponse } from '@/lib/ratelimit';
import { extEnvelope, needMongo } from '@/lib/ext/validate';
import { ensureMongo } from '@/lib/ext/mongo';

export async function extRoute(req, bucket) {
  const config = getConfig();
  const origin = config.corsOrigin || '*';
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
