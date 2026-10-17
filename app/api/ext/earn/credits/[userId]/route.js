import { json } from '@/lib/respond';
import { getCredits } from '@/lib/ext/credits';
import { creditsParamsSchema } from '@/lib/ext/schemas2';
import {
  validateParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/earn/credits/:userId — was GET /api/earn/credits/:userId. */
export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'earnVerify');
  if (response) return response;
  const raw = await params;
  const checked = validateParams(creditsParamsSchema, {
    userId: raw.userId,
  });
  if (checked.response) {
    return json(
      { error: 'userId is required', code: 'VALIDATION_ERROR' },
      { status: 400, origin },
    );
  }
  try {
    const result = await getCredits(checked.value.userId.trim());
    return json(
      { userId: checked.value.userId.trim(), credits: result.credits },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
