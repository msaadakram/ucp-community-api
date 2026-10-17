'use client';

/* Reveal island for one cookie jar: fetches the session detail (which
 * includes jar bytes) only after an explicit click, then hides again.
 * Nothing secret renders server-side. */

import { useState } from 'react';

export default function JarReveal({ id }) {
  const [open, setOpen] = useState(false);
  const [jar, setJar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function reveal() {
    if (open) {
      setOpen(false);
      setJar(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/ext/admin/session-jar/${id}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Fetch failed');
        setBusy(false);
        return;
      }
      setJar(body.cookies || []);
      setOpen(true);
    } catch (_) {
      setError('Could not reach the server');
    }
    setBusy(false);
  }

  return (
    <div>
      <button className="btn danger" type="button" onClick={reveal} disabled={busy}>
        {busy ? 'Loading…' : open ? 'Hide jar (clears bytes)' : 'Reveal cookie jar'}
      </button>
      {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      {open && jar ? (
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Domain</th>
              <th>Value (masked)</th>
            </tr>
          </thead>
          <tbody>
            {jar.map((c, i) => (
              <tr key={i}>
                <td>
                  <code className="mono">{c.name}</code>
                </td>
                <td>{c.domain}</td>
                <td>
                  <code className="mono">
                    {String(c.value || '').slice(0, 6)}…
                    ({String(c.value || '').length} chars)
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div className="muted" style={{ marginTop: 8 }}>
        Values are masked to the first 6 chars even after reveal. Full bytes
        are only available via the API export with a Bearer token.
      </div>
    </div>
  );
}
