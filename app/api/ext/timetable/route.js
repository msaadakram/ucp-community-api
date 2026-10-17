import { json } from '@/lib/respond';
import { Timetable } from '@/lib/ext/models';
import { extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/timetable — was GET /api/timetable-leaderboard.
 * Upstream returns the raw array (preserved verbatim). */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  try {
    const data = await Timetable.find({}).lean();
    return json(data, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
