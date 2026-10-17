/** @type {import('next').NextConfig} */
const nextConfig = {
  // API + admin UI backend: no image optimization needed.
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  // Security headers for the server-rendered admin UI + token pages
  // (API routes set their own CORS envelopes in lib/respond.js).
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/token/:path*',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
    ];
  },
};

module.exports = nextConfig;
