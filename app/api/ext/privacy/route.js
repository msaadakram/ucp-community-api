import { json } from '@/lib/respond';
import { setPrivacy } from '@/lib/ext/privacy';
import { privacyUpdateSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/privacy — was POST /api/privacy. */
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
  const checked = validateBody(privacyUpdateSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const { studentId, hideName, hidePhoto } = checked.value;
    return json(await setPrivacy(studentId, hideName, hidePhoto), { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
