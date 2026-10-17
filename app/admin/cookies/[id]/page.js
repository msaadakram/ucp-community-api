/* Single cookie-session inspector: metadata server-rendered, jar
 * bytes behind the JarReveal client island. */

import { getCookieSessionById } from '@/lib/ext/cookies';
import { requireAdminPage, fmtDate } from '../../admin-lib';
import { Shell } from '../../admin-shell';
import JarReveal from './jar-reveal';

export const dynamic = 'force-dynamic';

export default async function AdminCookieDetailPage({ params }) {
  const { username } = await requireAdminPage();
  const { id } = await params;
  const s = await getCookieSessionById(id).catch(() => null);
  if (!s) {
    return (
      <Shell username={username} active="cookies">
        <div className="error">Session not found.</div>
        <a href="/admin/cookies">← Back to sessions</a>
      </Shell>
    );
  }

  return (
    <Shell username={username} active="cookies">
      <a href="/admin/cookies">← Back to sessions</a>
      <h2 style={{ margin: '8px 0 4px' }}>Session inspector</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Metadata is safe to show. Jar bytes stay server-side until you
        explicitly reveal them.
      </div>
      <div className="grid">
        <div className="card">
          <h3>Student</h3>
          <div className="big" style={{ fontSize: 18 }}>
            {s.studentId || '—'}
          </div>
          <div className="sub">
            {s.userName || '—'} · {s.userEmail || '—'}
          </div>
        </div>
        <div className="card">
          <h3>Phase</h3>
          <div className="big" style={{ fontSize: 18 }}>
            {s.phase}
          </div>
          <div className="sub">{s.source}</div>
        </div>
        <div className="card">
          <h3>Cookies</h3>
          <div className="big">{s.cookieCount}</div>
          <div className="sub">{fmtDate(s.capturedAt)}</div>
        </div>
      </div>
      <table className="tbl" style={{ marginBottom: 14 }}>
        <tbody>
          <tr>
            <th>Session ID</th>
            <td>
              <code className="mono">{s.sessionId}</code>
            </td>
          </tr>
          <tr>
            <th>Trigger URL</th>
            <td>
              <code className="mono">{s.triggerUrl}</code>
            </td>
          </tr>
          <tr>
            <th>Domains</th>
            <td>{(s.domains || []).join(', ') || '—'}</td>
          </tr>
          <tr>
            <th>User agent</th>
            <td className="muted">{s.userAgent || '—'}</td>
          </tr>
          <tr>
            <th>Extension</th>
            <td className="muted">
              {s.metadata?.extensionVersion || '—'} · tab{' '}
              {s.metadata?.tabId ?? '—'}
            </td>
          </tr>
        </tbody>
      </table>
      <JarReveal id={String(s._id)} />
    </Shell>
  );
}
