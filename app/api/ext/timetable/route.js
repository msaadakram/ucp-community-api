import { json } from '@/lib/respond';
import { Timetable } from '@/lib/ext/models';
import { extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/timetable[?studentId=] — was GET /api/timetable-leaderboard.
 *
 * With a studentId: ONLY that student's own timetable rows.
 * Without one: the course CATALOGUE (distinct course names) — never the
 * raw rows of every student. The unscoped form used to ship every
 * student's timetable (ids, teachers, rooms) to every client: a 550 KB
 * payload that grew with the school and leaked the roster. */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const url = new URL(req.url);
  const studentId = (url.searchParams.get('studentId') || '').trim();
  try {
    if (studentId) {
      const data = await Timetable.find({ studentID: studentId }).lean();
      return json(data, { origin });
    }
    const names = await Timetable.distinct('courseName');
    return json(
      names
        .filter((n) => typeof n === 'string' && n.trim())
        .map((n) => ({ courseName: n.trim() })),
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
