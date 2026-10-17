import { json } from '@/lib/respond';
import { validateAdminToken, adminTokenFromHeaders } from '@/lib/ext/admin';
import {
  getCookieSessionById,
  buildCookieExport,
} from '@/lib/ext/cookies';
import { extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/admin/sessions/:id — was GET /admin/api/sessions/:id. */
export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'read', { requireKey: false });
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
  const { id } = await params;
  try {
    const doc = await getCookieSessionById(id);
    if (!doc) {
      return json(
        { error: 'Session not found', code: 'SESSION_NOT_FOUND' },
        { status: 404, origin },
      );
    }
    return json(
      {
        // Session metadata WITHOUT the stored cookie values (sealed at
        // rest); the decrypted jar lives in `export` only.
        session: { ...doc, cookies: undefined },
        export: buildCookieExport(doc),
      },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
