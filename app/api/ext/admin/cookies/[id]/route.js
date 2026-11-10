import { json } from '@/lib/respond';
import { cookies } from 'next/headers';
import { validateAdminToken } from '@/lib/ext/admin';
import { deleteCookieSession } from '@/lib/ext/cookies';
import { extError } from '@/lib/ext/validate';
import { extRoute, requireSameOrigin } from '@/lib/ext/route';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* DELETE /api/ext/admin/cookies/:id — delete ONE jar. First-party panel
 * only; cookie-authenticated + same-origin guard. */
export async function DELETE(req, { params }) {
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
  const raw = await params;
  try {
    const deleted = await deleteCookieSession(raw.id);
    return json({ ok: true, deleted }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
