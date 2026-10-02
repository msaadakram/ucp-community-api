/* Request authentication for App Router handlers: resolves the caller
 * from their Odoo portal session. Reads are open (campus feed); writes
 * require a live session (401 otherwise). */

import { verifyOdooSession } from './odoo.js';

export function sessionFromRequest(req) {
  const header = req.headers.get('x-ucp-session') || '';
  if (header.trim()) return header.trim();
  try {
    const url = new URL(req.url);
    return (url.searchParams.get('session_id') || '').trim();
  } catch (_) {
    return '';
  }
}

export async function resolveUser(config, req, verify = verifyOdooSession) {
  const sid = sessionFromRequest(req);
  if (!sid) return null;
  try {
    return await verify(config.odooBase, sid);
  } catch (_) {
    return null;
  }
}
