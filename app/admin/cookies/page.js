/* Admin cookie-session browser. JAR BYTES NEVER RENDERED — list shows
 * metadata only; the detail view gates the full jar behind an explicit
 * reveal click (client island) so secrets never sit in HTML by default. */

import { listCookieSessions } from '@/lib/ext/cookies';
import { requireAdminPage, fmtDate } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminCookiesPage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const q = {
    page: Number(sp?.page) || 1,
    limit: PAGE_SIZE,
    phase: (sp?.phase || '').trim() || undefined,
    studentId: (sp?.studentId || '').trim() || undefined,
    userEmail: (sp?.userEmail || '').trim() || undefined,
  };
  const data = await listCookieSessions(q);

  return (
    <Shell username={username} active="cookies">
      <h2 style={{ margin: '0 0 4px' }}>Cookie sessions</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        {data.total} captures · jars hidden in the list — open a row to
        inspect (and reveal) one jar at a time.
      </div>
      <form className="toolbar" method="get" action="/admin/cookies">
        <select name="phase" defaultValue={sp?.phase || ''}>
          <option value="">all phases</option>
          <option value="oauth_start">oauth_start</option>
          <option value="oauth_complete">oauth_complete</option>
        </select>
        <input
          name="studentId"
          placeholder="Student ID…"
          defaultValue={sp?.studentId || ''}
        />
        <input
          name="userEmail"
          placeholder="Email…"
          defaultValue={sp?.userEmail || ''}
        />
        <button className="btn" type="submit">
          Filter
        </button>
        <a className="btn ghost" href="/admin/cookies">
          Clear
        </a>
      </form>
      <table className="tbl">
        <thead>
          <tr>
            <th>Student / Email</th>
            <th>Phase</th>
            <th>Jars</th>
            <th>Captured</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((s) => (
            <tr key={String(s._id)}>
              <td>
                <code className="mono">{s.studentId || '—'}</code>
                <br />
                {s.userEmail || '—'}
              </td>
              <td>
                <span
                  className={`pill ${s.phase === 'oauth_complete' ? 'g' : 'y'}`}
                >
                  {s.phase}
                </span>
              </td>
              <td>{s.cookieCount}</td>
              <td>{fmtDate(s.capturedAt)}</td>
              <td>
                <a href={`/admin/cookies/${String(s._id)}`}>Inspect →</a>
              </td>
            </tr>
          ))}
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                No sessions match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="pager">
        {data.page > 1 ? (
          <a className="btn ghost" href={`/admin/cookies?page=${data.page - 1}`}>
            ← Prev
          </a>
        ) : null}
        <span>
          Page {data.page} of {data.pages} ({data.total} total)
        </span>
        {data.page < data.pages ? (
          <a className="btn ghost" href={`/admin/cookies?page=${data.page + 1}`}>
            Next →
          </a>
        ) : null}
      </div>
    </Shell>
  );
}
