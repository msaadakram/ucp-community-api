/* Admin grades browser: search by course/student, newest first. */

import { Grade } from '@/lib/ext/models';
import { requireAdminPage, fmtDate, fmtNum } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function shape(g) {
  return {
    id: String(g._id),
    studentId: g.studentId || '—',
    studentName: g.studentName || '—',
    courseName: g.courseName || '—',
    overall: fmtNum(g.overallPercentage),
    grade: g.grade || '—',
    hidden: g.hideName || g.hidePhoto || g.privacyMode,
    timestamp: fmtDate(g.timestamp),
  };
}

export default async function AdminGradesPage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const q = (sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page) || 1);
  const filter = {
    courseName: { $nin: ['__credits__', '__privacy__', '__earn_user__', '__earn_token__'] },
  };
  if (q) {
    filter.$or = [
      { courseName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { studentId: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { studentName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }
  const [rows, total] = await Promise.all([
    Grade.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Grade.countDocuments(filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell username={username} active="grades">
      <h2 style={{ margin: '0 0 4px' }}>Grades</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        {total} rows · newest first · privacy-hidden rows flagged
      </div>
      <form className="toolbar" method="get" action="/admin/grades">
        <input name="q" placeholder="Search course / student…" defaultValue={q} />
        <button className="btn" type="submit">
          Search
        </button>
        {q ? (
          <a className="btn ghost" href="/admin/grades">
            Clear
          </a>
        ) : null}
      </form>
      <table className="tbl">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>%</th>
            <th>Grade</th>
            <th>Privacy</th>
            <th>Saved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = shape(r);
            return (
              <tr key={s.id}>
                <td>
                  {s.studentName}
                  <br />
                  <code className="mono">{s.studentId}</code>
                </td>
                <td>{s.courseName}</td>
                <td>{s.overall}</td>
                <td>
                  <span className="pill b">{s.grade}</span>
                </td>
                <td>
                  {s.hidden ? (
                    <span className="pill y">hidden</span>
                  ) : (
                    <span className="pill g">visible</span>
                  )}
                </td>
                <td>{s.timestamp}</td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No grades match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="pager">
        {page > 1 ? (
          <a
            className="btn ghost"
            href={`/admin/grades?q=${encodeURIComponent(q)}&page=${page - 1}`}
          >
            ← Prev
          </a>
        ) : null}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <a
            className="btn ghost"
            href={`/admin/grades?q=${encodeURIComponent(q)}&page=${page + 1}`}
          >
            Next →
          </a>
        ) : null}
      </div>
    </Shell>
  );
}
