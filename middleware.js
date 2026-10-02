import { NextResponse } from 'next/server';

/* Global CORS for /api/* (Vercel Hobby has no edge firewall rules, so the
 * API answers preflights itself). */

export function middleware(req) {
  const origin = process.env.CORS_ORIGIN || '*';
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-ucp-session',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
