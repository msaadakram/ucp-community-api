'use client';

/* Credit adjust island: add/subtract via the admin adjust API. */

import { useState } from 'react';

export default function AdjustForm({ studentId }) {
  const [amount, setAmount] = useState(50);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function adjust(e) {
    e.preventDefault();
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/ext/admin/credits-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount: Number(amount) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote('Error: ' + (body.error || res.status));
      } else {
        setNote(`New balance: ${body.credits}`);
      }
    } catch (_) {
      setNote('Could not reach the server');
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={adjust}
      style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
    >
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          background: '#101619',
          border: '1px solid #2b383f',
          color: '#e8eef1',
          borderRadius: 10,
          padding: '8px 12px',
          width: 110,
        }}
      />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? '…' : 'Adjust'}
      </button>
      {note ? <span className="muted">{note}</span> : null}
    </form>
  );
}
