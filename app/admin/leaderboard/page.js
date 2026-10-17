/* Admin leaderboard inspector: pick a course, see classmate scoping. */

import { getLeaderboard } from '@/lib/ext/grades';
import { requireAdminPage, fmtDate } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLeaderboardPage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const courseName = (sp?.course || '').trim();
  const studentId = (sp?.student || '').trim();
  let rows = [];
  let error = '';
  if (courseName) {
    try {
      rows = await getLeaderboard(courseName, studentId || null);
    } catch (e) {
      error = e.message || 'Lookup failed';
    }
  }

  return (
    <Shell username={username} active="leaderboard">
      <h2 style={{ margin: '0 0 4px' }}>Leaderboard</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Same scoping the extension sees: with a student ID → classmates only;
        without → whole course. Read-only (no credits touched).
      </div>
      <form className="toolbar" method="get" action="/admin/leaderboard">
        <input
          name="course"
          placeholder="Course name…"
          defaultValue={courseName}
          required
        />
        <input
          name="student"
          placeholder="Student ID (optional)…"
          defaultValue={studentId}
        />
        <button className="btn" type="submit">
          Inspect
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {courseName ? (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Student</th>
              <th>%</th>
              <th>Grade</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g, i) => (
              <tr key={String(g._id || i)}>
                <td>{i + 1}</td>
                <td>
                  {g.studentName || '—'}
                  <br />
                  <code className="mono">{g.studentId || '—'}</code>
                </td>
                <td>{g.overallPercentage ?? '—'}</td>
                <td>
                  <span className="pill b">{g.grade || '—'}</span>
                </td>
                <td>{fmtDate(g.timestamp)}</td>
              </tr>
            ))}
            {rows.length === 0 && !error ? (
              <tr>
                <td colSpan={5} className="muted">
                  No rows for this course.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      ) : null}
    </Shell>
  );
}
