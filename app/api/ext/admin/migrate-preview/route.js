import mongoose from 'mongoose';
import { json } from '@/lib/respond';
import { cookies } from 'next/headers';
import { validateAdminToken } from '@/lib/ext/admin';
import { COURSE_NAMES } from '@/lib/ext/constants';
import { extRoute, requireSameOrigin } from '@/lib/ext/route';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET /api/ext/admin/migrate-preview?dry=1 — count (and optionally run)
 * the bump-credits migration. Cookie-authenticated admin only.
 * State-changing reads (?dry=0) also require a same-origin request
 * (CSRF guard — top-level navigations cannot satisfy it). */

export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read', { requireKey: false });
  if (response) return response;
  const dry = new URL(req.url).searchParams.get('dry') !== '0';
  const store = await cookies();
  const session = await validateAdminToken(
    store.get(ADMIN_COOKIE)?.value || null,
  ).catch(() => null);
  if (!session) {
    return json(
      { error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
      { status: 401, origin },
    );
  }
  if (!dry && !requireSameOrigin(req)) {
    return json(
      { error: 'Same-origin required', code: 'CSRF_GUARD' },
      { status: 403, origin },
    );
  }
  try {
    const coll = mongoose.connection.db.collection('grades');
    const records = await coll
      .find({ courseName: COURSE_NAMES.CREDITS })
      .project({ credits: 1 })
      .toArray();
    const below = records.filter((r) => (r.credits || 0) < 500);
    let bumped = 0;
    if (!dry) {
      for (const r of below) {
        await coll.updateOne(
          { _id: r._id },
          { $set: { credits: 500, timestamp: new Date() } },
        );
        bumped++;
      }
    }
    return json(
      {
        dry,
        total: records.length,
        belowThreshold: below.length,
        wouldBump: dry ? below.length : undefined,
        bumped: dry ? undefined : bumped,
      },
      { origin },
    );
  } catch (err) {
    return json(
      { error: 'Migration failed', code: 'INTERNAL_ERROR' },
      { status: 500, origin },
    );
  }
}
