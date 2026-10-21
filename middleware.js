import { NextResponse } from 'next/server';

/* Global CORS for /api/* (Vercel Hobby has no edge firewall rules, so the
 * API answers preflights itself). Extension content-scripts run under
 * chrome-extension:// origins — mirrored from extention-server/index.js. */

/// Defence-in-depth headers applied to every API response. The API is
/// JSON-only, so framing/sniffing never needs to be allowed.
function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Content-Security-Policy': "frame-ancestors 'none'; default-src 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-DNS-Prefetch-Control': 'off',
  };
}

export function middleware(req) {
  const origin = process.env.CORS_ORIGIN || '*';
  const reqOrigin = req.headers.get('origin') || '';
  const allow =
    origin === '*' || !reqOrigin
      ? origin
      : reqOrigin.startsWith('chrome-extension://')
        ? reqOrigin
        : origin;
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, x-ucp-session, x-api-key, x-admin-request',
        'Access-Control-Max-Age': '86400',
        ...securityHeaders(),
      },
    });
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(securityHeaders())) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = { matcher: '/api/:path*' };
