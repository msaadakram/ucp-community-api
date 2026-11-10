import { NextResponse } from 'next/server';

/* Shared JSON helpers: consistent envelopes + CORS on every API answer. */

export function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-ucp-session, x-api-key, x-admin-request',
    'Access-Control-Max-Age': '86400',
  };
}

export function json(data, { status = 200, origin = '*' } = {}) {
  return NextResponse.json(data, { status, headers: cors(origin) });
}

export function fail(message, { status = 502, origin = '*' } = {}) {
  return json({ error: message }, { status, origin });
}

export function needConfig(config) {
  if (!config.ok) {
    return fail(
      'server misconfigured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      { status: 500, origin: '*' },
    );
  }
  return null;
}

export function unauthorized(origin) {
  return fail(
    'portal session expired or missing — sign in again in the app',
    { status: 401, origin },
  );
}

/// Trust the right-most forwarded hop (the edge appends it) — the
/// left-most is attacker-controlled and worthless for limiting.
export function clientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'unknown';
}
