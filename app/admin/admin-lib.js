/* Shared admin helpers: auth check + formatting.
 * Every /admin page imports from here. Auth is cookie-based: the
 * httpOnly `ucp_admin_token` cookie is validated server-side via
 * validateAdminToken — never exposed to browser JS. */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { ensureMongo } from '@/lib/ext/mongo';
import { validateAdminToken } from '@/lib/ext/admin';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';

export async function requireAdminPage() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value || null;
  const config = getConfig();
  if (!config.mongoUri) {
    return { admin: null, mongoDown: true, username: null };
  }
  try {
    await ensureMongo(config.mongoUri);
  } catch (_) {
    return { admin: null, mongoDown: true, username: null };
  }
  const admin = await validateAdminToken(token).catch(() => null);
  if (!admin) redirect('/admin/login');
  return { admin, mongoDown: false, username: admin.username };
}

export function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return String(v);
  }
}

export function fmtNum(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}
