import { getConfig } from '@/lib/config';
import { json } from '@/lib/respond';
import { saveGrade } from '@/lib/ext/grades';
import { saveGradesSchema } from '@/lib/ext/schemas';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/grades/save — was POST /api/save-grades. */
export async function POST(req) {
  const { config, origin, response } = await extRoute(req, 'write');
  if (response) return response;
  void config;
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400, origin },
    );
  }
  const checked = validateBody(saveGradesSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    await saveGrade(checked.value);
    return json({ message: 'Saved successfully' }, { status: 201, origin });
  } catch (err) {
    return extError(err, origin);
  }
}
