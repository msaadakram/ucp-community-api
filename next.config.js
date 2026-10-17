/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only backend: no pages to lint at build time (Next 16 dropped
  // the eslint config key; keep builds warning-free).
};

module.exports = nextConfig;
