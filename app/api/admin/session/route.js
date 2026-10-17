/* Cookie session wrapper around the Bearer admin API.
 * The admin UI is server-rendered: login sets an httpOnly cookie that
 * server components validate directly via validateAdminToken — the
 * Bearer token never touches browser JS. */

import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { json } from '@/lib/respond';
import { adminLogin, adminLogout } from '@/lib/ext/admin';
import { ADMIN_COOKIE } from '@/lib/ext/admin-cookie';
import { adminLoginSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 24 * 60 * 60; // 24h, mirrors admin session TTL

/* POST /api/admin/session {username, password} — login, set cookie. */
export async function POST(req) {
  const { origin, response } = await extRoute(req, 'write');
  if (response) return response;
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400, origin },
    );
  }
  const checked = validateBody(adminLoginSchema, body);
  if (checked.response) return extEnvelope(checked.response, origin);
  try {
    const result = await adminLogin(
      checked.value.username,
      checked.value.password,
    );
    if (!result) {
      return json(
        { error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' },
        { status: 401, origin },
      );
    }
    const res = NextResponse.json(
      { ok: true, username: result.username, expiresAt: result.expiresAt },
      { status: 200 },
    );
    res.cookies.set(ADMIN_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return extError(err, origin);
  }
}

/* DELETE /api/admin/session — logout, clear cookie. Works even when the
 * database is unreachable (best-effort revoke + always clear cookie). */
export async function DELETE(req) {
  const { origin } = { origin: getConfig().corsOrigin || '*' };
  const token = req.cookies.get(ADMIN_COOKIE)?.value || null;
  try {
    if (token) await adminLogout(token);
  } catch (_) {}
  const res = json({ ok: true }, { origin });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
