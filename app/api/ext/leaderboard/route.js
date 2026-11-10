import { json } from '@/lib/respond';
import { getLeaderboard } from '@/lib/ext/grades';
import { getCredits } from '@/lib/ext/credits';
import { leaderboardQuerySchema } from '@/lib/ext/schemas';
import {
  validateQueryParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';
import { rateLimit, callerKey } from '@/lib/ext/rate-limit';

export const runtime = 'nodejs';

/* GET /api/ext/leaderboard?courseName=&studentId= — was GET /api/leaderboard.
 * The board is FREE and UNLIMITED for every client (app and extension):
 * no 402, no deduction — just a rate cap so nobody can hammer the database. */
export async function GET(req) {
  const { origin, response } = await extRoute(req, 'read');
  if (response) return response;
  const url = new URL(req.url);
  const checked = validateQueryParams(leaderboardQuerySchema, {
    courseName: url.searchParams.get('courseName'),
    studentId: url.searchParams.get('studentId') || undefined,
    courseCode: url.searchParams.get('courseCode') || undefined,
    source: url.searchParams.get('source') || undefined,
  });
  if (checked.response) return extEnvelope(checked.response, origin);
  const { courseName, studentId, courseCode, source } = checked.value;
  // Everyone gets the board free; cap per student/IP so one caller
  // cannot exhaust the shared database.
  const gate = rateLimit(callerKey(req, studentId), { limit: 180 });
  if (!gate.ok) {
    return json(
      {
        error: 'Too many leaderboard requests — try again shortly.',
        code: 'RATE_LIMITED',
        retryAfterMs: gate.retryAfterMs,
      },
      { status: 429, origin },
    );
  }
  try {
    const grades = await getLeaderboard(
      courseName,
      studentId || null,
      courseCode || null,
    );
    // Read the current balance for the UI if this looks like an extension
    // client — but never deduct for it.
    let remainingCredits;
    if (studentId) {
      try {
        const bal = await getCredits(studentId);
        remainingCredits = bal && bal.credits;
      } catch (_) {
        remainingCredits = undefined;
      }
    }
    return json({ grades, free: true, remainingCredits }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
