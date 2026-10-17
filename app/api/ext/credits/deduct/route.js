import { json } from '@/lib/respond';
import { deductCredit } from '@/lib/ext/credits';
import { deductCreditSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/credits/deduct — was POST /api/credits/deduct. */
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
  const checked = validateBody(deductCreditSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    return json(await deductCredit(checked.value.studentId), { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
