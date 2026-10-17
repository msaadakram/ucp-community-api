import { json } from '@/lib/respond';
import { Grade, Timetable } from '@/lib/ext/models';
import { checkStudentParamsSchema } from '@/lib/ext/schemas2';
import {
  validateParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/students/:id/check — was GET /api/check-student/:studentId. */
export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const raw = await params;
  const checked = validateParams(checkStudentParamsSchema, {
    studentId: raw.id,
  });
  if (checked.response) return extEnvelope(checked.response, origin);
  const { studentId } = checked.value;
  try {
    const gradeExists = await Grade.exists({ studentId });
    const timetableDoc = await Timetable.findOne({ studentID: studentId })
      .sort({ updatedAt: -1 })
      .select('updatedAt')
      .lean();
    return json(
      {
        exists: !!(gradeExists || timetableDoc),
        hasTimetable: !!timetableDoc,
        lastTimetableUpdate: timetableDoc ? timetableDoc.updatedAt : null,
      },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
