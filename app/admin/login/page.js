/* Admin login page. Server component renders the shell; the form is
 * a client island that talks to POST /api/admin/session. */

import { styles } from '../admin-styles';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="wrap">
        <div className="login-box">
          <h1>UCP Admin</h1>
          <div className="muted">
            Control panel for the combined community + extension backend.
          </div>
          <LoginForm />
          <div className="muted" style={{ marginTop: 14 }}>
            Default seed is <code className="mono">admin / admin</code> — set
            the <code className="mono">ADMIN_PASSWORD</code> env var in
            production.
          </div>
        </div>
      </div>
    </>
  );
}
