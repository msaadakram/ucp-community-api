/* Admin earn panel: active referral tokens + how the loop works. */

import { RewardToken } from '@/lib/ext/models-misc';
import { requireAdminPage, fmtDate } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminEarnPage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);
  const [rows, total, used] = await Promise.all([
    RewardToken.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select('token userId used shortUrl createdAt')
      .lean(),
    RewardToken.countDocuments({}),
    RewardToken.countDocuments({ used: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell username={username} active="earn">
      <h2 style={{ margin: '0 0 4px' }}>Earn / referrals</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        {total} tokens · {used} claimed · referral links grant 50 credits via
        Cuty short URLs (503 when the shortener is down).
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>User</th>
            <th>Token</th>
            <th>Status</th>
            <th>Short URL</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={String(t._id)}>
              <td>
                <code className="mono">{t.userId}</code>
              </td>
              <td>
                <code className="mono">{String(t.token).slice(0, 12)}…</code>
              </td>
              <td>
                {t.used ? (
                  <span className="pill y">claimed</span>
                ) : (
                  <span className="pill g">active</span>
                )}
              </td>
              <td className="muted">
                {t.shortUrl ? String(t.shortUrl).slice(0, 40) + '…' : '—'}
              </td>
              <td>{fmtDate(t.createdAt)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">
                No tokens yet — they appear when students tap “earn” in the
                extension.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="pager">
        {page > 1 ? (
          <a className="btn ghost" href={`/admin/earn?page=${page - 1}`}>
            ← Prev
          </a>
        ) : null}
        <span>
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <a className="btn ghost" href={`/admin/earn?page=${page + 1}`}>
            Next →
          </a>
        ) : null}
      </div>
    </Shell>
  );
}
