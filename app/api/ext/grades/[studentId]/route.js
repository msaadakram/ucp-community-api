import { json } from '@/lib/respond';
import { Grade } from '@/lib/ext/models';
import { extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/grades/:studentId — was GET /api/grades/:studentId. */
export async function GET(req, { params }) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const { studentId } = await params;
  try {
    const grades = await Grade.find({ studentId })
      .sort({ courseName: 1 })
      .select(
        'courseName courseCode overallPercentage grade assessments classAverage timestamp',
      );
    return json({ studentId, grades, count: grades.length }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
