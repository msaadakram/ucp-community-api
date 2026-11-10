/* Admin overview: live collection counts + subsystem status.
 * Server component queries Mongoose + Supabase directly (no HTTP hop). */

import { getConfig } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { ensureMongo } from '@/lib/ext/mongo';
import { Grade, Timetable, SubjectGroup } from '@/lib/ext/models';
import { CookieSession } from '@/lib/ext/models-cookies';
import { RewardToken } from '@/lib/ext/models-misc';
import { requireAdminPage, fmtDate } from './admin-lib';
import { Shell } from './admin-shell';

export const dynamic = 'force-dynamic';

async function mongoCounts() {
  const [
    grades,
    timetables,
    groups,
    cookies,
    tokens,
    privacy,
    credits,
    recent,
  ] = await Promise.all([
    Grade.countDocuments({ courseName: { $nin: ['__credits__', '__privacy__', '__earn_user__', '__earn_token__'] } }),
    Timetable.countDocuments({}),
    SubjectGroup.countDocuments({}),
    CookieSession.countDocuments({}),
    RewardToken.countDocuments({ used: false }),
    Grade.countDocuments({ courseName: '__privacy__' }),
    Grade.countDocuments({ courseName: '__credits__' }),
    CookieSession.find({})
      .sort({ capturedAt: -1 })
      .limit(6)
      .select('studentId userEmail source phase capturedAt')
      .lean(),
  ]);
  const latest = await Grade.findOne({
    courseName: { $nin: ['__credits__', '__privacy__', '__earn_user__', '__earn_token__'] },
  })
    .sort({ timestamp: -1 })
    .select('timestamp courseName')
    .lean();
  return { grades, timetables, groups, cookies, tokens, privacy, credits, latest, recent };
}

async function communityCounts(config) {
  try {
    const db = getSupabase(config);
    const [posts, comments, teachers] = await Promise.all([
      db.from('community_posts').select('id', { count: 'exact', head: true }),
      db.from('community_comments').select('id', { count: 'exact', head: true }),
      db.from('teachers').select('slug', { count: 'exact', head: true }),
    ]);
    return {
      posts: posts.count ?? '—',
      comments: comments.count ?? '—',
      teachers: teachers.count ?? '—',
      ok: true,
    };
  } catch (_) {
    return { posts: '—', comments: '—', teachers: '—', ok: false };
  }
}

export default async function AdminOverviewPage() {
  const { username } = await requireAdminPage();
  const config = getConfig();
  let m = null;
  try {
    await ensureMongo(config.mongoUri);
    m = await mongoCounts();
  } catch (_) {
    m = null;
  }
  const c = await communityCounts(config);

  return (
    <Shell
      username={username}
      active="overview"
      actions={<a className="btn ghost sm" href="/admin/health">Run health checks</a>}
    >
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">
        Live counts from MongoDB (extension) + Supabase (community), refreshed on every load.
      </p>
      {!m ? (
        <div className="error" style={{ marginTop: 12 }}>
          MongoDB unreachable — set <code className="mono">MONGODB_URI</code> and restart,
          then reload this page.
        </div>
      ) : null}

      <div className="section-label">Extension · MongoDB</div>
      <div className="grid">
        <div className="card">
          <h3>Grade rows</h3>
          <div className="big">{m ? m.grades : '—'}</div>
          <div className="sub">
            latest:{' '}
            {m && m.latest
              ? `${m.latest.courseName} · ${fmtDate(m.latest.timestamp)}`
              : '—'}
          </div>
        </div>
        <div className="card">
          <h3>Timetable rows</h3>
          <div className="big">{m ? m.timetables : '—'}</div>
          <div className="sub">{m ? `${m.groups} class groups` : '—'}</div>
        </div>
        <div className="card">
          <h3>Session jars stored</h3>
          <div className="big">{m ? m.cookies : '—'}</div>
          <div className="sub">latest-sync vault · 90-day TTL</div>
        </div>
        <div className="card">
          <h3>Active earn tokens</h3>
          <div className="big">{m ? m.tokens : '—'}</div>
          <div className="sub">unused, unexpired</div>
        </div>
        <div className="card">
          <h3>Privacy rows</h3>
          <div className="big">{m ? m.privacy : '—'}</div>
          <div className="sub">students with overrides</div>
        </div>
        <div className="card">
          <h3>Credit accounts</h3>
          <div className="big">{m ? m.credits : '—'}</div>
          <div className="sub">500 on first touch</div>
        </div>
      </div>

      {m && m.recent && m.recent.length > 0 ? (
        <>
          <div className="section-label">Latest session captures</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Phase</th>
                <th>Source</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody>
              {m.recent.map((r, i) => (
                <tr key={i}>
                  <td><code className="mono">{r.studentId || '—'}</code></td>
                  <td>{r.userEmail}</td>
                  <td>{r.phase}</td>
                  <td>{r.source}</td>
                  <td>{fmtDate(r.capturedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className="section-label">Community · Supabase</div>
      <div className="grid">
        <div className="card">
          <h3>Posts</h3>
          <div className="big">{c.posts}</div>
        </div>
        <div className="card">
          <h3>Comments</h3>
          <div className="big">{c.comments}</div>
        </div>
        <div className="card">
          <h3>Teachers</h3>
          <div className="big">{c.teachers}</div>
        </div>
        <div className="card">
          <h3>Supabase</h3>
          <div className="big" style={{ fontSize: 22 }}>
            {c.ok ? 'reachable' : 'down'}
          </div>
        </div>
      </div>
    </Shell>
  );
}
