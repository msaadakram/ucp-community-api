/* Admin timetable + class-group browser. */

import { Timetable, SubjectGroup } from '@/lib/ext/models';
import { requireAdminPage, fmtDate } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminTimetablePage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const q = (sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page) || 1);
  const filter = q
    ? {
        $or: [
          { courseName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { studentID: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { teacher: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }
    : {};
  const [rows, total, groups] = await Promise.all([
    Timetable.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Timetable.countDocuments(filter),
    SubjectGroup.countDocuments({}),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell username={username} active="timetable">
      <h2 style={{ margin: '0 0 4px' }}>Timetable</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        {total} rows · {groups} class groups (leaderboard cohorts)
      </div>
      <form className="toolbar" method="get" action="/admin/timetable">
        <input
          name="q"
          placeholder="Search course / student / teacher…"
          defaultValue={q}
        />
        <button className="btn" type="submit">
          Search
        </button>
        {q ? (
          <a className="btn ghost" href="/admin/timetable">
            Clear
          </a>
        ) : null}
      </form>
      <table className="tbl">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Day · Time</th>
            <th>Teacher · Room</th>
            <th>Synced</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r._id)}>
              <td>
                <code className="mono">{r.studentID}</code>
              </td>
              <td>{r.courseName}</td>
              <td>
                {r.day} · {r.time}
              </td>
              <td>
                {r.teacher}
                {r.room ? ` · ${r.room}` : ''}
              </td>
              <td>{fmtDate(r.updatedAt)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                No rows match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="pager">
        {page > 1 ? (
          <a
            className="btn ghost"
            href={`/admin/timetable?q=${encodeURIComponent(q)}&page=${page - 1}`}
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
            href={`/admin/timetable?q=${encodeURIComponent(q)}&page=${page + 1}`}
          >
            Next →
          </a>
        ) : null}
      </div>
    </Shell>
  );
}
