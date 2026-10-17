import { json } from '@/lib/respond';
import { validateAdminToken, adminTokenFromHeaders } from '@/lib/ext/admin';
import { listCookieSessions } from '@/lib/ext/cookies';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

function denied(origin) {
  return json(
    { error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
    { status: 401, origin },
  );
}

/* GET /api/ext/admin/sessions?... — was GET /admin/api/sessions. */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read', { requireKey: false });
  if (response) return response;
  const session = await validateAdminToken(
    adminTokenFromHeaders(req.headers),
  ).catch(() => null);
  if (!session) return denied(origin);
  const url = new URL(req.url);
  try {
    return json(
      await listCookieSessions({
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit'),
        phase: url.searchParams.get('phase'),
        studentId: url.searchParams.get('studentId'),
        userName: url.searchParams.get('userName'),
        userEmail: url.searchParams.get('userEmail'),
        dateFrom: url.searchParams.get('dateFrom'),
        dateTo: url.searchParams.get('dateTo'),
      }),
      { origin },
    );
  } catch (err) {
    return json(
      { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      { status: 500, origin },
    );
  }
}
