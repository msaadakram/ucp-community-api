import { json } from '@/lib/respond';
import {
  validateQueryParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { leaderboardQuerySchema } from '@/lib/ext/schemas';
import { extRoute } from '@/lib/ext/route';
import { SubjectGroup } from '@/lib/ext/models';
import { bareCourseName, escapeRegex, courseNameVariantsFilter } from '@/lib/ext/course-key';

export const runtime = 'nodejs';

/* GET /api/ext/roster?courseName=&studentId= — who is in this class
 * section. Read-only verification for the app: it proves the roster was
 * built (app sync or extension sync) and how many classmates the
 * student is grouped with, before any grades exist. */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const url = new URL(req.url);
  const checked = validateQueryParams(leaderboardQuerySchema, {
    courseName: url.searchParams.get('courseName'),
    studentId: url.searchParams.get('studentId') || undefined,
  });
  if (checked.response) return extEnvelope(checked.response, origin);
  const { courseName, studentId } = checked.value;
  try {
    const groups = await SubjectGroup.find({
      ...courseNameVariantsFilter(courseName),
    })
      .select('courseName studentIds')
      .lean();

    const ids = new Set();
    const sections = new Set();
    for (const g of groups) {
      for (const id of g.studentIds || []) ids.add(id);
      const m = String(g.courseName || '').match(/\(\s*([^)]+)\s*\)\s*$/);
      if (m) sections.add(m[1].trim().toLowerCase());
    }
    const classmates = studentId
      ? [...ids].filter((id) => id !== studentId)
      : [...ids];
    return json(
      {
        courseName,
        sections: [...sections],
        rosterSize: ids.size,
        classmates: classmates.length,
        youAreIn: studentId ? ids.has(studentId) : false,
        // Ids are only exposed to the extension/app that owns them;
        // the count is what the UI shows.
        studentIds: studentId ? classmates : undefined,
      },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
