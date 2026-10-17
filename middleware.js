import { NextResponse } from 'next/server';

/* Global CORS for /api/* (Vercel Hobby has no edge firewall rules, so the
 * API answers preflights itself). Extension content-scripts run under
 * chrome-extension:// origins — mirrored from extention-server/index.js. */

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
      },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
