import { json } from '@/lib/respond';
import { getLeaderboard } from '@/lib/ext/grades';
import { admitOrDeductCredit } from '@/lib/ext/credits';
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
 * With studentId: 402 when broke (never served a classmates board), 1 credit
 * deducted atomically after the board is built. source=app is free. */
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
  // The app is a first-party, free client: viewing a leaderboard there
  // never spends the extension's credits (app-only users never earn
  // them, so charging them would end in a dead "no credits" screen).
  const isApp = source === 'app';
  // Free app views are otherwise unbounded — cap them per student/IP so
  // one caller cannot exhaust the shared database.
  const gate = isApp
    ? rateLimit(callerKey(req, studentId), { limit: 180 })
    : { ok: true, retryAfterMs: 0 };
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
    if (isApp) {
      return json({ grades, free: true }, { origin });
    }
    if (studentId) {
      // Only charge when the view actually showed classmates — a self-only
      // result means nobody else has posted grades yet; charging there
      // drains credits for nothing. Admission is atomic: if the student
      // is out of credits they get 402 and NO board (and no deduction
      // beyond zero ever happens).
      const hasClassmates = grades.length > 1;
      if (!hasClassmates) {
        return json({ grades, free: true }, { origin });
      }
      const admit = await admitOrDeductCredit(studentId);
      if (!admit.ok) {
        return json(
          { error: 'No credits remaining', code: 'NO_CREDITS', credits: 0 },
          { status: 402, origin },
        );
      }
      return json(
        { grades, remainingCredits: admit.credits },
        { origin },
      );
    }
    return json({ grades }, { origin });
  } catch (err) {
    return extError(err, origin);
  }
}
