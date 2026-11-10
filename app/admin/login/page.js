/* Admin login page. Server component renders the shell; the form is
 * a client island that talks to POST /api/admin/session. */

import { styles } from '../admin-styles';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const maintenance = params?.error === 'maintenance';
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="wrap">
        <div className="login-box">
          <h1>UCP Admin</h1>
          <div className="muted">
            Control panel for the combined community + extension backend.
          </div>
          {maintenance ? (
            <div className="error" style={{ marginTop: 14 }}>
              Temporarily unavailable — the database is unreachable. The
              public API is unaffected.
            </div>
          ) : null}
          <LoginForm />
          <div className="muted" style={{ marginTop: 14 }}>
            Sign in with the credentials configured via the{' '}
            <code className="mono">ADMIN_PASSWORD</code> env var.
          </div>
        </div>
      </div>
    </>
  );
}
