/* Admin migration panel: bump-credits dry-run + guarded execute. */

import mongoose from 'mongoose';
import { requireAdminPage } from '../admin-lib';
import { Shell } from '../admin-shell';
import MigrateRunner from './_runner';

export const dynamic = 'force-dynamic';

async function preview() {
  const docs = await mongoose.connection.db
    .collection('grades')
    .find({ courseName: '__credits__' })
    .project({ credits: 1 })
    .toArray();
  const below = docs.filter((d) => (d.credits || 0) < 500).length;
  return { total: docs.length, below };
}

export default async function AdminMigratePage() {
  const { username } = await requireAdminPage();
  const p = await preview().catch(() => ({ total: '—', below: '—' }));

  return (
    <Shell username={username} active="migrate">
      <h2 style={{ margin: '0 0 4px' }}>Migrate</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Bump-credits: raises every sub-500 balance to 500. Same logic as the
        old <code className="mono">GET /migrate/bump-credits</code> endpoint —
        now admin-gated with a dry-run first.
      </div>
      <div className="grid">
        <div className="card">
          <h3>Credit rows</h3>
          <div className="big">{p.total}</div>
        </div>
        <div className="card">
          <h3>Below 500</h3>
          <div className="big">{p.below}</div>
        </div>
      </div>
      <MigrateRunner />
    </Shell>
  );
}
