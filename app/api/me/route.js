import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { json, needConfig, unauthorized } from '@/lib/respond';

export const runtime = 'nodejs';

/* Debug/verify-session helper for the app: echoes the verified identity. */
export async function GET(req) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const user = await resolveUser(config, req);
  if (!user) return unauthorized(config.corsOrigin);
  return json({ user }, { origin: config.corsOrigin });
}
