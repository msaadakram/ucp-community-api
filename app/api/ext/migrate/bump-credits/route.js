import { json } from '@/lib/respond';
import { validateAdminToken, adminTokenFromHeaders } from '@/lib/ext/admin';
import { migrateBumpCredits, migrationDb } from '@/lib/ext/migrate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/migrate/bump-credits — was GET /migrate/bump-credits.
 * Now requires the admin Bearer token (was open upstream). */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const session = await validateAdminToken(
    adminTokenFromHeaders(req.headers),
  ).catch(() => null);
  if (!session) {
    return json(
      { error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
      { status: 401, origin },
    );
  }
  try {
    const db = migrationDb();
    if (!db) {
      return json({ error: 'No database connection' }, { status: 500, origin });
    }
    const result = await migrateBumpCredits(db);
    return json({ success: true, ...result }, { origin });
  } catch (err) {
    return json({ error: err.message }, { status: 500, origin });
  }
}
