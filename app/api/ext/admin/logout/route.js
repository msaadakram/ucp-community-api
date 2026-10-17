import { json } from '@/lib/respond';
import { adminLogout, adminTokenFromHeaders } from '@/lib/ext/admin';
import { extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/admin/logout — was POST /admin/api/logout. */
export async function POST(req) {
  const { origin, response } = await extRoute(req, 'read', { requireKey: false });
  if (response) return response;
  try {
    await adminLogout(adminTokenFromHeaders(req.headers));
    return json({ message: 'Logged out' }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
