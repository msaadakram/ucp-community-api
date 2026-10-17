import { json } from '@/lib/respond';
import { saveCookieSession } from '@/lib/ext/cookies';
import { saveCookiesSchema } from '@/lib/ext/schemas';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';
/* Cookie payloads are full browser jars — allow well above the
 * community 256kb/1mb JSON defaults (Express allowed 10mb). */
export const maxDuration = 30;

/* POST /api/ext/cookies/save — was POST /api/cookies/save. */
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
  const checked = validateBody(saveCookiesSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const result = await saveCookieSession(checked.value);
    return json(
      { message: 'Cookies saved successfully', ...result },
      { status: 201, origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
