/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only backend: no pages, no image optimization needed.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
