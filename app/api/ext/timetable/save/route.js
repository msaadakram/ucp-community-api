import { json } from '@/lib/respond';
import { saveTimetable } from '@/lib/ext/timetable';
import { saveTimetableSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/timetable/save — was POST /api/save-timetable. */
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
  const checked = validateBody(saveTimetableSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const result = await saveTimetable(
      checked.value.studentID,
      checked.value.timetable,
    );
    return json(
      {
        message: 'Timetable saved and student grouped successfully',
        entriesSaved: result.entriesSaved,
      },
      { status: 201, origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
