'use client';

/* Migrate trigger island: dry-run preview then guarded execute. */

import { useState } from 'react';

export default function MigrateRunner() {
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(dry) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(
        `/api/ext/admin/migrate-preview?dry=${dry ? '1' : '0'}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || `HTTP ${res.status}`);
      } else {
        setOut(body);
      }
    } catch (_) {
      setError('Could not reach the server');
    }
    setBusy(false);
  }

  async function execute() {
    if (
      !window.confirm(
        'Bump every sub-500 credit balance to 500? This writes to the database.',
      )
    ) {
      return;
    }
    await run(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn ghost" onClick={() => run(true)} disabled={busy}>
          {busy ? '…' : 'Dry-run preview'}
        </button>
        <button className="btn danger" onClick={execute} disabled={busy}>
          {busy ? '…' : 'Execute bump'}
        </button>
      </div>
      {error ? (
        <div className="error" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}
      {out ? (
        <table className="tbl" style={{ marginTop: 12 }}>
          <tbody>
            <tr>
              <th>Total credit rows</th>
              <td>{out.total}</td>
            </tr>
            <tr>
              <th>Below 500</th>
              <td>{out.belowThreshold}</td>
            </tr>
            <tr>
              <th>{out.dry ? 'Would bump' : 'Bumped'}</th>
              <td>{out.dry ? out.wouldBump : out.bumped}</td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
