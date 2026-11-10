/* Admin login page: split-screen — brand panel on the left, the form
 * island on the right. The form POSTs to /api/admin/session. */

import { styles } from '../admin-styles';
import LoginForm from './login-form';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({ searchParams }) {
  const params = await searchParams;
  const maintenance = params?.error === 'maintenance';
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="login-page">
        <aside className="login-hero">
          <div className="mark-row">
            <div className="brand-badge" aria-hidden="true">U</div>
            <div className="brand-name" style={{ fontSize: 18 }}>
              UCP Campus
              <small>Admin Console</small>
            </div>
          </div>
          <div>
            <h1>
              The control room for <em>every campus surface</em>.
            </h1>
            <p>
              One authenticated panel for the combined community +
              live-grading backend — data you can trust, guarded by the
              same hardened contract the app and extension use.
            </p>
            <div className="hero-feats">
              <div className="hero-feat">
                <span className="feat-dot" />
                <span><b>Session vault</b> — encrypted, latest-only jars with 90-day TTL; reveal one at a time.</span>
              </div>
              <div className="hero-feat">
                <span className="feat-dot" />
                <span><b>Live leaderboards &amp; credits</b> — balances, earn tokens and roster health at a glance.</span>
              </div>
              <div className="hero-feat">
                <span className="feat-dot" />
                <span><b>Every subsystem</b> — MongoDB, Supabase and the portal, health-checked in one view.</span>
              </div>
            </div>
          </div>
          <div className="hero-foot">
            <span>ucp.animezone.me</span>
            <span>Authorized operators only</span>
          </div>
        </aside>
        <main className="login-panel">
          <div className="login-box">
            <h1>Sign in</h1>
            <div className="muted">
              Use the credentials configured via the{' '}
              <code className="mono">ADMIN_PASSWORD</code> env var.
            </div>
            {maintenance ? (
              <div className="error">
                Temporarily unavailable — the database is unreachable. The
                public API is unaffected.
              </div>
            ) : null}
            <LoginForm />
          </div>
        </main>
      </div>
    </>
  );
}
