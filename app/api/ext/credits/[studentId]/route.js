import { json } from '@/lib/respond';
import { getCredits } from '@/lib/ext/credits';
import { getCreditsParamsSchema } from '@/lib/ext/schemas2';
import {
  validateParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/credits/:studentId — was GET /api/credits/:studentId. */
export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const raw = await params;
  const checked = validateParams(getCreditsParamsSchema, {
    studentId: raw.studentId,
  });
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    return json(await getCredits(checked.value.studentId), { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
