import { json } from '@/lib/respond';
import { cookies } from 'next/headers';
import Joi from 'joi';
import { validateAdminToken } from '@/lib/ext/admin';
import { addCredits } from '@/lib/ext/credits';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute, requireSameOrigin } from '@/lib/ext/route';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const adjustSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required(),
  amount: Joi.number().integer().min(-1000).max(1000).required(),
});

/* POST /api/ext/admin/credits-adjust {studentId, amount} — admin-only
 * credit grant/revoke. Cookie-authenticated (first-party panel only). */

export async function POST(req) {
  const { origin, response } = await extRoute(req, 'write', { requireKey: false });
  if (response) return response;
  const store = await cookies();
  const session = await validateAdminToken(
    store.get(ADMIN_COOKIE)?.value || null,
  ).catch(() => null);
  if (!session) {
    return json(
      { error: 'Unauthorized', code: 'ADMIN_AUTH_REQUIRED' },
      { status: 401, origin },
    );
  }
  // CSRF guard: browser mutations must be same-origin (or set the custom
  // header, which cross-site forms cannot).
  if (!requireSameOrigin(req)) {
    return json(
      { error: 'Same-origin required', code: 'CSRF_GUARD' },
      { status: 403, origin },
    );
  }
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400, origin },
    );
  }
  const checked = validateBody(adjustSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const out = await addCredits(
      checked.value.studentId,
      checked.value.amount,
    );
    return json(
      { ok: true, studentId: out.studentId, credits: out.credits },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
