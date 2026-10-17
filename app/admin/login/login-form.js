'use client';

/* Login form island: POSTs to the cookie session API, then routes in. */

import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Login failed');
        setBusy(false);
        return;
      }
      window.location.href = '/admin';
    } catch (_) {
      setError('Could not reach the server');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <div className="error">{error}</div> : null}
      <label htmlFor="u">Username</label>
      <input
        id="u"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <label htmlFor="p">Password</label>
      <input
        id="p"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
