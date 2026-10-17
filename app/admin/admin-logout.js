'use client';

/* Logout island: DELETEs the cookie session, then routes to login. */

export default function LogoutButton() {
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={() => {
        fetch('/api/admin/session', { method: 'DELETE' }).finally(() => {
          window.location.href = '/admin/login';
        });
      }}
    >
      Log out
    </button>
  );
}
