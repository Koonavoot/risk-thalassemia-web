/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['tonnam.pskwr.com'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://tonnam-api.pskwr.com/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
