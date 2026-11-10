'use client';

/* Admin-side jar actions (delete one / purge all). First-party panel
 * calls go through the same-origin cookie session + CSRF guard. */

import { useState } from 'react';

async function callDelete(url) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'x-admin-request': '1' },
  });
  return res.ok;
}

export function DeleteJarButton({ id }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!window.confirm('Delete this session jar? This cannot be undone.')) return;
    setBusy(true);
    const ok = await callDelete(`/api/ext/admin/cookies/${id}`);
    if (ok) {
      window.location.reload();
      return;
    }
    alert('Delete failed');
    setBusy(false);
  }
  return (
    <button className="btn danger" style={{ padding: '6px 12px' }} disabled={busy} onClick={remove}>
      {busy ? '…' : 'Delete'}
    </button>
  );
}

export function PurgeAllButton({ studentId }) {
  const [busy, setBusy] = useState(false);
  async function purgeAll() {
    const typed = window.prompt(
      studentId
        ? `Type PURGE to delete every stored jar for ${studentId}`
        : 'Type PURGE to delete EVERY stored session jar',
      '',
    );
    if (typed !== 'PURGE') return;
    setBusy(true);
    const url = studentId
      ? `/api/ext/admin/cookies?studentId=${encodeURIComponent(studentId)}`
      : '/api/ext/admin/cookies';
    const ok = await callDelete(url);
    if (ok) {
      window.location.reload();
      return;
    }
    alert('Purge failed');
    setBusy(false);
  }
  return (
    <button className="btn danger" disabled={busy} onClick={purgeAll}>
      {busy ? 'Deleting…' : studentId ? 'Delete jars for student' : 'Purge ALL jars'}
    </button>
  );
}
