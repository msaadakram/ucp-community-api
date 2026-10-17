import { json } from '@/lib/respond';
import {
  adminLogin,
  adminLogout,
  validateAdminToken,
  adminTokenFromHeaders,
} from '@/lib/ext/admin';
import { adminLoginSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/admin/login — was POST /admin/api/login. */
export async function POST(req) {
  const { origin, response } = await extRoute(req, 'write');
  if (response) return response;
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400, origin },
    );
  }
  const checked = validateBody(adminLoginSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const result = await adminLogin(
      checked.value.username,
      checked.value.password,
    );
    if (!result) {
      return json(
        { error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' },
        { status: 401, origin },
      );
    }
    return json(
      {
        message: 'Login successful',
        token: result.token,
        username: result.username,
        expiresAt: result.expiresAt,
      },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}

export { adminLogout, validateAdminToken, adminTokenFromHeaders };
