import { json } from '@/lib/respond';
import { cookies } from 'next/headers';
import Joi from 'joi';
import { validateAdminToken } from '@/lib/ext/admin';
import { purgeCookieSessions } from '@/lib/ext/cookies';
import { validateQueryParams, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute, requireSameOrigin } from '@/lib/ext/route';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const purgeQuerySchema = Joi.object({
  studentId: Joi.string().trim().min(2).max(40).optional(),
});

/* DELETE /api/ext/admin/cookies[?studentId=…] — wipe every stored jar
 * (or just one student's current jar). First-party panel only;
 * cookie-authenticated + same-origin guard, like credits-adjust. */
export async function DELETE(req) {
  const { origin, response } = await extRoute(req, 'write', { requireKey: false });
  if (response) return response;
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
  if (!requireSameOrigin(req)) {
    return json(
      { error: 'Same-origin required', code: 'CSRF_GUARD' },
      { status: 403, origin },
    );
  }
  const url = new URL(req.url);
  const q = validateQueryParams(purgeQuerySchema, {
    studentId: url.searchParams.get('studentId') || undefined,
  });
  if (q.response) return extEnvelope(q.response, origin);
  try {
    const out = await purgeCookieSessions({
      studentId: q.value.studentId,
    });
    return json({ ok: true, ...out }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
