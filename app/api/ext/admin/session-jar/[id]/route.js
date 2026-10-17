import { json } from '@/lib/respond';
import { cookies } from 'next/headers';
import { validateAdminToken } from '@/lib/ext/admin';
import { getCookieSessionById } from '@/lib/ext/cookies';
import { decryptCookieValue } from '@/lib/ext/vault-crypto';
import { extRoute } from '@/lib/ext/route';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* GET /api/ext/admin/session-jar/:id — masked jar for the admin UI.
 * Cookie-authenticated (httpOnly admin cookie), NOT Bearer: only the
 * first-party admin panel can call it. Values are sealed at rest:
 * decrypt, then mask (first 6 chars) — never full secrets. */

export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'read', {
    requireKey: false,
  });
  if (response) return response;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value || null;
  const session = await validateAdminToken(token).catch(() => null);
  if (!session) {
    return json(
      { error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
      { status: 401, origin },
    );
  }
  const { id } = await params;
  const doc = await getCookieSessionById(id).catch(() => null);
  if (!doc) {
    return json(
      { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
      { status: 404, origin },
    );
  }
  return json(
    {
      sessionId: doc.sessionId,
      cookies: (doc.cookies || []).map((c) => {
        const plain = decryptCookieValue(c.value);
        return {
          name: c.name,
          domain: c.domain,
          value: plain.slice(0, 6),
          length: plain.length,
        };
      }),
    },
    { origin },
  );
}
