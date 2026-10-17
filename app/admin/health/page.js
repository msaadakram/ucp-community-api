/* Admin health panel: every subsystem in one place — Supabase,
 * Mongo, Odoo reachability, env presence, rate-bucket state. */

import mongoose from 'mongoose';
import { getConfig } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { ensureMongo } from '@/lib/ext/mongo';
import { requireAdminPage } from '../admin-lib';
import { Shell } from '../admin-shell';

export const dynamic = 'force-dynamic';

function Row({ label, ok, detail }) {
  return (
    <tr>
      <td>{label}</td>
      <td>
        {ok === null ? (
          <span className="pill y">unknown</span>
        ) : ok ? (
          <span className="pill g">ok</span>
        ) : (
          <span className="pill r">down</span>
        )}
      </td>
      <td className="muted">{detail}</td>
    </tr>
  );
}

export default async function AdminHealthPage() {
  const { username } = await requireAdminPage();
  const config = getConfig();

  let supa = { ok: false, detail: 'unreachable' };
  try {
    const db = getSupabase(config);
    const r = await db.from('community_posts').select('id', { count: 'exact', head: true });
    supa = { ok: !r.error, detail: r.error ? r.error.message : `${r.count ?? '?'} posts` };
  } catch (e) {
    supa = { ok: false, detail: e.message };
  }

  let mongo = { ok: false, detail: 'unreachable' };
  if (config.mongoUri) {
    try {
      await ensureMongo(config.mongoUri);
      const state = mongoose.connection.readyState;
      mongo = {
        ok: state === 1,
        detail: state === 1 ? `connected · ${mongoose.connection.name}` : `state=${state}`,
      };
    } catch (e) {
      mongo = { ok: false, detail: e.message };
    }
  } else {
    mongo = { ok: false, detail: 'MONGODB_URI unset' };
  }

  let odoo = { ok: null, detail: 'not probed (live check on each write)' };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`${config.odooBase}/web/session/get_session_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
      signal: ctl.signal,
    }).finally(() => clearTimeout(t));
    odoo = { ok: res.ok, detail: res.ok ? 'reachable' : `HTTP ${res.status}` };
  } catch (e) {
    odoo = { ok: false, detail: e.name === 'AbortError' ? 'timeout' : e.message };
  }

  const env = [
    ['SUPABASE_URL', !!process.env.SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', !!process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['MONGODB_URI', !!config.mongoUri],
    ['ADMIN_PASSWORD', !!process.env.ADMIN_PASSWORD],
    ['CUTY_API_TOKEN', !!config.cutyToken],
    ['BASE_URL', config.publicBaseUrl || '(unset)'],
  ];

  return (
    <Shell username={username} active="health">
      <h2 style={{ margin: '0 0 4px' }}>Health</h2>
      <div className="muted" style={{ marginBottom: 16 }}>
        Live probes run on every page load.
      </div>
      <table className="tbl" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Subsystem</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Supabase (community)" ok={supa.ok} detail={supa.detail} />
          <Row label="MongoDB (extension)" ok={mongo.ok} detail={mongo.detail} />
          <Row label="Odoo portal" ok={odoo.ok} detail={odoo.detail} />
        </tbody>
      </table>
      <h3 className="muted">ENVIRONMENT</h3>
      <table className="tbl">
        <tbody>
          {env.map(([k, v]) => (
            <tr key={k}>
              <th>
                <code className="mono">{k}</code>
              </th>
              <td>{typeof v === 'boolean' ? (v ? 'set' : 'missing') : v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
