import { getConfig } from '@/lib/config';
import { json } from '@/lib/respond';

export const runtime = 'nodejs';

/* GET /api/health — one check for the ONE backend.
 *
 * The same deployment serves the Android app (community routes), the Chrome
 * extension (/api/ext/*) and the admin panel, so the health payload names
 * every surface it owns. */
export async function GET() {
  const config = getConfig();
  if (!config.ok) return json({ ok: false }, { status: 500 });
  return json({
    ok: true,
    time: new Date().toISOString(),
    deployment: 'heroku:ucp-campus-community',
    host: 'https://ucp.animezone.me',
    singleBackend: true,
    serves: {
      app: ['community', 'leaderboard', 'teachers', 'posts'],
      extension: [
        'grades',
        'timetable',
        'leaderboard',
        'roster',
        'privacy',
        'credits',
      ],
      admin: true,
    },
  });
}
