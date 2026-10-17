import { json } from '@/lib/respond';
import { getLeaderboard } from '@/lib/ext/grades';
import { getCredits, deductCredit } from '@/lib/ext/credits';
import { leaderboardQuerySchema } from '@/lib/ext/schemas';
import {
  validateQueryParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/leaderboard?courseName=&studentId= — was GET /api/leaderboard.
 * With studentId: 402 when broke, deduct 1 after serving. */
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
    if (studentId) {
      try {
        const creditRecord = await getCredits(studentId);
        if (creditRecord.credits < 1) {
          return json(
            { error: 'No credits remaining', code: 'NO_CREDITS', credits: 0 },
            { status: 402, origin },
          );
        }
      } catch (_) {
        // Credit check failure never blocks the leaderboard (upstream parity).
      }
    }
    const grades = await getLeaderboard(courseName, studentId || null);
    if (studentId) {
      try {
        const updated = await deductCredit(studentId);
        return json(
          { grades, remainingCredits: updated.credits },
          { origin },
        );
      } catch (_) {
        return json({ grades }, { origin });
      }
    }
    return json({ grades }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
