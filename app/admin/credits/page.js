/* Admin credits panel: top balances + lookup + adjust form. */

import mongoose from 'mongoose';
import { getCredits } from '@/lib/ext/credits';
import { requireAdminPage } from '../admin-lib';
import { Shell } from '../admin-shell';
import AdjustForm from './credit-adjust';

export const dynamic = 'force-dynamic';

async function topBalances() {
  const docs = await mongoose.connection.db
    .collection('grades')
    .find({ courseName: '__credits__' })
    .sort({ credits: -1 })
    .limit(20)
    .toArray();
  return docs.map((d) => ({
    studentId: d.studentId,
    credits: d.credits ?? 0,
  }));
}

export default async function AdminCreditsPage({ searchParams }) {
  const { username } = await requireAdminPage();
  const sp = await searchParams;
  const lookup = (sp?.student || '').trim();
  let balance = null;
  if (lookup) {
    try {
      balance = await getCredits(lookup);
    } catch (_) {
      balance = { studentId: lookup, credits: 'error' };
    }
  }
  const top = await topBalances().catch(() => []);

  return (
    <Shell username={username} active="credits">
      <h2 style={{ margin: '0 0 4px' }}>Credits</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Leaderboard views cost 1 credit · 500 on first touch · referrals
        grant 50.
      </div>
      <form className="toolbar" method="get" action="/admin/credits">
        <input
          name="student"
          placeholder="Student ID lookup…"
          defaultValue={lookup}
        />
        <button className="btn" type="submit">
          Lookup
        </button>
      </form>
      {balance ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>Balance — {balance.studentId}</h3>
          <div className="big">{balance.credits}</div>
          <AdjustForm studentId={balance.studentId} />
        </div>
      ) : null}
      <h3 className="muted">TOP 20 BALANCES</h3>
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          {top.map((t, i) => (
            <tr key={t.studentId}>
              <td>{i + 1}</td>
              <td>
                <code className="mono">{t.studentId}</code>
              </td>
              <td>
                <span
                  className={`pill ${t.credits < 5 ? 'r' : t.credits < 50 ? 'y' : 'g'}`}
                >
                  {t.credits}
                </span>
              </td>
            </tr>
          ))}
          {top.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted">
                No credit accounts yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Shell>
  );
}
